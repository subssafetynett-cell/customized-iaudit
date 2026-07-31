/**
 * Audit Findings inbox — ownership-scoped plan fetch for Assigned / Raised tabs.
 * Returns slim plan rows (heavy blobs stripped) so the client can extractFindings.
 *
 * Performance: never scan `auditData::text LIKE` (caused intermittent Coolify 504s).
 * Prefer denormalized email arrays; fall back to a bounded recent-plan sample only.
 */

import prisma, { pool } from '../prisma.js';
import { stripHeavyAuditListPayload } from '../textSanitize.js';

export const FINDINGS_INBOX_PLAN_SELECT = {
    id: true,
    executionId: true,
    auditType: true,
    auditName: true,
    date: true,
    location: true,
    createdAt: true,
    updatedAt: true,
    templateId: true,
    auditProgramId: true,
    userId: true,
    leadAuditorId: true,
    auditData: true,
    findingsData: true,
    auditProgram: {
        select: {
            siteId: true,
        },
    },
};

const EMAIL_INDEX_LOOKBACK_DAYS = 180;
const EMAIL_INDEX_SCAN_LIMIT = 80;
const INBOX_PLAN_TAKE = 100;
const EMAIL_LOOKUP_TIMEOUT_MS = 8_000;

/** Collect assignToEmail values nested in audit execution JSON. */
export function collectAssigneeEmailsFromAuditData(auditData) {
    const emails = new Set();
    if (auditData == null) return emails;

    let data = auditData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return emails;
        }
    }
    if (!data || typeof data !== 'object') return emails;

    const visit = (node) => {
        if (node == null) return;
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (typeof node !== 'object') return;
        if (typeof node.assignToEmail === 'string') {
            const normalized = node.assignToEmail.toLowerCase().trim();
            if (normalized) emails.add(normalized);
        }
        Object.values(node).forEach(visit);
    };
    visit(data);
    return emails;
}

/** Collect raisedByEmail values nested in audit execution JSON. */
export function collectRaisedByEmailsFromAuditData(auditData) {
    const emails = new Set();
    if (auditData == null) return emails;

    let data = auditData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return emails;
        }
    }
    if (!data || typeof data !== 'object') return emails;

    const visit = (node) => {
        if (node == null) return;
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (typeof node !== 'object') return;
        if (typeof node.raisedByEmail === 'string') {
            const normalized = node.raisedByEmail.toLowerCase().trim();
            if (normalized) emails.add(normalized);
        }
        Object.values(node).forEach(visit);
    };
    visit(data);
    return emails;
}

function withTimeout(promise, ms, label) {
    let timer;
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise((_, reject) => {
            timer = setTimeout(
                () => reject(new Error(`${label} timed out after ${ms}ms`)),
                ms,
            );
        }),
    ]);
}

/**
 * Persist denormalized finding emails so inbox lookups stay index-friendly.
 * Safe no-op if columns are not yet patched.
 */
export async function syncAuditPlanFindingEmails(planId, auditData) {
    const id = Number(planId);
    if (!Number.isInteger(id) || id < 1) return;
    const assignees = [...collectAssigneeEmailsFromAuditData(auditData)];
    const raised = [...collectRaisedByEmailsFromAuditData(auditData)];
    try {
        await pool.query(
            `UPDATE "AuditPlan"
             SET "assigneeEmails" = $1::text[],
                 "raisedByEmails" = $2::text[]
             WHERE id = $3`,
            [assignees, raised, id],
        );
    } catch (err) {
        // Column may not exist until bootstrap patch runs.
        if (!/assigneeEmails|raisedByEmails|42703/i.test(String(err?.message || err))) {
            console.warn('[FINDINGS-INBOX] sync emails failed:', err?.message || err);
        }
    }
}

/**
 * Resolve plan ids for an email field via denormalized arrays (preferred),
 * then a bounded recent-sample fallback — never a full-table text LIKE.
 * @param {'assignToEmail'|'raisedByEmail'} field
 */
