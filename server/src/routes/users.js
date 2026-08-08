import { Router } from 'express';
import express from 'express';
import bcrypt from 'bcrypt';
import prisma, {
    handlePrismaError,
    isPrismaForeignKeyViolation,
    isPrismaUniqueViolation
} from '../prisma.js';
import {
    parsePaginationQuery,
    paginatedResponse
} from '../pagination.js';
import {
    PERSON_NAME_MAX,
    sanitizePersonName,
    personNameValidationError,
    sanitizePhoneField,
    phoneFieldValidationError,
    sanitizePlainText,
    sanitizeShortLabel
} from '../textSanitize.js';
import {
    clearSessionCookie,
    invalidateAllUserSessions,
    LOGIN_SUCCESS_USER_SELECT,
    ensureUserTrialStarted
} from '../session.js';
import {
    sendOtpToEmailAddress,
    sendPasswordChangedNotificationEmail
} from '../auth/otpMail.js';
import {
    invalidateOrgLookupCaches,
    getOrgRootUserId,
    collectOrgSubtreeUserIds,
    collectOrgMemberUserIds,
    actorCanAccessTargetUser,
    actorCanViewUserBillingStatus,
    findUserByEmail,
    USER_ASSIGNABLE_ROLES,
    normalizeUserRole,
    actorCanManageOrgUsers,
    actorCanEditOrgUsers,
    assertActorMayModifyProtectedCompanyOwner,
    userRowHasOrgAdminPrivileges,
    countActiveOrgAdministrators,
    LAST_ACTIVE_ADMIN_MESSAGE,
    actorCanInviteOrgUser,
    actorIsLeadAuditor,
    actorCanInviteAuditee,
    actorCanAssignAuditeeToSite,
    siteUserIsAuditee,
    parseAuditeeSiteIds,
    assignAuditeeToSites,
    formatAuditeeSiteLabels,
    defaultAuditeeNamesFromEmail,
    actorCanManageAuditee,
    ensureOrphanUserOrgLink,
} from '../orgAccess.js';
import { deleteUserCompletely } from '../deleteUser.js';
import {
    PASSWORD_REGEX,
    PASSWORD_REQUIREMENTS_MESSAGE,
    NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE,
} from '../passwordPolicy.js';

