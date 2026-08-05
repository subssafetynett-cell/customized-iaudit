import prisma from './prisma.js';
import { collectAssigneeEmailsFromAuditData } from './audit/findingsInbox.js';
import { escapeHtml } from './textSanitize.js';
import {
    isSmtpConfigured,
    getAppLoginUrl,
    getSmtpFromAddress,
    transporter,
} from './auth/otpMail.js';

const ORG_ROOT_WALK_MAX_DEPTH = 32;

/** Short-lived caches for org tree lookups — Users page hits these on every list load. */
const ORG_LOOKUP_CACHE_TTL_MS = 45_000;
const orgRootIdCache = new Map();
const orgSubtreeIdsCache = new Map();
const orgMemberIdsCache = new Map();

function invalidateOrgLookupCaches() {
    orgRootIdCache.clear();
    orgSubtreeIdsCache.clear();
    orgMemberIdsCache.clear();
}

/** Walk creatorId chain to the account root (user with creatorId null). */
async function getOrgRootUserId(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) return null;
    const cached = orgRootIdCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.rootId;
    }

    const rows = await prisma.$queryRaw`
        WITH RECURSIVE ancestor AS (
            SELECT id, "creatorId" FROM "User" WHERE id = ${id}
            UNION ALL
            SELECT u.id, u."creatorId" FROM "User" u
            INNER JOIN ancestor a ON u.id = a."creatorId"
        )
        SELECT id FROM ancestor WHERE "creatorId" IS NULL
        LIMIT 1
    `;
    const rootId = rows?.[0]?.id != null ? Number(rows[0].id) : null;
    const resolved = Number.isInteger(rootId) && rootId > 0 ? rootId : null;
    orgRootIdCache.set(id, { rootId: resolved, expiresAt: Date.now() + ORG_LOOKUP_CACHE_TTL_MS });
    return resolved;
}

/** All user ids in the same org (account root + every user created under that tree). */
async function collectOrgSubtreeUserIds(orgRootId) {
    if (orgRootId == null || !Number.isInteger(orgRootId) || orgRootId < 1) {
        return [];
    }
    const cached = orgSubtreeIdsCache.get(orgRootId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.ids;
    }
    const rows = await prisma.$queryRaw`
        WITH RECURSIVE subtree AS (
            SELECT id FROM "User" WHERE id = ${orgRootId}
            UNION
            SELECT u.id FROM "User" u
            INNER JOIN subtree t ON u."creatorId" = t.id
        )
        SELECT id FROM subtree
    `;
    const ids = normalizePositiveIntIds(rows.map((r) => r.id));
    orgSubtreeIdsCache.set(orgRootId, {
        ids,
        expiresAt: Date.now() + ORG_LOOKUP_CACHE_TTL_MS,
    });
    return ids;
}

function normalizePositiveIntIds(rawIds) {
    const out = [];
    const seen = new Set();
    for (const raw of rawIds || []) {
        const n = typeof raw === 'bigint' ? Number(raw) : Number(raw);
        if (!Number.isInteger(n) || n < 1 || seen.has(n)) continue;
        seen.add(n);
        out.push(n);
    }
    return out;
}

/**
 * Org members visible to actor: walk up to account root, then include the full subtree.
 * Ensures inviter, invitees, and sibling teammates (any role) all share one user list.
 * Also expands via company ownership so broken creatorId links do not hide teammates.
 */
async function collectOrgMemberUserIds(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [];

    const cached = orgMemberIdsCache.get(id);
    if (cached && cached.expiresAt > Date.now() && Array.isArray(cached.ids) && cached.ids.length > 0) {
        return cached.ids;
    }

    const idSet = new Set();

    try {
        const rows = await prisma.$queryRaw`
            WITH RECURSIVE ancestor AS (
                SELECT id, "creatorId" FROM "User" WHERE id = ${id}
                UNION
                SELECT u.id, u."creatorId" FROM "User" u
                INNER JOIN ancestor a ON u.id = a."creatorId"
            ),
            org_root AS (
                SELECT id FROM ancestor WHERE "creatorId" IS NULL
                LIMIT 1
            ),
            subtree AS (
                SELECT id FROM org_root
                UNION
                SELECT u.id FROM "User" u
                INNER JOIN subtree s ON u."creatorId" = s.id
            )
            SELECT id FROM subtree
        `;
        for (const n of normalizePositiveIntIds(rows.map((r) => r.id))) {
            idSet.add(n);
        }
    } catch (err) {
        console.warn('[orgAccess] collectOrgMemberUserIds CTE failed:', err?.message || err);
    }

    // Authoritative fallback: root + subtree (also covers CTE miss / empty org_root).
    const orgRootId = await resolveActorOrgRootId(id);
    const fromRoot = await collectOrgSubtreeUserIds(orgRootId);
    for (const n of fromRoot) idSet.add(n);
    idSet.add(id);

    // Expand through company owners linked to anyone already in the set (peer admins / invitees).
    if (idSet.size > 0) {
        try {
            const companies = await prisma.company.findMany({
                where: { userId: { in: [...idSet] } },
                select: { userId: true },
            });
            for (const company of companies) {
                const ownerId = Number(company.userId);
                if (!Number.isInteger(ownerId) || ownerId < 1) continue;
                idSet.add(ownerId);
                const ownerRoot = (await getOrgRootUserId(ownerId)) ?? ownerId;
                for (const n of await collectOrgSubtreeUserIds(ownerRoot)) {
                    idSet.add(n);
                }
            }
        } catch (err) {
            console.warn('[orgAccess] company-owner org expand failed:', err?.message || err);
        }
    }

    const memberIds = [...idSet];
    // Do not cache empty results — invite / org-tree races must not stick for the TTL window.
    if (memberIds.length > 0) {
        orgMemberIdsCache.set(id, {
            ids: memberIds,
            expiresAt: Date.now() + ORG_LOOKUP_CACHE_TTL_MS,
        });
    }
    return memberIds;
}

async function actorCanAccessTargetUser(actorId, targetUserId) {
    const a = Number(actorId);
    const t = Number(targetUserId);
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(t) || t < 1) return false;
    if (a === t) return true;
    const [actor, target] = await Promise.all([
        prisma.user.findUnique({ where: { id: a }, select: { role: true, creatorId: true } }),
        prisma.user.findUnique({ where: { id: t }, select: { id: true, creatorId: true } }),
    ]);
    if (!actor || !target) return false;
    const role = normalizeUserRole(actor.role);
    if (role === 'superadmin') return true;

    const [actorRootId, targetRootId] = await Promise.all([
        getOrgRootUserId(a),
        getOrgRootUserId(t),
    ]);
    // Same-org account root or org admin may manage anyone in the org tree.
    if (actorRootId != null && targetRootId != null && actorRootId === targetRootId) {
        if (a === actorRootId) return true;
        if (role === 'admin') return true;
        if (actor.creatorId == null && role !== 'auditee') return true;
    }

    const actorOrgRoot = actor.creatorId != null ? Number(actor.creatorId) : a;
    if (Number(target.id) === actorOrgRoot) return true;
    if (target.creatorId != null && Number(target.creatorId) === actorOrgRoot) return true;
    if (target.creatorId != null && Number(target.creatorId) === a) return true;
    return false;
}

