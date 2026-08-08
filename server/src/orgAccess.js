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
 * Also expands via company ownership and audit-program collaboration so broken
 * creatorId links do not hide teammates' companies / sites / departments / users.
 */
async function collectOrgMemberUserIds(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [];

    const cached = orgMemberIdsCache.get(id);
    if (cached && cached.expiresAt > Date.now() && Array.isArray(cached.ids) && cached.ids.length > 0) {
        return cached.ids;
    }

    const idSet = new Set();

    const addUserAndOrgTree = async (userId) => {
        const uid = Number(userId);
        if (!Number.isInteger(uid) || uid < 1 || idSet.has(uid)) return;
        idSet.add(uid);
        const root = (await getOrgRootUserId(uid)) ?? uid;
        for (const n of await collectOrgSubtreeUserIds(root)) {
            idSet.add(n);
        }
    };

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
                await addUserAndOrgTree(company.userId);
            }
        } catch (err) {
            console.warn('[orgAccess] company-owner org expand failed:', err?.message || err);
        }
    }

    // Expand through audit-program collaboration (covers invitees with broken creatorId
    // who still appear as lead/team auditor or program owner alongside the company org).
    try {
        const programs = await prisma.auditProgram.findMany({
            where: {
                OR: [
                    { userId: id },
                    { leadAuditorId: id },
                    { auditors: { some: { id } } },
                    { userId: { in: [...idSet] } },
                    { leadAuditorId: { in: [...idSet] } },
                    { auditors: { some: { id: { in: [...idSet] } } } },
                    { site: { company: { userId: { in: [...idSet] } } } },
                ],
            },
            select: {
                userId: true,
                leadAuditorId: true,
                auditors: { select: { id: true } },
                site: { select: { company: { select: { userId: true } } } },
            },
        });
        for (const program of programs) {
            if (program.userId != null) await addUserAndOrgTree(program.userId);
            if (program.leadAuditorId != null) await addUserAndOrgTree(program.leadAuditorId);
            if (program.site?.company?.userId != null) {
                await addUserAndOrgTree(program.site.company.userId);
            }
            for (const auditor of program.auditors || []) {
                await addUserAndOrgTree(auditor.id);
            }
        }
    } catch (err) {
        console.warn('[orgAccess] audit-program org expand failed:', err?.message || err);
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

/**
 * Non-auditee org members share one catalog: any teammate in the same org tree
 * (or expanded membership set) is visible for company/site/user scoped operations.
 */
async function actorCanAccessTargetUser(actorId, targetUserId) {
    const a = Number(actorId);
    const t = Number(targetUserId);
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(t) || t < 1) return false;
    if (a === t) return true;
    const actor = await prisma.user.findUnique({
        where: { id: a },
        select: { role: true },
    });
    if (!actor) return false;
    const role = normalizeUserRole(actor.role);
    if (role === 'superadmin') return true;
    if (role === 'auditee') return false;

    if (await actorInSameOrgAs(a, t)) return true;

    const members = await collectOrgMemberUserIds(a);
    return members.includes(t);
}

/** True when actor may read/mutate a company owned by companyOwnerUserId. */
async function actorCanAccessOrgCompanyOwner(actorId, companyOwnerUserId) {
    const a = Number(actorId);
    const owner = Number(companyOwnerUserId);
    if (!Number.isInteger(a) || a < 1 || !Number.isInteger(owner) || owner < 1) return false;
    if (a === owner) return true;
    const actor = await prisma.user.findUnique({
        where: { id: a },
        select: { role: true },
    });
    if (!actor) return false;
    if (normalizeUserRole(actor.role) === 'superadmin') return true;
    if (normalizeUserRole(actor.role) === 'auditee') return false;
    // Same creatorId org tree (User A owns company; User B invited by A).
    if (await actorInSameOrgAs(a, owner)) return true;
    const ownerIds = await resolveOrgCompanyOwnerUserIds(a);
    return ownerIds.includes(owner);
}

/**
 * Re-link invitees with missing/broken creatorId so previously created A→B (and B→C)
 * accounts share one org catalog. Never merges two company-owning account roots.
 * @returns {Promise<number>} number of users re-linked
 */
