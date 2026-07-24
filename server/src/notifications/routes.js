import { Router } from 'express';
import {
    listNotificationsForUser,
    markAllNotificationsRead,
    markNotificationRead,
} from './service.js';

function sendServiceError(res, error) {
    const code = error?.code;
    if (code === 'VALIDATION') {
        return res.status(400).json({ error: error.message });
    }
    if (code === 'NOT_FOUND') {
        return res.status(404).json({ error: error.message });
    }
    if (code === 'FORBIDDEN') {
        return res.status(403).json({ error: error.message });
    }
    console.error('[notifications]', error);
    return res.status(500).json({ error: 'Failed to process notification request' });
}

/**
 * @param {{ authenticateToken: Function, checkTrialExpiration?: Function }} deps
 */
export function createNotificationsRouter({
    authenticateToken,
    checkTrialExpiration = (_req, _res, next) => next(),
}) {
    const router = Router();
    const auth = [authenticateToken, checkTrialExpiration];

    /** GET /notifications */
    router.get('/', ...auth, async (req, res) => {
        try {
            const result = await listNotificationsForUser({
                actorId: req.user.id,
                limit: req.query.limit,
            });
            return res.json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    /** PATCH /notifications/read-all — must be before /:id/read */
    router.patch('/read-all', ...auth, async (req, res) => {
        try {
            const result = await markAllNotificationsRead({ actorId: req.user.id });
            return res.json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    /** PATCH /notifications/:id/read */
    router.patch('/:id/read', ...auth, async (req, res) => {
        try {
            const result = await markNotificationRead({
                id: req.params.id,
                actorId: req.user.id,
            });
            return res.json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    return router;
}