async function scanPlanIdsByAuditDataEmailField(field, email, limit = EMAIL_INDEX_SCAN_LIMIT) {
    const safeEmail = String(email || '').toLowerCase().trim();
    if (!safeEmail) return [];

    const column = field === 'raisedByEmail' ? 'raisedByEmails' : 'assigneeEmails';

    try {
        const indexed = await withTimeout(
            pool.query(
                `SELECT id FROM "AuditPlan"
                 WHERE $1 = ANY("${column}")
                 ORDER BY "updatedAt" DESC
                 LIMIT $2`,
                [safeEmail, limit],
            ),
            EMAIL_LOOKUP_TIMEOUT_MS,
            `findings ${column} index lookup`,
        );
        const indexedIds = (indexed.rows || [])
            .map((row) => Number(row.id))
            .filter((id) => Number.isInteger(id) && id > 0);
        if (indexedIds.length > 0) return indexedIds;
    } catch (err) {
        console.warn(`[FINDINGS-INBOX] ${column} index lookup skipped:`, err?.message || err);
    }

    // Legacy fallback: sample recent plans only (updatedAt index), filter in memory.
    try {
        const sample = await withTimeout(
            pool.query(
                `SELECT id, "auditData" FROM "AuditPlan"
                 WHERE "auditData" IS NOT NULL
                   AND "updatedAt" > NOW() - ($1::int * INTERVAL '1 day')
                 ORDER BY "updatedAt" DESC
                 LIMIT $2`,
                [EMAIL_INDEX_LOOKBACK_DAYS, limit],
            ),
            EMAIL_LOOKUP_TIMEOUT_MS,
            `findings ${field} sample fallback`,
        );
        const collect =
            field === 'raisedByEmail'
                ? collectRaisedByEmailsFromAuditData
                : collectAssigneeEmailsFromAuditData;
        return (sample.rows || [])
            .filter((row) => collect(row.auditData).has(safeEmail))
            .map((row) => Number(row.id))
            .filter((id) => Number.isInteger(id) && id > 0);
    } catch (err) {
        console.warn(`[FINDINGS-INBOX] ${field} sample fallback skipped:`, err?.message || err);
        return [];
    }
}

/**
 * @param {object} deps - visibility helpers from index.js
 * @param {number} actorId
 * @param {'assigned'|'raised'|'visible'} ownership
 */
