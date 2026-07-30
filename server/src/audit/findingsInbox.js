/**
 * Audit Findings inbox — ownership-scoped plan fetch for Assigned / Raised tabs.
 * Returns slim plan rows (heavy blobs stripped) so the client can extractFindings.
 */

import prisma from '../prisma.js';
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

function escapeLikeLiteral(email) {
    return String(email || '').replace(/"/g, '').replace(/%/g, '').replace(/_/g, '');
}

/**
 * Scan AuditPlan.auditData JSON text for an email field (bounded, recent plans).
 * @param {'assignToEmail'|'raisedByEmail'} field
 */
async function scanPlanIdsByAuditDataEmailField(field, email, limit = 150) {
    const safeEmail = escapeLikeLiteral(email);
    if (!safeEmail) return [];
    const likePattern = `%"${field}":"${safeEmail}"%`;
    try {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT id FROM "AuditPlan"
             WHERE "auditData" IS NOT NULL
               AND "updatedAt" > NOW() - INTERVAL '3 years'
               AND LOWER("auditData"::text) LIKE LOWER($1)
             ORDER BY "updatedAt" DESC
             LIMIT $2`,
            likePattern,
            limit,
        );
        return (Array.isArray(rows) ? rows : [])
            .map((row) => Number(row.id))
            .filter((id) => Number.isInteger(id) && id > 0);
    } catch (err) {
        console.warn(`[FINDINGS-INBOX] ${field} scan skipped:`, err?.message || err);
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
            scanPlanIdsByAuditDataEmailField('assignToEmail', actorEmail, 150),
            scanPlanIdsByAuditDataEmailField('raisedByEmail', actorEmail, 150),
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
    }

    const plans = await prisma.auditPlan.findMany({
        where: visibilityWhere,
        select: FINDINGS_INBOX_PLAN_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: 200,
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
