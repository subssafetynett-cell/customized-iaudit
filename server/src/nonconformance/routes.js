import { Router } from 'express';
import {
    getNonconformanceById,
    listNonconformances,
    raiseNonconformance,
    reviewNonconformance,
    submitNonconformanceResponse,
} from './service.js';

function sendServiceError(res, error) {
    const code = error?.code;
    if (code === 'VALIDATION' || code === 'INVALID_DUE_DATE' || code === 'INVALID_SEVERITY') {
        return res.status(400).json({ error: error.message });
    }
    if (code === 'INVALID_STATUS') {
        return res.status(409).json({ error: error.message });
    }
    if (code === 'NOT_FOUND' || code === 'FINDING_NOT_FOUND') {
        return res.status(404).json({ error: error.message });
    }
    if (code === 'FORBIDDEN') {
        return res.status(403).json({ error: error.message });
    }
    if (code === 'ALREADY_EXISTS') {
        return res.status(409).json({
            error: error.message,
            existingId: error.existingId,
            existingNcNumber: error.existingNcNumber,
        });
    }
    if (code === 'ASSIGNEE_NOT_FOUND' || code === 'REVIEWER_NOT_FOUND') {
        return res.status(404).json({ error: error.message });
    }
    console.error('[nonconformance]', error);
    return res.status(500).json({ error: 'Failed to process nonconformance request' });
}

/**
 * Create Express router for Nonconformance APIs.
 * @param {{ authenticateToken: Function, checkTrialExpiration?: Function, actorCanAccessAuditPlan: Function }} deps
 */
export function createNonconformanceRouter({
    authenticateToken,
    checkTrialExpiration = (_req, _res, next) => next(),
    actorCanAccessAuditPlan,
}) {
    const router = Router();
    const auth = [authenticateToken, checkTrialExpiration];

    /** POST /nonconformances — Raise Nonconformance */
    router.post('/', ...auth, async (req, res) => {
        try {
            if (String(req.user?.role || '').toLowerCase() === 'auditee') {
                return res.status(403).json({ error: 'Auditees cannot raise nonconformances' });
            }
            const {
                auditPlanId,
                findingId,
                assigneeId,
                reviewerId,
                dueDate,
                findingTitle,
                findingDescription,
            } = req.body ?? {};

            const result = await raiseNonconformance({
                actorId: req.user.id,
                auditPlanId,
                findingId,
                assigneeId,
                reviewerId,
                dueDate,
                findingTitle,
                findingDescription,
                canAccessPlan: actorCanAccessAuditPlan,
            });
            return res.status(201).json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    /** GET /nonconformances — List Nonconformances */
    router.get('/', ...auth, async (req, res) => {
        try {
            const result = await listNonconformances({
                actorId: req.user.id,
                auditPlanId: req.query.auditPlanId,
                status: req.query.status,
                assigneeId: req.query.assigneeId,
                page: req.query.page,
                limit: req.query.limit,
                canAccessPlan: actorCanAccessAuditPlan,
            });
            return res.json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    /** POST /nonconformances/:id/responses — Auditee submits a response */
    router.post('/:id/responses', ...auth, async (req, res) => {
        try {
            const {
                rootCause,
                immediateCorrection,
                correctiveAction,
                preventiveAction,
                proposedCompletionDate,
                additionalComments,
                evidenceFilenames,
                evidence,
            } = req.body ?? {};

            const result = await submitNonconformanceResponse({
                nonconformanceId: req.params.id,
                actorId: req.user.id,
                rootCause,
                immediateCorrection,
                correctiveAction,
                preventiveAction,
                proposedCompletionDate,
                additionalComments,
                evidenceFilenames,
                evidence,
            });
            return res.status(201).json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    /** POST /nonconformances/:id/review — Auditor/reviewer decision */
    router.post('/:id/review', ...auth, async (req, res) => {
        try {
            const { decision, comment } = req.body ?? {};
            const result = await reviewNonconformance({
                nonconformanceId: req.params.id,
                actorId: req.user.id,
                actorRole: req.user.role,
                decision,
                comment,
            });
            return res.json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    /** GET /nonconformances/:id — Get Nonconformance Details */
    router.get('/:id', ...auth, async (req, res) => {
        try {
            const result = await getNonconformanceById({
                id: req.params.id,
                actorId: req.user.id,
                canAccessPlan: actorCanAccessAuditPlan,
            });
            return res.json(result);
        } catch (error) {
            return sendServiceError(res, error);
        }
    });

    return router;
}
