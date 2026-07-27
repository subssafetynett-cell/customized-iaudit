import prisma from '../prisma.js';
import { NOTIFICATION_TYPES } from './constants.js';

function uniquePositiveIds(ids) {
    return [
        ...new Set(
            (Array.isArray(ids) ? ids : [])
                .map((id) => Number(id))
                .filter((id) => Number.isInteger(id) && id > 0),
        ),
    ];
}

export function serializeNotification(row) {
    if (!row) return null;
    return {
        id: row.id,
        recipientUserId: row.recipientUserId,
        nonconformanceId: row.nonconformanceId ?? null,
        linkPath: row.linkPath ?? null,
        type: row.type,
        title: row.title,
        message: row.message,
        isRead: Boolean(row.isRead),
        createdAt: row.createdAt,
        nonconformance: row.nonconformance
            ? {
                  id: row.nonconformance.id,
                  ncNumber: row.nonconformance.ncNumber,
                  status: row.nonconformance.status,
              }
            : undefined,
    };
}

/**
 * Create one notification (Prisma client or transaction).
 */
export async function createNotification(
    db,
    { recipientUserId, nonconformanceId = null, linkPath = null, type, title, message },
) {
    const recipient = Number(recipientUserId);
    if (!Number.isInteger(recipient) || recipient < 1) return null;

    const ncRaw = nonconformanceId != null ? Number(nonconformanceId) : null;
    const ncId =
        Number.isInteger(ncRaw) && ncRaw > 0 ? ncRaw : null;
    const path =
        linkPath != null && String(linkPath).trim()
            ? String(linkPath).trim().slice(0, 500)
            : null;

    return db.notification.create({
        data: {
            recipientUserId: recipient,
            nonconformanceId: ncId,
            linkPath: path,
            type: String(type || '').slice(0, 80),
            title: String(title || '').slice(0, 200),
            message: String(message || '').slice(0, 1000),
            isRead: false,
        },
    });
}

/**
 * Notify one or more users (skips duplicates / invalid ids / excludeActorId).
 */
export async function notifyUsers(
    db,
    {
        recipientUserIds,
        excludeUserId = null,
        nonconformanceId,
        linkPath = null,
        type,
        title,
        message,
    },
) {
    const exclude = excludeUserId != null ? Number(excludeUserId) : null;
    const recipients = uniquePositiveIds(recipientUserIds).filter(
        (id) => exclude == null || id !== exclude,
    );
    if (!recipients.length) return [];

    const created = [];
    for (const recipientUserId of recipients) {
        const row = await createNotification(db, {
            recipientUserId,
            nonconformanceId,
            linkPath,
            type,
            title,
            message,
        });
        if (row) created.push(row);
    }
    return created;
}

