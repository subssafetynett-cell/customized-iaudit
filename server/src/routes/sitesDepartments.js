import { Router } from 'express';
import prisma from '../prisma.js';
import {
    parsePaginationQuery,
    paginatedResponse
} from '../pagination.js';
import {
    DEPT_TEXT_LIMITS,
    SITE_TEXT_LIMITS,
    organizationTextLengthError,
    sanitizeOrganizationText,
    sanitizePhoneField,
    phoneFieldValidationError,
    sanitizePlainText
} from '../textSanitize.js';
import {
    actorCanAccessTargetUser,
    actorCanAssignAuditeeToSite,
    resolveOrgCompanyOwnerUserIds,
    assertActorCanManageSite,
    assertActorCanManageDepartment,
    assertDepartmentCreateBodySiteId,
    DEPARTMENT_CREATE_ALLOWED_BODY_KEYS,
    checkTrialExpiration
} from '../orgAccess.js';
import {
    getDisallowedExtraKeysError
} from '../session.js';

export function createSitesDepartmentsRouter({ authenticateToken, checkTrialExpiration }) {
    const router = Router();

    router.post('/companies/:companyId/sites', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { companyId } = req.params;
        const actorId = Number(req.user.id);
        const {
            name, description, siteType, status,
            address, city, state, country, postalCode,
            latitude, longitude, contactName, contactPosition,
            contactNumber, email
        } = req.body;
        try {
            const cid = Number.parseInt(companyId, 10);
            if (Number.isNaN(cid)) {
                return res.status(400).json({ error: 'Invalid company id' });
            }
            const company = await prisma.company.findUnique({ where: { id: cid }, select: { userId: true } });
            if (!company || company.userId == null) {
                return res.status(404).json({ error: 'Company not found' });
            }
            if (!(await actorCanAccessTargetUser(actorId, company.userId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const siteNameLenErr = organizationTextLengthError(name, SITE_TEXT_LIMITS.name, 'Site name');
            if (siteNameLenErr) {
                return res.status(400).json({ error: siteNameLenErr });
            }
            const siteAddressLenErr = organizationTextLengthError(address, SITE_TEXT_LIMITS.address, 'Address');
            if (siteAddressLenErr) {
                return res.status(400).json({ error: siteAddressLenErr });
            }
            const sName = sanitizeOrganizationText(name, SITE_TEXT_LIMITS.name);
            if (!sName) {
                return res.status(400).json({ error: 'Site name is required' });
            }
            const sAddress = sanitizeOrganizationText(address, SITE_TEXT_LIMITS.address);
            if (!sAddress) {
                return res.status(400).json({ error: 'Address is required' });
            }

            const sitePhone = sanitizePhoneField(contactNumber, { countryName: country });
            if (!sitePhone) {
                return res.status(400).json({
                    error: phoneFieldValidationError(contactNumber, { countryName: country }, 'Contact number')
                        || 'Contact number is required.',
                });
            }

            const site = await prisma.site.create({
                data: {
                    name: sName,
                    description: sanitizePlainText(description, SITE_TEXT_LIMITS.description, { preserveNewlines: true }),
                    siteType: sanitizePlainText(siteType, SITE_TEXT_LIMITS.siteType),
                    status: sanitizePlainText(status, SITE_TEXT_LIMITS.status) || 'Active',
                    address: sAddress,
                    city: sanitizePlainText(city, SITE_TEXT_LIMITS.city),
                    state: sanitizePlainText(state, SITE_TEXT_LIMITS.state),
                    country: sanitizePlainText(country, SITE_TEXT_LIMITS.country),
                    postalCode: sanitizePlainText(postalCode, SITE_TEXT_LIMITS.postalCode),
                    latitude: latitude != null && String(latitude).trim() !== '' && !Number.isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null,
                    longitude: longitude != null && String(longitude).trim() !== '' && !Number.isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null,
                    contactName: sanitizePlainText(contactName, SITE_TEXT_LIMITS.contactName),
                    contactPosition: sanitizePlainText(contactPosition, SITE_TEXT_LIMITS.contactPosition),
                    contactNumber: sitePhone,
                    email: sanitizePlainText(email, SITE_TEXT_LIMITS.email),
                    companyId: cid,
                    // userId is reserved for auditee assignment, not company ownership
                    userId: null,
                }
            });
            res.status(201).json(site);
        } catch (error) {
            console.error('Error creating site:', error);
            res.status(500).json({ error: 'Failed to create site', details: error.message || String(error) });
        }
    });

    // Get sites for companies in the actor's organization (same scope as GET /companies).
    router.get('/sites', authenticateToken, checkTrialExpiration, async (req, res) => {
        const actorId = Number(req.user.id);
        if (!Number.isInteger(actorId) || actorId < 1) {
            return res.json([]);
        }

        const pagination = parsePaginationQuery(req.query, { defaultLimit: 50 });
        const search = String(req.query.search || '').trim();
        // Audit Active List only needs names for filter chips — skip address/company payload.
        const minimal =
            req.query.minimal === '1' ||
            req.query.minimal === 'true' ||
            String(req.query.fields || '').toLowerCase() === 'minimal';
        const siteSelect = minimal
            ? {
                  id: true,
                  name: true,
              }
            : {
                  id: true,
                  name: true,
                  description: true,
                  siteType: true,
                  status: true,
                  address: true,
                  city: true,
                  state: true,
                  country: true,
                  postalCode: true,
                  companyId: true,
                  userId: true,
                  contactName: true,
                  contactPosition: true,
                  contactNumber: true,
                  email: true,
                  createdAt: true,
                  updatedAt: true,
                  company: {
                      select: {
                          id: true,
                          name: true,
                          userId: true,
                      },
                  },
              };

        try {
            const searchWhere = search
                ? { name: { contains: search, mode: 'insensitive' } }
                : {};

            const sendSites = async (where) => {
                const fullWhere = { ...where, ...searchWhere };
                if (!pagination.paginate) {
                    const sites = await prisma.site.findMany({
                        where: fullWhere,
                        select: siteSelect,
                        orderBy: [{ name: 'asc' }],
                        take: pagination.take,
                    });
                    return res.json(sites);
                }
                const [total, sites] = await Promise.all([
                    prisma.site.count({ where: fullWhere }),
                    prisma.site.findMany({
                        where: fullWhere,
                        select: siteSelect,
                        orderBy: [{ name: 'asc' }],
                        skip: pagination.skip,
                        take: pagination.limit,
                    }),
                ]);
                return res.json(
                    paginatedResponse(sites, {
                        page: pagination.page,
                        pageSize: pagination.limit,
                        total,
                    }),
                );
            };

            const ownerUserIds = await resolveOrgCompanyOwnerUserIds(actorId);
            if (ownerUserIds.length === 0) {
                if (!pagination.paginate) return res.json([]);
                return res.json(
                    paginatedResponse([], {
                        page: pagination.page,
                        pageSize: pagination.limit,
                        total: 0,
                    }),
                );
            }

            return await sendSites({
                company: { userId: { in: ownerUserIds } },
            });
        } catch (error) {
            console.error('Failed to fetch sites:', error);
            res.status(500).json({ error: 'Failed to fetch sites' });
        }
    });

    // Update a site
    router.put('/sites/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        const actorId = Number(req.user.id);
        const access = await assertActorCanManageSite(actorId, id);
        if (!access.ok) {
            return res.status(access.status).json({ error: access.error });
        }
        const {
            name, description, siteType, status,
            address, city, state, country, postalCode,
            latitude, longitude, contactName, contactPosition,
            contactNumber, email
        } = req.body;
        try {
            const data = {};
            if (name !== undefined) {
                const siteNameLenErr = organizationTextLengthError(name, SITE_TEXT_LIMITS.name, 'Site name');
                if (siteNameLenErr) {
                    return res.status(400).json({ error: siteNameLenErr });
                }
                const sName = sanitizeOrganizationText(name, SITE_TEXT_LIMITS.name);
                if (!sName) {
                    return res.status(400).json({ error: 'Site name is required' });
                }
                data.name = sName;
            }
            if (description !== undefined) {
                data.description = sanitizePlainText(description, SITE_TEXT_LIMITS.description, { preserveNewlines: true });
            }
            if (siteType !== undefined) {
                data.siteType = sanitizePlainText(siteType, SITE_TEXT_LIMITS.siteType);
            }
            if (status !== undefined) {
                data.status = sanitizePlainText(status, SITE_TEXT_LIMITS.status);
            }
            if (address !== undefined) {
                const siteAddressLenErr = organizationTextLengthError(address, SITE_TEXT_LIMITS.address, 'Address');
                if (siteAddressLenErr) {
                    return res.status(400).json({ error: siteAddressLenErr });
                }
                const sAddress = sanitizeOrganizationText(address, SITE_TEXT_LIMITS.address);
                if (!sAddress) {
                    return res.status(400).json({ error: 'Address is required' });
                }
                data.address = sAddress;
            }
            if (city !== undefined) {
                data.city = sanitizePlainText(city, SITE_TEXT_LIMITS.city);
            }
            if (state !== undefined) {
                data.state = sanitizePlainText(state, SITE_TEXT_LIMITS.state);
            }
            if (country !== undefined) {
                data.country = sanitizePlainText(country, SITE_TEXT_LIMITS.country);
            }
            if (postalCode !== undefined) {
                data.postalCode = sanitizePlainText(postalCode, SITE_TEXT_LIMITS.postalCode);
            }
            if (latitude !== undefined || longitude !== undefined) {
                data.latitude =
                    latitude != null && String(latitude).trim() !== '' && !Number.isNaN(parseFloat(latitude))
                        ? parseFloat(latitude)
                        : null;
                data.longitude =
                    longitude != null && String(longitude).trim() !== '' && !Number.isNaN(parseFloat(longitude))
                        ? parseFloat(longitude)
                        : null;
            }
            if (contactName !== undefined) {
                data.contactName = sanitizePlainText(contactName, SITE_TEXT_LIMITS.contactName);
            }
            if (contactPosition !== undefined) {
                data.contactPosition = sanitizePlainText(contactPosition, SITE_TEXT_LIMITS.contactPosition);
            }
            if (contactNumber !== undefined) {
                let countryName = country;
                if (countryName === undefined) {
                    const existingSite = await prisma.site.findUnique({
                        where: { id: Number(id) },
                        select: { country: true },
                    });
                    countryName = existingSite?.country;
                }
                const cn = sanitizePhoneField(contactNumber, { countryName });
                if (!cn) {
                    return res.status(400).json({
                        error: phoneFieldValidationError(contactNumber, { countryName }, 'Contact number')
                            || 'Contact number is required.',
                    });
                }
                data.contactNumber = cn;
            }
            if (email !== undefined) {
                data.email = sanitizePlainText(email, SITE_TEXT_LIMITS.email);
            }

            if (Object.keys(data).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            const site = await prisma.site.update({
                where: { id: access.siteId },
                data
            });
            res.json(site);
        } catch (error) {
            if (error?.code === 'P2025') {
                return res.status(404).json({ error: 'Site not found' });
            }
            console.error('Error updating site:', error);
            res.status(500).json({ error: 'Failed to update site' });
        }
    });

    // Delete a site (and related departments / audit programs that block the FK)
    router.delete('/sites/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        const actorId = Number(req.user.id);
        const access = await assertActorCanManageSite(actorId, id);
        if (!access.ok) {
            return res.status(access.status).json({ error: access.error });
        }
        try {
            const siteId = access.siteId;

            // Respond as soon as the site row is gone for snappy UI; cascade related rows first.
            await prisma.$transaction(async (tx) => {
                const programs = await tx.auditProgram.findMany({
                    where: { siteId },
                    select: { id: true },
                });
                const programIds = programs.map((p) => p.id);

                if (programIds.length > 0) {
                    await tx.auditPlan.deleteMany({
                        where: { auditProgramId: { in: programIds } },
                    });
                    await tx.auditProgram.deleteMany({
                        where: { id: { in: programIds } },
                    });
                }

                await tx.department.deleteMany({ where: { siteId } });
                await tx.site.delete({ where: { id: siteId } });
            });

            res.status(204).send();
        } catch (error) {
            if (error?.code === 'P2025') {
                return res.status(404).json({ error: 'Site not found' });
            }
            console.error('Error deleting site:', error);
            res.status(500).json({
                error: 'Failed to delete site',
                details: error?.message || String(error),
            });
        }
    });

    // Create a department
    router.post('/sites/:siteId/departments', authenticateToken, checkTrialExpiration, async (req, res) => {
        const actorId = Number(req.user.id);
        const badKeys = getDisallowedExtraKeysError(req.body, DEPARTMENT_CREATE_ALLOWED_BODY_KEYS);
        if (badKeys) {
            return res.status(400).json({ error: badKeys });
        }

        const { siteId } = req.params;
        const access = await assertActorCanManageSite(actorId, siteId);
        if (!access.ok) {
            return res.status(access.status).json({ error: access.error });
        }

        const siteIdMismatch = assertDepartmentCreateBodySiteId(req.body, access.siteId);
        if (siteIdMismatch) {
            return res.status(400).json({ error: siteIdMismatch });
        }

        const { name, code, status, manager, description } = req.body;
        try {
            const deptNameLenErr = organizationTextLengthError(name, DEPT_TEXT_LIMITS.name, 'Department name');
            if (deptNameLenErr) {
                return res.status(400).json({ error: deptNameLenErr });
            }
            const dName = sanitizeOrganizationText(name, DEPT_TEXT_LIMITS.name);
            if (!dName) {
                return res.status(400).json({ error: 'Department name is required' });
            }

            const department = await prisma.department.create({
                data: {
                    name: dName,
                    code: sanitizePlainText(code, DEPT_TEXT_LIMITS.code),
                    status: sanitizePlainText(status, DEPT_TEXT_LIMITS.status) || 'Active',
                    manager: sanitizePlainText(manager, DEPT_TEXT_LIMITS.manager),
                    description: sanitizePlainText(description, DEPT_TEXT_LIMITS.description, { preserveNewlines: true }),
                    siteId: access.siteId
                }
            });
            res.status(201).json(department);
        } catch (error) {
            console.error('Error creating department:', error);
            res.status(500).json({ error: 'Failed to create department' });
        }
    });

    // Update a department
    router.put('/departments/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const actorId = Number(req.user.id);
        const { id } = req.params;
        const { name, code, status, manager, description, siteId } = req.body;
        try {
            const access = await assertActorCanManageDepartment(actorId, id);
            if (!access.ok) {
                return res.status(access.status).json({ error: access.error });
            }
            const parsedDeptId = access.departmentId;

            const existing = await prisma.department.findUnique({
                where: { id: parsedDeptId },
                include: { site: { select: { id: true, companyId: true } } },
            });
            if (!existing?.site) {
                return res.status(404).json({ error: 'Department not found' });
            }

            const data = {};
            if (name !== undefined) {
                const deptNameLenErr = organizationTextLengthError(name, DEPT_TEXT_LIMITS.name, 'Department name');
                if (deptNameLenErr) {
                    return res.status(400).json({ error: deptNameLenErr });
                }
                const dName = sanitizeOrganizationText(name, DEPT_TEXT_LIMITS.name);
                if (!dName) {
                    return res.status(400).json({ error: 'Department name is required' });
                }
                data.name = dName;
            }
            if (code !== undefined) {
                data.code = sanitizePlainText(code, DEPT_TEXT_LIMITS.code);
            }
            if (status !== undefined) {
                data.status = sanitizePlainText(status, DEPT_TEXT_LIMITS.status);
            }
            if (manager !== undefined) {
                data.manager = sanitizePlainText(manager, DEPT_TEXT_LIMITS.manager);
            }
            if (description !== undefined) {
                data.description = sanitizePlainText(description, DEPT_TEXT_LIMITS.description, { preserveNewlines: true });
            }
            if (siteId !== undefined) {
                const parsedSiteId = Number.parseInt(siteId, 10);
                if (!Number.isFinite(parsedSiteId)) {
                    return res.status(400).json({ error: 'Invalid site ID' });
                }
                const targetSite = await prisma.site.findUnique({
                    where: { id: parsedSiteId },
                    select: { id: true, companyId: true },
                });
                if (!targetSite) {
                    return res.status(404).json({ error: 'Site not found' });
                }
                if (!(await actorCanAssignAuditeeToSite(actorId, targetSite.id))) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
                if (targetSite.companyId !== existing.site.companyId) {
                    return res.status(400).json({
                        error: 'Department can only be moved to a site within the same company',
                    });
                }
                data.siteId = targetSite.id;
            }

            if (Object.keys(data).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            const department = await prisma.department.update({
                where: { id: parsedDeptId },
                data
            });
            res.json(department);
        } catch (error) {
            console.error('Error updating department:', error);
            res.status(500).json({ error: 'Failed to update department' });
        }
    });

    // Delete a department (PSZL-012: org-scoped via assertActorCanManageDepartment)
    router.delete('/departments/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const actorId = Number(req.user.id);
        const { id } = req.params;
        const access = await assertActorCanManageDepartment(actorId, id);
        if (!access.ok) {
            return res.status(access.status).json({ error: access.error });
        }
        try {
            await prisma.department.delete({
                where: { id: access.departmentId }
            });
            res.status(204).send();
        } catch (error) {
            if (error?.code === 'P2025') {
                return res.status(404).json({ error: 'Department not found' });
            }
            console.error('Error deleting department:', error);
            res.status(500).json({ error: 'Failed to delete department' });
        }
    });



    return router;
}
