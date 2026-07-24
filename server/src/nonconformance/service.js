import prisma from '../prisma.js';
import {
    NcNotificationTemplates,
    notifyUsers,
} from '../notifications/index.js';
import {
    activityMessageForReview,
    activityTypeForReview,
    createNcActivity,
} from './activity.js';
import {
    NC_ACTIVITY_TYPES,
    NC_DETAIL_INCLUDE,
    NC_RESPONSE_ALLOWED_STATUSES,
    NC_REVIEW_ALLOWED_STATUSES,
    NC_REVIEW_DECISIONS,
    NC_REVIEW_DECISION_VALUES,
    NC_SEVERITIES,
    NC_SEVERITY_VALUES,
    NC_STATUSES,
} from './constants.js';
import { findFindingOnPlan } from './findingLookup.js';

function userSummary(user) {
    if (!user) return null;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        name: name || user.email,
    };
}

function normalizeEvidenceFilenames(raw) {
    const list = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
          ? (() => {
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : raw ? [raw] : [];
                } catch {
                    return raw.trim() ? [raw.trim()] : [];
                }
            })()
          : [];
    return [
        ...new Set(
            list
                .map((item) => String(item ?? '').trim())
                .filter(Boolean)
                .map((name) => name.slice(0, 255)),
        ),
    ].slice(0, 50);
}

function normalizeRole(role) {
    return String(role || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

export function serializeNonconformanceResponse(row) {
    if (!row) return null;
    const evidence = Array.isArray(row.evidenceFilenames)
        ? row.evidenceFilenames
        : normalizeEvidenceFilenames(row.evidenceFilenames);
    return {
        id: row.id,
        nonconformanceId: row.nonconformanceId,
        version: row.version,
        rootCause: row.rootCause,
        immediateCorrection: row.immediateCorrection,
        correctiveAction: row.correctiveAction,
        preventiveAction: row.preventiveAction,
        proposedCompletionDate: row.proposedCompletionDate,
        additionalComments: row.additionalComments,
        evidenceFilenames: evidence,
        submittedById: row.submittedById,
        submittedAt: row.submittedAt,
        submittedBy: userSummary(row.submittedBy),
    };
}

export function serializeNonconformanceReview(row) {
    if (!row) return null;
    return {
        id: row.id,
        nonconformanceId: row.nonconformanceId,
        decision: row.decision,
        comment: row.comment,
        reviewedById: row.reviewedById,
        reviewedAt: row.reviewedAt,
        reviewedBy: userSummary(row.reviewedBy),
    };
}

export function serializeNonconformanceActivity(row) {
    if (!row) return null;
    return {
        id: row.id,
        nonconformanceId: row.nonconformanceId,
        type: row.type,
        message: row.message,
        comment: row.comment,
        actorId: row.actorId,
        createdAt: row.createdAt,
        actor: userSummary(row.actor),
    };
}

export function serializeNonconformance(row) {
    if (!row) return null;
    const responses = Array.isArray(row.responses)
        ? row.responses.map(serializeNonconformanceResponse)
        : undefined;
    const reviews = Array.isArray(row.reviews)
        ? row.reviews.map(serializeNonconformanceReview)
        : undefined;
    const activities = Array.isArray(row.activities)
        ? row.activities.map(serializeNonconformanceActivity)
        : undefined;
    const reviewerComments = Array.isArray(reviews)
        ? reviews
              .filter((r) => r.comment && String(r.comment).trim())
              .map((r) => ({
                  id: r.id,
                  decision: r.decision,
                  comment: r.comment,
                  reviewedAt: r.reviewedAt,
                  reviewedBy: r.reviewedBy,
              }))
        : undefined;

    return {
        id: row.id,
        ncNumber: row.ncNumber,
        auditPlanId: row.auditPlanId,
        findingId: row.findingId,
        findingTitle: row.findingTitle,
        findingDescription: row.findingDescription,
        severity: row.severity,
        assigneeId: row.assigneeId,
        reviewerId: row.reviewerId,
        dueDate: row.dueDate,
        status: row.status,
        closedAt: row.closedAt ?? null,
        createdById: row.createdById,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        assignee: userSummary(row.assignee),
        reviewer: userSummary(row.reviewer),
        createdBy: userSummary(row.createdBy),
        auditPlan: row.auditPlan
            ? {
                  id: row.auditPlan.id,
                  auditName: row.auditPlan.auditName,
                  executionId: row.auditPlan.executionId,
                  auditProgramId: row.auditPlan.auditProgramId,
              }
            : undefined,
        ...(responses ? { responses } : {}),
        ...(reviews ? { reviews, reviewHistory: reviews } : {}),
        ...(reviewerComments ? { reviewerComments } : {}),
        ...(activities ? { activities, activityHistory: activities } : {}),
    };
}

async function loadPlanForNc(auditPlanId) {
    return prisma.auditPlan.findUnique({
        where: { id: auditPlanId },
        include: {
            leadAuditor: { select: { id: true } },
            auditors: { select: { id: true } },
            auditProgram: {
                include: {
                    auditors: { select: { id: true } },
                    leadAuditor: { select: { id: true } },
                    site: { select: { id: true } },
                },
            },
        },
    });
}

function isPlanLeadAuditor(actorId, plan) {
    if (!plan) return false;
    if (Number(plan.leadAuditorId) === actorId) return true;
    if (Number(plan.auditProgram?.leadAuditorId) === actorId) return true;
    return false;
}

function isPlanAuditor(actorId, plan) {
    if (!plan) return false;
    if (
        Array.isArray(plan.auditors) &&
        plan.auditors.some((a) => Number(a.id) === actorId)
    ) {
        return true;
    }
    if (
        Array.isArray(plan.auditProgram?.auditors) &&
        plan.auditProgram.auditors.some((a) => Number(a.id) === actorId)
    ) {
        return true;
    }
    return false;
}

/**
 * Review allowed for: assigned Reviewer, NC Creator, plan Lead Auditor, plan Auditor.
 * Auditee role is always denied (caller should check role first).
 */
function actorCanReviewNonconformance(actorId, nc, plan) {
    if (Number(nc.reviewerId) === actorId) return true;
    if (Number(nc.createdById) === actorId) return true;
    if (isPlanLeadAuditor(actorId, plan)) return true;
    if (isPlanAuditor(actorId, plan)) return true;
    return false;
}

function parseDueDate(raw) {
    if (raw == null || raw === '') return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
        const err = new Error('Invalid dueDate');
        err.code = 'INVALID_DUE_DATE';
        throw err;
    }
    return d;
}

function parseOptionalDate(raw, fieldLabel) {
    if (raw == null || raw === '') return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
        const err = new Error(`Invalid ${fieldLabel}`);
        err.code = 'VALIDATION';
        throw err;
    }
    return d;
}