/** True when actor and target belong to the same organization tree. */
async function actorInSameOrgAs(actorId, targetUserId) {
    const a = Number(actorId);
    const t = Number(targetUserId);
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(t) || t < 1) return false;
    if (a === t) return true;
    const [actorRoot, targetRoot] = await Promise.all([
        getOrgRootUserId(a),
        getOrgRootUserId(t),
    ]);
    return actorRoot != null && targetRoot != null && actorRoot === targetRoot;
}

/**
 * Subscription / billing status (PII + Stripe fields): lock down horizontal IDOR.
 * Allowed: self; superadmin; org billing root (same org); user directly created by actor.
 * NOT allowed: sibling teammates reading each other's billing by swapping :id.
 */
async function actorCanViewUserBillingStatus(actorId, targetUserId) {
    if (actorId === targetUserId) return true;
    const [actor, target] = await Promise.all([
        prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } }),
        prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, creatorId: true } })
    ]);
    if (!actor || !target) return false;
    if (actor.role === 'superadmin') return true;

    const actorRoot = await getOrgRootUserId(actor.id);
    const targetRoot = await getOrgRootUserId(target.id);
    if (actorRoot != null && targetRoot != null && actorRoot === targetRoot && actor.id === actorRoot) {
        return true;
    }
    if (target.creatorId === actorId) {
        return true;
    }
    return false;
}

async function actorIsAuditee(actorId) {
    const actor = await prisma.user.findUnique({
        where: { id: Number(actorId) },
        select: { role: true },
    });
    return normalizeUserRole(actor?.role) === 'auditee';
}

async function getAuditeeAssignedSiteIds(auditeeId) {
    const sites = await prisma.site.findMany({
        where: { userId: Number(auditeeId) },
        select: { id: true },
    });
    return sites.map((s) => s.id);
}

async function auditeeCanAccessSiteId(auditeeId, siteId) {
    const parsedSiteId = Number(siteId);
    if (!Number.isInteger(parsedSiteId) || parsedSiteId < 1) return false;
    const site = await prisma.site.findFirst({
        where: { id: parsedSiteId, userId: Number(auditeeId) },
        select: { id: true },
    });
    return Boolean(site);
}

async function rejectIfAuditee(actorId, res, message = 'Forbidden') {
    if (await actorIsAuditee(actorId)) {
        res.status(403).json({ error: message });
        return true;
    }
    return false;
}

async function actorCanAccessAuditProgram(actorId, program) {
    if (!program) return false;
    const actorIdNum = Number(actorId);
    if (!Number.isInteger(actorIdNum) || actorIdNum < 1) return false;

    if (await actorIsAuditee(actorIdNum)) {
        return auditeeCanAccessSiteId(actorIdNum, program.siteId);
    }

    if (Number(program.userId) === actorIdNum) return true;
    if (Number(program.leadAuditorId) === actorIdNum) return true;
    if (Array.isArray(program.auditors) && program.auditors.some((a) => Number(a.id) === actorIdNum)) {
        return true;
    }

    if (await actorHasFullOrgAuditVisibility(actorIdNum)) {
        if (program.userId != null && (await actorCanAccessTargetUser(actorIdNum, program.userId))) {
            return true;
        }
        // Program belongs to same org as actor (company owner org tree).
        if (program.siteId != null) {
            const site = program.site?.companyId != null
                ? { companyId: program.site.companyId }
                : await prisma.site.findUnique({
                    where: { id: Number(program.siteId) },
                    select: { companyId: true },
                });
            if (site?.companyId != null) {
                const company = await prisma.company.findUnique({
                    where: { id: Number(site.companyId) },
                    select: { userId: true },
                });
                if (company?.userId != null && (await actorInSameOrgAs(actorIdNum, company.userId))) {
                    return true;
                }
            }
        }
    }

    return false;
}

async function actorIsFindingAssignee(actorId, plan) {
    if (!plan?.auditData) return false;
    const actor = await prisma.user.findUnique({
        where: { id: Number(actorId) },
        select: { email: true },
    });
    if (!actor?.email) return false;
    const actorEmail = actor.email.toLowerCase().trim();
    return collectAssigneeEmailsFromAuditData(plan.auditData).has(actorEmail);
}

async function actorCanAccessAuditPlan(actorId, plan) {
    if (!plan) return false;
    const actorIdNum = Number(actorId);
    if (!Number.isInteger(actorIdNum) || actorIdNum < 1) return false;

    if (await actorIsAuditee(actorIdNum)) {
        const siteId = plan.auditProgram?.siteId ?? plan.siteId;
        if (siteId != null && (await auditeeCanAccessSiteId(actorIdNum, siteId))) return true;
        if (await actorIsFindingAssignee(actorIdNum, plan)) return true;
        return false;
    }

    if (Number(plan.userId) === actorIdNum) return true;
    if (Number(plan.leadAuditorId) === actorIdNum) return true;
    if (Array.isArray(plan.auditors) && plan.auditors.some((a) => Number(a.id) === actorIdNum)) {
        return true;
    }

    if (plan.auditProgram) {
        if (Number(plan.auditProgram.userId) === actorIdNum) return true;
        if (Number(plan.auditProgram.leadAuditorId) === actorIdNum) return true;
        if (
            Array.isArray(plan.auditProgram.auditors) &&
            plan.auditProgram.auditors.some((a) => Number(a.id) === actorIdNum)
        ) {
            return true;
        }
    }

    if (await actorHasFullOrgAuditVisibility(actorIdNum)) {
        if (plan.userId != null && (await actorCanAccessTargetUser(actorIdNum, plan.userId))) return true;
        if (plan.auditProgram && (await actorCanAccessAuditProgram(actorIdNum, plan.auditProgram))) return true;
    }

    if (await actorIsFindingAssignee(actorIdNum, plan)) return true;
    return false;
}

async function findUserByEmail(rawEmail) {
    const email = String(rawEmail || '').toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Valid email is required', status: 400 };
    }

    const user = await prisma.user.findFirst({
        where: {
            email: { equals: email, mode: 'insensitive' },
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
        },
    });

    if (!user) {
        return { found: false };
    }

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    return { found: true, id: user.id, name, email: user.email };
}

