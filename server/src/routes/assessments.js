import { Router } from 'express';
import prisma from '../prisma.js';
import {
    sanitizePersonName,
    sanitizePlainText,
    sanitizeShortLabel,
    escapeHtml
} from '../textSanitize.js';
import {
    actorIsAuditee,
    actorCanWriteSelfAssessmentStore,
    actorCanWriteOrgAssessmentStore,
    filterGapAnalysesForUser,
    stampGapAnalysesForUser,
    gapAnalysisDraftForUser,
    ensureUserGapAnalysisStore,
    filterSelfAssessmentsForUser,
    stampSelfAssessmentsForUser,
    selfAssessmentDraftForUser,
    resolveAssessmentStoreOwnerId,
    ensureUserSelfAssessmentStore,
    countOrgGapAnalyses,
    countOrgSelfAssessments,
    rejectIfTrialLimitExceeded
} from '../orgAccess.js';
import {
    OTP_RESEND_COOLDOWN_MS,
    transporter,
    isSmtpConfigured,
    getSmtpFromAddress
} from '../auth/otpMail.js';

import { buildSelfAssessmentReportPdf } from '../buildSelfAssessmentReportPdf.js';

export function createAssessmentsRouter({ authenticateToken, checkTrialExpiration }) {
    const router = Router();

    const assessmentReportEmailLastSent = new Map();

    // --- Organization-scoped gap analysis & self assessment (not blocked by trial expiry) ---

    router.get('/gap-analyses', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            if (await actorIsAuditee(actorId)) {
                return res.json({
                    userId: actorId,
                    orgRootUserId: actorId,
                    analyses: [],
                    draft: null,
                    updatedAt: null,
                    canWrite: false,
                });
            }
            const storeOwnerId = await resolveAssessmentStoreOwnerId(actorId, req.query.ownerUserId);
            const { userId, analyses, draft, row } = await ensureUserGapAnalysisStore(storeOwnerId);
            res.json({
                userId,
                orgRootUserId: userId,
                storeOwnerId,
                analyses,
                draft,
                updatedAt: row.updatedAt,
                canWrite: await actorCanWriteOrgAssessmentStore(actorId),
            });
        } catch (error) {
            if (error?.statusCode === 403) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            console.error('Error loading gap analyses:', error);
            res.status(500).json({ error: 'Failed to load gap analyses' });
        }
    });

    router.put('/gap-analyses', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            if (!(await actorCanWriteOrgAssessmentStore(actorId))) {
                return res.status(403).json({ error: 'Forbidden', message: 'Read-only role cannot modify gap analyses.' });
            }
            const storeOwnerId = await resolveAssessmentStoreOwnerId(actorId, req.body?.ownerUserId);
            await ensureUserGapAnalysisStore(storeOwnerId);
            const { analyses, draft } = req.body ?? {};
            const existing = await prisma.userGapAnalysisStore.findUnique({
                where: { userId: storeOwnerId },
            });
            const ownedExisting = filterGapAnalysesForUser(existing?.analyses, storeOwnerId);
            const incomingAnalyses =
                analyses !== undefined
                    ? stampGapAnalysesForUser(
                          filterGapAnalysesForUser(analyses, storeOwnerId),
                          storeOwnerId,
                      )
                    : undefined;
            // Refuse accidental empty wipe of an existing store (use DELETE for removals).
            const safeAnalyses =
                incomingAnalyses !== undefined &&
                incomingAnalyses.length === 0 &&
                ownedExisting.length > 0 &&
                req.body?.forceReplaceAnalyses !== true
                    ? ownedExisting
                    : incomingAnalyses;
            const data = {
                analyses: safeAnalyses !== undefined ? safeAnalyses : ownedExisting,
                draft:
                    draft !== undefined
                        ? draft === null
                            ? null
                            : gapAnalysisDraftForUser({ ...draft, ownerUserId: storeOwnerId }, storeOwnerId)
                        : (existing?.draft ?? null),
            };
            if (analyses !== undefined) {
                const orgTotalBefore = await countOrgGapAnalyses(actorId);
                const actorDelta = data.analyses.length - ownedExisting.length;
                const trialRejected = await rejectIfTrialLimitExceeded(
                    actorId,
                    'gapAnalysis',
                    orgTotalBefore + actorDelta,
                );
                if (trialRejected) {
                    return res.status(403).json(trialRejected);
                }
            }
            const row = await prisma.userGapAnalysisStore.upsert({
                where: { userId: storeOwnerId },
                create: { userId: storeOwnerId, ...data },
                update: data,
            });
            res.json({ ok: true, userId: storeOwnerId, orgRootUserId: storeOwnerId, updatedAt: row.updatedAt });
        } catch (error) {
            if (error?.statusCode === 403) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            console.error('Error saving gap analyses:', error);
            res.status(500).json({ error: 'Failed to save gap analyses' });
        }
    });

    router.delete('/gap-analyses/:externalId', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            if (!(await actorCanWriteOrgAssessmentStore(actorId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const storeOwnerId = await resolveAssessmentStoreOwnerId(actorId, req.query.ownerUserId);
            const { analyses } = await ensureUserGapAnalysisStore(storeOwnerId);
            const externalId = String(req.params.externalId || '');
            const next = analyses.filter((a) => String(a?.id) !== externalId);
            if (next.length === analyses.length) {
                return res.status(404).json({ error: 'Gap analysis not found' });
            }
            await prisma.userGapAnalysisStore.update({
                where: { userId: storeOwnerId },
                data: { analyses: stampGapAnalysesForUser(next, storeOwnerId) },
            });
            res.status(204).send();
        } catch (error) {
            if (error?.statusCode === 403) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            console.error('Error deleting gap analysis:', error);
            res.status(500).json({ error: 'Failed to delete gap analysis' });
        }
    });

    router.get('/self-assessments', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            if (await actorIsAuditee(actorId)) {
                return res.json({
                    userId: actorId,
                    orgRootUserId: actorId,
                    assessments: [],
                    draft: null,
                    updatedAt: null,
                    canWrite: false,
                });
            }
            const storeOwnerId = await resolveAssessmentStoreOwnerId(actorId, req.query.ownerUserId);
            const { userId, assessments, draft, row } = await ensureUserSelfAssessmentStore(storeOwnerId);
            res.json({
                userId,
                orgRootUserId: userId,
                storeOwnerId,
                assessments,
                draft,
                updatedAt: row.updatedAt,
                canWrite: actorCanWriteSelfAssessmentStore(actorId),
            });
        } catch (error) {
            if (error?.statusCode === 403) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            console.error('Error loading self assessments:', error);
            res.status(500).json({ error: 'Failed to load self assessments' });
        }
    });

    router.put('/self-assessments', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            if (!actorCanWriteSelfAssessmentStore(actorId)) {
                return res.status(403).json({ error: 'Forbidden', message: 'Cannot modify self assessments.' });
            }
            const storeOwnerId = await resolveAssessmentStoreOwnerId(actorId, req.body?.ownerUserId);
            await ensureUserSelfAssessmentStore(storeOwnerId);
            const { assessments, draft } = req.body ?? {};
            const existing = await prisma.userSelfAssessmentStore.findUnique({
                where: { userId: storeOwnerId },
            });
            const ownedExisting = filterSelfAssessmentsForUser(existing?.assessments, storeOwnerId);
            const incomingAssessments =
                assessments !== undefined
                    ? stampSelfAssessmentsForUser(
                          filterSelfAssessmentsForUser(assessments, storeOwnerId),
                          storeOwnerId,
                      )
                    : undefined;
            const safeAssessments =
                incomingAssessments !== undefined &&
                incomingAssessments.length === 0 &&
                ownedExisting.length > 0 &&
                req.body?.forceReplaceAssessments !== true
                    ? ownedExisting
                    : incomingAssessments;
            const data = {
                assessments: safeAssessments !== undefined ? safeAssessments : ownedExisting,
                draft:
                    draft !== undefined
                        ? draft === null
                            ? null
                            : selfAssessmentDraftForUser({ ...draft, ownerUserId: storeOwnerId }, storeOwnerId)
                        : (existing?.draft ?? null),
            };
            if (assessments !== undefined) {
                const orgTotalBefore = await countOrgSelfAssessments(actorId);
                const actorDelta = data.assessments.length - ownedExisting.length;
                const trialRejected = await rejectIfTrialLimitExceeded(
                    actorId,
                    'selfAssessment',
                    orgTotalBefore + actorDelta,
                );
                if (trialRejected) {
                    return res.status(403).json(trialRejected);
                }
            }
            const row = await prisma.userSelfAssessmentStore.upsert({
                where: { userId: storeOwnerId },
                create: { userId: storeOwnerId, ...data },
                update: data,
            });
            res.json({ ok: true, userId: storeOwnerId, orgRootUserId: storeOwnerId, updatedAt: row.updatedAt });
        } catch (error) {
            if (error?.statusCode === 403) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            console.error('Error saving self assessments:', error);
            res.status(500).json({ error: 'Failed to save self assessments' });
        }
    });

    router.delete('/self-assessments/:externalId', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            if (!actorCanWriteSelfAssessmentStore(actorId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const storeOwnerId = await resolveAssessmentStoreOwnerId(actorId, req.query.ownerUserId);
            const { assessments } = await ensureUserSelfAssessmentStore(storeOwnerId);
            const externalId = String(req.params.externalId || '');
            const next = assessments.filter((a) => String(a?.id) !== externalId);
            if (next.length === assessments.length) {
                return res.status(404).json({ error: 'Self assessment not found' });
            }
            await prisma.userSelfAssessmentStore.update({
                where: { userId: storeOwnerId },
                data: { assessments: stampSelfAssessmentsForUser(next, storeOwnerId) },
            });
            res.status(204).send();
        } catch (error) {
            if (error?.statusCode === 403) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            console.error('Error deleting self assessment:', error);
            res.status(500).json({ error: 'Failed to delete self assessment' });
        }
    });

    /** @deprecated Use /gap-analyses — kept for older clients */
    router.get('/user-persisted/gap-analyses', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            const { analyses, draft } = await ensureUserGapAnalysisStore(actorId);
            res.json({ analyses, draft });
        } catch (error) {
            console.error('Error loading gap analyses:', error);
            res.status(500).json({ error: 'Failed to load gap analyses' });
        }
    });
    router.put('/user-persisted/gap-analyses', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            if (!(await actorCanWriteOrgAssessmentStore(actorId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            await ensureUserGapAnalysisStore(actorId);
            const { analyses, draft } = req.body ?? {};
            const existing = await prisma.userGapAnalysisStore.findUnique({
                where: { userId: actorId },
            });
            const ownedExisting = filterGapAnalysesForUser(existing?.analyses, actorId);
            const incomingAnalyses =
                analyses !== undefined
                    ? stampGapAnalysesForUser(
                          filterGapAnalysesForUser(analyses, actorId),
                          actorId,
                      )
                    : undefined;
            const safeAnalyses =
                incomingAnalyses !== undefined &&
                incomingAnalyses.length === 0 &&
                ownedExisting.length > 0 &&
                req.body?.forceReplaceAnalyses !== true
                    ? ownedExisting
                    : incomingAnalyses;
            const data = {
                analyses: safeAnalyses !== undefined ? safeAnalyses : ownedExisting,
                draft:
                    draft !== undefined
                        ? draft === null
                            ? null
                            : gapAnalysisDraftForUser({ ...draft, ownerUserId: actorId }, actorId)
                        : (existing?.draft ?? null),
            };
            const row = await prisma.userGapAnalysisStore.upsert({
                where: { userId: actorId },
                create: { userId: actorId, ...data },
                update: data,
            });
            res.json({ ok: true, updatedAt: row.updatedAt });
        } catch (error) {
            console.error('Error saving gap analyses:', error);
            res.status(500).json({ error: 'Failed to save gap analyses' });
        }
    });
    router.get('/user-persisted/self-assessments', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            const { assessments, draft } = await ensureUserSelfAssessmentStore(actorId);
            res.json({ assessments, draft });
        } catch (error) {
            console.error('Error loading self assessments:', error);
            res.status(500).json({ error: 'Failed to load self assessments' });
        }
    });
    router.put('/user-persisted/self-assessments', authenticateToken, async (req, res) => {
        try {
            const actorId = Number(req.user.id);
            if (!actorCanWriteSelfAssessmentStore(actorId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            await ensureUserSelfAssessmentStore(actorId);
            const { assessments, draft } = req.body ?? {};
            const existing = await prisma.userSelfAssessmentStore.findUnique({
                where: { userId: actorId },
            });
            const ownedExisting = filterSelfAssessmentsForUser(existing?.assessments, actorId);
            const incomingAssessments =
                assessments !== undefined
                    ? stampSelfAssessmentsForUser(
                          filterSelfAssessmentsForUser(assessments, actorId),
                          actorId,
                      )
                    : undefined;
            const safeAssessments =
                incomingAssessments !== undefined &&
                incomingAssessments.length === 0 &&
                ownedExisting.length > 0 &&
                req.body?.forceReplaceAssessments !== true
                    ? ownedExisting
                    : incomingAssessments;
            const data = {
                assessments: safeAssessments !== undefined ? safeAssessments : ownedExisting,
                draft:
                    draft !== undefined
                        ? draft === null
                            ? null
                            : selfAssessmentDraftForUser({ ...draft, ownerUserId: actorId }, actorId)
                        : (existing?.draft ?? null),
            };
            const row = await prisma.userSelfAssessmentStore.upsert({
                where: { userId: actorId },
                create: { userId: actorId, ...data },
                update: data,
            });
            res.json({ ok: true, updatedAt: row.updatedAt });
        } catch (error) {
            console.error('Error saving self assessments:', error);
            res.status(500).json({ error: 'Failed to save self assessments' });
        }
    });

    router.post('/send-assessment-report', authenticateToken, async (req, res) => {
        const raw = req.body || {};
        const companyName = sanitizePersonName(raw.companyName, 200) || '';
        const auditorName = sanitizePersonName(raw.auditorName, 200) || '';
        const auditCompany = raw.auditCompany ? sanitizePersonName(raw.auditCompany, 200) : '';
        const standard = sanitizeShortLabel(raw.standard, 80) || '';
        const score = Number(raw.score);
        const date = raw.date;
        const questions = Array.isArray(raw.questions) ? raw.questions.slice(0, 500) : [];

        const recipientEmail = String(req.user.email || '').toLowerCase().trim();
        if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
            return res.status(400).json({ error: 'Your account does not have a valid email for report delivery.' });
        }

        if (raw.pdfBase64) {
            console.warn(`[assessment-report] Ignored client pdfBase64 from user ${req.user.id} (PSZL-015)`);
        }

        if (!companyName || !standard) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const uid = req.user.id;
        const last = assessmentReportEmailLastSent.get(uid) || 0;
        if (Date.now() - last < OTP_RESEND_COOLDOWN_MS) {
            const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - last)) / 1000);
            res.setHeader('Retry-After', String(remainingSeconds));
            return res.status(429).json({
                error: `Please wait ${remainingSeconds} seconds before sending another report email.`,
                retryAfterSeconds: remainingSeconds
            });
        }
        assessmentReportEmailLastSent.set(uid, Date.now());

        try {
            const total = questions?.length || 0;
            const yesCount = questions?.filter(q => q.answer === 'yes').length || 0;
            const noCount = questions?.filter(q => q.answer === 'no').length || 0;
            const percentage = total > 0 ? Math.round((yesCount / total) * 100) : 0;

            // Group questions by clause for detailed breakdown
            const clauseGroups = {};
            (questions || []).forEach(q => {
                const clauseKey = sanitizePlainText(q.clause, 200) || 'General';
                if (!clauseGroups[clauseKey]) clauseGroups[clauseKey] = { yes: 0, no: 0, total: 0 };
                clauseGroups[clauseKey].total++;
                if (q.answer === 'yes') clauseGroups[clauseKey].yes++;
                else clauseGroups[clauseKey].no++;
            });

            const clauseRows = Object.entries(clauseGroups).map(([clause, data]) => {
                const pct = Math.round((data.yes / data.total) * 100);
                const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
                const safeClause = escapeHtml(sanitizePlainText(clause, 200) || '');
                return `<tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${safeClause}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px;">${data.yes} / ${data.total}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
                        <span style="color:${color};font-weight:600;font-size:13px;">${pct}%</span>
                    </td>
                </tr>`;
            }).join('');

            const scoreColor = percentage >= 70 ? '#16a34a' : percentage >= 40 ? '#d97706' : '#dc2626';
            const stage = score >= 38 ? 'Mature Stage' : score >= 25 ? 'Moderate Stage' : 'Early Stage';

            if (!isSmtpConfigured()) {
                console.error('[assessment-report] SMTP_USER and SMTP_PASS must both be set to send report emails.');
                return res.status(503).json({ error: 'Email service is not configured. Please contact your administrator.' });
            }

            const mailOptions = {
                from: { name: 'iAudit Global', address: getSmtpFromAddress() },
                to: recipientEmail,
                subject: `Your ${escapeHtml(standard)} Self Assessment Report — ${escapeHtml(companyName)}`,
                html: `
                <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#f8fafc;">
                    <!-- Header -->
                    <div style="background:#213847;padding:28px 32px;border-radius:8px 8px 0 0;">
                        <h1 style="margin:0;color:#fff;font-size:22px;">Self Assessment Report</h1>
                        <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">${escapeHtml(standard)}</p>
                    </div>

                    <!-- Details -->
                    <div style="background:#fff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:160px;">Company</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${escapeHtml(companyName)}</td></tr>
                            ${auditCompany ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Company Being Audited</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${escapeHtml(auditCompany)}</td></tr>` : ''}
                            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Auditor</td><td style="padding:6px 0;font-size:13px;">${escapeHtml(auditorName || '-')}</td></tr>
                            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Date</td><td style="padding:6px 0;font-size:13px;">${date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td></tr>
                        </table>

                        <!-- Score Banner -->
                        <div style="background:#f1f5f9;border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:24px;">
                            <p style="margin:0 0 4px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Overall Score</p>
                            <span style="font-size:42px;font-weight:700;color:${scoreColor};">${score} <span style="font-size:22px;color:#94a3b8;">/ 50</span></span>
                            <p style="margin:8px 0 0;color:#475569;font-size:14px;">Maturity Stage: <strong>${stage}</strong></p>
                            <p style="margin:4px 0 0;color:#475569;font-size:13px;">${yesCount} Yes &nbsp;·&nbsp; ${noCount} No &nbsp;·&nbsp; ${total} Total Questions</p>
                        </div>

                        <!-- Clause Breakdown -->
                        <h3 style="margin:0 0 12px;font-size:15px;color:#1e293b;">Score by Clause</h3>
                        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                            <thead>
                                <tr style="background:#213847;">
                                    <th style="padding:10px 12px;text-align:left;color:#fff;font-size:13px;">Clause</th>
                                    <th style="padding:10px 12px;text-align:center;color:#fff;font-size:13px;">Compliance</th>
                                    <th style="padding:10px 12px;text-align:center;color:#fff;font-size:13px;">Score</th>
                                </tr>
                            </thead>
                            <tbody>${clauseRows}</tbody>
                        </table>
                    </div>

                    <!-- Footer -->
                    <div style="background:#f1f5f9;padding:16px 32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;text-align:center;">
                        <p style="margin:0;color:#94a3b8;font-size:12px;">This report was generated by AuditMate. For questions, contact your administrator.</p>
                    </div>
                </div>`
            };

            const pdfBuffer = await buildSelfAssessmentReportPdf({
                companyName,
                auditorName,
                auditCompany,
                standard,
                score,
                date,
                questions,
            });
            mailOptions.attachments = [{
                filename: `Self_Assessment_${companyName.replace(/\s+/g, '_')}_Report.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
            }];

            // Fire-and-forget: report is already saved client-side; do not block on SMTP latency.
            transporter.sendMail(mailOptions)
                .then(() => console.log(`Assessment report sent to ${recipientEmail}`))
                .catch((err) => console.error('Failed to send assessment report email:', err));

            res.json({ success: true });
        } catch (error) {
            console.error('Error sending assessment report:', error);
            res.status(500).json({ error: 'Failed to send report' });
        }
    });



    return router;
}
