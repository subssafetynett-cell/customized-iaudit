import { Router } from 'express';
import prisma, {
    isPrismaUniqueViolation,
    pool
} from '../prisma.js';
import {
    parsePaginationQuery,
    paginatedResponse
} from '../pagination.js';
import {
    sanitizeAuditDataPayload,
    stripHeavyAuditListPayload,
    escapeHtml
} from '../textSanitize.js';
import {
    collectOrgSubtreeUserIds,
    actorCanAccessTargetUser,
    actorIsAuditee,
    getAuditeeAssignedSiteIds,
    rejectIfAuditee,
    actorCanAccessAuditProgram,
    actorCanAccessAuditPlan,
    findUserByEmail,
    sendFindingAssignmentEmail,
    resolveActorOrgRootId,
    actorCanReadOrgAssessmentStore,
    validateAuditProgramAssignments,
    resolveAuditProgramCompanyId,
    validateAuditPlanAuditorAssignments,
    buildOrgSubtreeProgramVisibilityOr,
    buildOrgSubtreePlanVisibilityOr,
    buildAssignedAuditProgramVisibilityOr,
    buildAssignedAuditPlanVisibilityOr,
    actorHasFullOrgAuditVisibility,
    checkTrialExpiration,
    countOrgAuditPrograms,
    rejectIfTrialLimitExceeded
} from '../orgAccess.js';
import {
    transporter,
    isSmtpConfigured,
    getSmtpFromAddress,
    getAppLoginUrl
} from '../auth/otpMail.js';

import {
    applyFindingAssignmentToAuditData,
} from '../audit/findingAssignment.js';
import {
    AUDIT_LIFECYCLE,
    lifecycleStatusFromAuditData,
    lifecycleStatusSqlExpression,
} from '../audit/lifecycleStatus.js';
import {
    loadFindingsInboxPlans,
    syncAuditPlanFindingEmails,
} from '../audit/findingsInbox.js';
import {
    sendNcAssignmentEmail,
    sendFindingResponseEmail,
} from '../mail/smtp.js';
import {
    NcNotificationTemplates,
    createNotification,
} from '../notifications/index.js';

