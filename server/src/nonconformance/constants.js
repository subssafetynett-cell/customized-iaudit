/** Allowed Nonconformance workflow statuses. */
export const NC_STATUSES = Object.freeze({
    ASSIGNED: 'ASSIGNED',
    RESPONSE_SUBMITTED: 'RESPONSE_SUBMITTED',
    CHANGES_REQUESTED: 'CHANGES_REQUESTED',
    CLOSED: 'CLOSED',
});

export const NC_STATUS_VALUES = Object.freeze(Object.values(NC_STATUSES));

/** Statuses that allow an auditee to submit / update a response. */
export const NC_RESPONSE_ALLOWED_STATUSES = Object.freeze([
    NC_STATUSES.ASSIGNED,
    NC_STATUSES.CHANGES_REQUESTED,
    NC_STATUSES.RESPONSE_SUBMITTED,
]);

/** Status from which an auditor/reviewer may submit a review decision. */
export const NC_REVIEW_ALLOWED_STATUSES = Object.freeze([
    NC_STATUSES.RESPONSE_SUBMITTED,
]);

/** Auditor review decisions. */
export const NC_REVIEW_DECISIONS = Object.freeze({
    APPROVE: 'APPROVE',
    REQUEST_CHANGES: 'REQUEST_CHANGES',
});

export const NC_REVIEW_DECISION_VALUES = Object.freeze(
    Object.values(NC_REVIEW_DECISIONS),
);

/** Activity timeline event types. */
export const NC_ACTIVITY_TYPES = Object.freeze({
    RAISED: 'RAISED',
    RESPONSE_SUBMITTED: 'RESPONSE_SUBMITTED',
    CHANGES_REQUESTED: 'CHANGES_REQUESTED',
    APPROVED: 'APPROVED',
    CLOSED: 'CLOSED',
});

/** Only Minor / Major findings may raise a Nonconformance. */
export const NC_SEVERITIES = Object.freeze({
    Minor: 'Minor',
    Major: 'Major',
});

export const NC_SEVERITY_VALUES = Object.freeze(Object.values(NC_SEVERITIES));

export const NC_USER_SELECT = Object.freeze({
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
});

export const NC_RESPONSE_INCLUDE = Object.freeze({
    submittedBy: { select: NC_USER_SELECT },
});

export const NC_REVIEW_INCLUDE = Object.freeze({
    reviewedBy: { select: NC_USER_SELECT },
});

export const NC_ACTIVITY_INCLUDE = Object.freeze({
    actor: { select: NC_USER_SELECT },
});

export const NC_DETAIL_INCLUDE = Object.freeze({
    assignee: { select: NC_USER_SELECT },
    reviewer: { select: NC_USER_SELECT },
    createdBy: { select: NC_USER_SELECT },
    auditPlan: {
        select: {
            id: true,
            auditName: true,
            executionId: true,
            auditProgramId: true,
        },
    },
    responses: {
        include: NC_RESPONSE_INCLUDE,
        orderBy: [{ version: 'desc' }, { submittedAt: 'desc' }],
    },
    reviews: {
        include: NC_REVIEW_INCLUDE,
        orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
    },
    activities: {
        include: NC_ACTIVITY_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    },
});