async function sendFindingAssignmentEmail({
    assignToEmail,
    assignToName,
    assignerName,
    auditName,
    findingRef,
    findingType,
    auditPlanId,
}) {
    if (!isSmtpConfigured()) {
        console.warn('[FINDING-ASSIGN] SMTP not configured; skipping assignment email.');
        return { sent: false, skipped: true };
    }

    const safeAssignee = escapeHtml(assignToName || assignToEmail);
    const safeAssigner = escapeHtml(assignerName || 'A team member');
    const safeAudit = escapeHtml(auditName || 'an audit');
    const safeRef = escapeHtml(findingRef || 'Finding');
    const safeType = escapeHtml(findingType || '');
    const loginUrl = getAppLoginUrl();
    const findingsUrl = `${String(process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/$/, '')}/audit-findings`;

    const subject = `${safeAssigner} assigned you an audit finding`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #213847; margin-bottom: 8px;">Audit finding assigned to you</h2>
            <p style="font-size: 15px; line-height: 1.6;">
                <strong>${safeAssigner}</strong> assigned you a finding on <strong>${safeAudit}</strong>.
                Please log in to iAudit Global and complete it.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">Finding</p>
                <p style="margin: 0; font-size: 15px; font-weight: bold;">${safeRef}${safeType ? ` (${safeType})` : ''}</p>
            </div>
            <p style="margin: 24px 0;">
                <a href="${findingsUrl}" style="display: inline-block; background: #1e855e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                    View my findings
                </a>
            </p>
            <p style="font-size: 13px; color: #64748b;">
                Or sign in at <a href="${loginUrl}" style="color: #1e855e;">${loginUrl}</a>
            </p>
            <p style="margin-top: 24px; font-size: 11px; color: #94a3b8;">Audit plan #${Number(auditPlanId) || ''} · This is an automated message.</p>
        </div>
    `;

    await transporter.sendMail({
        from: getSmtpFromAddress(),
        to: assignToEmail,
        subject,
        html,
        text: `${assignerName || 'A team member'} assigned you a finding (${findingRef || 'Finding'}) on ${auditName || 'an audit'}. Please log in to our app and complete it: ${findingsUrl}`,
    });

    return { sent: true };
}

async function resolveActorOrgRootId(actorId) {
    const root = await getOrgRootUserId(actorId);
    return root ?? actorId;
}

async function actorIsInOrgSubtree(actorId, orgRootUserId) {
    if (actorId === orgRootUserId) return true;
    const subtree = await collectOrgSubtreeUserIds(orgRootUserId);
    return subtree.includes(actorId);
}

async function actorCanReadOrgAssessmentStore(actorId, orgRootUserId) {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (!actor) return false;
    if (actor.role === 'superadmin') return true;
    return actorIsInOrgSubtree(actorId, orgRootUserId);
}

const USER_ASSIGNABLE_ROLES = new Set(['admin', 'auditor', 'lead_auditor', 'other', 'auditee']);

function normalizeUserRole(role) {
    return String(role ?? '').trim().toLowerCase();
}

/** Create/update/delete users and change roles — org admins only (not auditors/auditees). */
async function actorCanManageOrgUsers(actorId) {
    const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { role: true, creatorId: true }
    });
    if (!actor) return false;
    const r = normalizeUserRole(actor.role);
    if (r === 'superadmin' || r === 'admin') return true;
    // Organization root (no creator) may manage users in their org; auditees never may.
    if (actor.creatorId == null && r !== 'auditee') return true;
    return false;
}

const PROTECTED_COMPANY_OWNER_MESSAGE =
    'The company owner account cannot be removed or deactivated by other administrators.';

/** PSZL-013: org root (signup account) and registered company owner are not removable by peer admins. */
async function isProtectedCompanyOwnerUserId(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) return false;
    const orgRootId = await getOrgRootUserId(id);
    if (orgRootId === id) return true;
    const ownedCompany = await prisma.company.findFirst({
        where: { userId: id },
        select: { id: true },
    });
    return Boolean(ownedCompany);
}

/** Returns ok:false when a non-owner admin tries to delete/deactivate the protected company owner. */
async function assertActorMayModifyProtectedCompanyOwner(actorId, targetId) {
    if (!(await isProtectedCompanyOwnerUserId(targetId))) {
        return { ok: true };
    }
    const actorNum = Number(actorId);
    const targetNum = Number(targetId);
    if (actorNum === targetNum) {
        return { ok: true };
    }
    const actor = await prisma.user.findUnique({
        where: { id: actorNum },
        select: { role: true },
    });
    if (normalizeUserRole(actor?.role) === 'superadmin') {
        return { ok: true };
    }
    const [actorRoot, targetRoot] = await Promise.all([
        getOrgRootUserId(actorNum),
        getOrgRootUserId(targetNum),
    ]);
    if (actorRoot != null && actorRoot === targetRoot) {
        return { ok: false, status: 403, error: PROTECTED_COMPANY_OWNER_MESSAGE };
    }
    return { ok: true };
}

/** Same privilege model as actorCanManageOrgUsers, applied to a loaded user row. */
function userRowHasOrgAdminPrivileges(user) {
    if (!user) return false;
    const r = normalizeUserRole(user.role);
    if (r === 'superadmin' || r === 'admin') return true;
    if (user.creatorId == null && r !== 'auditee') return true;
    return false;
}

/** PSZL-014: active org members who can administer users (admin / org root). */
async function countActiveOrgAdministrators(actorId) {
    const orgRootId = await getOrgRootUserId(actorId);
    if (orgRootId == null) return 0;
    const memberIds = await collectOrgSubtreeUserIds(orgRootId);
    if (memberIds.length === 0) return 0;
    const users = await prisma.user.findMany({
        where: { id: { in: memberIds }, isActive: true },
        select: { id: true, role: true, creatorId: true },
    });
    return users.filter((u) => userRowHasOrgAdminPrivileges(u)).length;
}

const LAST_ACTIVE_ADMIN_MESSAGE =
    'You are the only active administrator in this organization. Invite or activate another administrator before deactivating your account.';

/** Any org member except auditees may invite teammates; role assignment stays admin-only. */
async function actorCanInviteOrgUser(actorId) {
    const actor = await prisma.user.findUnique({
        where: { id: Number(actorId) },
        select: { id: true, role: true, isActive: true },
    });
    if (!actor || actor.isActive === false) return false;
    // Every active role (admin, auditor, lead auditor, auditee, other, …) may invite.
    return true;
}

/** User is designated lead auditor on at least one audit program or plan. */
async function actorIsLeadAuditor(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return false;
    const [programCount, planCount] = await Promise.all([
        prisma.auditProgram.count({ where: { leadAuditorId: id } }),
        prisma.auditPlan.count({ where: { leadAuditorId: id } }),
    ]);
    return programCount > 0 || planCount > 0;
}

/** Any active org member may invite an auditee (site assignment still org-scoped). */
async function actorCanInviteAuditee(actorId) {
    return actorCanInviteOrgUser(actorId);
}

/**
 * User ids whose registered companies an actor may read (sites + departments included).
 * Any org member — regardless of role — shares the same company catalog as the account root.
 */
async function resolveOrgCompanyOwnerUserIds(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [];
    const memberIds = await collectOrgMemberUserIds(id);
    if (memberIds.length > 0) return memberIds;
    const orgRootId = await resolveActorOrgRootId(id);
    const fromRoot = await collectOrgSubtreeUserIds(orgRootId);
    return fromRoot.length > 0 ? fromRoot : [id];
}

async function siteIdsInActorOrg(actorId) {
    const ownerUserIds = await resolveOrgCompanyOwnerUserIds(actorId);
    const companies = await prisma.company.findMany({
        where: { userId: { in: ownerUserIds } },
        select: { sites: { select: { id: true } } },
    });
    return new Set(companies.flatMap((c) => c.sites.map((s) => s.id)));
}

async function actorCanAssignAuditeeToSite(actorId, siteId) {
    const parsed = Number.parseInt(String(siteId), 10);
    if (Number.isNaN(parsed) || parsed < 1) return false;
    const allowed = await siteIdsInActorOrg(actorId);
    return allowed.has(parsed);
}

/** Batch site-assignment check (one org lookup instead of N). */
async function actorCanAssignAuditeeToAllSites(actorId, siteIds) {
    const ids = (Array.isArray(siteIds) ? siteIds : [])
        .map((id) => Number.parseInt(String(id), 10))
        .filter((n) => Number.isInteger(n) && n >= 1);
    if (ids.length === 0) return false;
    const allowed = await siteIdsInActorOrg(actorId);
    return ids.every((id) => allowed.has(id));
}

/** PSZL-010: site must exist and belong to the actor's organization before mutate. */
async function assertActorCanManageSite(actorId, siteId) {
    const parsed = Number.parseInt(String(siteId), 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return { ok: false, status: 400, error: 'Invalid site ID' };
    }
    if (await actorIsAuditee(actorId)) {
        return { ok: false, status: 403, error: 'Forbidden' };
    }
    const site = await prisma.site.findUnique({
        where: { id: parsed },
        select: { id: true },
    });
    if (!site) {
        return { ok: false, status: 404, error: 'Site not found' };
    }
    const actor = await prisma.user.findUnique({
        where: { id: Number(actorId) },
        select: { role: true },
    });
    if (actor?.role === 'superadmin') {
        return { ok: true, siteId: parsed };
    }
    if (!(await actorCanAssignAuditeeToSite(actorId, parsed))) {
        return { ok: false, status: 403, error: 'Forbidden' };
    }
    return { ok: true, siteId: parsed };
}

/** Resolve department and ensure the actor may manage its parent site (PSZL-011 / PSZL-012). */
async function assertActorCanManageDepartment(actorId, departmentId) {
    const parsed = Number.parseInt(String(departmentId), 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return { ok: false, status: 400, error: 'Invalid department ID' };
    }
    const department = await prisma.department.findUnique({
        where: { id: parsed },
        select: { id: true, siteId: true },
    });
    if (!department) {
        return { ok: false, status: 404, error: 'Department not found' };
    }
    const siteAccess = await assertActorCanManageSite(actorId, department.siteId);
    if (!siteAccess.ok) {
        return siteAccess;
    }
    return { ok: true, departmentId: parsed, siteId: siteAccess.siteId };
}

/** Reject tampered body siteId on POST .../sites/:id/departments (path is authoritative). */
function assertDepartmentCreateBodySiteId(body, pathSiteId) {
    if (body?.siteId === undefined || body?.siteId === null || String(body.siteId).trim() === '') {
        return null;
    }
    const fromBody = Number.parseInt(String(body.siteId), 10);
    if (!Number.isInteger(fromBody) || fromBody !== pathSiteId) {
        return 'Invalid request';
    }
    return null;
}

const DEPARTMENT_CREATE_ALLOWED_BODY_KEYS = new Set([
    'name', 'code', 'status', 'manager', 'description', 'siteId',
]);

/** Org members eligible as lead auditor or team auditor (excludes auditees). */
async function orgAuditorUserIdSet(actorId) {
    const memberIds = await collectOrgMemberUserIds(actorId);
    if (memberIds.length === 0) return new Set();
    const users = await prisma.user.findMany({
        where: {
            id: { in: memberIds },
            isActive: true,
            role: { not: 'auditee' },
        },
        select: { id: true },
    });
    return new Set(users.map((u) => u.id));
}

function parsePositiveIntIds(raw) {
    if (raw == null) return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return [
        ...new Set(
            list
                .map((id) => Number.parseInt(String(id), 10))
                .filter((id) => Number.isInteger(id) && id > 0),
        ),
    ];
}

/** Reject lead/team auditor ids outside the actor's org (403 on tampered ids). */
async function assertOrgAuditorUserIds(actorId, userIds, { allowEmpty = true } = {}) {
    const normalized = parsePositiveIntIds(userIds);
    if (normalized.length === 0) {
        return allowEmpty
            ? { ok: true, ids: [] }
            : { ok: false, status: 400, error: 'Auditor user id is required' };
    }
    const allowed = await orgAuditorUserIdSet(actorId);
    if (normalized.some((id) => !allowed.has(id))) {
        return {
            ok: false,
            status: 400,
            error: 'One or more selected auditors are not allowed for this organization',
        };
    }
    return { ok: true, ids: normalized };
}

/** scheduleData.departmentIds must belong to the program site within the actor's org. */
async function assertOrgSiteDepartments(actorId, siteId, scheduleData) {
    if (!scheduleData || typeof scheduleData !== 'object' || Array.isArray(scheduleData)) {
        return { ok: true };
    }
    const rawIds = scheduleData.departmentIds;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
        return { ok: true };
    }
    const parsedSiteId = Number.parseInt(String(siteId), 10);
    if (!Number.isInteger(parsedSiteId) || parsedSiteId < 1) {
        return { ok: false, status: 400, error: 'Invalid site ID' };
    }
    if (!(await actorCanAssignAuditeeToSite(actorId, parsedSiteId))) {
        return { ok: false, status: 403, error: 'Forbidden' };
    }
    const deptIds = parsePositiveIntIds(rawIds);
    if (deptIds.length === 0) {
        return { ok: true };
    }
    const departments = await prisma.department.findMany({
        where: { id: { in: deptIds } },
        select: { id: true, siteId: true },
    });
    if (departments.length !== deptIds.length) {
        return { ok: false, status: 400, error: 'One or more selected departments were not found' };
    }
    if (departments.some((dept) => dept.siteId !== parsedSiteId)) {
        return {
            ok: false,
            status: 400,
            error: 'Departments must belong to the selected site',
        };
    }
    return { ok: true };
}

async function validateAuditProgramAssignments(actorId, { siteId, leadAuditorId, auditorIds, scheduleData }) {
    const parsedSiteId = Number.parseInt(String(siteId), 10);
    if (!Number.isInteger(parsedSiteId) || parsedSiteId < 1) {
        return { ok: false, status: 400, error: 'Invalid site ID' };
    }
    if (!(await actorCanAssignAuditeeToSite(actorId, parsedSiteId))) {
        return { ok: false, status: 403, error: 'You do not have access to the selected site' };
    }
    if (leadAuditorId != null && leadAuditorId !== '') {
        const leadCheck = await assertOrgAuditorUserIds(actorId, [leadAuditorId], { allowEmpty: false });
        if (!leadCheck.ok) {
            return {
                ok: false,
                status: leadCheck.status || 400,
                error: leadCheck.error === 'Auditor user id is required'
                    ? 'Lead auditor is required'
                    : (leadCheck.error || 'Invalid lead auditor'),
            };
        }
    }
    const auditorCheck = await assertOrgAuditorUserIds(actorId, auditorIds ?? [], { allowEmpty: true });
    if (!auditorCheck.ok) return auditorCheck;
    const deptCheck = await assertOrgSiteDepartments(actorId, parsedSiteId, scheduleData);
    if (!deptCheck.ok) return deptCheck;
    const parsedLead =
        leadAuditorId != null && leadAuditorId !== ''
            ? Number.parseInt(String(leadAuditorId), 10)
            : null;
    return {
        ok: true,
        siteId: parsedSiteId,
        leadAuditorId: Number.isInteger(parsedLead) && parsedLead > 0 ? parsedLead : null,
        auditorIds: auditorCheck.ids,
    };
}

/** Active non-auditee users in the company owner's organization (full org tree). */
async function companyAuditorUserIdSet(companyId) {
    const parsedCompanyId = Number.parseInt(String(companyId), 10);
    if (!Number.isInteger(parsedCompanyId) || parsedCompanyId < 1) {
        return new Set();
    }
    const company = await prisma.company.findUnique({
        where: { id: parsedCompanyId },
        select: { userId: true },
    });
    if (!company?.userId) {
        return new Set();
    }
    // Use the org root of the company owner so peer admins / teammates are included,
    // not only the owner's direct invite subtree (which caused intermittent 403 on save).
    const ownerRootId = (await getOrgRootUserId(company.userId)) ?? Number(company.userId);
    const memberIds = await collectOrgSubtreeUserIds(ownerRootId);
    if (memberIds.length === 0) {
        return new Set();
    }
    const users = await prisma.user.findMany({
        where: {
            id: { in: memberIds },
            isActive: true,
            role: { not: 'auditee' },
        },
        select: { id: true },
    });
    return new Set(users.map((u) => Number(u.id)));
}

/** Reject auditor ids outside the audit program's company (403 on tampered ids). */
async function assertCompanyAuditorUserIds(
    companyId,
    userIds,
    { allowEmpty = true, grandfatherIds = [] } = {},
) {
    const normalized = parsePositiveIntIds(userIds);
    if (normalized.length === 0) {
        return allowEmpty
            ? { ok: true, ids: [] }
            : { ok: false, status: 400, error: 'Auditor user id is required' };
    }
    const allowed = await companyAuditorUserIdSet(companyId);
    for (const id of parsePositiveIntIds(grandfatherIds)) {
        allowed.add(id);
    }
    const rejected = normalized.filter((id) => !allowed.has(id));
    if (rejected.length > 0) {
        return {
            ok: false,
            status: 403,
            error: 'One or more selected auditors are not allowed for this company',
        };
    }
    return { ok: true, ids: normalized };
}

async function resolveAuditProgramCompanyId(program) {
    if (program?.site?.companyId != null) {
        return Number(program.site.companyId);
    }
    const siteId = program?.siteId;
    if (siteId == null) {
        return null;
    }
    const site = await prisma.site.findUnique({
        where: { id: Number(siteId) },
        select: { companyId: true },
    });
    return site?.companyId ?? null;
}

async function validateAuditPlanAuditorAssignments(
    actorId,
    { companyId, leadAuditorId, auditorIds, grandfatherIds = [] },
) {
    const parsedCompanyId = Number.parseInt(String(companyId), 10);
    if (!Number.isInteger(parsedCompanyId) || parsedCompanyId < 1) {
        return { ok: false, status: 400, error: 'Invalid company for audit plan' };
    }
    const company = await prisma.company.findUnique({
        where: { id: parsedCompanyId },
        select: { userId: true },
    });
    if (!company?.userId) {
        return { ok: false, status: 403, error: 'You do not have access to this company' };
    }
    // Same-org check (not shallow creator-only) — peer admins must be able to save plans.
    if (!(await actorInSameOrgAs(actorId, company.userId))) {
        return { ok: false, status: 403, error: 'You do not have access to this company' };
    }

    const existingIds = parsePositiveIntIds(grandfatherIds);

    if (leadAuditorId != null && leadAuditorId !== '') {
        const leadCheck = await assertCompanyAuditorUserIds(
            parsedCompanyId,
            [leadAuditorId],
            { allowEmpty: false, grandfatherIds: existingIds },
        );
        if (!leadCheck.ok) return leadCheck;
    }
    const auditorCheck = await assertCompanyAuditorUserIds(parsedCompanyId, auditorIds ?? [], {
        allowEmpty: true,
        grandfatherIds: existingIds,
    });
    if (!auditorCheck.ok) return auditorCheck;
    const parsedLead =
        leadAuditorId != null && leadAuditorId !== ''
            ? Number.parseInt(String(leadAuditorId), 10)
            : null;
    return {
        ok: true,
        leadAuditorId: Number.isInteger(parsedLead) && parsedLead > 0 ? parsedLead : null,
        auditorIds: auditorCheck.ids,
    };
}

/** True when Site.userId references an auditee (not a legacy creator id from older site creation). */
function siteUserIsAuditee(site) {
    if (site?.userId == null) return false;
    return normalizeUserRole(site.user?.role) === 'auditee';
}

function parseAuditeeSiteIds(body) {
    const raw = body?.siteIds ?? (body?.siteId != null ? [body.siteId] : []);
    if (!Array.isArray(raw)) return null;
    const ids = [
        ...new Set(
            raw
                .map((id) => Number.parseInt(String(id), 10))
                .filter((id) => Number.isInteger(id) && id >= 1),
        ),
    ];
    return ids.length > 0 ? ids : null;
}

async function assignAuditeeToSites(tx, auditeeId, siteIds) {
    const sites = await tx.site.findMany({
        where: { id: { in: siteIds } },
        select: { id: true, userId: true, user: { select: { role: true } } },
    });
    if (sites.length !== siteIds.length) {
        const err = new Error('Site not found');
        err.code = 'SITE_NOT_FOUND';
        throw err;
    }

    for (const site of sites) {
        if (siteUserIsAuditee(site) && Number(site.userId) !== auditeeId) {
            const err = new Error('Site already assigned');
            err.code = 'SITE_ALREADY_ASSIGNED';
            throw err;
        }
        if (site.userId != null && !siteUserIsAuditee(site)) {
            await tx.site.update({
                where: { id: site.id },
                data: { userId: null },
            });
        }
    }

    await tx.site.updateMany({
        where: { userId: auditeeId, id: { notIn: siteIds } },
        data: { userId: null },
    });

    for (const siteId of siteIds) {
        const assigned = await tx.site.updateMany({
            where: { id: siteId, OR: [{ userId: null }, { userId: auditeeId }] },
            data: { userId: auditeeId },
        });
        if (assigned.count !== 1) {
            const err = new Error('Site already assigned');
            err.code = 'SITE_ALREADY_ASSIGNED';
            throw err;
        }
    }
}

async function formatAuditeeSiteLabels(siteIds) {
    if (!siteIds.length) return [];
    const sites = await prisma.site.findMany({
        where: { id: { in: siteIds } },
        select: { id: true, name: true, company: { select: { name: true } } },
        orderBy: { name: 'asc' },
    });
    return sites.map((s) => `${s.name} (${s.company?.name ?? 'Company'})`);
}

/**
 * Clear Site.userId when it still points at a non-auditee user (legacy rows stored the creator).
 * Pass ownerUserIds to limit cleanup to one org's companies; omit for a full migration pass.
 */
async function clearLegacySiteUserIds(client = prisma, ownerUserIds = null) {
    if (Array.isArray(ownerUserIds) && ownerUserIds.length === 0) return 0;

    const where = { userId: { not: null } };
    if (Array.isArray(ownerUserIds)) {
        where.company = { userId: { in: ownerUserIds } };
    }

    const occupied = await client.site.findMany({
        where,
        select: { id: true, userId: true, user: { select: { role: true } } },
    });
    const legacyIds = occupied
        .filter((s) => !siteUserIsAuditee(s))
        .map((s) => s.id);
    if (legacyIds.length === 0) return 0;
    const result = await client.site.updateMany({
        where: { id: { in: legacyIds } },
        data: { userId: null },
    });
    return result.count;
}

function defaultAuditeeNamesFromEmail(email) {
    const local = String(email || '').split('@')[0] || 'auditee';
    // Split on separators so john.doe becomes John / Doe (no dots left for email auto-linkify).
    const parts = local
        .replace(/[^a-zA-Z0-9._-]/g, ' ')
        .replace(/[._-]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
    const firstName = cap((parts[0] || 'Auditee').replace(/[^a-zA-Z]/g, '')) || 'Auditee';
    const lastName =
        parts.length > 1
            ? parts.slice(1).map((p) => cap(p.replace(/[^a-zA-Z]/g, ''))).filter(Boolean).join(' ') || 'User'
            : 'User';
    return { firstName, lastName };
}

/** Org admin or invite-capable user managing an auditee in their scope. */
async function actorCanManageAuditee(actorId, targetId) {
    const tid = Number(targetId);
    if (!Number.isInteger(tid) || tid < 1) return false;
    if (!(await actorCanAccessTargetUser(actorId, tid))) return false;
    const target = await prisma.user.findUnique({
        where: { id: tid },
        select: { role: true },
    });
    if (!target || normalizeUserRole(target.role) !== 'auditee') return false;
    if (await actorCanManageOrgUsers(actorId)) return true;
    return actorCanInviteAuditee(actorId);
}

/** Per-user self assessment store — any signed-in user may read/write their own row. */
function actorCanWriteSelfAssessmentStore(actorId) {
    return Number.isInteger(actorId) && actorId > 0;
}

/** Gap/self assessment writes: org members except read-only auditors. */
async function actorCanWriteOrgAssessmentStore(actorId) {
    const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { role: true, creatorId: true }
    });
    if (!actor) return false;
    if (actor.role === 'superadmin' || actor.role === 'admin') return true;
    if (actor.creatorId == null) return true;
    if (actor.role === 'auditor') return false;
    return true;
}

function mergeJsonRecordsById(existingList, moreLists) {
    const byId = new Map();
    const add = (list) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
            if (item && item.id != null) byId.set(String(item.id), item);
        }
    };
    add(existingList);
    for (const list of moreLists) add(list);
    return Array.from(byId.values());
}

async function migrateLegacyUserGapStores(orgRootUserId, subtreeIds) {
    if (!subtreeIds.length) return;
    try {
        const legacyRows = await prisma.$queryRaw`
            SELECT "userId", analyses, draft FROM "UserGapAnalysisStore"
            WHERE "userId" = ANY(${subtreeIds}::int[])
        `;
        if (!legacyRows.length) return;

        let mergedAnalyses = [];
        let mergedDraft = null;
        for (const row of legacyRows) {
            mergedAnalyses = mergeJsonRecordsById(mergedAnalyses, [row.analyses]);
            if (row.draft) mergedDraft = row.draft;
        }

        const existing = await prisma.orgGapAnalysisStore.findUnique({
            where: { orgRootUserId }
        });
        const analyses = mergeJsonRecordsById(existing?.analyses ?? [], [mergedAnalyses]);
        const draft = existing?.draft ?? mergedDraft;

        await prisma.orgGapAnalysisStore.upsert({
            where: { orgRootUserId },
            create: { orgRootUserId, analyses, draft },
            update: { analyses, draft: draft ?? undefined }
        });

        await prisma.$executeRaw`
            DELETE FROM "UserGapAnalysisStore" WHERE "userId" = ANY(${subtreeIds}::int[])
        `;
    } catch (err) {
        if (err?.code !== 'P2010' && err?.code !== '42P01') {
            console.warn('Legacy gap store migration skipped:', err?.message || err);
        }
    }
}

async function migrateLegacyUserSelfAssessmentStores(orgRootUserId, subtreeIds) {
    if (!subtreeIds.length) return;
    try {
        const legacyRows = await prisma.$queryRaw`
            SELECT "userId", assessments, draft FROM "UserSelfAssessmentStore"
            WHERE "userId" = ANY(${subtreeIds}::int[])
        `;
        if (!legacyRows.length) return;

        let mergedAssessments = [];
        let mergedDraft = null;
        for (const row of legacyRows) {
            mergedAssessments = mergeJsonRecordsById(mergedAssessments, [row.assessments]);
            if (row.draft) mergedDraft = row.draft;
        }

        const existing = await prisma.orgSelfAssessmentStore.findUnique({
            where: { orgRootUserId }
        });
        const assessments = mergeJsonRecordsById(existing?.assessments ?? [], [mergedAssessments]);
        const draft = existing?.draft ?? mergedDraft;

        await prisma.orgSelfAssessmentStore.upsert({
            where: { orgRootUserId },
            create: { orgRootUserId, assessments, draft },
            update: { assessments, draft: draft ?? undefined }
        });

        await prisma.$executeRaw`
            DELETE FROM "UserSelfAssessmentStore" WHERE "userId" = ANY(${subtreeIds}::int[])
        `;
    } catch (err) {
        if (err?.code !== 'P2010' && err?.code !== '42P01') {
            console.warn('Legacy self assessment store migration skipped:', err?.message || err);
        }
    }
}

function gapAnalysisOwnerId(record) {
    const id = record?.createdByUserId ?? record?.userId;
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function filterGapAnalysesForUser(analyses, userId) {
    if (!Array.isArray(analyses)) return [];
    return analyses.filter((a) => gapAnalysisOwnerId(a) === userId);
}

function stampGapAnalysesForUser(analyses, userId) {
    if (!Array.isArray(analyses)) return [];
    return analyses.map((a) => ({
        ...a,
        createdByUserId: gapAnalysisOwnerId(a) ?? userId,
        userId,
    }));
}

function gapAnalysisDraftForUser(draft, userId) {
    if (!draft || typeof draft !== 'object') return null;
    const owner = Number(draft.ownerUserId);
    if (Number.isInteger(owner) && owner > 0 && owner !== userId) return null;
    return { ...draft, ownerUserId: userId };
}

async function importOwnedGapAnalysesFromOrgStore(actorId) {
    const orgRootUserId = await resolveActorOrgRootId(actorId);
    const orgRow = await prisma.orgGapAnalysisStore.findUnique({
        where: { orgRootUserId },
    });
    if (!orgRow) return [];
    return filterGapAnalysesForUser(orgRow.analyses, actorId);
}

async function ensureUserGapAnalysisStore(actorId) {
    let row = await prisma.userGapAnalysisStore.findUnique({ where: { userId: actorId } });
    if (!row) {
        let analyses = await importOwnedGapAnalysesFromOrgStore(actorId);
        let draft = null;
        try {
            const legacyRows = await prisma.$queryRaw`
                SELECT analyses, draft FROM "UserGapAnalysisStore" WHERE "userId" = ${actorId}
            `;
            if (legacyRows?.length) {
                const legacy = legacyRows[0];
                analyses = stampGapAnalysesForUser(
                    filterGapAnalysesForUser(legacy.analyses, actorId),
                    actorId,
                );
                draft = gapAnalysisDraftForUser(legacy.draft, actorId);
            }
        } catch (err) {
            if (err?.code !== 'P2010' && err?.code !== '42P01') {
                console.warn('Legacy user gap analysis read skipped:', err?.message || err);
            }
        }
        row = await prisma.userGapAnalysisStore.create({
            data: { userId: actorId, analyses, draft },
        });
    }
    let analyses = filterGapAnalysesForUser(row.analyses, actorId);
    const draft = gapAnalysisDraftForUser(row.draft, actorId);
    const storedLen = Array.isArray(row.analyses) ? row.analyses.length : 0;
    if (analyses.length !== storedLen || draft !== row.draft) {
        row = await prisma.userGapAnalysisStore.update({
            where: { userId: actorId },
            data: { analyses: stampGapAnalysesForUser(analyses, actorId), draft },
        });
        analyses = filterGapAnalysesForUser(row.analyses, actorId);
    }
    return { userId: actorId, analyses, draft, row };
}

function selfAssessmentOwnerId(record) {
    const id = record?.createdByUserId ?? record?.userId;
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function filterSelfAssessmentsForUser(assessments, userId) {
    if (!Array.isArray(assessments)) return [];
    return assessments.filter((a) => selfAssessmentOwnerId(a) === userId);
}

function stampSelfAssessmentsForUser(assessments, userId) {
    if (!Array.isArray(assessments)) return [];
    return assessments.map((a) => ({
        ...a,
        createdByUserId: selfAssessmentOwnerId(a) ?? userId,
        userId,
    }));
}

function selfAssessmentDraftForUser(draft, userId) {
    if (!draft || typeof draft !== 'object') return null;
    const owner = Number(draft.ownerUserId);
    if (Number.isInteger(owner) && owner > 0 && owner !== userId) return null;
    return { ...draft, ownerUserId: userId };
}

/** Gap/self-assessment rows are keyed per user; org admins may manage a teammate's store. */
async function resolveAssessmentStoreOwnerId(actorId, requestedOwnerId) {
    const actor = Number(actorId);
    if (!Number.isInteger(actor) || actor < 1) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }
    const requested =
        requestedOwnerId != null && requestedOwnerId !== ''
            ? Number(requestedOwnerId)
            : actor;
    if (!Number.isInteger(requested) || requested < 1) return actor;
    if (requested === actor) return actor;
    if (!(await actorCanAccessTargetUser(actor, requested))) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }
    if (!(await actorCanManageOrgUsers(actor))) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }
    return requested;
}

/** One-time import: only records explicitly owned by this user (never unowned org-wide rows). */
async function importOwnedSelfAssessmentsFromOrgStore(actorId) {
    const orgRootUserId = await resolveActorOrgRootId(actorId);
    const orgRow = await prisma.orgSelfAssessmentStore.findUnique({
        where: { orgRootUserId },
    });
    if (!orgRow) return [];
    return filterSelfAssessmentsForUser(orgRow.assessments, actorId);
}

async function ensureUserSelfAssessmentStore(actorId) {
    let row = await prisma.userSelfAssessmentStore.findUnique({ where: { userId: actorId } });
    if (!row) {
        let assessments = await importOwnedSelfAssessmentsFromOrgStore(actorId);
        let draft = null;
        try {
            const legacyRows = await prisma.$queryRaw`
                SELECT assessments, draft FROM "UserSelfAssessmentStore" WHERE "userId" = ${actorId}
            `;
            if (legacyRows?.length) {
                const legacy = legacyRows[0];
                assessments = stampSelfAssessmentsForUser(
                    filterSelfAssessmentsForUser(legacy.assessments, actorId),
                    actorId,
                );
                draft = selfAssessmentDraftForUser(legacy.draft, actorId);
            }
        } catch (err) {
            if (err?.code !== 'P2010' && err?.code !== '42P01') {
                console.warn('Legacy user self-assessment read skipped:', err?.message || err);
            }
        }
        row = await prisma.userSelfAssessmentStore.create({
            data: { userId: actorId, assessments, draft },
        });
    }
    let assessments = filterSelfAssessmentsForUser(row.assessments, actorId);
    const draft = selfAssessmentDraftForUser(row.draft, actorId);
    const storedLen = Array.isArray(row.assessments) ? row.assessments.length : 0;
    if (assessments.length !== storedLen || draft !== row.draft) {
        row = await prisma.userSelfAssessmentStore.update({
            where: { userId: actorId },
            data: {
                assessments: stampSelfAssessmentsForUser(assessments, actorId),
                draft,
            },
        });
        assessments = filterSelfAssessmentsForUser(row.assessments, actorId);
    }
    return { userId: actorId, assessments, draft, row };
}

/** Org-wide visibility for audit programs. */
function buildOrgSubtreeProgramVisibilityOr(subtreeIds) {
    if (!subtreeIds.length) return [{ userId: -1 }];
    return [
        { userId: { in: subtreeIds } },
        { leadAuditorId: { in: subtreeIds } },
        { auditors: { some: { id: { in: subtreeIds } } } },
        { user: { is: { creatorId: { in: subtreeIds } } } },
        { user: { is: { id: { in: subtreeIds } } } }
    ];
}

/** Org-wide visibility for audit plans (includes linked programs). */
function buildOrgSubtreePlanVisibilityOr(subtreeIds) {
    if (!subtreeIds.length) return [{ userId: -1 }];
    return [
        ...buildOrgSubtreeProgramVisibilityOr(subtreeIds),
        { auditProgram: { is: { userId: { in: subtreeIds } } } },
        { auditProgram: { is: { leadAuditorId: { in: subtreeIds } } } },
        { auditProgram: { is: { auditors: { some: { id: { in: subtreeIds } } } } } }
    ];
}

/** Programs visible to a user through direct ownership or auditor assignment only. */
function buildAssignedAuditProgramVisibilityOr(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [{ userId: -1 }];
    return [
        { userId: id },
        { leadAuditorId: id },
        { auditors: { some: { id } } },
    ];
}

/** Plans visible through direct assignment or via an assigned audit program. */
function buildAssignedAuditPlanVisibilityOr(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [{ userId: -1 }];
    return [
        { userId: id },
        { leadAuditorId: id },
        { auditors: { some: { id } } },
        { auditProgram: { is: { userId: id } } },
        { auditProgram: { is: { leadAuditorId: id } } },
        { auditProgram: { is: { auditors: { some: { id } } } } },
    ];
}

/** Org admins / account owners see the full org audit catalog; invited teammates see assignments only. */
async function actorHasFullOrgAuditVisibility(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return false;
    const actor = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
    });
    if (normalizeUserRole(actor?.role) === 'superadmin') return true;
    return actorCanManageOrgUsers(id);
}


/** Trial removed — all non-superadmin users have full access without expiration checks. */
const checkTrialExpiration = async (_req, _res, next) => {
    next();
};

const TRIAL_GAP_ANALYSIS_LIMIT = 3;
const TRIAL_SELF_ASSESSMENT_LIMIT = 3;
const TRIAL_AUDIT_PROGRAM_LIMIT = 1;

async function loadUserSubscriptionFlags(userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionStatus: true, role: true },
    });
}

function userRequiresTrialLimits(user) {
    if (!user) return false;
    if (user.role === 'superadmin') return false;
    return user.subscriptionStatus !== 'active';
}

function trialLimitResponse(resource, limit) {
    const labels = {
        gapAnalysis: 'gap analyses',
        selfAssessment: 'self assessments',
        auditProgram: 'audit programs',
    };
    const label = labels[resource] || 'items';
    return {
        error: 'TrialLimitExceeded',
        resource,
        limit,
        message: `You have reached the free trial limit of ${limit} ${label}. Please upgrade your plan to create more.`,
    };
}

async function countOrgAuditPrograms(actorId) {
    const orgRootId = await resolveActorOrgRootId(actorId);
    const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
    return prisma.auditProgram.count({
        where: { OR: buildOrgSubtreeProgramVisibilityOr(subtreeIds) },
    });
}

async function countOrgGapAnalyses(actorId) {
    const orgRootId = await resolveActorOrgRootId(actorId);
    const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
    let total = 0;
    for (const uid of subtreeIds) {
        const { analyses } = await ensureUserGapAnalysisStore(uid);
        total += analyses.length;
    }
    return total;
}

async function countOrgSelfAssessments(actorId) {
    const orgRootId = await resolveActorOrgRootId(actorId);
    const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
    let total = 0;
    for (const uid of subtreeIds) {
        const { assessments } = await ensureUserSelfAssessmentStore(uid);
        total += assessments.length;
    }
    return total;
}

async function rejectIfTrialLimitExceeded(_actorId, _resource, _projectedCount) {
    return null;
}

export {
    ORG_ROOT_WALK_MAX_DEPTH,
    ORG_LOOKUP_CACHE_TTL_MS,
    orgRootIdCache,
    orgSubtreeIdsCache,
    orgMemberIdsCache,
    invalidateOrgLookupCaches,
    getOrgRootUserId,
    collectOrgSubtreeUserIds,
    collectOrgMemberUserIds,
    actorCanAccessTargetUser,
    actorInSameOrgAs,
    actorCanViewUserBillingStatus,
    actorIsAuditee,
    getAuditeeAssignedSiteIds,
    auditeeCanAccessSiteId,
    rejectIfAuditee,
    actorCanAccessAuditProgram,
    actorIsFindingAssignee,
    actorCanAccessAuditPlan,
    findUserByEmail,
    sendFindingAssignmentEmail,
    resolveActorOrgRootId,
    actorIsInOrgSubtree,
    actorCanReadOrgAssessmentStore,
    USER_ASSIGNABLE_ROLES,
    normalizeUserRole,
    actorCanManageOrgUsers,
    PROTECTED_COMPANY_OWNER_MESSAGE,
    isProtectedCompanyOwnerUserId,
    assertActorMayModifyProtectedCompanyOwner,
    userRowHasOrgAdminPrivileges,
    countActiveOrgAdministrators,
    LAST_ACTIVE_ADMIN_MESSAGE,
    actorCanInviteOrgUser,
    actorIsLeadAuditor,
    actorCanInviteAuditee,
    resolveOrgCompanyOwnerUserIds,
    siteIdsInActorOrg,
    actorCanAssignAuditeeToSite,
    actorCanAssignAuditeeToAllSites,
    assertActorCanManageSite,
    assertActorCanManageDepartment,
    assertDepartmentCreateBodySiteId,
    DEPARTMENT_CREATE_ALLOWED_BODY_KEYS,
    orgAuditorUserIdSet,
    parsePositiveIntIds,
    assertOrgAuditorUserIds,
    assertOrgSiteDepartments,
    validateAuditProgramAssignments,
    companyAuditorUserIdSet,
    assertCompanyAuditorUserIds,
    resolveAuditProgramCompanyId,
    validateAuditPlanAuditorAssignments,
    siteUserIsAuditee,
    parseAuditeeSiteIds,
    assignAuditeeToSites,
    formatAuditeeSiteLabels,
    clearLegacySiteUserIds,
    defaultAuditeeNamesFromEmail,
    actorCanManageAuditee,
    actorCanWriteSelfAssessmentStore,
    actorCanWriteOrgAssessmentStore,
    mergeJsonRecordsById,
    migrateLegacyUserGapStores,
    migrateLegacyUserSelfAssessmentStores,
    gapAnalysisOwnerId,
    filterGapAnalysesForUser,
    stampGapAnalysesForUser,
    gapAnalysisDraftForUser,
    importOwnedGapAnalysesFromOrgStore,
    ensureUserGapAnalysisStore,
    selfAssessmentOwnerId,
    filterSelfAssessmentsForUser,
    stampSelfAssessmentsForUser,
    selfAssessmentDraftForUser,
    resolveAssessmentStoreOwnerId,
    importOwnedSelfAssessmentsFromOrgStore,
    ensureUserSelfAssessmentStore,
    buildOrgSubtreeProgramVisibilityOr,
    buildOrgSubtreePlanVisibilityOr,
    buildAssignedAuditProgramVisibilityOr,
    buildAssignedAuditPlanVisibilityOr,
    actorHasFullOrgAuditVisibility,
    checkTrialExpiration,
    TRIAL_GAP_ANALYSIS_LIMIT,
    TRIAL_SELF_ASSESSMENT_LIMIT,
    TRIAL_AUDIT_PROGRAM_LIMIT,
    loadUserSubscriptionFlags,
    userRequiresTrialLimits,
    trialLimitResponse,
    countOrgAuditPrograms,
    countOrgGapAnalyses,
    countOrgSelfAssessments,
    rejectIfTrialLimitExceeded,
};