export async function listNotificationsForUser({ actorId, limit = 50 }) {
    const actor = Number(actorId);
    if (!Number.isInteger(actor) || actor < 1) {
        const err = new Error('Invalid user');
        err.code = 'VALIDATION';
        throw err;
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const rows = await prisma.notification.findMany({
        where: { recipientUserId: actor },
        include: {
            nonconformance: {
                select: { id: true, ncNumber: true, status: true },
            },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
    });

    return rows.map(serializeNotification);
}

export async function markNotificationRead({ id, actorId }) {
    const notifId = Number(id);
    const actor = Number(actorId);
    if (!Number.isInteger(notifId) || notifId < 1) {
        const err = new Error('Invalid notification id');
        err.code = 'VALIDATION';
        throw err;
    }

    const row = await prisma.notification.findUnique({
        where: { id: notifId },
        include: {
            nonconformance: {
                select: { id: true, ncNumber: true, status: true },
            },
        },
    });
    if (!row) {
        const err = new Error('Notification not found');
        err.code = 'NOT_FOUND';
        throw err;
    }
    if (Number(row.recipientUserId) !== actor) {
        const err = new Error('Forbidden');
        err.code = 'FORBIDDEN';
        throw err;
    }

    if (row.isRead) return serializeNotification(row);

    const updated = await prisma.notification.update({
        where: { id: notifId },
        data: { isRead: true },
        include: {
            nonconformance: {
                select: { id: true, ncNumber: true, status: true },
            },
        },
    });
    return serializeNotification(updated);
}

export async function markAllNotificationsRead({ actorId }) {
    const actor = Number(actorId);
    if (!Number.isInteger(actor) || actor < 1) {
        const err = new Error('Invalid user');
        err.code = 'VALIDATION';
        throw err;
    }

    const result = await prisma.notification.updateMany({
        where: { recipientUserId: actor, isRead: false },
        data: { isRead: true },
    });

    return { updated: result.count };
}

/** Helpers used by the Nonconformance workflow. */
export const NcNotificationTemplates = Object.freeze({
    assigned(ncNumber, raisedByName) {
        const raised = String(raisedByName || '').trim();
        return {
            type: NOTIFICATION_TYPES.NC_ASSIGNED,
            title: 'Nonconformance assigned',
            message: raised
                ? `${ncNumber} was raised by ${raised} and assigned to you for response.`
                : `${ncNumber} has been assigned to you for response.`,
        };
    },
    findingAssigned(findingRef, raisedByName) {
        const raised = String(raisedByName || '').trim();
        const ref = String(findingRef || 'a finding').trim() || 'a finding';
        return {
            type: NOTIFICATION_TYPES.FINDING_ASSIGNED,
            title: 'Nonconformance assigned',
            message: raised
                ? `${raised} raised a nonconformance (${ref}) and assigned it to you.`
                : `A nonconformance (${ref}) has been assigned to you.`,
        };
    },
    responseSubmitted(ncNumber, isUpdate = false) {
        return {
            type: NOTIFICATION_TYPES.NC_RESPONSE_SUBMITTED,
            title: isUpdate ? 'Response updated' : 'Response submitted',
            message: isUpdate
                ? `An updated response was submitted for ${ncNumber}.`
                : `A response was submitted for ${ncNumber}.`,
        };
    },
    findingResponseSubmitted(findingRef, responderName, isUpdate = false) {
        const ref = String(findingRef || 'a finding').trim() || 'a finding';
        const who = String(responderName || '').trim();
        return {
            type: NOTIFICATION_TYPES.FINDING_RESPONSE_SUBMITTED,
            title: isUpdate ? 'Finding response updated' : 'Finding response received',
            message: who
                ? isUpdate
                    ? `${who} updated their response for ${ref}.`
                    : `${who} submitted a response for ${ref}.`
                : isUpdate
                  ? `An updated response was submitted for ${ref}.`
                  : `A response was submitted for ${ref}.`,
        };
    },
    changesRequested(ncNumber, reason) {
        const note = String(reason || '').trim();
        return {
            type: NOTIFICATION_TYPES.NC_CHANGES_REQUESTED,
            title: 'Changes requested',
            message: note
                ? `Changes were requested on your response for ${ncNumber}: ${note}`
                : `Changes were requested on your response for ${ncNumber}.`,
        };
    },
    findingReviewAccepted(findingRef) {
        const ref = String(findingRef || 'a finding').trim() || 'a finding';
        return {
            type: NOTIFICATION_TYPES.FINDING_REVIEW_ACCEPTED,
            title: 'Response accepted',
            message: `Your response for ${ref} was accepted and the finding was closed.`,
        };
    },
    findingReviewRejected(findingRef, reason) {
        const ref = String(findingRef || 'a finding').trim() || 'a finding';
        const note = String(reason || '').trim();
        return {
            type: NOTIFICATION_TYPES.FINDING_REVIEW_REJECTED,
            title: 'Response rejected — please revise',
            message: note
                ? `Your response for ${ref} was rejected and reopened. Reason: ${note}`
                : `Your response for ${ref} was rejected and reopened for revision.`,
        };
    },
    closed(ncNumber) {
        return {
            type: NOTIFICATION_TYPES.NC_CLOSED,
            title: 'Nonconformance closed',
            message: `${ncNumber} has been approved and closed.`,
        };
    },
});