async function postUserEmailChangeSendOtp(req, res) {
    const targetId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    const actorId = Number(req.user?.id);
    if (Number.isNaN(actorId)) {
        return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    }
    let { newEmail } = req.body;
    if (!newEmail || typeof newEmail !== 'string') {
        return res.status(400).json({ error: 'Valid new email is required' });
    }
    newEmail = newEmail.toLowerCase().trim();
    const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailFmt.test(newEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    try {
        if (!(await actorCanAccessTargetUser(actorId, targetId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) {
            return res.status(404).json({ error: 'User not found' });
        }
        const currentNorm = (target.email || '').toLowerCase().trim();
        if (currentNorm === newEmail) {
            return res.status(400).json({ error: 'This is already the user\'s current email' });
        }
        const taken = await prisma.user.findFirst({
            where: { email: newEmail, NOT: { id: targetId } }
        });
        if (taken) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        await sendOtpToEmailAddress(newEmail, 'email_change');
        res.status(200).json({ message: 'Verification code sent' });
    } catch (error) {
        if (error.message === 'OTP_COOLDOWN') {
            res.setHeader('Retry-After', String(error.retryAfterSeconds));
            return res.status(429).json({
                error: `Please wait ${error.retryAfterSeconds} seconds before requesting another code.`,
                retryAfterSeconds: error.retryAfterSeconds
            });
        }
        if (error.message === 'EMAIL_NOT_CONFIGURED') {
            return res.status(503).json({ error: 'Email delivery is not configured on this server.' });
        }
        if (error.message === 'EMAIL_SEND_FAILED') {
            console.error('email-change send-otp SMTP error:', error.smtpDetail);
            return res.status(503).json({
                error: 'We could not send the verification email. Check spam or junk and try again.'
            });
        }
        console.error('email-change send-otp error:', error);
        const hint =
            /updatedAt|Otp|does not exist|Unknown column|P2022/i.test(String(error?.message || ''))
                ? 'Database may be out of date. Run: npx prisma migrate deploy (or rebuild the server container).'
                : undefined;
        res.status(500).json({
            error: 'Failed to send verification code',
            detail: error?.message || String(error),
            hint
        });
    }
}

export { postUserEmailChangeSendOtp };

export function createUsersRouter({ authenticateToken, checkTrialExpiration }) {
    const router = Router();
    void checkTrialExpiration;

    const SUPER_ADMIN_USER_LIST_SELECT = {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        customRoleName: true,
        isActive: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
        firstLoginAt: true,
        lastLoginAt: true,
        subscriptionStatus: true,
        trialEndDate: true
    };

    /** @returns {Promise<{ id: number, role: string } | null>} viewer or null if response already sent */
    async function requirePlatformSuperAdmin(req, res) {
        const actorId = Number(req.user?.id);
        if (!Number.isInteger(actorId) || actorId < 1) {
            res.status(401).json({ error: 'Invalid session. Please log in again.' });
            return null;
        }
        const viewer = await prisma.user.findUnique({
            where: { id: actorId },
            select: { id: true, role: true }
        });
        if (!viewer) {
            res.status(401).json({ error: 'User not found.' });
            return null;
        }
        if (viewer.role !== 'superadmin') {
            res.status(403).json({ error: 'Forbidden' });
            return null;
        }
        return viewer;
    }

    /** Super Admin console — all platform users (no ?scope= query param required). */
    router.get('/super-admin/users', authenticateToken, async (req, res) => {
        try {
            if (!(await requirePlatformSuperAdmin(req, res))) return;
            const pagination = parsePaginationQuery(req.query, { defaultLimit: 15 });
            const search = String(req.query.search || '').trim();
            const role = String(req.query.role || '').trim();
            const status = String(req.query.status || '').trim().toLowerCase();

            const where = {};
            if (search) {
                where.OR = [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (role && role !== 'all') {
                where.role = role;
            }
            if (status === 'active') where.isActive = true;
            if (status === 'inactive') where.isActive = false;

            if (!pagination.paginate) {
                const users = await prisma.user.findMany({
                    where,
                    select: SUPER_ADMIN_USER_LIST_SELECT,
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    take: pagination.take,
                });
                return res.json(users);
            }

            const [total, users] = await Promise.all([
                prisma.user.count({ where }),
                prisma.user.findMany({
                    where,
                    select: SUPER_ADMIN_USER_LIST_SELECT,
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    skip: pagination.skip,
                    take: pagination.limit,
                }),
            ]);
            res.json(
                paginatedResponse(users, {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                }),
            );
        } catch (error) {
            console.error('Failed to fetch super-admin users:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    });

    /** Super Admin console — all companies with sites/departments. */
    router.get('/super-admin/companies', authenticateToken, async (req, res) => {
        try {
            if (!(await requirePlatformSuperAdmin(req, res))) return;
            const pagination = parsePaginationQuery(req.query, { defaultLimit: 15 });
            const search = String(req.query.search || '').trim();
            const where = search
                ? { name: { contains: search, mode: 'insensitive' } }
                : {};

            if (!pagination.paginate) {
                const companies = await prisma.company.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        industry: true,
                        contactNumber: true,
                        description: true,
                        streetAddress: true,
                        city: true,
                        state: true,
                        country: true,
                        postalCode: true,
                        isoStandards: true,
                        userId: true,
                        createdAt: true,
                        updatedAt: true,
                        sites: {
                            select: {
                                id: true,
                                name: true,
                                siteType: true,
                                status: true,
                                city: true,
                                companyId: true,
                                departments: {
                                    select: {
                                        id: true,
                                        name: true,
                                        siteId: true,
                                        status: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { id: 'asc' },
                    take: pagination.take,
                });
                return res.json(companies);
            }

            const [total, companies] = await Promise.all([
                prisma.company.count({ where }),
                prisma.company.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        industry: true,
                        contactNumber: true,
                        description: true,
                        streetAddress: true,
                        city: true,
                        state: true,
                        country: true,
                        postalCode: true,
                        isoStandards: true,
                        userId: true,
                        createdAt: true,
                        updatedAt: true,
                        sites: {
                            select: {
                                id: true,
                                name: true,
                                siteType: true,
                                status: true,
                                city: true,
                                companyId: true,
                                departments: {
                                    select: {
                                        id: true,
                                        name: true,
                                        siteId: true,
                                        status: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { id: 'asc' },
                    skip: pagination.skip,
                    take: pagination.limit,
                }),
            ]);
            res.json(
                paginatedResponse(companies, {
                    page: pagination.page,
                    pageSize: pagination.limit,
                    total,
                }),
            );
        } catch (error) {
            console.error('Failed to fetch super-admin companies:', error);
            res.status(500).json({ error: 'Failed to fetch companies' });
        }
    });

    // User routes — never return the whole user table; scope to org or explicit superadmin ?scope=all.
    // `?creatorId=` may only narrow results; it cannot be used to read another tenant's users (IDOR).
    router.get('/users', authenticateToken, async (req, res) => {
        const actorId = Number(req.user?.id);
        if (!Number.isInteger(actorId) || actorId < 1) {
            return res.status(401).json({ error: 'Invalid session. Please log in again.' });
        }
        const t0 = Date.now();
        try {
            const viewer = await prisma.user.findUnique({
                where: { id: actorId },
                select: { id: true, role: true }
            });
            if (!viewer) {
                return res.status(401).json({ error: 'User not found.' });
            }

            const pagination = parsePaginationQuery(req.query, { defaultLimit: 8 });
            const search = String(req.query.search || '').trim();
            const roleFilter = String(req.query.role || '').trim();
            const statusFilter = String(req.query.status || '').trim().toLowerCase();

            if (normalizeUserRole(viewer.role) === 'auditee') {
                if (!pagination.paginate) return res.json([]);
                return res.json(
                    paginatedResponse([], {
                        page: pagination.page,
                        limit: pagination.limit,
                        total: 0,
                    }),
                );
            }

            const scopeAll =
                viewer.role === 'superadmin' &&
                (String(req.query.scope || '') === 'all' ||
                    String(req.headers['x-super-admin-console'] || '').toLowerCase() === 'true');

            let filterCreatorId = null;
            const rawCreator = req.query.creatorId;
            if (rawCreator !== undefined && rawCreator !== null && String(rawCreator).trim() !== '') {
                const c = Number.parseInt(String(rawCreator), 10);
                if (Number.isNaN(c) || c < 1) {
                    return res.status(400).json({ error: 'Invalid creatorId' });
                }
                // Only self, users you may administer, or platform superadmin (scope=all) may scope by creator.
                const mayUseCreatorFilter =
                    scopeAll || c === actorId || (await actorCanAccessTargetUser(actorId, c));
                if (!mayUseCreatorFilter) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
                filterCreatorId = c;
            }

            /** When scope=all, skip the expensive "fetch all IDs then filter" round-trip. */
            let whereBase = {};
            let orgLookupMs = 0;
            if (scopeAll) {
                if (filterCreatorId != null) {
                    whereBase = { creatorId: filterCreatorId };
                }
            } else {
                const orgT0 = Date.now();
                await ensureOrphanUserOrgLink(actorId).catch(() => {});
                const allowedIds = await collectOrgMemberUserIds(actorId);
                orgLookupMs = Date.now() - orgT0;
                if (allowedIds.length === 0) {
                    if (!pagination.paginate) return res.json([]);
                    return res.json(
                        paginatedResponse([], {
                            page: pagination.page,
                            pageSize: pagination.limit,
                            total: 0,
                        }),
                    );
                }
                whereBase = {
                    id: { in: allowedIds },
                    ...(filterCreatorId != null ? { creatorId: filterCreatorId } : {}),
                };
            }
            if (search) {
                whereBase.OR = [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (roleFilter && roleFilter !== 'all') {
                whereBase.role = roleFilter;
            }
            if (statusFilter === 'active') whereBase.isActive = true;
            if (statusFilter === 'inactive') whereBase.isActive = false;

            const userSelect = {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                role: true,
                customRoleName: true,
                isActive: true,
                emailVerifiedAt: true,
                creatorId: true,
                createdAt: true,
                firstLoginAt: true,
                lastLoginAt: true,
            };

            const attachAuditeeSites = async (users) => {
                const auditeeIds = users
                    .filter((u) => normalizeUserRole(u.role) === 'auditee')
                    .map((u) => u.id);
                const sitesByAuditeeId = new Map();
                if (auditeeIds.length > 0) {
                    const sites = await prisma.site.findMany({
                        where: { userId: { in: auditeeIds } },
                        select: {
                            id: true,
                            name: true,
                            userId: true,
                            company: { select: { name: true } },
                        },
                        orderBy: { name: 'asc' },
                    });
                    for (const site of sites) {
                        if (site.userId == null) continue;
                        const uid = Number(site.userId);
                        if (!sitesByAuditeeId.has(uid)) sitesByAuditeeId.set(uid, []);
                        sitesByAuditeeId.get(uid).push(site);
                    }
                }

                return users.map((u) => {
                    if (normalizeUserRole(u.role) !== 'auditee') return u;
                    const assigned = sitesByAuditeeId.get(u.id) ?? [];
                    const siteIds = assigned.map((s) => s.id);
                    const siteLabels = assigned.map(
                        (s) => `${s.name} (${s.company?.name ?? 'Company'})`,
                    );
                    return {
                        ...u,
                        siteIds,
                        siteLabels,
                        siteId: siteIds[0] ?? null,
                        siteLabel: siteLabels.length > 0 ? siteLabels.join(', ') : null,
                    };
                });
            };

            const dbT0 = Date.now();
            if (!pagination.paginate) {
                const users = await prisma.user.findMany({
                    where: whereBase,
                    select: userSelect,
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    take: pagination.take,
                });
                const payload = await attachAuditeeSites(users);
                res.setHeader(
                    'Server-Timing',
                    `org;dur=${orgLookupMs},db;dur=${Date.now() - dbT0},total;dur=${Date.now() - t0}`,
                );
                return res.json(payload);
            }

            const [total, users] = await Promise.all([
                prisma.user.count({ where: whereBase }),
                prisma.user.findMany({
                    where: whereBase,
                    select: userSelect,
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    skip: pagination.skip,
                    take: pagination.limit,
                }),
            ]);

            const payload = await attachAuditeeSites(users);
            res.setHeader(
                'Server-Timing',
                `org;dur=${orgLookupMs},db;dur=${Date.now() - dbT0},total;dur=${Date.now() - t0}`,
            );
            res.json(
                paginatedResponse(payload, {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                }),
            );
        } catch (error) {
            console.error('Failed to fetch users:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    });

    router.get('/users/lookup-by-email', authenticateToken, async (req, res) => {
        const actorId = Number(req.user?.id);
        if (!Number.isInteger(actorId) || actorId < 1) {
            return res.status(401).json({ error: 'Invalid session. Please log in again.' });
        }
        try {
            const result = await findUserByEmail(req.query.email);
            if (result.error) {
                return res.status(result.status || 400).json({ error: result.error });
            }
            return res.json(result);
        } catch (error) {
            console.error('Failed to lookup user by email:', error);
            return res.status(500).json({ error: 'Failed to lookup user' });
        }
    });

    router.get('/users/manage-access', authenticateToken, async (req, res) => {
        const actorId = Number(req.user.id);
        try {
            const [canManageUsers, canInviteUsers, canInviteAuditee, canEditUsers] = await Promise.all([
                actorCanManageOrgUsers(actorId),
                actorCanInviteOrgUser(actorId),
                actorCanInviteAuditee(actorId),
                actorCanEditOrgUsers(actorId),
            ]);
            res.json({
                allowed: canInviteUsers,
                canInviteUsers,
                // Directory edit (roles/status/details): admins + lead auditors.
                canManageUsers: canManageUsers || canEditUsers,
                canEditUsers,
                canInviteAuditee,
                isLeadAuditorEditor: canEditUsers && !canManageUsers,
            });
        } catch (error) {
            console.error('Error checking user management access:', error);
            res.status(500).json({ error: 'Failed to check access' });
        }
    });

    router.get('/users/invite-auditee/access', authenticateToken, async (req, res) => {
        const actorId = Number(req.user.id);
        try {
            const [allowed, isCompanyAdmin, isLeadAuditor] = await Promise.all([
                actorCanInviteAuditee(actorId),
                actorCanManageOrgUsers(actorId),
                actorIsLeadAuditor(actorId),
            ]);
            res.json({ allowed, isCompanyAdmin, isLeadAuditor });
        } catch (error) {
            console.error('Error checking invite auditee access:', error);
            res.status(500).json({ error: 'Failed to check access' });
        }
    });

    router.get('/users/auditees', authenticateToken, async (req, res) => {
        const actorId = Number(req.user.id);
        if (!(await actorCanInviteAuditee(actorId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        try {
            const orgRootId = await getOrgRootUserId(actorId);
            const allowedIds =
                orgRootId != null ? await collectOrgSubtreeUserIds(orgRootId) : [actorId];
            if (allowedIds.length === 0) {
                return res.json([]);
            }

            const auditees = await prisma.user.findMany({
                where: {
                    id: { in: allowedIds },
                    role: 'auditee',
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    mobile: true,
                    role: true,
                    isActive: true,
                    emailVerifiedAt: true,
                    createdAt: true,
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            });

            if (auditees.length === 0) {
                return res.json([]);
            }

            const auditeeIds = auditees.map((u) => u.id);
            const sites = await prisma.site.findMany({
                where: { userId: { in: auditeeIds } },
                select: {
                    id: true,
                    name: true,
                    userId: true,
                    company: { select: { name: true } },
                },
                orderBy: { name: 'asc' },
            });
            const sitesByAuditeeId = new Map();
            for (const site of sites) {
                if (site.userId == null) continue;
                const uid = Number(site.userId);
                if (!sitesByAuditeeId.has(uid)) sitesByAuditeeId.set(uid, []);
                sitesByAuditeeId.get(uid).push(site);
            }

            res.json(
                auditees.map((u) => {
                    const assigned = sitesByAuditeeId.get(u.id) ?? [];
                    const siteIds = assigned.map((s) => s.id);
                    const siteLabels = assigned.map(
                        (s) => `${s.name} (${s.company?.name ?? 'Company'})`,
                    );
                    const primary = assigned[0];
                    return {
                        ...u,
                        siteIds,
                        siteLabels,
                        siteId: primary?.id ?? null,
                        siteLabel: siteLabels.length > 0 ? siteLabels.join(', ') : null,
                    };
                }),
            );
        } catch (error) {
            console.error('Error listing auditees:', error);
            res.status(500).json({ error: 'Failed to list auditees' });
        }
    });

    // Get single user status quickly (never return PII or raw Stripe price IDs)
    router.get('/users/:id/status', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const targetId = Number.parseInt(id, 10);
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        const actorId = Number(req.user.id);
        try {
            if (!(await actorCanViewUserBillingStatus(actorId, targetId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const [viewer, user] = await Promise.all([
                prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }),
                prisma.user.findUnique({
                    where: { id: targetId },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        isActive: true,
                        trialStartDate: true,
                        trialEndDate: true,
                        subscriptionStatus: true,
                        subscriptionPlan: true,
                        planStartDate: true,
                        planExpiryDate: true,
                        nextBillingDate: true,
                        stripePriceId: true,
                        renewalType: true,
                        autopayConsent: true,
                        onboardingCompleted: true
                    }
                })
            ]);

            if (!user) {
                return res.json({ exists: false, isActive: false });
            }

            let currentStatus = user.subscriptionStatus;
            if (user.role !== 'superadmin' && currentStatus !== 'active') {
                await prisma.user.update({
                    where: { id: targetId },
                    data: {
                        subscriptionStatus: 'active',
                        trialStartDate: null,
                        trialEndDate: null,
                    },
                });
                currentStatus = 'active';
            }

            const viewingSelf = actorId === targetId;
            const fullBilling = viewingSelf || viewer?.role === 'superadmin';

            // Org admin / delegate: only coarse flags — no billing internals, payment history, or plan details
            if (!fullBilling) {
                return res.json({
                    exists: true,
                    isActive: user.isActive,
                    subscriptionStatus: currentStatus,
                    onboardingCompleted: user.onboardingCompleted,
                    role: user.role,
                });
            }

            const latestPayment = await prisma.payment.findFirst({
                where: { userId: user.id, status: 'paid' },
                orderBy: { createdAt: 'desc' },
                select: { duration: true }
            });

            const priceIdLower = user.stripePriceId ? String(user.stripePriceId).toLowerCase() : '';
            const isMonthlyPlan = priceIdLower.includes('month') || user.nextBillingDate != null;

            res.json({
                exists: true,
                isActive: user.isActive,
                subscriptionStatus: currentStatus,
                trialEndDate: user.trialEndDate,
                trialStartDate: user.trialStartDate,
                subscriptionPlan: user.subscriptionPlan,
                planStartDate: user.planStartDate,
                planExpiryDate: user.planExpiryDate,
                nextBillingDate: user.nextBillingDate,
                isMonthlyPlan,
                renewalType: user.renewalType,
                autopayConsent: user.autopayConsent,
                onboardingCompleted: user.onboardingCompleted,
                duration: latestPayment?.duration || null,
                // Keep client sidebar/permissions in sync with DB role
                role: user.role,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            });
        } catch (error) {
            console.error('Failed to fetch user status:', error);
            res.status(500).json({ error: 'Failed to fetch user status' });
        }
    });

    router.post('/users/:id/resend-verification', authenticateToken, async (req, res) => {
        const targetId = Number.parseInt(req.params.id, 10);
        const actorId = Number(req.user.id);
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        try {
            if (!(await actorCanEditOrgUsers(actorId))) {
                return res.status(403).json({ error: 'Forbidden', message: 'Only administrators and lead auditors can resend verification.' });
            }
            if (!(await actorCanAccessTargetUser(actorId, targetId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const user = await prisma.user.findUnique({
                where: { id: targetId },
                select: { email: true, emailVerifiedAt: true, creatorId: true }
            });
            if (!user) return res.status(404).json({ error: 'User not found' });
            if (user.creatorId == null) {
                return res.status(400).json({ error: 'This user does not require invite verification' });
            }
            if (user.emailVerifiedAt) {
                return res.status(400).json({ error: 'Email is already verified' });
            }
            await sendOtpToEmailAddress(user.email.toLowerCase().trim(), 'user_invite');
            res.json({ message: 'Verification code sent.' });
        } catch (error) {
            if (error.code === 'OTP_COOLDOWN') {
                return res.status(429).json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds });
            }
            console.error('Error resending user verification:', error);
            res.status(500).json({ error: 'Failed to send verification code' });
        }
    });

    router.post('/users/invite-auditee', authenticateToken, async (req, res) => {
        const creatorId = Number(req.user.id);
        if (!(await actorCanInviteAuditee(creatorId))) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to invite auditees.',
            });
        }

        const {
            email,
            mobile,
            phoneCountry,
            password,
            siteId,
            siteIds: rawSiteIds,
            firstName: rawFirst,
            lastName: rawLast,
            sendWelcomeEmail,
        } = req.body ?? {};

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                error: PASSWORD_REQUIREMENTS_MESSAGE,
            });
        }

        const emailNorm =
            typeof email === 'string' ? (sanitizePlainText(email.trim().toLowerCase(), 254) || '') : '';
        const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailFmt.test(emailNorm)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const phoneOpts = { countryCode: phoneCountry };
        const userMobile = sanitizePhoneField(mobile, phoneOpts);
        if (!userMobile) {
            return res.status(400).json({
                error: phoneFieldValidationError(mobile, phoneOpts, 'Mobile number') || 'Mobile number is required.',
            });
        }

        const parsedSiteIds = parseAuditeeSiteIds({ siteIds: rawSiteIds, siteId });
        if (!parsedSiteIds) {
            return res.status(400).json({ error: 'At least one valid site is required' });
        }
        const siteAccess = await Promise.all(
            parsedSiteIds.map((sid) => actorCanAssignAuditeeToSite(creatorId, sid)),
        );
        if (siteAccess.some((ok) => !ok)) {
            return res.status(403).json({ error: 'You cannot assign an auditee to one or more selected sites' });
        }

        const defaults = defaultAuditeeNamesFromEmail(emailNorm);
        if (rawFirst != null && String(rawFirst).trim() !== '') {
            const fnErr = personNameValidationError(rawFirst, 'First name');
            if (fnErr) return res.status(400).json({ error: fnErr });
        }
        if (rawLast != null && String(rawLast).trim() !== '') {
            const lnErr = personNameValidationError(rawLast, 'Last name');
            if (lnErr) return res.status(400).json({ error: lnErr });
        }
        const fn = sanitizePersonName(rawFirst, PERSON_NAME_MAX) || defaults.firstName;
        const ln = sanitizePersonName(rawLast, PERSON_NAME_MAX) || defaults.lastName;

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const auditeeCreatorFk =
                (await getOrgRootUserId(creatorId)) ?? (Number.isInteger(creatorId) ? creatorId : null);
            const user = await prisma.$transaction(async (tx) => {
                const sites = await tx.site.findMany({
                    where: { id: { in: parsedSiteIds } },
                    select: { id: true, userId: true, user: { select: { role: true } } },
                });
                if (sites.length !== parsedSiteIds.length) {
                    const err = new Error('Site not found');
                    err.code = 'SITE_NOT_FOUND';
                    throw err;
                }
                for (const site of sites) {
                    if (siteUserIsAuditee(site)) {
                        const err = new Error('Site already assigned');
                        err.code = 'SITE_ALREADY_ASSIGNED';
                        throw err;
                    }
                }
                const occupiedIds = sites.filter((s) => s.userId != null).map((s) => s.id);
                if (occupiedIds.length > 0) {
                    await tx.site.updateMany({
                        where: { id: { in: occupiedIds } },
                        data: { userId: null },
                    });
                }

                const created = await tx.user.create({
                    data: {
                        firstName: fn,
                        lastName: ln,
                        email: emailNorm,
                        mobile: userMobile,
                        role: 'auditee',
                        isActive: false,
                        emailVerifiedAt: null,
                        password: hashedPassword,
                        creatorId: auditeeCreatorFk,
                    },
                });

                await assignAuditeeToSites(tx, created.id, parsedSiteIds);

                return created;
            });

            invalidateOrgLookupCaches();

            const wantWelcomeEmail = sendWelcomeEmail !== false;
            const { password: _pw, ...userWithoutPassword } = user;
            let siteLabels = [];
            try {
                siteLabels = await formatAuditeeSiteLabels(parsedSiteIds);
            } catch (labelErr) {
                console.error('[invite-auditee] formatAuditeeSiteLabels failed:', labelErr);
            }

            let verificationEmailSent = false;
            let welcomeEmailSent = false;
            try {
                const inviteEmailOptions = {
                    backgroundDelivery: true,
                    ...(wantWelcomeEmail
                        ? { welcomeCredentials: { firstName: fn, lastName: ln, password } }
                        : {}),
                };
                const { emailTransmitted } = await sendOtpToEmailAddress(
                    emailNorm,
                    'user_invite',
                    inviteEmailOptions,
                );
                verificationEmailSent = emailTransmitted === true;
                welcomeEmailSent = Boolean(wantWelcomeEmail && emailTransmitted === true);
            } catch (otpErr) {
                console.error('Failed to send auditee invite email:', otpErr);
            }

            return res.status(201).json({
                ...userWithoutPassword,
                siteIds: parsedSiteIds,
                siteLabels,
                siteId: parsedSiteIds[0] ?? null,
                emailVerificationPending: true,
                verificationEmailSent,
                welcomeEmailSent,
            });
        } catch (error) {
            console.error('Error inviting auditee:', error);
            handlePrismaError(error, 'POST /users/invite-auditee');
            if (error.code === 'SITE_NOT_FOUND') {
                return res.status(404).json({ error: 'Site not found' });
            }
            if (error.code === 'SITE_ALREADY_ASSIGNED') {
                return res.status(409).json({
                    error: 'Site already assigned',
                    message:
                        'One or more selected sites are already assigned to another auditee. Unassign them or choose different sites.',
                });
            }
            if (isPrismaUniqueViolation(error)) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            res.status(500).json({
                error: 'Failed to invite auditee',
                details: error?.message || String(error),
            });
        }
    });

    router.patch('/users/:id/auditee-site', authenticateToken, async (req, res) => {
        const targetId = Number.parseInt(req.params.id, 10);
        const actorId = Number(req.user.id);
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        if (!(await actorCanManageAuditee(actorId, targetId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const parsedSiteIds = parseAuditeeSiteIds(req.body);
        if (!parsedSiteIds) {
            return res.status(400).json({ error: 'At least one valid site is required' });
        }
        for (const sid of parsedSiteIds) {
            if (!(await actorCanAssignAuditeeToSite(actorId, sid))) {
                return res.status(403).json({ error: 'You cannot assign an auditee to one or more selected sites' });
            }
        }

        try {
            await prisma.$transaction(async (tx) => {
                await assignAuditeeToSites(tx, targetId, parsedSiteIds);
            });

            const siteLabels = await formatAuditeeSiteLabels(parsedSiteIds);
            res.json({
                siteIds: parsedSiteIds,
                siteLabels,
                siteId: parsedSiteIds[0] ?? null,
                siteLabel: siteLabels.join(', ') || null,
            });
        } catch (error) {
            console.error('Error assigning auditee site:', error);
            if (error.code === 'SITE_NOT_FOUND') {
                return res.status(404).json({ error: 'Site not found' });
            }
            if (error.code === 'SITE_ALREADY_ASSIGNED') {
                return res.status(409).json({
                    error: 'Site already assigned',
                    message:
                        'One or more selected sites are already assigned to another auditee. Unassign them or choose different sites.',
                });
            }
            res.status(500).json({ error: 'Failed to assign site' });
        }
    });

    router.post('/users', authenticateToken, async (req, res) => {
        const { firstName, lastName, email, mobile, phoneCountry, role, customRoleName, password, sendWelcomeEmail, siteId, siteIds: rawSiteIds } = req.body;
        const creatorId = req.user.id;
        const canInvite = await actorCanInviteOrgUser(creatorId);
        if (!canInvite) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to invite users.'
            });
        }
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ error: PASSWORD_REQUIREMENTS_MESSAGE });
        }

        const fnErr = personNameValidationError(firstName, 'First name');
        const lnErr = personNameValidationError(lastName, 'Last name');
        if (fnErr || lnErr) {
            return res.status(400).json({ error: fnErr || lnErr });
        }
        const fn = sanitizePersonName(firstName, PERSON_NAME_MAX);
        const ln = sanitizePersonName(lastName, PERSON_NAME_MAX);

        const emailNorm =
            typeof email === 'string' ? (sanitizePlainText(email.trim().toLowerCase(), 254) || '') : '';
        const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailFmt.test(emailNorm)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const userMobile = sanitizePhoneField(mobile, { countryCode: phoneCountry });
        if (!userMobile) {
            return res.status(400).json({
                error: phoneFieldValidationError(mobile, { countryCode: phoneCountry }, 'Mobile number') || 'Mobile number is required.',
            });
        }

        try {
            let roleNorm = normalizeUserRole(sanitizeShortLabel(role, 80) || 'auditor');
            if (!USER_ASSIGNABLE_ROLES.has(roleNorm)) {
                return res.status(400).json({ error: 'Invalid role' });
            }

            let parsedSiteIds = null;
            if (roleNorm === 'auditee') {
                parsedSiteIds = parseAuditeeSiteIds({ siteIds: rawSiteIds, siteId });
                if (!parsedSiteIds) {
                    return res.status(400).json({ error: 'At least one valid site is required' });
                }
                const siteAccess = await Promise.all(
                    parsedSiteIds.map((sid) => actorCanAssignAuditeeToSite(creatorId, sid)),
                );
                if (siteAccess.some((ok) => !ok)) {
                    return res.status(403).json({ error: 'You cannot assign an auditee to one or more selected sites' });
                }
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const existingEmail = await prisma.user.findFirst({
                where: { email: emailNorm },
                select: { id: true },
            });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            const creatorIdNum = Number(creatorId);
            if (!Number.isInteger(creatorIdNum) || creatorIdNum < 1) {
                return res.status(401).json({ error: 'Invalid session. Please log in again.' });
            }
            // Attach under the inviter's org root so A→B→C always share one company/site catalog.
            const orgRoot = await getOrgRootUserId(creatorIdNum);
            const creatorFk = (Number.isInteger(orgRoot) && orgRoot > 0) ? orgRoot : creatorIdNum;

            const user = await prisma.$transaction(async (tx) => {
                if (roleNorm === 'auditee' && parsedSiteIds) {
                    const sites = await tx.site.findMany({
                        where: { id: { in: parsedSiteIds } },
                        select: { id: true, userId: true, user: { select: { role: true } } },
                    });
                    if (sites.length !== parsedSiteIds.length) {
                        const err = new Error('Site not found');
                        err.code = 'SITE_NOT_FOUND';
                        throw err;
                    }
                    for (const site of sites) {
                        if (siteUserIsAuditee(site)) {
                            const err = new Error('Site already assigned');
                            err.code = 'SITE_ALREADY_ASSIGNED';
                            throw err;
                        }
                    }
                    const occupiedIds = sites.filter((s) => s.userId != null).map((s) => s.id);
                    if (occupiedIds.length > 0) {
                        await tx.site.updateMany({
                            where: { id: { in: occupiedIds } },
                            data: { userId: null },
                        });
                    }
                }

                const created = await tx.user.create({
                    data: {
                        firstName: fn,
                        lastName: ln,
                        email: emailNorm,
                        mobile: userMobile,
                        role: roleNorm,
                        customRoleName:
                            roleNorm === 'other'
                                ? sanitizeShortLabel(customRoleName, 120)
                                : null,
                        isActive: false,
                        emailVerifiedAt: null,
                        password: hashedPassword,
                        creatorId: creatorFk,
                    }
                });

                if (roleNorm === 'auditee' && parsedSiteIds) {
                    await assignAuditeeToSites(tx, created.id, parsedSiteIds);
                }

                return created;
            });

            invalidateOrgLookupCaches();

            // User is committed — never return 500 after this point (would make retries
            // falsely report "Email already exists" while the invite already exists).
            const wantWelcomeEmail = sendWelcomeEmail !== false;
            const { password: _pw, ...userWithoutPassword } = user;
            const responseBody = {
                ...userWithoutPassword,
                emailVerificationPending: true,
                verificationEmailSent: false,
                welcomeEmailSent: false,
            };

            if (roleNorm === 'auditee' && parsedSiteIds) {
                try {
                    const siteLabels = await formatAuditeeSiteLabels(parsedSiteIds);
                    responseBody.siteIds = parsedSiteIds;
                    responseBody.siteLabels = siteLabels;
                    responseBody.siteId = parsedSiteIds[0] ?? null;
                    responseBody.siteLabel = siteLabels.length > 0 ? siteLabels.join(', ') : null;
                } catch (labelErr) {
                    console.error('[invite] formatAuditeeSiteLabels failed:', labelErr);
                    responseBody.siteIds = parsedSiteIds;
                    responseBody.siteId = parsedSiteIds[0] ?? null;
                }
            }

            try {
                const inviteEmailOptions = {
                    backgroundDelivery: true,
                    ...(wantWelcomeEmail
                        ? { welcomeCredentials: { firstName: fn, lastName: ln, password } }
                        : {}),
                };
                const { emailTransmitted } = await sendOtpToEmailAddress(
                    emailNorm,
                    'user_invite',
                    inviteEmailOptions,
                );
                responseBody.verificationEmailSent = emailTransmitted === true;
                responseBody.welcomeEmailSent = Boolean(wantWelcomeEmail && emailTransmitted === true);
            } catch (otpErr) {
                console.error('Failed to send invite onboarding email:', otpErr);
                responseBody.verificationEmailSent = false;
                responseBody.welcomeEmailSent = false;
            }

            return res.status(201).json(responseBody);
        } catch (error) {
            console.error('Error creating user:', error);
            handlePrismaError(error, 'POST /users');
            if (error.code === 'SITE_NOT_FOUND') {
                return res.status(404).json({ error: 'Site not found' });
            }
            if (error.code === 'SITE_ALREADY_ASSIGNED') {
                return res.status(409).json({
                    error: 'Site already assigned',
                    message:
                        'One or more selected sites are already assigned to another auditee. Unassign them or choose different sites.',
                });
            }
            if (isPrismaUniqueViolation(error)) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (isPrismaForeignKeyViolation(error)) {
                return res.status(400).json({
                    error: 'Invalid creator or related record',
                    details: error?.message || String(error),
                });
            }
            res.status(500).json({
                error: 'Failed to create user',
                details: error?.message || String(error),
            });
        }
    });



    router.post('/users/:id/email-change/send-otp', authenticateToken, postUserEmailChangeSendOtp);

    router.put('/users/:id', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const targetId = Number.parseInt(id, 10);
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        const { firstName, lastName, email, mobile, phoneCountry, role, customRoleName, isActive, password, onboardingCompleted, emailChangeOtp, siteId, siteIds: rawSiteIds } = req.body;
        const actorId = Number(req.user.id);
        try {
            const [canAccess, canManageUsers, canEditUsers, canManageAuditee, targetUser] = await Promise.all([
                actorCanAccessTargetUser(actorId, targetId),
                actorCanManageOrgUsers(actorId),
                actorCanEditOrgUsers(actorId),
                actorCanManageAuditee(actorId, targetId),
                prisma.user.findUnique({
                    where: { id: targetId },
                    select: { email: true, role: true },
                }),
            ]);
            if (!canAccess) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            if (!targetUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            const targetRoleNorm = normalizeUserRole(targetUser.role);
            const canEditDirectory = canManageUsers || canEditUsers;

            if (!canEditDirectory && targetId !== actorId) {
                if (!(canManageAuditee && targetRoleNorm === 'auditee')) {
                    return res.status(403).json({
                        error: 'Forbidden',
                        message: 'Only administrators and lead auditors can edit other users.'
                    });
                }
            }

            const actorRow = await prisma.user.findUnique({
                where: { id: actorId },
                select: { role: true }
            });
            if (
                targetRoleNorm === 'superadmin' &&
                normalizeUserRole(actorRow?.role) !== 'superadmin'
            ) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            if (isActive === false && targetId !== actorId) {
                const ownerGuard = await assertActorMayModifyProtectedCompanyOwner(actorId, targetId);
                if (!ownerGuard.ok) {
                    return res.status(ownerGuard.status).json({ error: ownerGuard.error });
                }
            }

            if (isActive === false && targetId === actorId) {
                const actorAdminRow = await prisma.user.findUnique({
                    where: { id: actorId },
                    select: { role: true, creatorId: true, isActive: true },
                });
                if (userRowHasOrgAdminPrivileges(actorAdminRow)) {
                    const activeAdminCount = await countActiveOrgAdministrators(actorId);
                    if (activeAdminCount <= 1) {
                        return res.status(400).json({ error: LAST_ACTIVE_ADMIN_MESSAGE });
                    }
                }
            }

            const privilegeFieldsRequested =
                role !== undefined ||
                customRoleName !== undefined ||
                (isActive !== undefined && targetId !== actorId);
            if (privilegeFieldsRequested && !canEditDirectory) {
                if (!(canManageAuditee && targetRoleNorm === 'auditee')) {
                    return res.status(403).json({
                        error: 'Forbidden',
                        message: 'Only administrators and lead auditors can change user roles or account status.'
                    });
                }
                if (role !== undefined || customRoleName !== undefined) {
                    return res.status(403).json({
                        error: 'Forbidden',
                        message: 'Only administrators and lead auditors can change user roles.'
                    });
                }
            }

            const oldNorm = targetUser.email.toLowerCase().trim();
            const incomingNorm =
                email != null && typeof email === 'string'
                    ? (sanitizePlainText(email.trim().toLowerCase(), 254) || oldNorm)
                    : oldNorm;
            const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailFmt.test(incomingNorm)) {
                return res.status(400).json({ error: 'Please enter a valid email address' });
            }

            if (incomingNorm !== oldNorm) {
                const otpRaw = emailChangeOtp != null ? String(emailChangeOtp).trim() : '';
                if (!otpRaw) {
                    return res.status(400).json({ error: 'Verification code required to change email address' });
                }
                const storedData = await prisma.otp.findFirst({ where: { email: incomingNorm } });
                if (!storedData) {
                    return res.status(400).json({ error: 'No verification code for this email. Send a new code first.' });
                }
                if (new Date(storedData.expiresAt) < new Date()) {
                    await prisma.otp.delete({ where: { email: incomingNorm } }).catch(() => {});
                    return res.status(400).json({ error: 'Verification code has expired. Send a new code.' });
                }
                if (storedData.code !== otpRaw) {
                    return res.status(400).json({ error: 'Invalid verification code' });
                }
                await prisma.otp.delete({ where: { email: incomingNorm } });
                const emailTaken = await prisma.user.findFirst({
                    where: { email: incomingNorm, NOT: { id: targetId } }
                });
                if (emailTaken) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
            }

            const updateData = {
                email: incomingNorm,
                onboardingCompleted: onboardingCompleted !== undefined ? onboardingCompleted : undefined
            };
            if (incomingNorm !== oldNorm) {
                updateData.emailVerifiedAt = new Date();
            }

            if (isActive !== undefined) {
                updateData.isActive = isActive;
            }

            if (firstName !== undefined) {
                const fnErr = personNameValidationError(firstName, 'First name');
                if (fnErr) {
                    return res.status(400).json({ error: fnErr });
                }
                updateData.firstName = sanitizePersonName(firstName, PERSON_NAME_MAX);
            }
            if (lastName !== undefined) {
                const lnErr = personNameValidationError(lastName, 'Last name');
                if (lnErr) {
                    return res.status(400).json({ error: lnErr });
                }
                updateData.lastName = sanitizePersonName(lastName, PERSON_NAME_MAX);
            }
            if (mobile !== undefined) {
                const raw = typeof mobile === 'string' ? mobile.trim() : '';
                if (raw === '') {
                    updateData.mobile = null;
                } else {
                    const phoneOpts = { countryCode: phoneCountry };
                    const m = sanitizePhoneField(mobile, phoneOpts);
                    if (!m) {
                        return res.status(400).json({
                            error: phoneFieldValidationError(mobile, phoneOpts, 'Mobile number') || 'Mobile number is required.',
                        });
                    }
                    updateData.mobile = m;
                }
            }
            if (role !== undefined && role !== null) {
                const r = normalizeUserRole(sanitizeShortLabel(role, 80));
                if (!r || !USER_ASSIGNABLE_ROLES.has(r)) {
                    return res.status(400).json({ error: 'Invalid role' });
                }
                updateData.role = r;
            }
            if (customRoleName !== undefined) {
                updateData.customRoleName =
                    customRoleName === null ? null : sanitizeShortLabel(customRoleName, 120);
            }

            const nextRoleNorm = updateData.role != null ? normalizeUserRole(updateData.role) : targetRoleNorm;
            const siteIdsProvided = rawSiteIds !== undefined || siteId !== undefined;
            let parsedSiteIds = null;
            if (siteIdsProvided || (nextRoleNorm === 'auditee' && targetRoleNorm !== 'auditee')) {
                parsedSiteIds = parseAuditeeSiteIds({ siteIds: rawSiteIds, siteId });
                if (nextRoleNorm === 'auditee' && !parsedSiteIds) {
                    return res.status(400).json({ error: 'At least one valid site is required' });
                }
            }
            if (parsedSiteIds) {
                if (nextRoleNorm !== 'auditee') {
                    return res.status(400).json({ error: 'Sites can only be assigned to auditee users' });
                }
                if (targetRoleNorm === 'auditee') {
                    if (!canManageAuditee) {
                        return res.status(403).json({ error: 'Forbidden' });
                    }
                } else if (!(await actorCanInviteAuditee(actorId))) {
                    return res.status(403).json({
                        error: 'Forbidden',
                        message: 'You do not have permission to assign the auditee role.',
                    });
                }
                const siteAccess = await Promise.all(
                    parsedSiteIds.map((sid) => actorCanAssignAuditeeToSite(actorId, sid)),
                );
                if (siteAccess.some((ok) => !ok)) {
                    return res.status(403).json({ error: 'You cannot assign an auditee to one or more selected sites' });
                }
            }

            if (password) {
                if (!PASSWORD_REGEX.test(password)) {
                    return res.status(400).json({ error: PASSWORD_REQUIREMENTS_MESSAGE });
                }
                const pwdRow = await prisma.user.findUnique({
                    where: { id: targetId },
                    select: { password: true },
                });
                if (
                    pwdRow?.password
                    && (await bcrypt.compare(String(password), pwdRow.password))
                ) {
                    return res.status(400).json({ error: NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE });
                }
                updateData.password = await bcrypt.hash(password, 10);
                updateData.failedLoginAttempts = 0;
            }

            const passwordWillChange = Boolean(password);

            const user = await prisma.$transaction(async (tx) => {
                const updated = await tx.user.update({
                    where: { id: targetId },
                    data: updateData
                });

                if (targetRoleNorm === 'auditee' && nextRoleNorm !== 'auditee') {
                    await tx.site.updateMany({
                        where: { userId: targetId },
                        data: { userId: null },
                    });
                } else if (nextRoleNorm === 'auditee' && parsedSiteIds) {
                    await assignAuditeeToSites(tx, targetId, parsedSiteIds);
                }

                return updated;
            });

            invalidateOrgLookupCaches();

            if (passwordWillChange) {
                const revoked = await invalidateAllUserSessions(targetId);
                console.log(`[AUTH] Password changed for user ${targetId}; revoked ${revoked} session(s)`);
                setImmediate(() => {
                    void sendPasswordChangedNotificationEmail({
                        toEmail: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        changedBySelf: targetId === actorId,
                    });
                });
            }

            const { password: _, ...userWithoutPassword } = user;
            const responseBody = { ...userWithoutPassword };
            if (passwordWillChange) {
                if (targetId === actorId) {
                    clearSessionCookie(res);
                    responseBody.reauthRequired = true;
                } else {
                    responseBody.targetSessionsRevoked = true;
                }
            }
            if (normalizeUserRole(user.role) === 'auditee') {
                const assignedSites = await prisma.site.findMany({
                    where: { userId: targetId },
                    select: { id: true, name: true, company: { select: { name: true } } },
                    orderBy: { name: 'asc' },
                });
                const siteIds = assignedSites.map((s) => s.id);
                const siteLabels = assignedSites.map(
                    (s) => `${s.name} (${s.company?.name ?? 'Company'})`,
                );
                responseBody.siteIds = siteIds;
                responseBody.siteLabels = siteLabels;
                responseBody.siteId = siteIds[0] ?? null;
                responseBody.siteLabel = siteLabels.length > 0 ? siteLabels.join(', ') : null;
            }
            res.json(responseBody);
        } catch (error) {
            console.error('Error updating user:', error);
            if (error.code === 'SITE_NOT_FOUND') {
                return res.status(404).json({ error: 'Site not found' });
            }
            if (error.code === 'SITE_ALREADY_ASSIGNED') {
                return res.status(409).json({
                    error: 'Site already assigned',
                    message:
                        'One or more selected sites are already assigned to another auditee. Unassign them or choose different sites.',
                });
            }
            if (isPrismaUniqueViolation(error)) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            res.status(500).json({
                error: 'Failed to update user',
                details: error?.message || String(error),
            });
        }
    });

    router.delete('/users/:id', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const targetId = Number.parseInt(id, 10);
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        const actorId = Number(req.user.id);
        if (targetId === actorId) {
            return res.status(400).json({
                error: 'You cannot delete your own account while signed in. Sign out or use another admin account.',
            });
        }

        try {
            // Single round-trip for actor + target — avoid repeated role/org lookups.
            const [actor, target] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: actorId },
                    select: { id: true, role: true, creatorId: true },
                }),
                prisma.user.findUnique({
                    where: { id: targetId },
                    select: { id: true, role: true, creatorId: true, email: true },
                }),
            ]);
            if (!actor) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (!target) {
                return res.status(404).json({ error: 'User not found' });
            }
            if (normalizeUserRole(target.role) === 'superadmin') {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const actorRole = normalizeUserRole(actor.role);
            const isSuperAdmin = actorRole === 'superadmin';
            const canManageOrg =
                isSuperAdmin ||
                actorRole === 'admin' ||
                (actor.creatorId == null && actorRole !== 'auditee') ||
                (await actorCanEditOrgUsers(actorId));

            if (!isSuperAdmin) {
                if (!(await actorCanAccessTargetUser(actorId, targetId))) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
                const targetIsAuditee = normalizeUserRole(target.role) === 'auditee';
                if (!canManageOrg) {
                    // Non-admins may only delete auditees they can manage.
                    if (!targetIsAuditee || !(await actorCanManageAuditee(actorId, targetId))) {
                        return res.status(403).json({
                            error: 'Forbidden',
                            message: 'You cannot delete this user.',
                        });
                    }
                }

                const ownerGuard = await assertActorMayModifyProtectedCompanyOwner(actorId, targetId);
                if (!ownerGuard.ok) {
                    return res.status(ownerGuard.status).json({ error: ownerGuard.error });
                }
            }

            // Respond as soon as the DB work finishes — no extra lookups after delete.
            await deleteUserCompletely(targetId);
            invalidateOrgLookupCaches();
            res.status(204).send();
        } catch (error) {
            if (error.code === 'USER_NOT_FOUND') {
                return res.status(404).json({ error: 'User not found' });
            }
            if (error.code === 'INVALID_ID') {
                return res.status(400).json({ error: 'Invalid user id' });
            }
            console.error('Error deleting user:', error);
            res.status(500).json({
                error: 'Failed to delete user',
                message: error.message,
            });
        }
    });

    // Audit Program routes
    router.post('/users/:id/start-trial', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const targetId = Number.parseInt(id, 10);
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        try {
            const actor = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { role: true }
            });
            if (actor?.role !== 'superadmin' && req.user.id !== targetId) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            await ensureUserTrialStarted(targetId);

            const full = await prisma.user.findUnique({
                where: { id: targetId },
                select: LOGIN_SUCCESS_USER_SELECT
            });
            if (!full) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(full);
        } catch (error) {
            console.error('Failed to activate user access:', error);
            res.status(500).json({ error: 'Failed to activate user access' });
        }
    });

    // Audit Program routes

    // User Activity for Company Admin
    router.get('/users/:id/activity', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const targetId = Number.parseInt(id, 10);
        if (Number.isNaN(targetId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }

        try {
            const actorId = req.user.id;
            const actor = await prisma.user.findUnique({
                where: { id: actorId },
                select: { role: true }
            });

            if (!actor) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const actorRole = normalizeUserRole(actor.role);
            
            // Only company_admin or superadmin can view this
            if (actorRole !== 'company_admin' && actorRole !== 'superadmin') {
                return res.status(403).json({ error: 'Forbidden. Only Company Admin can view user activity.' });
            }

            if (actorRole !== 'superadmin') {
                if (!(await actorCanAccessTargetUser(actorId, targetId))) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
            }

            // Fetch Audit Programs
            const auditPrograms = await prisma.auditProgram.findMany({
                where: {
                    OR: [
                        { leadAuditorId: targetId },
                        { userId: targetId },
                        { auditors: { some: { id: targetId } } }
                    ]
                },
                include: { site: true },
                orderBy: { createdAt: 'desc' }
            });

            // Fetch Audit Plans
            const auditPlans = await prisma.auditPlan.findMany({
                where: {
                    OR: [
                        { leadAuditorId: targetId },
                        { userId: targetId },
                        { auditors: { some: { id: targetId } } }
                    ]
                },
                include: { auditProgram: true },
                orderBy: { createdAt: 'desc' }
            });

            // Fetch Findings (Nonconformances)
            const findings = await prisma.nonconformance.findMany({
                where: {
                    OR: [
                        { assigneeId: targetId },
                        { reviewerId: targetId },
                        { createdById: targetId }
                    ]
                },
                include: { auditPlan: true },
                orderBy: { createdAt: 'desc' }
            });

            res.json({
                auditPrograms,
                auditPlans,
                findings
            });
        } catch (error) {
            console.error('Failed to fetch user activity:', error);
            res.status(500).json({ error: 'Failed to fetch user activity' });
        }
    });

    return router;
}