export function createAuditsRouter({ authenticateToken, checkTrialExpiration }) {
    const router = Router();

    router.get('/audit-programs', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { userId, full } = req.query;
        const wantFull = full === 'true';

        try {
            const actorId = req.user.id;
            let programWhere;

            if (await actorIsAuditee(actorId)) {
                const siteIds = await getAuditeeAssignedSiteIds(actorId);
                programWhere = siteIds.length > 0 ? { siteId: { in: siteIds } } : { id: -1 };
            } else {
            const useOrgScope =
                String(req.query.scope || '') === 'org' ||
                !userId ||
                userId === 'undefined' ||
                userId === 'null';

            if (useOrgScope && req.user.role !== 'superadmin') {
                const orgRootId = await resolveActorOrgRootId(actorId);
                if (!(await actorCanReadOrgAssessmentStore(actorId, orgRootId))) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
                if (await actorHasFullOrgAuditVisibility(actorId)) {
                    const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
                    programWhere = { OR: buildOrgSubtreeProgramVisibilityOr(subtreeIds) };
                } else {
                    programWhere = { OR: buildAssignedAuditProgramVisibilityOr(actorId) };
                }
            } else {
                let scopeUserId;
                if (userId && userId !== 'undefined' && userId !== 'null') {
                    scopeUserId = Number.parseInt(String(userId), 10);
                } else {
                    scopeUserId = actorId;
                }
                if (Number.isNaN(scopeUserId)) {
                    return res.status(400).json({ error: 'Invalid userId' });
                }
                if (!(await actorCanAccessTargetUser(actorId, scopeUserId))) {
                    return res.status(403).json({ error: 'Forbidden' });
                }

                const parsedUserId = scopeUserId;
                const user = await prisma.user.findUnique({ where: { id: parsedUserId } });
                const effectiveAdminId = user?.creatorId || parsedUserId;

                programWhere = {
                    OR: [
                        { userId: parsedUserId },
                        { leadAuditorId: parsedUserId },
                        { auditors: { some: { id: parsedUserId } } },
                        { user: { is: { creatorId: parsedUserId } } },
                        { user: { is: { id: effectiveAdminId } } },
                        { user: { is: { creatorId: effectiveAdminId } } }
                    ]
                };
            }
            }

            const programSelect = wantFull
                ? {
                    id: true,
                    name: true,
                    isoStandard: true,
                    frequency: true,
                    duration: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    siteId: true,
                    site: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    leadAuditor: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    auditors: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    scheduleData: true
                }
                : {
                    id: true,
                    name: true,
                    isoStandard: true,
                    frequency: true,
                    duration: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    siteId: true,
                    site: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    scheduleData: true
                };

            const search = String(req.query.search || '').trim();
            const standardFilter = String(req.query.standard || req.query.isoStandard || '').trim();
            const siteFilter = String(req.query.siteId || '').trim();
            const pagination = parsePaginationQuery(req.query, { defaultLimit: 8 });

            if (search) {
                programWhere = {
                    AND: [
                        programWhere,
                        { name: { contains: search, mode: 'insensitive' } },
                    ],
                };
            }
            if (standardFilter && standardFilter !== 'all') {
                programWhere = {
                    AND: [programWhere, { isoStandard: standardFilter }],
                };
            }
            if (siteFilter && siteFilter !== 'all') {
                const siteIdNum = Number.parseInt(siteFilter, 10);
                if (!Number.isNaN(siteIdNum)) {
                    programWhere = {
                        AND: [programWhere, { siteId: siteIdNum }],
                    };
                }
            }

            const mapPrograms = (programs) =>
                programs.map((p) => {
                    const sd = p.scheduleData && typeof p.scheduleData === 'object' ? p.scheduleData : null;
                    const isConfigured = Boolean(sd && Object.keys(sd).length > 0);
                    const departmentIds = Array.isArray(sd?.departmentIds)
                        ? sd.departmentIds.map((id) => String(id))
                        : [];
                    const departmentNames = Array.isArray(sd?.departmentNames)
                        ? sd.departmentNames.map((name) => String(name))
                        : [];

                    if (wantFull) {
                        return { ...p, isConfigured, departmentIds, departmentNames };
                    }

                    const { scheduleData: _, ...programWithoutData } = p;
                    return {
                        ...programWithoutData,
                        isConfigured,
                        departmentIds,
                        departmentNames,
                    };
                });

            if (!pagination.paginate) {
                const programs = await prisma.auditProgram.findMany({
                    where: programWhere,
                    orderBy: { createdAt: 'desc' },
                    select: programSelect,
                    take: pagination.take,
                });
                return res.json(mapPrograms(programs));
            }

            const [total, programs] = await Promise.all([
                prisma.auditProgram.count({ where: programWhere }),
                prisma.auditProgram.findMany({
                    where: programWhere,
                    orderBy: { createdAt: 'desc' },
                    select: programSelect,
                    skip: pagination.skip,
                    take: pagination.limit,
                }),
            ]);

            res.json(
                paginatedResponse(mapPrograms(programs), {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                }),
            );
        } catch (error) {
            console.error('Failed to fetch audit programs:', error);
            res.status(500).json({ error: 'Failed to fetch audit programs' });
        }
    });

    // Get single Audit Program (Full Details)
    router.get('/audit-programs/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        try {
            const program = await prisma.auditProgram.findUnique({
                where: { id: Number.parseInt(id) },
                include: {
                    site: { include: { company: true } },
                    auditors: true,
                    leadAuditor: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            });
            if (!program) return res.status(404).json({ error: 'Audit program not found' });
            if (!(await actorCanAccessAuditProgram(req.user.id, program))) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            res.json(program);
        } catch (error) {
            console.error('Failed to fetch audit program details:', error);
            res.status(500).json({ error: 'Failed to fetch audit program details' });
        }
    });

    router.post('/audit-programs', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { name, isoStandard, frequency, duration, siteId, auditorIds, leadAuditorId, scheduleData, userId } = req.body;
        try {
            const actorId = req.user.id;
            if (await rejectIfAuditee(actorId, res, 'Auditees cannot create audit programs')) {
                return;
            }
            const ownerId = userId != null ? Number.parseInt(String(userId), 10) : actorId;
            if (Number.isNaN(ownerId)) {
                return res.status(400).json({ error: 'Invalid userId' });
            }
            if (!(await actorCanAccessTargetUser(actorId, ownerId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const programCount = await countOrgAuditPrograms(actorId);
            const trialRejected = await rejectIfTrialLimitExceeded(
                actorId,
                'auditProgram',
                programCount + 1,
            );
            if (trialRejected) {
                return res.status(403).json(trialRejected);
            }

            const assignmentCheck = await validateAuditProgramAssignments(actorId, {
                siteId,
                leadAuditorId,
                auditorIds,
                scheduleData,
            });
            if (!assignmentCheck.ok) {
                return res.status(assignmentCheck.status).json({ error: assignmentCheck.error });
            }

            const program = await prisma.auditProgram.create({
                data: {
                    name,
                    isoStandard,
                    frequency,
                    duration: Number.parseInt(duration),
                    siteId: assignmentCheck.siteId,
                    auditors: {
                        connect: assignmentCheck.auditorIds.map((id) => ({ id })),
                    },
                    leadAuditorId: assignmentCheck.leadAuditorId,
                    scheduleData: scheduleData || {},
                    status: 'Draft',
                    userId: ownerId
                },
                include: {
                    site: true,
                    auditors: true,
                    leadAuditor: true
                }
            });
            res.status(201).json(program);
        } catch (error) {
            console.error('Error creating audit program:', error);
            res.status(500).json({ error: 'Failed to create audit program' });
        }
    });

    router.put('/audit-programs/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        const { name, isoStandard, frequency, duration, siteId, auditorIds, leadAuditorId, scheduleData, status } = req.body;
        try {
            const existing = await prisma.auditProgram.findUnique({
                where: { id: Number.parseInt(id) },
                include: { auditors: true, leadAuditor: true }
            });
            if (!existing) return res.status(404).json({ error: 'Audit program not found' });
            if (!(await actorCanAccessAuditProgram(req.user.id, existing))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const actorId = Number(req.user.id);
            const effectiveSiteId = siteId != null ? siteId : existing.siteId;
            const effectiveLeadAuditorId =
                leadAuditorId !== undefined ? leadAuditorId : existing.leadAuditorId;
            const effectiveAuditorIds =
                auditorIds !== undefined
                    ? auditorIds
                    : existing.auditors.map((a) => a.id);
            const effectiveScheduleData =
                scheduleData !== undefined ? scheduleData : existing.scheduleData;
            const assignmentCheck = await validateAuditProgramAssignments(actorId, {
                siteId: effectiveSiteId,
                leadAuditorId: effectiveLeadAuditorId,
                auditorIds: effectiveAuditorIds,
                scheduleData: effectiveScheduleData,
            });
            if (!assignmentCheck.ok) {
                return res.status(assignmentCheck.status).json({ error: assignmentCheck.error });
            }

            // Disconnect all current auditors first before connecting new ones to ensure clean update
            await prisma.auditProgram.update({
                where: { id: Number.parseInt(id) },
                data: {
                    auditors: {
                        set: []
                    }
                }
            });

            const program = await prisma.auditProgram.update({
                where: { id: Number.parseInt(id) },
                data: {
                    name,
                    isoStandard,
                    frequency,
                    duration: Number.parseInt(duration),
                    siteId: assignmentCheck.siteId,
                    auditors: {
                        connect: assignmentCheck.auditorIds.map((id) => ({ id })),
                    },
                    leadAuditorId: assignmentCheck.leadAuditorId,
                    scheduleData: scheduleData || {},
                    status: status || 'Draft'
                },
                include: {
                    site: true,
                    auditors: true,
                    leadAuditor: true
                }
            });
            res.json(program);
        } catch (error) {
            console.error('Error updating audit program:', error);
            res.status(500).json({ error: 'Failed to update audit program' });
        }
    });

    router.delete('/audit-programs/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        const programId = Number.parseInt(id);
        try {
            const existing = await prisma.auditProgram.findUnique({
                where: { id: programId },
                include: { auditors: true, leadAuditor: true }
            });
            if (!existing) return res.status(404).json({ error: 'Audit program not found' });
            if (!(await actorCanAccessAuditProgram(req.user.id, existing))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            await prisma.$transaction(async (tx) => {
                // Delete all associated audit plans first
                await tx.auditPlan.deleteMany({
                    where: { auditProgramId: programId }
                });

                // Then delete the program
                await tx.auditProgram.delete({
                    where: { id: programId }
                });
            });
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting audit program:', error);
            res.status(500).json({ error: 'Failed to delete audit program' });
        }
    });

    // Audit Plan Routes

    // Get all audit plans (optionally filter by programId)
    router.get('/audit-plans', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { programId, userId } = req.query;
        try {
            const whereClause = {};
            if (programId) whereClause.auditProgramId = Number.parseInt(programId);

            const superAll = req.user.role === 'superadmin' && String(req.query.scope || '') === 'all';

            if (!superAll) {
                const actorId = req.user.id;

                if (await actorIsAuditee(actorId)) {
                    const siteIds = await getAuditeeAssignedSiteIds(actorId);
                    whereClause.auditProgram = {
                        is: siteIds.length > 0 ? { siteId: { in: siteIds } } : { siteId: -1 },
                    };
                } else {
                const useOrgScope =
                    String(req.query.scope || '') === 'org' ||
                    !userId ||
                    userId === 'undefined' ||
                    userId === 'null';

                if (useOrgScope) {
                    const orgRootId = await resolveActorOrgRootId(actorId);
                    if (!(await actorCanReadOrgAssessmentStore(actorId, orgRootId))) {
                        return res.status(403).json({ error: 'Forbidden' });
                    }
                    if (await actorHasFullOrgAuditVisibility(actorId)) {
                        const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
                        whereClause.OR = buildOrgSubtreePlanVisibilityOr(subtreeIds);
                    } else {
                        whereClause.OR = buildAssignedAuditPlanVisibilityOr(actorId);
                    }
                } else {
                    let scopeUserId = Number.parseInt(String(userId), 10);
                    if (Number.isNaN(scopeUserId)) {
                        return res.status(400).json({ error: 'Invalid userId' });
                    }
                    if (!(await actorCanAccessTargetUser(actorId, scopeUserId))) {
                        return res.status(403).json({ error: 'Forbidden' });
                    }

                    const uId = scopeUserId;
                    const user = await prisma.user.findUnique({ where: { id: uId } });
                    const effectiveAdminId = user?.creatorId || uId;

                    whereClause.OR = [
                        { userId: uId },
                        { leadAuditorId: uId },
                        { auditors: { some: { id: uId } } },
                        { user: { is: { creatorId: uId } } },
                        { user: { is: { id: effectiveAdminId } } },
                        { user: { is: { creatorId: effectiveAdminId } } },
                        { auditProgram: { is: { userId: uId } } },
                        { auditProgram: { is: { leadAuditorId: uId } } },
                        { auditProgram: { is: { auditors: { some: { id: uId } } } } }
                    ];
                }
                }
            }

            const includeData = req.query.includeData === 'true';
            const pagination = parsePaginationQuery(req.query, { defaultLimit: 8 });
            const search = String(req.query.search || '').trim();
            const siteName = String(req.query.site || req.query.siteName || '').trim();
            const siteIdFilter = String(req.query.siteId || '').trim();
            const typeFilter = String(req.query.type || '').trim().toLowerCase();
            const statusFilter = String(req.query.status || '').trim().toUpperCase().replace(/\s+/g, '_');

            const andFilters = [];
            if (search) {
                andFilters.push({
                    OR: [
                        { auditName: { contains: search, mode: 'insensitive' } },
                        { executionId: { contains: search, mode: 'insensitive' } },
                        { location: { contains: search, mode: 'insensitive' } },
                    ],
                });
            }
            if (siteIdFilter && siteIdFilter !== 'all') {
                const siteIdNum = Number.parseInt(siteIdFilter, 10);
                if (!Number.isNaN(siteIdNum) && siteIdNum > 0) {
                    andFilters.push({
                        auditProgram: { is: { siteId: siteIdNum } },
                    });
                }
            }
            if (siteName && siteName !== 'all') {
                andFilters.push({
                    OR: [
                        { location: { equals: siteName, mode: 'insensitive' } },
                        {
                            auditProgram: {
                                is: {
                                    site: {
                                        is: { name: { equals: siteName, mode: 'insensitive' } },
                                    },
                                },
                            },
                        },
                    ],
                });
            }
            // Module vs ISO: module plans typically have a non-empty templateId.
            if (typeFilter === 'module') {
                andFilters.push({
                    AND: [
                        { templateId: { not: null } },
                        { NOT: { templateId: '' } },
                    ],
                });
            } else if (typeFilter === 'iso') {
                andFilters.push({
                    OR: [{ templateId: null }, { templateId: '' }],
                });
            }
            // Lifecycle status tabs: Planned | In Progress | Completed
            // Filter by derived progress (completedItems/totalItems/progress), not only the status column.
            if (
                statusFilter === 'PLANNED' ||
                statusFilter === 'IN_PROGRESS' ||
                statusFilter === 'COMPLETED'
            ) {
                const derivedExpr = lifecycleStatusSqlExpression();
                try {
                    await pool.query(
                        `WITH stale AS (
                            SELECT id, (${derivedExpr}) AS derived
                            FROM "AuditPlan"
                            WHERE status IS DISTINCT FROM (${derivedExpr})
                            ORDER BY "updatedAt" DESC
                            LIMIT 500
                         )
                         UPDATE "AuditPlan" AS ap
                         SET status = stale.derived
                         FROM stale
                         WHERE ap.id = stale.id`,
                    );
                } catch (syncErr) {
                    console.warn(
                        '[audit-plans] lifecycle status sync failed:',
                        syncErr?.message || syncErr,
                    );
                }
                try {
                    const idResult = await pool.query(
                        `SELECT id FROM "AuditPlan"
                         WHERE (${derivedExpr}) = $1
                         ORDER BY "updatedAt" DESC
                         LIMIT 5000`,
                        [statusFilter],
                    );
                    const matchingIds = idResult.rows
                        .map((row) => Number(row.id))
                        .filter((id) => Number.isInteger(id) && id > 0);
                    andFilters.push({
                        id: { in: matchingIds.length > 0 ? matchingIds : [-1] },
                    });
                } catch (filterErr) {
                    console.warn(
                        '[audit-plans] lifecycle status filter failed, falling back to status column:',
                        filterErr?.message || filterErr,
                    );
                    andFilters.push({ status: statusFilter });
                }
            }

            const listWhere =
                andFilters.length > 0 ? { AND: [whereClause, ...andFilters] } : whereClause;

            // List view (Audit Active List) only needs table columns + progress flags.
            // findingsData / auditors / auditData are omitted unless includeData=true.
            const planSelect = {
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
                status: true,
                ...(includeData
                    ? {
                          findingsData: true,
                          auditData: true,
                          auditors: {
                              select: {
                                  id: true,
                                  firstName: true,
                                  lastName: true,
                              },
                          },
                      }
                    : {}),
                leadAuditor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                auditProgram: {
                    select: {
                        id: true,
                        name: true,
                        // scheduleData can be multi‑MB — never include on list responses
                        site: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            };

            const listStartedAt = performance.now();
            const findManyArgs = {
                where: listWhere,
                orderBy: { createdAt: 'desc' },
                select: planSelect,
                skip: pagination.paginate ? pagination.skip : 0,
                take: pagination.paginate ? pagination.limit : pagination.take,
            };

            // Run page query + count in parallel (was sequential: findMany then count).
            const [plans, total] = pagination.paginate
                ? await Promise.all([
                      prisma.auditPlan.findMany(findManyArgs),
                      prisma.auditPlan.count({ where: listWhere }),
                  ])
                : [await prisma.auditPlan.findMany(findManyArgs), 0];
            const findMs = performance.now() - listStartedAt;
            const resolvedTotal = pagination.paginate ? total : plans.length;

            // Pull only progress / completed flags from Postgres JSON (avoids shipping full auditData).
            // Skip when includeData=true — progress is derived from the selected auditData blob.
            const planIds = plans.map((p) => p.id).filter((id) => Number.isInteger(id) && id > 0);
            /** @type {Map<number, { progress: number, auditCompleted: boolean }>} */
            const progressById = new Map();
            let progressMs = 0;
            if (!includeData && planIds.length > 0) {
                const progressStartedAt = performance.now();
                try {
                    const metaResult = await pool.query(
                        `SELECT
                            id,
                            COALESCE(("auditData"->>'progress')::double precision, 0) AS progress,
                            COALESCE(("auditData"->>'completedItems')::double precision, 0) AS "completedItems",
                            COALESCE(("auditData"->>'totalItems')::double precision, 0) AS "totalItems",
                            COALESCE(("auditData"->>'auditCompleted')::boolean, false) AS "auditCompleted"
                         FROM "AuditPlan"
                         WHERE id = ANY($1::int[])`,
                        [planIds],
                    );
                    for (const row of metaResult.rows) {
                        const id = Number(row.id);
                        const progressNum = Number(row.progress);
                        const completedNum = Number(row.completedItems);
                        const totalNum = Number(row.totalItems);
                        let progress = Number.isFinite(progressNum)
                            ? Math.min(100, Math.max(0, Math.round(progressNum)))
                            : 0;
                        if (
                            Number.isFinite(completedNum) &&
                            Number.isFinite(totalNum) &&
                            totalNum > 0
                        ) {
                            progress = Math.min(
                                100,
                                Math.max(0, Math.round((completedNum / totalNum) * 100)),
                            );
                        }
                        progressById.set(id, {
                            progress,
                            auditCompleted: row.auditCompleted === true,
                        });
                    }
                } catch (metaErr) {
                    console.warn('[audit-plans] progress meta query failed:', metaErr?.message || metaErr);
                }
                progressMs = performance.now() - progressStartedAt;
            }

            const optimizedPlans = plans.map((plan) => {
                const meta = progressById.get(plan.id) || { progress: 0, auditCompleted: false };
                let progress = meta.progress;
                let auditCompleted = meta.auditCompleted;

                if (includeData && plan.auditData) {
                    try {
                        const data =
                            typeof plan.auditData === 'string'
                                ? JSON.parse(plan.auditData)
                                : plan.auditData;
                        if (data && typeof data === 'object') {
                            if (data.progress != null) {
                                const p = Number(data.progress);
                                if (Number.isFinite(p)) {
                                    progress = Math.min(100, Math.max(0, Math.round(p)));
                                }
                            }
                            if (data.auditCompleted === true) auditCompleted = true;
                        }
                    } catch {
                        /* ignore */
                    }
                }

                // Badge / tabs: prefer progress-derived lifecycle so UI matches answer state.
                const derivedStatus =
                    progress <= 0
                        ? AUDIT_LIFECYCLE.PLANNED
                        : progress >= 100
                          ? AUDIT_LIFECYCLE.COMPLETED
                          : AUDIT_LIFECYCLE.IN_PROGRESS;

                if (!includeData) {
                    return {
                        ...plan,
                        status: derivedStatus,
                        progress,
                        auditCompleted,
                    };
                }

                // Strip evidence/base64 so list payloads stay small (findings pages still work).
                return {
                    ...plan,
                    status: derivedStatus,
                    auditData: stripHeavyAuditListPayload(plan.auditData),
                    findingsData: stripHeavyAuditListPayload(plan.findingsData),
                    progress,
                    auditCompleted,
                };
            });

            const totalMs = performance.now() - listStartedAt;
            res.setHeader(
                'Server-Timing',
                `db;desc="find+count";dur=${findMs.toFixed(1)}, progress;dur=${progressMs.toFixed(1)}, total;dur=${totalMs.toFixed(1)}`,
            );
            res.setHeader('X-Response-Time', `${totalMs.toFixed(1)}ms`);

            if (!pagination.paginate) {
                return res.json(optimizedPlans);
            }
            res.json(
                paginatedResponse(optimizedPlans, {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: resolvedTotal,
                }),
            );
        } catch (error) {
            console.error('Failed to fetch audit plans:', error);
            res.status(500).json({ error: 'Failed to fetch audit plans' });
        }
    });

    // Get single Audit Plan (Full Details) — slim selects (no deep company/auditor dumps)
    router.get('/audit-plans/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        const planId = Number.parseInt(id, 10);
        if (!Number.isInteger(planId) || planId < 1) {
            return res.status(400).json({ error: 'Invalid audit plan id' });
        }
        try {
            const startedAt = performance.now();
            const plan = await prisma.auditPlan.findUnique({
                where: { id: planId },
                select: {
                    id: true,
                    executionId: true,
                    auditType: true,
                    auditName: true,
                    templateId: true,
                    date: true,
                    location: true,
                    scope: true,
                    objective: true,
                    criteria: true,
                    leadAuditorId: true,
                    auditProgramId: true,
                    userId: true,
                    status: true,
                    itinerary: true,
                    auditData: true,
                    findingsData: true,
                    createdAt: true,
                    updatedAt: true,
                    leadAuditor: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    auditors: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    auditProgram: {
                        select: {
                            id: true,
                            name: true,
                            frequency: true,
                            duration: true,
                            createdAt: true,
                            scheduleData: true,
                            siteId: true,
                            userId: true,
                            leadAuditorId: true,
                            site: {
                                select: {
                                    id: true,
                                    name: true,
                                    companyId: true,
                                    company: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                            leadAuditor: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                            auditors: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!plan) return res.status(404).json({ error: 'Audit plan not found' });
            if (!(await actorCanAccessAuditPlan(req.user.id, plan))) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const ms = performance.now() - startedAt;
            res.setHeader('Server-Timing', `db;dur=${ms.toFixed(1)}`);
            res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`);
            // Alias site onto plan for execute UI that reads plan.site
            const site = plan.auditProgram?.site || null;
            res.json({ ...plan, site });
        } catch (error) {
            console.error('Failed to fetch audit plan details:', error);
            res.status(500).json({ error: 'Failed to fetch audit plan details' });
        }
    });

    // Create Audit Plan
    router.post('/audit-plans', authenticateToken, checkTrialExpiration, async (req, res) => {
        const {
            auditProgramId, executionId, auditType, auditName, templateId, date, location,
            scope, objective, criteria,
            leadAuditorId, auditorIds, itinerary, userId
        } = req.body;

        if (!auditProgramId) {
            import('fs').then(fs => fs.appendFileSync('audit_debug.log', JSON.stringify({ error: "Missing auditProgramId", body: req.body }) + '\n'));
            return res.status(400).json({ error: 'Missing required field: auditProgramId' });
        }

        try {
            const program = await prisma.auditProgram.findUnique({
                where: { id: Number.parseInt(auditProgramId, 10) },
                include: {
                    auditors: true,
                    leadAuditor: true,
                    site: { select: { companyId: true } },
                },
            });
            if (!program) return res.status(404).json({ error: 'Audit program not found' });
            if (!(await actorCanAccessAuditProgram(req.user.id, program))) {
                return res.status(403).json({ error: 'You do not have permission to create an audit plan for this program' });
            }

            const actorId = Number(req.user.id);
            const planOwnerId = userId != null ? Number.parseInt(String(userId), 10) : actorId;
            if (!Number.isInteger(planOwnerId) || planOwnerId < 1 || !(await actorCanAccessTargetUser(actorId, planOwnerId))) {
                return res.status(403).json({ error: 'You do not have permission to create an audit plan for this user' });
            }

            const programCompanyId = await resolveAuditProgramCompanyId(program);
            const auditorCheck = await validateAuditPlanAuditorAssignments(actorId, {
                companyId: programCompanyId,
                leadAuditorId,
                auditorIds,
            });
            if (!auditorCheck.ok) {
                return res.status(auditorCheck.status).json({ error: auditorCheck.error });
            }

            const plan = await prisma.auditPlan.create({
                data: {
                    auditProgramId: Number.parseInt(auditProgramId, 10),
                    executionId,
                    auditType,
                    auditName,
                    templateId,
                    date: date ? new Date(date) : null,
                    location,
                    scope,
                    objective,
                    criteria,
                    leadAuditorId: auditorCheck.leadAuditorId,
                    auditors: {
                        connect: auditorCheck.auditorIds.map((id) => ({ id })),
                    },
                    itinerary: itinerary || [],
                    userId: planOwnerId,
                    status: AUDIT_LIFECYCLE.PLANNED,
                }
            });
            res.status(201).json(plan);
        } catch (error) {
            console.error('Error saving audit plan:', error);
            import('fs').then(fs => fs.appendFileSync('audit_debug.log', JSON.stringify({ error: error.message, stack: error.stack, body: req.body }) + '\n'));
            if (isPrismaUniqueViolation(error)) {
                return res.status(409).json({ error: 'An audit plan for this program and execution already exists.' });
            }
            res.status(500).json({ error: 'Failed to save audit plan', details: error.message });
        }
    });

    // Update Audit Plan
    router.put('/audit-plans/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        const {
            auditType, auditName, templateId, date, location,
            scope, objective, criteria,
            leadAuditorId, auditorIds, itinerary
        } = req.body;

        try {
            const existing = await prisma.auditPlan.findUnique({
                where: { id: Number.parseInt(id) },
                include: {
                    auditors: true,
                    auditProgram: {
                        include: {
                            auditors: true,
                            leadAuditor: true,
                            site: { select: { companyId: true } },
                        },
                    },
                },
            });
            if (!existing) return res.status(404).json({ error: 'Audit plan not found' });
            if (!(await actorCanAccessAuditPlan(req.user.id, existing))) {
                return res.status(403).json({ error: 'You do not have permission to update this audit plan' });
            }
            if (await actorIsAuditee(Number(req.user.id))) {
                return res.status(403).json({
                    error: 'Auditees can view and download audits only',
                });
            }

            const actorId = Number(req.user.id);
            const programCompanyId = await resolveAuditProgramCompanyId(existing.auditProgram);
            let validatedAuditors = null;
            if (leadAuditorId !== undefined || auditorIds !== undefined) {
                const effectiveLeadAuditorId =
                    leadAuditorId !== undefined ? leadAuditorId : existing.leadAuditorId;
                const effectiveAuditorIds =
                    auditorIds !== undefined
                        ? auditorIds
                        : existing.auditors.map((a) => a.id);
                // Keep currently assigned auditors allowed even if they became inactive,
                // so saving an existing plan does not randomly return 403.
                const grandfatherIds = [
                    existing.leadAuditorId,
                    ...existing.auditors.map((a) => a.id),
                ];
                validatedAuditors = await validateAuditPlanAuditorAssignments(actorId, {
                    companyId: programCompanyId,
                    leadAuditorId: effectiveLeadAuditorId,
                    auditorIds: effectiveAuditorIds,
                    grandfatherIds,
                });
                if (!validatedAuditors.ok) {
                    return res.status(validatedAuditors.status).json({ error: validatedAuditors.error });
                }
            }

            const updateData = {};
            if (auditType !== undefined) updateData.auditType = auditType;
            if (auditName !== undefined) updateData.auditName = auditName;
            if (templateId !== undefined) updateData.templateId = templateId;
            if (date !== undefined) updateData.date = date ? new Date(date) : null;
            if (location !== undefined) updateData.location = location;
            if (scope !== undefined) updateData.scope = scope;
            if (objective !== undefined) updateData.objective = objective;
            if (criteria !== undefined) updateData.criteria = criteria;
            if (leadAuditorId !== undefined && validatedAuditors) {
                updateData.leadAuditorId = validatedAuditors.leadAuditorId;
            }
            if (auditorIds !== undefined && validatedAuditors) {
                updateData.auditors = {
                    set: [],
                    connect: validatedAuditors.auditorIds.map((aid) => ({ id: aid })),
                };
            }
            if (itinerary !== undefined) updateData.itinerary = itinerary;
            if (req.body.auditData !== undefined) {
                updateData.auditData = sanitizeAuditDataPayload(req.body.auditData);
            }
            if (req.body.findingsData !== undefined) updateData.findingsData = req.body.findingsData;
            updateData.updatedAt = new Date();

            // Do not echo multi‑MB auditData back to the client — Save Audit only needs ack + progress.
            let progress = 0;
            let auditCompleted = false;
            let lifecycleStatus = existing.status || AUDIT_LIFECYCLE.PLANNED;
            if (updateData.auditData && typeof updateData.auditData === 'object') {
                const p = Number(updateData.auditData.progress);
                if (Number.isFinite(p)) progress = Math.min(100, Math.max(0, Math.round(p)));
                auditCompleted = updateData.auditData.auditCompleted === true;
                lifecycleStatus = lifecycleStatusFromAuditData(updateData.auditData);
                updateData.status = lifecycleStatus;
            } else if (updateData.auditData === null) {
                lifecycleStatus = AUDIT_LIFECYCLE.PLANNED;
                updateData.status = lifecycleStatus;
            }

            const plan = await prisma.auditPlan.update({
                where: { id: Number.parseInt(id) },
                data: updateData,
                select: {
                    id: true,
                    updatedAt: true,
                    auditName: true,
                    executionId: true,
                    templateId: true,
                    auditProgramId: true,
                    status: true,
                },
            });
            if (updateData.auditData !== undefined) {
                // Fire-and-forget denormalized email index for findings inbox.
                void syncAuditPlanFindingEmails(plan.id, updateData.auditData);
            }
            res.status(200).json({
                ...plan,
                progress,
                auditCompleted,
                status: plan.status || lifecycleStatus,
                saved: true,
            });
        } catch (error) {
            console.error('Error updating audit plan:', error);
            res.status(500).json({ error: 'Failed to update audit plan' });
        }
    });

    async function handleFindingsInboxRequest(req, res) {
        const actorId = Number(req.user?.id);
        const rawOwnership = String(req.query.ownership || req.query.type || 'assigned')
            .toLowerCase()
            .trim();
        const ownership =
            rawOwnership === 'raised'
                ? 'raised'
                : rawOwnership === 'visible' || rawOwnership === 'dashboard'
                  ? 'visible'
                  : 'assigned';

        try {
            const plans = await loadFindingsInboxPlans(
                {
                    actorIsAuditee,
                    getAuditeeAssignedSiteIds,
                    actorHasFullOrgAuditVisibility,
                    resolveActorOrgRootId,
                    collectOrgSubtreeUserIds,
                    buildOrgSubtreePlanVisibilityOr,
                    buildAssignedAuditPlanVisibilityOr,
                },
                actorId,
                ownership,
            );
            res.json(plans);
        } catch (error) {
            console.error('Failed to fetch findings inbox:', error);
            res.status(500).json({ error: 'Failed to fetch findings' });
        }
    }

    /** Ownership-scoped findings inbox: ?ownership=assigned|raised|visible (alias: ?type=). */
    router.get('/audit-findings', authenticateToken, checkTrialExpiration, handleFindingsInboxRequest);

    /**
     * Recent findings for dashboard widgets.
     * Returns slim plan rows (same shape as /audit-findings); clients extract and slice.
     * Query: ?limit=5 (max 20).
     */
    router.get('/audit-findings/recent', authenticateToken, checkTrialExpiration, async (req, res) => {
        const actorId = Number(req.user?.id);
        const limitRaw = Number.parseInt(String(req.query.limit ?? '5'), 10);
        const limit = Number.isFinite(limitRaw)
            ? Math.min(20, Math.max(1, limitRaw))
            : 5;
        try {
            const plans = await loadFindingsInboxPlans(
                {
                    actorIsAuditee,
                    getAuditeeAssignedSiteIds,
                    actorHasFullOrgAuditVisibility,
                    resolveActorOrgRootId,
                    collectOrgSubtreeUserIds,
                    buildOrgSubtreePlanVisibilityOr,
                    buildAssignedAuditPlanVisibilityOr,
                },
                actorId,
                'visible',
            );
            // Newest plans first already; cap payload for the recent widget.
            res.json(plans.slice(0, Math.max(limit, 8)));
        } catch (error) {
            console.error('Failed to fetch recent findings:', error);
            res.status(500).json({ error: 'Failed to fetch recent findings' });
        }
    });

    router.get('/assigned-audit-findings', authenticateToken, checkTrialExpiration, async (req, res) => {
        // Backward compatible: defaults to assigned; accepts ?ownership= / ?type=
        if (!req.query.ownership && !req.query.type) {
            req.query.ownership = 'assigned';
        }
        return handleFindingsInboxRequest(req, res);
    });

    router.post('/audit-plans/:id/notify-finding-assignment', authenticateToken, checkTrialExpiration, async (req, res) => {
        const planId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(planId)) {
            return res.status(400).json({ error: 'Invalid audit plan id' });
        }

        const {
            assignToEmail,
            assignToName,
            findingRef,
            findingType,
            assignment,
            raisedByName,
            kind,
            rowPatch,
        } = req.body || {};
        const actorId = Number(req.user?.id);
        const isNcStyle =
            String(kind || '').toLowerCase() === 'nonconformance' ||
            String(kind || '').toLowerCase() === 'nc';

        try {
            const existing = await prisma.auditPlan.findUnique({
                where: { id: planId },
                include: {
                    auditors: true,
                    auditProgram: { include: { auditors: true, leadAuditor: true } },
                },
            });
            if (!existing) return res.status(404).json({ error: 'Audit plan not found' });
            if (!(await actorCanAccessAuditPlan(actorId, existing))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const lookup = await findUserByEmail(assignToEmail);
            if (lookup.error) {
                return res.status(lookup.status || 400).json({ error: lookup.error });
            }
            if (!lookup.found) {
                return res.status(404).json({ error: 'User does not exist. Please create the user.' });
            }

            const resolvedName = assignToName || lookup.name;
            const safeRowPatch =
                rowPatch && typeof rowPatch === 'object'
                    ? Object.fromEntries(
                          Object.entries(rowPatch).filter(
                              ([k, v]) =>
                                  [
                                      'findings',
                                      'raisedBy',
                                      'raisedByName',
                                      'raisedByEmail',
                                      'targetDate',
                                      'description',
                                      'details',
                                      'ofi',
                                  ].includes(k) &&
                                  (typeof v === 'string' || typeof v === 'number'),
                          ),
                      )
                    : null;
            let persistedAuditData = existing.auditData;
            if (assignment?.source && assignment?.key != null) {
                persistedAuditData = applyFindingAssignmentToAuditData(
                    existing.auditData,
                    assignment,
                    lookup.email,
                    resolvedName,
                    safeRowPatch,
                );
                await prisma.auditPlan.update({
                    where: { id: planId },
                    data: {
                        auditData: sanitizeAuditDataPayload(persistedAuditData),
                        updatedAt: new Date(),
                    },
                });
                void syncAuditPlanFindingEmails(planId, persistedAuditData);
            }

            const assigner = await prisma.user.findUnique({
                where: { id: actorId },
                select: { firstName: true, lastName: true, email: true },
            });
            const assignerName =
                `${assigner?.firstName || ''} ${assigner?.lastName || ''}`.trim() ||
                assigner?.email ||
                'A team member';
            const raisedName = String(raisedByName || '').trim() || assignerName;

            // Queue email — never block the HTTP response on SMTP (Coolify 504 risk).
            const mailPromise = isNcStyle
                ? sendNcAssignmentEmail({
                    assignToEmail: lookup.email,
                    assignToName: resolvedName,
                    raisedByName: raisedName,
                    auditName: existing.auditName,
                    findingRef,
                    auditPlanId: planId,
                })
                : sendFindingAssignmentEmail({
                    assignToEmail: lookup.email,
                    assignToName: resolvedName,
                    assignerName,
                    auditName: existing.auditName,
                    findingRef,
                    findingType,
                    auditPlanId: planId,
                });
            void mailPromise.catch((err) =>
                console.error('[FINDING-ASSIGN] Email send failed:', err?.message || err),
            );

            // In-app notification for the assignee (Findings / NC inbox).
            if (Number(lookup.id) !== actorId) {
                try {
                    const tpl = isNcStyle
                        ? NcNotificationTemplates.findingAssigned(findingRef, raisedName)
                        : {
                              type: 'FINDING_ASSIGNED',
                              title: 'Finding assigned',
                              message: `${assignerName} assigned you a finding (${findingRef || 'Finding'}).`,
                          };
                    await createNotification(prisma, {
                        recipientUserId: lookup.id,
                        nonconformanceId: null,
                        ...tpl,
                    });
                } catch (notifErr) {
                    console.error('[FINDING-ASSIGN] Failed to create in-app notification:', notifErr);
                }
            }

            return res.json({
                ok: true,
                notified: true,
                emailed: 'queued',
                persisted: Boolean(assignment?.source && assignment?.key != null),
                assignee: { id: lookup.id, name: lookup.name, email: lookup.email },
            });
        } catch (error) {
            console.error('Failed to notify finding assignment:', error);
            return res.status(500).json({ error: 'Failed to send assignment notification' });
        }
    });

    /**
     * Notify the reporter (raised-by) when an assignee submits a finding response.
     * Used for informal NC/exception findings that are not formal Nonconformance records.
     */
    router.post('/audit-plans/:id/notify-finding-response', authenticateToken, checkTrialExpiration, async (req, res) => {
        const planId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(planId)) {
            return res.status(400).json({ error: 'Invalid audit plan id' });
        }

        const {
            findingId,
            findingRef,
            raisedByEmail,
            raisedByUserId,
            nonconformanceId,
            isUpdate,
        } = req.body || {};
        const actorId = Number(req.user?.id);
        const updated = Boolean(isUpdate);

        try {
            const existing = await prisma.auditPlan.findUnique({
                where: { id: planId },
                include: {
                    auditors: true,
                    auditProgram: { include: { auditors: true, leadAuditor: true } },
                },
            });
            if (!existing) return res.status(404).json({ error: 'Audit plan not found' });
            if (!(await actorCanAccessAuditPlan(actorId, existing))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const actor = await prisma.user.findUnique({
                where: { id: actorId },
                select: { firstName: true, lastName: true, email: true },
            });
            const responderName =
                `${actor?.firstName || ''} ${actor?.lastName || ''}`.trim() ||
                actor?.email ||
                'The assignee';

            let lookup = { found: false, id: null, name: '', email: '' };
            const reporterId = Number(raisedByUserId);
            if (Number.isInteger(reporterId) && reporterId > 0) {
                const user = await prisma.user.findUnique({
                    where: { id: reporterId },
                    select: { id: true, firstName: true, lastName: true, email: true },
                });
                if (user) {
                    lookup = {
                        found: true,
                        id: user.id,
                        name:
                            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                            user.email ||
                            '',
                        email: user.email || '',
                    };
                }
            }
            if (!lookup.found && raisedByEmail) {
                const byEmail = await findUserByEmail(raisedByEmail);
                if (byEmail.error) {
                    return res.status(byEmail.status || 400).json({ error: byEmail.error });
                }
                if (byEmail.found) {
                    lookup = {
                        found: true,
                        id: byEmail.id,
                        name: byEmail.name,
                        email: byEmail.email,
                    };
                }
            }
            if (!lookup.found) {
                return res.status(404).json({
                    error: 'Reporter user not found for the raised-by email.',
                });
            }

            const safeFindingId = String(findingId || '').trim();
            const linkPath = nonconformanceId
                ? `/nonconformances/${Number(nonconformanceId)}`
                : safeFindingId
                  ? `/audit-findings/${planId}/${encodeURIComponent(safeFindingId)}`
                  : '/audit-findings?tab=raised';

            let notifiedInApp = false;
            if (Number(lookup.id) !== actorId) {
                try {
                    const tpl = NcNotificationTemplates.findingResponseSubmitted(
                        findingRef || safeFindingId || 'Finding',
                        responderName,
                        updated,
                    );
                    await createNotification(prisma, {
                        recipientUserId: lookup.id,
                        nonconformanceId: nonconformanceId ? Number(nonconformanceId) : null,
                        linkPath,
                        ...tpl,
                    });
                    notifiedInApp = true;
                } catch (notifErr) {
                    console.error('[FINDING-RESPONSE] Failed to create notification:', notifErr);
                }
            }

            let mailResult = { sent: false, skipped: true };
            if (lookup.email && Number(lookup.id) !== actorId) {
                mailResult = { sent: false, skipped: false, queued: true };
                void sendFindingResponseEmail({
                    reporterEmail: lookup.email,
                    reporterName: lookup.name,
                    responderName,
                    auditName: existing.auditName,
                    findingRef: findingRef || safeFindingId,
                    auditPlanId: planId,
                    findingId: safeFindingId,
                    nonconformanceId: nonconformanceId ? Number(nonconformanceId) : null,
                    isUpdate: updated,
                }).catch((mailErr) => {
                    console.error('[FINDING-RESPONSE] Failed to send email:', mailErr);
                });
            }

            return res.json({
                ok: true,
                notified: notifiedInApp || mailResult.queued === true,
                emailed: mailResult.queued === true ? 'queued' : false,
                reporter: { id: lookup.id, name: lookup.name, email: lookup.email },
            });
        } catch (error) {
            console.error('Failed to notify finding response:', error);
            return res.status(500).json({ error: 'Failed to send response notification' });
        }
    });

    /**
     * Notify the assignee after the reporter accepts/closes or rejects/reopens a response.
     */
    router.post('/audit-plans/:id/notify-finding-review', authenticateToken, checkTrialExpiration, async (req, res) => {
        const planId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(planId)) {
            return res.status(400).json({ error: 'Invalid audit plan id' });
        }

        const {
            findingId,
            findingRef,
            assignToEmail,
            decision,
            reason,
            nonconformanceId,
        } = req.body || {};
        const actorId = Number(req.user?.id);
        const decisionNorm = String(decision || '').trim().toUpperCase();
        if (decisionNorm !== 'ACCEPT' && decisionNorm !== 'REJECT') {
            return res.status(400).json({ error: 'decision must be ACCEPT or REJECT' });
        }
        if (decisionNorm === 'REJECT' && !String(reason || '').trim()) {
            return res.status(400).json({ error: 'reason is required when rejecting' });
        }

        try {
            const existing = await prisma.auditPlan.findUnique({
                where: { id: planId },
                include: {
                    auditors: true,
                    auditProgram: { include: { auditors: true, leadAuditor: true } },
                },
            });
            if (!existing) return res.status(404).json({ error: 'Audit plan not found' });
            if (!(await actorCanAccessAuditPlan(actorId, existing))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const lookup = await findUserByEmail(assignToEmail);
            if (lookup.error) {
                return res.status(lookup.status || 400).json({ error: lookup.error });
            }
            if (!lookup.found) {
                return res.status(404).json({ error: 'Assignee user not found.' });
            }

            const safeFindingId = String(findingId || '').trim();
            const linkPath = nonconformanceId
                ? `/nonconformances/${Number(nonconformanceId)}`
                : safeFindingId
                  ? `/audit-findings/${planId}/${encodeURIComponent(safeFindingId)}`
                  : '/audit-findings?tab=assigned';

            const tpl =
                decisionNorm === 'ACCEPT'
                    ? NcNotificationTemplates.findingReviewAccepted(
                          findingRef || safeFindingId || 'Finding',
                      )
                    : NcNotificationTemplates.findingReviewRejected(
                          findingRef || safeFindingId || 'Finding',
                          reason,
                      );

            let notifiedInApp = false;
            if (Number(lookup.id) !== actorId) {
                try {
                    await createNotification(prisma, {
                        recipientUserId: lookup.id,
                        nonconformanceId: nonconformanceId ? Number(nonconformanceId) : null,
                        linkPath,
                        ...tpl,
                    });
                    notifiedInApp = true;
                } catch (notifErr) {
                    console.error('[FINDING-REVIEW] Failed to create notification:', notifErr);
                }
            }

            // Best-effort email — never await SMTP on the request path.
            let mailed = false;
            if (lookup.email && Number(lookup.id) !== actorId && isSmtpConfigured()) {
                mailed = true;
                const actor = await prisma.user.findUnique({
                    where: { id: actorId },
                    select: { firstName: true, lastName: true, email: true },
                });
                const reporterName =
                    `${actor?.firstName || ''} ${actor?.lastName || ''}`.trim() ||
                    actor?.email ||
                    'The reporter';
                const base = getAppLoginUrl();
                const subject =
                    decisionNorm === 'ACCEPT'
                        ? `Response accepted — finding closed`
                        : `Response rejected — please revise`;
                const bodyReason =
                    decisionNorm === 'REJECT'
                        ? `<p style="font-size: 15px; line-height: 1.6;"><strong>Reason:</strong> ${escapeHtml(String(reason || ''))}</p>`
                        : '';
                void transporter
                    .sendMail({
                        from: getSmtpFromAddress(),
                        to: lookup.email,
                        subject,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
                                <h2 style="color: #213847;">${escapeHtml(tpl.title)}</h2>
                                <p style="font-size: 15px; line-height: 1.6;">
                                    <strong>${escapeHtml(reporterName)}</strong> reviewed your response for
                                    <strong>${escapeHtml(findingRef || safeFindingId || 'a finding')}</strong>
                                    on <strong>${escapeHtml(existing.auditName || 'an audit')}</strong>.
                                </p>
                                ${bodyReason}
                                <p style="margin: 24px 0;">
                                    <a href="${base}${linkPath}" style="display: inline-block; background: #1e855e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                                        Open finding
                                    </a>
                                </p>
                            </div>
                        `,
                        text: `${tpl.message} Open: ${base}${linkPath}`,
                    })
                    .catch((mailErr) => {
                        console.error('[FINDING-REVIEW] Failed to send email:', mailErr);
                    });
            }

            return res.json({
                ok: true,
                notified: notifiedInApp || mailed,
                emailed: mailed ? 'queued' : false,
                assignee: { id: lookup.id, name: lookup.name, email: lookup.email },
            });
        } catch (error) {
            console.error('Failed to notify finding review:', error);
            return res.status(500).json({ error: 'Failed to send review notification' });
        }
    });
    router.delete('/audit-plans/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        try {
            const existing = await prisma.auditPlan.findUnique({
                where: { id: Number.parseInt(id) },
                include: {
                    auditors: true,
                    auditProgram: { include: { auditors: true, leadAuditor: true } }
                }
            });
            if (!existing) return res.status(404).json({ error: 'Audit plan not found' });
            if (!(await actorCanAccessAuditPlan(req.user.id, existing))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            await prisma.auditPlan.delete({
                where: { id: Number.parseInt(id) }
            });
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting audit plan:', error);
            res.status(500).json({ error: 'Failed to delete audit plan' });
        }
    });




    return router;
}