export async function loadFindingsInboxPlans(deps, actorId, ownership) {
    const {
        actorIsAuditee,
        getAuditeeAssignedSiteIds,
        actorHasFullOrgAuditVisibility,
        resolveActorOrgRootId,
        collectOrgSubtreeUserIds,
        buildOrgSubtreePlanVisibilityOr,
        buildAssignedAuditPlanVisibilityOr,
    } = deps;

    const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { email: true },
    });
    if (!actor?.email) return [];

    const actorEmail = actor.email.toLowerCase().trim();
    const isAuditee = await actorIsAuditee(actorId);
    const auditeeSiteIds = isAuditee ? await getAuditeeAssignedSiteIds(actorId) : null;
    const ownsRaised = ownership === 'raised';
    const ownsVisible = ownership === 'visible';

    const [ncAssigneeRows, ncCreatedRows, assignScanIds, raisedScanIds, auditorPlanIds] =
        await Promise.all([
            prisma.nonconformance.findMany({
                where: { assigneeId: actorId },
                select: { auditPlanId: true },
                distinct: ['auditPlanId'],
                take: 200,
            }),
            prisma.nonconformance.findMany({
                where: { createdById: actorId },
                select: { auditPlanId: true },
                distinct: ['auditPlanId'],
                take: 200,
            }),
            scanPlanIdsByAuditDataEmailField('assignToEmail', actorEmail, EMAIL_INDEX_SCAN_LIMIT),
            scanPlanIdsByAuditDataEmailField('raisedByEmail', actorEmail, EMAIL_INDEX_SCAN_LIMIT),
            prisma.auditPlan.findMany({
                where: {
                    auditData: { not: null },
                    OR: [
                        { userId: actorId },
                        { leadAuditorId: actorId },
                        { auditors: { some: { id: actorId } } },
                    ],
                },
                select: { id: true },
                orderBy: { updatedAt: 'desc' },
                take: 120,
            }),
        ]);

    const ncAssigneeIds = ncAssigneeRows
        .map((row) => Number(row.auditPlanId))
        .filter((id) => Number.isInteger(id) && id > 0);
    const ncCreatedIds = ncCreatedRows
        .map((row) => Number(row.auditPlanId))
        .filter((id) => Number.isInteger(id) && id > 0);
    const rolePlanIds = (Array.isArray(auditorPlanIds) ? auditorPlanIds : [])
        .map((row) => Number(row.id))
        .filter((id) => Number.isInteger(id) && id > 0);

    let hintPlanIds;
    if (ownsVisible) {
        hintPlanIds = [
            ...new Set([
                ...ncAssigneeIds,
                ...ncCreatedIds,
                ...assignScanIds,
                ...raisedScanIds,
                ...rolePlanIds,
            ]),
        ];
    } else if (ownsRaised) {
        hintPlanIds = [...new Set([...ncCreatedIds, ...raisedScanIds, ...rolePlanIds])];
    } else {
        hintPlanIds = [...new Set([...ncAssigneeIds, ...assignScanIds])];
    }

    let visibilityWhere = { auditData: { not: null } };
    if (isAuditee && auditeeSiteIds) {
        visibilityWhere = {
            auditData: { not: null },
            OR: [
                {
                    auditProgram: {
                        is: auditeeSiteIds.length > 0
                            ? { siteId: { in: auditeeSiteIds } }
                            : { siteId: -1 },
                    },
                },
                ...(hintPlanIds.length ? [{ id: { in: hintPlanIds } }] : []),
            ],
        };
    } else if (await actorHasFullOrgAuditVisibility(actorId)) {
        const orgRootId = await resolveActorOrgRootId(actorId);
        const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
        visibilityWhere = {
            auditData: { not: null },
            OR: [
                ...buildOrgSubtreePlanVisibilityOr(subtreeIds),
                ...(hintPlanIds.length ? [{ id: { in: hintPlanIds } }] : []),
            ],
        };
    } else {
        visibilityWhere = {
            auditData: { not: null },
            OR: [
                ...buildAssignedAuditPlanVisibilityOr(actorId),
                ...(hintPlanIds.length ? [{ id: { in: hintPlanIds } }] : []),
            ],
        };
    }

    // Prefer hint ids when present to shrink the scan window further.
    if (hintPlanIds.length > 0 && ownsRaised) {
        visibilityWhere = {
            AND: [
                visibilityWhere,
                {
                    OR: [
                        { id: { in: hintPlanIds } },
                        { userId: actorId },
                        { leadAuditorId: actorId },
                        { auditors: { some: { id: actorId } } },
                    ],
                },
            ],
        };
    } else if (hintPlanIds.length > 0 && !ownsVisible) {
        // Assigned tab: only hint plans (NC + email index) — avoid org-wide fat scans.
        visibilityWhere = {
            AND: [visibilityWhere, { id: { in: hintPlanIds } }],
        };
    }

    const plans = await withTimeout(
        prisma.auditPlan.findMany({
            where: visibilityWhere,
            select: FINDINGS_INBOX_PLAN_SELECT,
            orderBy: { updatedAt: 'desc' },
            take: INBOX_PLAN_TAKE,
        }),
        EMAIL_LOOKUP_TIMEOUT_MS + 4_000,
        'findings inbox plan load',
    ).catch((err) => {
        console.warn('[FINDINGS-INBOX] plan load failed:', err?.message || err);
        return [];
    });

    const filtered = plans.filter((plan) => {
        const planId = Number(plan.id);
        if (ownsVisible) {
            if (isAuditee && auditeeSiteIds) {
                if (hintPlanIds.includes(planId)) return true;
                const siteId = plan.auditProgram?.siteId;
                return siteId != null && auditeeSiteIds.includes(Number(siteId));
            }
            return true;
        }
        if (ownsRaised) {
            const raised = collectRaisedByEmailsFromAuditData(plan.auditData);
            if (raised.has(actorEmail)) return true;
            if (hintPlanIds.includes(planId)) return true;
            // Lead/owner may have raised findings without email stamped yet
            if (Number(plan.userId) === actorId || Number(plan.leadAuditorId) === actorId) {
                return true;
            }
            return false;
        }

        if (!collectAssigneeEmailsFromAuditData(plan.auditData).has(actorEmail)) {
            if (!hintPlanIds.includes(planId)) return false;
        }
        if (isAuditee && auditeeSiteIds) {
            if (hintPlanIds.includes(planId)) return true;
            const siteId = plan.auditProgram?.siteId;
            return siteId != null && auditeeSiteIds.includes(Number(siteId));
        }
        return true;
    });

    return filtered.map((plan) => ({
        ...plan,
        auditData: stripHeavyAuditListPayload(plan.auditData),
        findingsData: stripHeavyAuditListPayload(plan.findingsData),
    }));
}
