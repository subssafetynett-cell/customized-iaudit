import {
    NC_ACTIVITY_TYPES,
    NC_REVIEW_DECISIONS,
} from './constants.js';

/**
 * Create an append-only Nonconformance activity row (within a Prisma tx or client).
 */
export async function createNcActivity(
    db,
    { nonconformanceId, type, message, comment = null, actorId = null },
) {
    return db.nonconformanceActivity.create({
        data: {
            nonconformanceId,
            type,
            message: String(message || '').slice(0, 1000),
            comment: comment != null ? String(comment).slice(0, 10000) || null : null,
            actorId: actorId != null ? Number(actorId) : null,
        },
    });
}

export function activityMessageForReview(decision) {
    if (decision === NC_REVIEW_DECISIONS.APPROVE) {
        return 'Response approved; nonconformance closed';
    }
    if (decision === NC_REVIEW_DECISIONS.REQUEST_CHANGES) {
        return 'Changes requested on submitted response';
    }
    return 'Review decision recorded';
}

export function activityTypeForReview(decision) {
    if (decision === NC_REVIEW_DECISIONS.APPROVE) {
        return NC_ACTIVITY_TYPES.APPROVED;
    }
    if (decision === NC_REVIEW_DECISIONS.REQUEST_CHANGES) {
        return NC_ACTIVITY_TYPES.CHANGES_REQUESTED;
    }
    return decision;
}