async function repairOrgCreatorLinks() {
    let repaired = 0;

    const users = await prisma.user.findMany({
        select: {
            id: true,
            role: true,
            creatorId: true,
            createdAt: true,
            emailVerifiedAt: true,
        },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const companyOwnerRows = await prisma.company.findMany({
        where: { userId: { not: null } },
        select: { userId: true },
    });
    const companyOwners = new Set(
        normalizePositiveIntIds(companyOwnerRows.map((c) => c.userId)),
    );

    const walkRoot = (userId) => {
        let cur = Number(userId);
        const seen = new Set();
        while (Number.isInteger(cur) && cur > 0 && !seen.has(cur)) {
            seen.add(cur);
            const row = byId.get(cur);
            if (!row || row.creatorId == null) return cur;
            cur = Number(row.creatorId);
        }
        return Number(userId);
    };

    const linkUserToRoot = async (userId, rootId) => {
        const uid = Number(userId);
        const root = Number(rootId);
        if (!Number.isInteger(uid) || uid < 1 || !Number.isInteger(root) || root < 1) return false;
        if (uid === root) return false;
        const row = byId.get(uid);
        if (!row) return false;
        if (normalizeUserRole(row.role) === 'superadmin') return false;
        // Never re-parent a user who already owns a registered company (their own org root).
        if (companyOwners.has(uid)) return false;
        if (row.creatorId != null && Number(row.creatorId) === root) return false;
        await prisma.user.update({
            where: { id: uid },
            data: { creatorId: root },
        });
        row.creatorId = root;
        repaired += 1;
        return true;
    };

    // 1) Audit-program collaboration: attach orphan teammates under the program org root.
    try {
        const programs = await prisma.auditProgram.findMany({
            select: {
                userId: true,
                leadAuditorId: true,
                auditors: { select: { id: true } },
                site: { select: { company: { select: { userId: true } } } },
            },
        });
        for (const program of programs) {
            const ownerCandidate = program.site?.company?.userId ?? program.userId;
            if (ownerCandidate == null) continue;
            const root = walkRoot(ownerCandidate);
            const related = new Set();
            if (program.userId != null) related.add(Number(program.userId));
            if (program.leadAuditorId != null) related.add(Number(program.leadAuditorId));
            for (const auditor of program.auditors || []) {
                related.add(Number(auditor.id));
            }
            for (const uid of related) {
                const row = byId.get(uid);
                if (!row || row.creatorId != null) continue;
                await linkUserToRoot(uid, root);
            }
        }
    } catch (err) {
        console.warn('[orgAccess] repairOrgCreatorLinks audit expand failed:', err?.message || err);
    }

    // 2) Orphans (no creatorId, no owned company): attach when org root is unambiguous.
    const companyRoots = users.filter(
        (u) =>
            u.creatorId == null &&
            companyOwners.has(u.id) &&
            normalizeUserRole(u.role) !== 'superadmin',
    );

    const orphans = users.filter(
        (u) =>
            u.creatorId == null &&
            !companyOwners.has(u.id) &&
            normalizeUserRole(u.role) !== 'superadmin',
    );

    for (const orphan of orphans) {
        if (orphan.creatorId != null) continue;

        let parentId = null;
        if (companyRoots.length === 1) {
            parentId = companyRoots[0].id;
        } else {
            const createdMs = orphan.createdAt ? new Date(orphan.createdAt).getTime() : 0;
            const verifiedMs = orphan.emailVerifiedAt
                ? new Date(orphan.emailVerifiedAt).getTime()
                : 0;
            // Invitees are created first, then verify later; public signup verifies in the same request.
            const looksLikeInvitee =
                (verifiedMs > 0 && createdMs > 0 && verifiedMs - createdMs >= 30_000) ||
                normalizeUserRole(orphan.role) !== 'admin';
            if (looksLikeInvitee && createdMs > 0) {
                const priorRoots = companyRoots.filter(
                    (r) => new Date(r.createdAt).getTime() <= createdMs,
                );
                if (priorRoots.length === 1) {
                    parentId = priorRoots[0].id;
                }
            }
        }

        if (parentId != null) {
            await linkUserToRoot(orphan.id, parentId);
        }
    }

    if (repaired > 0) {
        invalidateOrgLookupCaches();
    }
    return repaired;
}

/**
 * Best-effort link for a single orphan invitee (e.g. on login) without a full table scan
 * when the user already has a creatorId or owns a company.
 */
async function ensureOrphanUserOrgLink(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) return false;
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            role: true,
            creatorId: true,
            createdAt: true,
            emailVerifiedAt: true,
        },
    });
    if (!user || user.creatorId != null) return false;
    if (normalizeUserRole(user.role) === 'superadmin') return false;

    const ownsCompany = await prisma.company.findFirst({
        where: { userId: id },
        select: { id: true },
    });
    if (ownsCompany) return false;

    // Prefer attaching via a shared audit program.
    const program = await prisma.auditProgram.findFirst({
        where: {
            OR: [
                { userId: id },
                { leadAuditorId: id },
                { auditors: { some: { id } } },
            ],
        },
        select: {
            userId: true,
            site: { select: { company: { select: { userId: true } } } },
        },
    });
    if (program) {
        const ownerCandidate = program.site?.company?.userId ?? program.userId;
        if (ownerCandidate != null && Number(ownerCandidate) !== id) {
            const root = (await getOrgRootUserId(ownerCandidate)) ?? Number(ownerCandidate);
            if (root !== id) {
                await prisma.user.update({ where: { id }, data: { creatorId: root } });
                invalidateOrgLookupCaches();
                return true;
            }
        }
    }

    const companyRoots = await prisma.user.findMany({
        where: {
            creatorId: null,
            role: { not: 'superadmin' },
            companies: { some: {} },
        },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });

    let parentId = null;
    if (companyRoots.length === 1) {
        parentId = companyRoots[0].id;
    } else {
        const createdMs = user.createdAt ? new Date(user.createdAt).getTime() : 0;
        const verifiedMs = user.emailVerifiedAt ? new Date(user.emailVerifiedAt).getTime() : 0;
        const looksLikeInvitee =
            (verifiedMs > 0 && createdMs > 0 && verifiedMs - createdMs >= 30_000) ||
            normalizeUserRole(user.role) !== 'admin';
        if (looksLikeInvitee && createdMs > 0) {
            const prior = companyRoots.filter((r) => new Date(r.createdAt).getTime() <= createdMs);
            if (prior.length === 1) parentId = prior[0].id;
        }
    }

    if (parentId == null || parentId === id) return false;
    await prisma.user.update({ where: { id }, data: { creatorId: parentId } });
    invalidateOrgLookupCaches();
    return true;
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

    // Any non-auditee org teammate may use programs on sites in their shared company catalog
    // (User A creates sites; User B invited by A can create plans / audits on those sites).
    if (program.siteId != null && (await actorCanAssignAuditeeToSite(actorIdNum, program.siteId))) {
        return true;
    }
    // Fallback when siteId missing but company is loaded on the program include.
    if (program.site?.companyId != null || program.site?.id != null) {
        const siteIdForAccess = program.site?.id ?? program.siteId;
        if (siteIdForAccess != null && (await actorCanAssignAuditeeToSite(actorIdNum, siteIdForAccess))) {
            return true;
        }
        if (program.site?.companyId != null) {
            const company = await prisma.company.findUnique({
                where: { id: Number(program.site.companyId) },
                select: { userId: true },
            });
            if (
                company?.userId != null
                && (
                    (await actorInSameOrgAs(actorIdNum, company.userId))
                    || (await actorCanAccessOrgCompanyOwner(actorIdNum, company.userId))
                )
            ) {
                return true;
            }
        }
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
                if (
                    company?.userId != null
                    && (
                        (await actorInSameOrgAs(actorIdNum, company.userId))
                        || (await actorCanAccessOrgCompanyOwner(actorIdNum, company.userId))
                    )
                ) {
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

    // Shared org sites: invitees may open / execute plans for programs on User A's sites.
    const planSiteId =
        plan.auditProgram?.siteId
        ?? plan.siteId
        ?? null;
    if (planSiteId != null && (await actorCanAssignAuditeeToSite(actorIdNum, planSiteId))) {
        return true;
    }

    // Anyone who can use the parent audit program may view/update its plans (create + save).
    if (plan.auditProgram && (await actorCanAccessAuditProgram(actorIdNum, plan.auditProgram))) {
        return true;
    }

    if (await actorHasFullOrgAuditVisibility(actorIdNum)) {
        if (plan.userId != null && (await actorCanAccessTargetUser(actorIdNum, plan.userId))) return true;
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

const USER_ASSIGNABLE_ROLES = new Set(['admin', 'auditor', 'lead_auditor', 'other', 'auditee', 'company_admin']);

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
    if (r === 'superadmin' || r === 'admin' || r === 'company_admin') return true;
    // Organization root (no creator) may manage users in their org; auditees never may.
    if (actor.creatorId == null && r !== 'auditee') return true;
    return false;
}

/**
 * Users directory edit rights: org admins plus lead auditors (role or assigned as lead
 * on a program/plan) may edit every org user on the Users page.
 */
async function actorCanEditOrgUsers(actorId) {
    if (await actorCanManageOrgUsers(actorId)) return true;
    const actor = await prisma.user.findUnique({
        where: { id: Number(actorId) },
        select: { role: true, isActive: true },
    });
    if (!actor || actor.isActive === false) return false;
    if (normalizeUserRole(actor.role) === 'lead_auditor') return true;
    return actorIsLeadAuditor(actorId);
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
    if (r === 'superadmin' || r === 'admin' || r === 'company_admin') return true;
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
 *
 * Legacy live orgs often have broken creatorId chains (invitee is an orphan root, or the
 * company is owned by a peer admin). Bridge those via ancestors, audit participation, and
 * same-name companies that already belong to a reachable teammate's richer org tree.
 */
async function resolveOrgCompanyOwnerUserIds(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [];

    const idSet = new Set(await collectOrgMemberUserIds(id));
    idSet.add(id);

    // Explicit ancestor walk (covers invitee → admin → company owner).
    let cursor = id;
    for (let depth = 0; depth < ORG_ROOT_WALK_MAX_DEPTH; depth += 1) {
        const row = await prisma.user.findUnique({
            where: { id: cursor },
            select: { creatorId: true },
        });
        const parentId = row?.creatorId != null ? Number(row.creatorId) : null;
        if (!Number.isInteger(parentId) || parentId < 1) break;
        if (idSet.has(parentId)) break;
        idSet.add(parentId);
        cursor = parentId;
    }

    const mergeOwnerTree = async (ownerId) => {
        const oid = Number(ownerId);
        if (!Number.isInteger(oid) || oid < 1) return;
        idSet.add(oid);
        const root = (await getOrgRootUserId(oid)) ?? oid;
        for (const n of await collectOrgSubtreeUserIds(root)) {
            idSet.add(n);
        }
    };

    // Companies already owned by anyone currently in the set.
    const owned = await prisma.company.findMany({
        where: { userId: { in: [...idSet] } },
        select: {
            id: true,
            name: true,
            userId: true,
            _count: { select: { sites: true } },
        },
    });
    for (const company of owned) {
        await mergeOwnerTree(company.userId);
    }

    // Legacy bridge: companies reached through audit programs / plans the actor (or teammates) touch.
    const memberList = [...idSet];
    if (memberList.length > 0) {
        try {
            const programs = await prisma.auditProgram.findMany({
                where: {
                    OR: [
                        { userId: { in: memberList } },
                        { leadAuditorId: { in: memberList } },
                        { auditors: { some: { id: { in: memberList } } } },
                    ],
                },
                select: {
                    site: { select: { company: { select: { userId: true } } } },
                },
                take: 200,
            });
            for (const program of programs) {
                await mergeOwnerTree(program.site?.company?.userId);
            }

            const plans = await prisma.auditPlan.findMany({
                where: {
                    OR: [
                        { userId: { in: memberList } },
                        { leadAuditorId: { in: memberList } },
                        { auditors: { some: { id: { in: memberList } } } },
                    ],
                },
                select: {
                    auditProgram: {
                        select: {
                            site: { select: { company: { select: { userId: true } } } },
                        },
                    },
                },
                take: 200,
            });
            for (const plan of plans) {
                await mergeOwnerTree(plan.auditProgram?.site?.company?.userId);
            }
        } catch (err) {
            console.warn('[orgAccess] audit-linked company bridge failed:', err?.message || err);
        }
    }

    // Legacy bridge: invitee sees an empty duplicate company while the real sites live on
    // another company with the same name owned by a reachable org user / sibling tree.
    const emptyNames = owned
        .filter((c) => (c._count?.sites ?? 0) === 0 && c.name)
        .map((c) => String(c.name).trim())
        .filter(Boolean);
    if (emptyNames.length > 0) {
        try {
            const richer = await prisma.company.findMany({
                where: {
                    OR: emptyNames.map((name) => ({
                        name: { equals: name, mode: 'insensitive' },
                    })),
                    sites: { some: {} },
                },
                select: { userId: true, name: true },
                take: 50,
            });
            for (const company of richer) {
                const ownerId = Number(company.userId);
                if (!Number.isInteger(ownerId) || ownerId < 1) continue;
                if (idSet.has(ownerId) || (await actorInSameOrgAs(id, ownerId))) {
                    await mergeOwnerTree(ownerId);
                    continue;
                }
                // Single-tenant style fallback: exactly one richer company with this name.
                const sameName = richer.filter(
                    (r) =>
                        String(r.name || '').trim().toLowerCase() ===
                        String(company.name || '').trim().toLowerCase(),
                );
                if (sameName.length === 1) {
                    await mergeOwnerTree(ownerId);
                }
            }
        } catch (err) {
            console.warn('[orgAccess] same-name company bridge failed:', err?.message || err);
        }
    }

    return [...idSet];
}

/**
 * Concrete Company row ids visible to the actor (owner match + audit-program company links).
 * Prefer this for site/department catalog queries so invitees always see the org's sites.
 */
async function resolveOrgVisibleCompanyIds(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [];

    const ownerUserIds = await resolveOrgCompanyOwnerUserIds(id);
    const idSet = new Set();

    if (ownerUserIds.length > 0) {
        const owned = await prisma.company.findMany({
            where: { userId: { in: ownerUserIds } },
            select: { id: true },
        });
        for (const row of owned) {
            const cid = Number(row.id);
            if (Number.isInteger(cid) && cid > 0) idSet.add(cid);
        }
    }

    // Also pull companies tied to audit programs that org members participate in
    // (covers odd ownership / null userId edge cases without leaking other tenants).
    if (ownerUserIds.length > 0) {
        try {
            const programs = await prisma.auditProgram.findMany({
                where: {
                    OR: [
                        { userId: { in: ownerUserIds } },
                        { leadAuditorId: { in: ownerUserIds } },
                        { auditors: { some: { id: { in: ownerUserIds } } } },
                    ],
                },
                select: { site: { select: { companyId: true } } },
            });
            for (const program of programs) {
                const cid = Number(program.site?.companyId);
                if (Number.isInteger(cid) && cid > 0) idSet.add(cid);
            }
        } catch (err) {
            console.warn('[orgAccess] resolveOrgVisibleCompanyIds program expand failed:', err?.message || err);
        }
    }

    return [...idSet];
}

async function siteIdsInActorOrg(actorId) {
    const companyIds = await resolveOrgVisibleCompanyIds(actorId);
    if (companyIds.length === 0) {
        // Fallback for older call sites / empty company id resolution.
        const ownerUserIds = await resolveOrgCompanyOwnerUserIds(actorId);
        const companies = await prisma.company.findMany({
            where: { userId: { in: ownerUserIds } },
            select: { sites: { select: { id: true } } },
        });
        return new Set(companies.flatMap((c) => c.sites.map((s) => s.id)));
    }
    const sites = await prisma.site.findMany({
        where: { companyId: { in: companyIds } },
        select: { id: true },
    });
    return new Set(sites.map((s) => s.id));
}

/**
 * True when actor may use a site for audits / programs / plans / auditee assignment.
 * Invitees (User B created by User A) must pass when the site's company is owned by
 * anyone in their shared creatorId org tree — not only when the bulk company catalog hits.
 */
async function actorCanAssignAuditeeToSite(actorId, siteId) {
    const parsed = Number.parseInt(String(siteId), 10);
    if (Number.isNaN(parsed) || parsed < 1) return false;
    const a = Number(actorId);
    if (!Number.isInteger(a) || a < 1) return false;

    const site = await prisma.site.findUnique({
        where: { id: parsed },
        select: {
            id: true,
            companyId: true,
            company: { select: { id: true, userId: true } },
        },
    });
    if (!site) return false;

    const actor = await prisma.user.findUnique({
        where: { id: a },
        select: { role: true },
    });
    if (!actor) return false;
    const role = normalizeUserRole(actor.role);
    if (role === 'superadmin') return true;
    if (role === 'auditee') {
        return auditeeCanAccessSiteId(a, parsed);
    }

    const ownerId = site.company?.userId != null ? Number(site.company.userId) : null;
    if (Number.isInteger(ownerId) && ownerId > 0) {
        if (ownerId === a) return true;
        // Primary rule for A→B: same organization tree via creatorId.
        if (await actorInSameOrgAs(a, ownerId)) return true;
        // Expanded membership (company / program collaboration links).
        if (await actorCanAccessOrgCompanyOwner(a, ownerId)) return true;
    }

    const allowed = await siteIdsInActorOrg(a);
    if (allowed.has(parsed)) return true;
    if (site.companyId != null && Number.isInteger(Number(site.companyId))) {
        const companyIds = await resolveOrgVisibleCompanyIds(a);
        if (companyIds.includes(Number(site.companyId))) return true;
    }
    return false;
}

/** Batch site-assignment check (one org lookup instead of N). */
async function actorCanAssignAuditeeToAllSites(actorId, siteIds) {
    const ids = (Array.isArray(siteIds) ? siteIds : [])
        .map((id) => Number.parseInt(String(id), 10))
        .filter((n) => Number.isInteger(n) && n >= 1);
    if (ids.length === 0) return false;
    // Per-site checks (same-org company owner) — avoid false negatives from catalog-only Sets.
    for (const id of ids) {
        if (!(await actorCanAssignAuditeeToSite(actorId, id))) return false;
    }
    return true;
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
    return new Set(users.map((u) => Number(u.id)));
}

/**
 * Users the actor may pick as lead/team auditor when creating programs/plans.
 * Union of: actor's org list (matches GET /users picker) + site company org + self.
 */
async function assignableAuditorUserIdSet(actorId, companyId = null) {
    const allowed = await orgAuditorUserIdSet(actorId);
    const parsedCompanyId = companyId != null ? Number.parseInt(String(companyId), 10) : null;
    if (Number.isInteger(parsedCompanyId) && parsedCompanyId > 0) {
        const companySet = await companyAuditorUserIdSet(parsedCompanyId);
        for (const id of companySet) allowed.add(Number(id));
    }
    const selfId = Number(actorId);
    if (Number.isInteger(selfId) && selfId > 0) {
        const me = await prisma.user.findUnique({
            where: { id: selfId },
            select: { id: true, role: true, isActive: true },
        });
        if (me && me.isActive !== false && normalizeUserRole(me.role) !== 'auditee') {
            allowed.add(Number(me.id));
        }
    }
    return allowed;
}

/**
 * Allow any auditor the UI can list for this actor (org catalog), plus company-org teammates.
 * Falls back to actorCanAccessTargetUser for edge cases (invitee / catalog skew).
 */
async function assertAssignableAuditorUserIds(
    actorId,
    userIds,
    { allowEmpty = true, companyId = null, grandfatherIds = [] } = {},
) {
    const normalized = parsePositiveIntIds(userIds);
    if (normalized.length === 0) {
        return allowEmpty
            ? { ok: true, ids: [] }
            : { ok: false, status: 400, error: 'Auditor user id is required' };
    }

    const allowed = await assignableAuditorUserIdSet(actorId, companyId);
    for (const id of parsePositiveIntIds(grandfatherIds)) {
        allowed.add(Number(id));
    }

    const rejected = [];
    for (const id of normalized) {
        if (allowed.has(id)) continue;
        // Same org visibility as the Users picker — accept if actor can see this teammate.
        if (await actorCanAccessTargetUser(actorId, id)) {
            const row = await prisma.user.findUnique({
                where: { id },
                select: { role: true, isActive: true },
            });
            if (row && row.isActive !== false && normalizeUserRole(row.role) !== 'auditee') {
                allowed.add(id);
                continue;
            }
        }
        rejected.push(id);
    }

    if (rejected.length > 0) {
        return {
            ok: false,
            status: 403,
            error: 'One or more selected auditors are not allowed for this organization',
        };
    }
    return { ok: true, ids: normalized };
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
    return assertAssignableAuditorUserIds(actorId, userIds, { allowEmpty, companyId: null });
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
        return {
            ok: false,
            status: 403,
            error: 'You do not have access to the selected site or its departments',
        };
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

    await ensureOrphanUserOrgLink(actorId).catch(() => {});

    if (!(await actorCanAssignAuditeeToSite(actorId, parsedSiteId))) {
        return {
            ok: false,
            status: 403,
            error: 'You do not have access to the selected site. Use a site from your organization (sites created by your admin or teammates).',
        };
    }

    const site = await prisma.site.findUnique({
        where: { id: parsedSiteId },
        select: { companyId: true },
    });
    const companyId = site?.companyId != null ? Number(site.companyId) : null;

    // Allow any auditor shown in the org user picker (actor org ∪ company org ∪ accessible teammates).
    let resolvedLead = null;
    if (leadAuditorId != null && leadAuditorId !== '') {
        const leadCheck = await assertAssignableAuditorUserIds(actorId, [leadAuditorId], {
            allowEmpty: false,
            companyId,
        });
        if (!leadCheck.ok) {
            return {
                ok: false,
                status: leadCheck.status || 403,
                error: leadCheck.error === 'Auditor user id is required'
                    ? 'Lead auditor is required'
                    : (leadCheck.error || 'Invalid lead auditor'),
            };
        }
        resolvedLead = leadCheck.ids[0] ?? null;
    }
    const auditorCheck = await assertAssignableAuditorUserIds(actorId, auditorIds ?? [], {
        allowEmpty: true,
        companyId,
    });
    if (!auditorCheck.ok) return auditorCheck;

    const deptCheck = await assertOrgSiteDepartments(actorId, parsedSiteId, scheduleData);
    if (!deptCheck.ok) return deptCheck;

    return {
        ok: true,
        siteId: parsedSiteId,
        leadAuditorId: resolvedLead,
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
    const memberIds = await collectOrgMemberUserIds(ownerRootId);
    const subtreeIds = memberIds.length > 0
        ? memberIds
        : await collectOrgSubtreeUserIds(ownerRootId);
    if (subtreeIds.length === 0) {
        return new Set();
    }
    const users = await prisma.user.findMany({
        where: {
            id: { in: subtreeIds },
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
    { allowEmpty = true, grandfatherIds = [], actorId = null } = {},
) {
    // When actorId is known, use the same allow-list as the Users picker (org ∪ company).
    if (actorId != null) {
        return assertAssignableAuditorUserIds(actorId, userIds, {
            allowEmpty,
            companyId,
            grandfatherIds,
        });
    }
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
    const hasCompany = Number.isInteger(parsedCompanyId) && parsedCompanyId > 0;

    // Company scope is preferred but not required — program/site access is enforced by the route.
    // Invitees saving plans on User A's sites must not fail solely on company-owner lookup skew.
    if (hasCompany) {
        const company = await prisma.company.findUnique({
            where: { id: parsedCompanyId },
            select: { userId: true },
        });
        if (company?.userId != null) {
            const ownerOk = await actorCanAccessOrgCompanyOwner(actorId, company.userId);
            if (!ownerOk) {
                // Still allow when the actor can see the selected auditors via org picker rules.
                console.warn(
                    '[orgAccess] plan auditor validate: company owner check soft-failed; using assignable auditor union',
                    { actorId, companyId: parsedCompanyId, ownerId: company.userId },
                );
            }
        }
    }

    const existingIds = parsePositiveIntIds(grandfatherIds);
    const companyScope = hasCompany ? parsedCompanyId : null;

    if (leadAuditorId != null && leadAuditorId !== '') {
        const leadCheck = await assertAssignableAuditorUserIds(
            actorId,
            [leadAuditorId],
            { allowEmpty: false, companyId: companyScope, grandfatherIds: existingIds },
        );
        if (!leadCheck.ok) return leadCheck;
    }
    const auditorCheck = await assertAssignableAuditorUserIds(actorId, auditorIds ?? [], {
        allowEmpty: true,
        companyId: companyScope,
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
    const raw = Array.isArray(row.analyses) ? row.analyses : [];
    const draft = gapAnalysisDraftForUser(row.draft, actorId);
    // Keep owned + unowned (legacy). Never permanently drop rows on GET.
    const keepable = raw.filter((a) => {
        const owner = gapAnalysisOwnerId(a);
        return owner === null || owner === actorId;
    });
    const needsStamp = keepable.some((a) => gapAnalysisOwnerId(a) === null);
    const analyses = stampGapAnalysesForUser(keepable, actorId);
    if (needsStamp) {
        const foreign = raw.filter((a) => {
            const owner = gapAnalysisOwnerId(a);
            return owner !== null && owner !== actorId;
        });
        row = await prisma.userGapAnalysisStore.update({
            where: { userId: actorId },
            data: {
                analyses: [...analyses, ...foreign],
                draft,
            },
        });
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
    const raw = Array.isArray(row.assessments) ? row.assessments : [];
    const draft = selfAssessmentDraftForUser(row.draft, actorId);
    // Keep owned + unowned (legacy). Never permanently drop rows on GET.
    const keepable = raw.filter((a) => {
        const owner = selfAssessmentOwnerId(a);
        return owner === null || owner === actorId;
    });
    const needsStamp = keepable.some((a) => selfAssessmentOwnerId(a) === null);
    const assessments = stampSelfAssessmentsForUser(keepable, actorId);
    if (needsStamp) {
        const foreign = raw.filter((a) => {
            const owner = selfAssessmentOwnerId(a);
            return owner !== null && owner !== actorId;
        });
        row = await prisma.userSelfAssessmentStore.update({
            where: { userId: actorId },
            data: {
                assessments: [...assessments, ...foreign],
                draft,
            },
        });
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
        { user: { is: { id: { in: subtreeIds } } } },
        // Programs on companies owned by anyone in the org tree (A's sites visible to B).
        { site: { is: { company: { is: { userId: { in: subtreeIds } } } } } },
    ];
}

/** Org-wide visibility for audit plans (includes linked programs).
 * Do NOT spread program-visibility clauses — AuditPlan has no top-level `site` relation.
 */
function buildOrgSubtreePlanVisibilityOr(subtreeIds) {
    if (!subtreeIds.length) return [{ userId: -1 }];
    return [
        { userId: { in: subtreeIds } },
        { leadAuditorId: { in: subtreeIds } },
        { auditors: { some: { id: { in: subtreeIds } } } },
        { user: { is: { creatorId: { in: subtreeIds } } } },
        { user: { is: { id: { in: subtreeIds } } } },
        { auditProgram: { is: { userId: { in: subtreeIds } } } },
        { auditProgram: { is: { leadAuditorId: { in: subtreeIds } } } },
        { auditProgram: { is: { auditors: { some: { id: { in: subtreeIds } } } } } },
        {
            auditProgram: {
                is: { site: { is: { company: { is: { userId: { in: subtreeIds } } } } } },
            },
        },
    ];
}

/** Programs on concrete company ids (shared catalog for invitees). */
function buildOrgCompanySiteProgramVisibilityOr(companyIds) {
    const ids = normalizePositiveIntIds(companyIds);
    if (!ids.length) return [];
    return [{ site: { is: { companyId: { in: ids } } } }];
}

/** Plans whose program sits on org-visible companies. */
function buildOrgCompanySitePlanVisibilityOr(companyIds) {
    const ids = normalizePositiveIntIds(companyIds);
    if (!ids.length) return [];
    return [
        { auditProgram: { is: { site: { is: { companyId: { in: ids } } } } } },
    ];
}

/** Programs visible to a user through ownership, assignment, or shared org sites. */
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

/**
 * Teammate (non-admin) catalog: assignments plus every program/plan on org-visible company sites
 * so User B can work on sites/departments created by User A.
 */
async function buildTeammateAuditProgramVisibilityOr(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [{ userId: -1 }];
    const companyIds = await resolveOrgVisibleCompanyIds(id);
    return [
        ...buildAssignedAuditProgramVisibilityOr(id),
        ...buildOrgCompanySiteProgramVisibilityOr(companyIds),
    ];
}

async function buildTeammateAuditPlanVisibilityOr(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return [{ userId: -1 }];
    const companyIds = await resolveOrgVisibleCompanyIds(id);
    return [
        ...buildAssignedAuditPlanVisibilityOr(id),
        ...buildOrgCompanySitePlanVisibilityOr(companyIds),
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
    actorCanAccessOrgCompanyOwner,
    repairOrgCreatorLinks,
    ensureOrphanUserOrgLink,
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
    actorCanEditOrgUsers,
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
    resolveOrgVisibleCompanyIds,
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
    buildTeammateAuditProgramVisibilityOr,
    buildTeammateAuditPlanVisibilityOr,
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