/**
 * Raise a Nonconformance from a Minor/Major finding on an audit plan.
 */
export async function raiseNonconformance({
    actorId,
    auditPlanId,
    findingId,
    assigneeId,
    reviewerId,
    dueDate,
    findingTitle,
    findingDescription,
    canAccessPlan,
}) {
    const planId = Number(auditPlanId);
    const assignee = Number(assigneeId);
    const actor = Number(actorId);
    if (!Number.isInteger(planId) || planId < 1) {
        const err = new Error('Valid auditPlanId is required');
        err.code = 'VALIDATION';
        throw err;
    }
    if (!String(findingId || '').trim()) {
        const err = new Error('findingId is required');
        err.code = 'VALIDATION';
        throw err;
    }
    if (!Number.isInteger(assignee) || assignee < 1) {
        const err = new Error('Valid assigneeId is required');
        err.code = 'VALIDATION';
        throw err;
    }

    const plan = await loadPlanForNc(planId);
    if (!plan) {
        const err = new Error('Audit plan not found');
        err.code = 'NOT_FOUND';
        throw err;
    }
    if (!(await canAccessPlan(actor, plan))) {
        const err = new Error('Forbidden');
        err.code = 'FORBIDDEN';
        throw err;
    }

    const finding = findFindingOnPlan(plan, findingId);
    if (!finding) {
        const err = new Error('Finding not found on this audit plan');
        err.code = 'FINDING_NOT_FOUND';
        throw err;
    }
    if (!NC_SEVERITY_VALUES.includes(finding.severity)) {
        const err = new Error('Only Minor or Major findings can raise a Nonconformance');
        err.code = 'INVALID_SEVERITY';
        throw err;
    }

    const existing = await prisma.nonconformance.findUnique({
        where: {
            auditPlanId_findingId: {
                auditPlanId: planId,
                findingId: String(findingId).trim(),
            },
        },
        select: { id: true, ncNumber: true },
    });
    if (existing) {
        const err = new Error('A Nonconformance already exists for this finding');
        err.code = 'ALREADY_EXISTS';
        err.existingId = existing.id;
        err.existingNcNumber = existing.ncNumber;
        throw err;
    }

    const assigneeUser = await prisma.user.findUnique({
        where: { id: assignee },
        select: { id: true, isActive: true },
    });
    if (!assigneeUser) {
        const err = new Error('Assignee user not found');
        err.code = 'ASSIGNEE_NOT_FOUND';
        throw err;
    }

    let reviewer = reviewerId != null ? Number(reviewerId) : actor;
    if (!Number.isInteger(reviewer) || reviewer < 1) {
        reviewer = plan.leadAuditorId || actor;
    }
    const reviewerUser = await prisma.user.findUnique({
        where: { id: reviewer },
        select: { id: true },
    });
    if (!reviewerUser) {
        const err = new Error('Reviewer user not found');
        err.code = 'REVIEWER_NOT_FOUND';
        throw err;
    }

    const title =
        String(findingTitle || '').trim() ||
        finding.title ||
        finding.clauseRef ||
        'Nonconformance';
    const description =
        String(findingDescription || '').trim() || finding.description;

    const parsedDue = parseDueDate(dueDate);

    const created = await prisma.$transaction(async (tx) => {
        const row = await tx.nonconformance.create({
            data: {
                ncNumber: `TMP-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
                auditPlanId: planId,
                findingId: String(findingId).trim(),
                findingTitle: title.slice(0, 500),
                findingDescription: description.slice(0, 10000),
                severity:
                    finding.severity === NC_SEVERITIES.Major
                        ? NC_SEVERITIES.Major
                        : NC_SEVERITIES.Minor,
                assigneeId: assignee,
                reviewerId: reviewer,
                dueDate: parsedDue,
                status: NC_STATUSES.ASSIGNED,
                createdById: actor,
            },
        });
        const year = new Date().getFullYear();
        const ncNumber = `NC-${year}-${String(row.id).padStart(5, '0')}`;
        const updated = await tx.nonconformance.update({
            where: { id: row.id },
            data: { ncNumber },
        });

        await createNcActivity(tx, {
            nonconformanceId: updated.id,
            type: NC_ACTIVITY_TYPES.RAISED,
            message: `${ncNumber} raised and assigned`,
            actorId: actor,
        });

        const assignedTpl = NcNotificationTemplates.assigned(ncNumber);
        await notifyUsers(tx, {
            recipientUserIds: [assignee],
            excludeUserId: actor,
            nonconformanceId: updated.id,
            ...assignedTpl,
        });

        return tx.nonconformance.findUnique({
            where: { id: updated.id },
            include: NC_DETAIL_INCLUDE,
        });
    });

    return serializeNonconformance(created);
}

/**
 * List nonconformances visible to the actor.
 */
export async function listNonconformances({
    actorId,
    auditPlanId,
    status,
    assigneeId,
    canAccessPlan,
}) {
    const actor = Number(actorId);
    const where = {};

    if (auditPlanId != null && String(auditPlanId).trim() !== '') {
        const planId = Number(auditPlanId);
        if (!Number.isInteger(planId) || planId < 1) {
            const err = new Error('Invalid auditPlanId');
            err.code = 'VALIDATION';
            throw err;
        }
        const plan = await loadPlanForNc(planId);
        if (!plan) {
            const err = new Error('Audit plan not found');
            err.code = 'NOT_FOUND';
            throw err;
        }
        if (!(await canAccessPlan(actor, plan))) {
            const err = new Error('Forbidden');
            err.code = 'FORBIDDEN';
            throw err;
        }
        where.auditPlanId = planId;
    }

    if (status) {
        const s = String(status).trim().toUpperCase();
        if (!Object.values(NC_STATUSES).includes(s)) {
            const err = new Error('Invalid status filter');
            err.code = 'VALIDATION';
            throw err;
        }
        where.status = s;
    }

    if (assigneeId != null && String(assigneeId).trim() !== '') {
        const aid = Number(assigneeId);
        if (!Number.isInteger(aid) || aid < 1) {
            const err = new Error('Invalid assigneeId');
            err.code = 'VALIDATION';
            throw err;
        }
        where.assigneeId = aid;
    }

    if (!where.auditPlanId) {
        where.OR = [
            { assigneeId: actor },
            { reviewerId: actor },
            { createdById: actor },
        ];
    }

    const rows = await prisma.nonconformance.findMany({
        where,
        include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
            reviewer: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
            auditPlan: {
                select: {
                    id: true,
                    auditName: true,
                    executionId: true,
                    auditProgramId: true,
                },
            },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 200,
    });

    return rows.map(serializeNonconformance);
}

/**
 * Get a single Nonconformance by id (includes responses, reviews, activities).
 */
export async function getNonconformanceById({ id, actorId, canAccessPlan }) {
    const ncId = Number(id);
    const actor = Number(actorId);
    if (!Number.isInteger(ncId) || ncId < 1) {
        const err = new Error('Invalid nonconformance id');
        err.code = 'VALIDATION';
        throw err;
    }

    const row = await prisma.nonconformance.findUnique({
        where: { id: ncId },
        include: NC_DETAIL_INCLUDE,
    });
    if (!row) {
        const err = new Error('Nonconformance not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    const isParty =
        row.assigneeId === actor ||
        row.reviewerId === actor ||
        row.createdById === actor;

    if (!isParty) {
        const plan = await loadPlanForNc(row.auditPlanId);
        if (!plan || !(await canAccessPlan(actor, plan))) {
            const err = new Error('Forbidden');
            err.code = 'FORBIDDEN';
            throw err;
        }
    }

    return serializeNonconformance(row);
}

/**
 * Append an auditee response and set status to RESPONSE_SUBMITTED.
 */
export async function submitNonconformanceResponse({
    nonconformanceId,
    actorId,
    rootCause,
    immediateCorrection,
    correctiveAction,
    preventiveAction,
    proposedCompletionDate,
    additionalComments,
    evidenceFilenames,
    evidence,
}) {
    const ncId = Number(nonconformanceId);
    const actor = Number(actorId);
    if (!Number.isInteger(ncId) || ncId < 1) {
        const err = new Error('Invalid nonconformance id');
        err.code = 'VALIDATION';
        throw err;
    }

    const root = String(rootCause ?? '').trim();
    const corrective = String(correctiveAction ?? '').trim();
    if (!root) {
        const err = new Error('Root Cause is required');
        err.code = 'VALIDATION';
        throw err;
    }
    if (!corrective) {
        const err = new Error('Corrective Action is required');
        err.code = 'VALIDATION';
        throw err;
    }

    const nc = await prisma.nonconformance.findUnique({
        where: { id: ncId },
        select: {
            id: true,
            assigneeId: true,
            reviewerId: true,
            status: true,
            ncNumber: true,
            auditPlanId: true,
        },
    });
    if (!nc) {
        const err = new Error('Nonconformance not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    if (Number(nc.assigneeId) !== actor) {
        const err = new Error('Only the assigned Auditee can submit a response');
        err.code = 'FORBIDDEN';
        throw err;
    }

    const status = String(nc.status || '').trim().toUpperCase();
    if (!NC_RESPONSE_ALLOWED_STATUSES.includes(status)) {
        const err = new Error(
            'Response can only be submitted when status is ASSIGNED or CHANGES_REQUESTED',
        );
        err.code = 'INVALID_STATUS';
        throw err;
    }

    const plan = await loadPlanForNc(nc.auditPlanId);
    const reviewRecipients = [
        nc.reviewerId,
        plan?.leadAuditorId,
        plan?.auditProgram?.leadAuditorId,
    ];

    const proposedDate = parseOptionalDate(
        proposedCompletionDate,
        'proposedCompletionDate',
    );
    const evidenceList = normalizeEvidenceFilenames(evidenceFilenames ?? evidence);

    const updated = await prisma.$transaction(async (tx) => {
        const agg = await tx.nonconformanceResponse.aggregate({
            where: { nonconformanceId: ncId },
            _max: { version: true },
        });
        const nextVersion = (agg._max.version || 0) + 1;

        await tx.nonconformanceResponse.create({
            data: {
                nonconformanceId: ncId,
                version: nextVersion,
                rootCause: root.slice(0, 10000),
                immediateCorrection:
                    String(immediateCorrection ?? '').trim().slice(0, 10000) || null,
                correctiveAction: corrective.slice(0, 10000),
                preventiveAction:
                    String(preventiveAction ?? '').trim().slice(0, 10000) || null,
                proposedCompletionDate: proposedDate,
                additionalComments:
                    String(additionalComments ?? '').trim().slice(0, 10000) || null,
                evidenceFilenames: evidenceList,
                submittedById: actor,
            },
        });

        await createNcActivity(tx, {
            nonconformanceId: ncId,
            type: NC_ACTIVITY_TYPES.RESPONSE_SUBMITTED,
            message: `Response v${nextVersion} submitted`,
            actorId: actor,
        });

        const responseTpl = NcNotificationTemplates.responseSubmitted(nc.ncNumber);
        await notifyUsers(tx, {
            recipientUserIds: reviewRecipients,
            excludeUserId: actor,
            nonconformanceId: ncId,
            ...responseTpl,
        });

        return tx.nonconformance.update({
            where: { id: ncId },
            data: { status: NC_STATUSES.RESPONSE_SUBMITTED },
            include: NC_DETAIL_INCLUDE,
        });
    });

    return serializeNonconformance(updated);
}

/**
 * Auditor/reviewer decision: APPROVE (→ CLOSED) or REQUEST_CHANGES (→ CHANGES_REQUESTED).
 */
export async function reviewNonconformance({
    nonconformanceId,
    actorId,
    actorRole,
    decision,
    comment,
}) {
    const ncId = Number(nonconformanceId);
    const actor = Number(actorId);
    if (!Number.isInteger(ncId) || ncId < 1) {
        const err = new Error('Invalid nonconformance id');
        err.code = 'VALIDATION';
        throw err;
    }
    if (!Number.isInteger(actor) || actor < 1) {
        const err = new Error('Invalid actor');
        err.code = 'VALIDATION';
        throw err;
    }

    if (normalizeRole(actorRole) === 'auditee') {
        const err = new Error('Auditees cannot review nonconformances');
        err.code = 'FORBIDDEN';
        throw err;
    }

    const decisionNorm = String(decision ?? '')
        .trim()
        .toUpperCase();
    if (!NC_REVIEW_DECISION_VALUES.includes(decisionNorm)) {
        const err = new Error('decision must be APPROVE or REQUEST_CHANGES');
        err.code = 'VALIDATION';
        throw err;
    }

    const commentText = String(comment ?? '').trim();
    if (decisionNorm === NC_REVIEW_DECISIONS.REQUEST_CHANGES && !commentText) {
        const err = new Error('comment is required when requesting changes');
        err.code = 'VALIDATION';
        throw err;
    }

    const nc = await prisma.nonconformance.findUnique({
        where: { id: ncId },
        select: {
            id: true,
            ncNumber: true,
            status: true,
            assigneeId: true,
            reviewerId: true,
            createdById: true,
            auditPlanId: true,
        },
    });
    if (!nc) {
        const err = new Error('Nonconformance not found');
        err.code = 'NOT_FOUND';
        throw err;
    }

    const status = String(nc.status || '').trim().toUpperCase();
    if (!NC_REVIEW_ALLOWED_STATUSES.includes(status)) {
        const err = new Error(
            'Review is only allowed when status is RESPONSE_SUBMITTED',
        );
        err.code = 'INVALID_STATUS';
        throw err;
    }

    const plan = await loadPlanForNc(nc.auditPlanId);
    if (!actorCanReviewNonconformance(actor, nc, plan)) {
        const err = new Error(
            'Only the assigned Reviewer, NC Creator, Lead Auditor, or Auditor can review',
        );
        err.code = 'FORBIDDEN';
        throw err;
    }

    const storedComment = commentText ? commentText.slice(0, 10000) : null;
    const nextStatus =
        decisionNorm === NC_REVIEW_DECISIONS.APPROVE
            ? NC_STATUSES.CLOSED
            : NC_STATUSES.CHANGES_REQUESTED;
    const closedAt =
        decisionNorm === NC_REVIEW_DECISIONS.APPROVE ? new Date() : null;

    const updated = await prisma.$transaction(async (tx) => {
        await tx.nonconformanceReview.create({
            data: {
                nonconformanceId: ncId,
                decision: decisionNorm,
                comment: storedComment,
                reviewedById: actor,
            },
        });

        await createNcActivity(tx, {
            nonconformanceId: ncId,
            type:
                decisionNorm === NC_REVIEW_DECISIONS.APPROVE
                    ? NC_ACTIVITY_TYPES.CLOSED
                    : activityTypeForReview(decisionNorm),
            message: activityMessageForReview(decisionNorm),
            comment: storedComment,
            actorId: actor,
        });

        const reviewTpl =
            decisionNorm === NC_REVIEW_DECISIONS.APPROVE
                ? NcNotificationTemplates.closed(nc.ncNumber)
                : NcNotificationTemplates.changesRequested(nc.ncNumber);
        await notifyUsers(tx, {
            recipientUserIds: [nc.assigneeId],
            excludeUserId: actor,
            nonconformanceId: ncId,
            ...reviewTpl,
        });

        return tx.nonconformance.update({
            where: { id: ncId },
            data: {
                status: nextStatus,
                closedAt,
            },
            include: NC_DETAIL_INCLUDE,
        });
    });

    return serializeNonconformance(updated);
}
