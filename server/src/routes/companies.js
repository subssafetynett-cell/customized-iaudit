import { Router } from 'express';
import prisma from '../prisma.js';
import {
    parsePaginationQuery,
    paginatedResponse,
    paginateArray
} from '../pagination.js';
import {
    COMPANY_TEXT_LIMITS,
    organizationTextLengthError,
    sanitizeLogoField,
    sanitizeOrganizationText,
    sanitizePhoneField,
    phoneFieldValidationError,
    sanitizePlainText,
    sanitizeStringArray
} from '../textSanitize.js';
import {
    getOrgRootUserId,
    collectOrgSubtreeUserIds,
    actorCanAccessTargetUser,
    normalizeUserRole,
    checkTrialExpiration
} from '../orgAccess.js';

export function createCompaniesRouter({ authenticateToken, checkTrialExpiration }) {
    const router = Router();

    router.get('/companies', authenticateToken, checkTrialExpiration, async (req, res) => {
        const actorId = Number(req.user?.id);
        if (!Number.isInteger(actorId) || actorId < 1) {
            return res.status(401).json({ error: 'Invalid session. Please log in again.' });
        }

        const { admin } = req.query;
        const rawQueryUserId = req.query.userId;
        const pagination = parsePaginationQuery(req.query, { defaultLimit: 8 });
        const search = String(req.query.search || '').trim();

        console.log(`[DEBUG] GET /companies called for actor: ${actorId}, admin: ${admin}`);

        try {
            const viewer = await prisma.user.findUnique({
                where: { id: actorId },
                select: { role: true }
            });
            if (!viewer) {
                return res.status(401).json({ error: 'User not found.' });
            }

            // Reject cross-tenant ?userId= probing unless platform superadmin.
            let explicitOwnerId = null;
            if (rawQueryUserId !== undefined && rawQueryUserId !== null && String(rawQueryUserId).trim() !== '') {
                explicitOwnerId = Number.parseInt(String(rawQueryUserId), 10);
                if (Number.isNaN(explicitOwnerId) || explicitOwnerId < 1) {
                    return res.status(400).json({ error: 'Invalid userId' });
                }
                if (explicitOwnerId !== actorId && viewer.role !== 'superadmin') {
                    return res.status(403).json({ error: 'Forbidden' });
                }
            }

            // List responses only need fields used by company/site/department tables and forms.
            const companyInclude = {
                sites: {
                    select: {
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
                        latitude: true,
                        longitude: true,
                        contactName: true,
                        contactPosition: true,
                        contactNumber: true,
                        email: true,
                        companyId: true,
                        userId: true,
                        createdAt: true,
                        updatedAt: true,
                        departments: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                siteId: true,
                                code: true,
                                manager: true,
                                status: true,
                                createdAt: true,
                                updatedAt: true,
                            },
                        },
                    },
                },
            };

            const searchWhere = search
                ? { name: { contains: search, mode: 'insensitive' } }
                : {};

            const sendCompanies = async (where) => {
                const fullWhere = { ...where, ...searchWhere };
                if (!pagination.paginate) {
                    const companies = await prisma.company.findMany({
                        where: fullWhere,
                        include: companyInclude,
                        orderBy: { id: 'asc' },
                        take: pagination.take,
                    });
                    return res.json(companies);
                }
                const [total, companies] = await Promise.all([
                    prisma.company.count({ where: fullWhere }),
                    prisma.company.findMany({
                        where: fullWhere,
                        include: companyInclude,
                        orderBy: { id: 'asc' },
                        skip: pagination.skip,
                        take: pagination.limit,
                    }),
                ]);
                return res.json(
                    paginatedResponse(companies, {
                        page: pagination.page,
                        limit: pagination.limit,
                        total,
                    }),
                );
            };

            if (admin === 'true') {
                if (viewer.role !== 'superadmin') {
                    return res.status(403).json({ error: 'Forbidden' });
                }
                return await sendCompanies({});
            }

            if (normalizeUserRole(viewer.role) === 'auditee') {
                const assignedSites = await prisma.site.findMany({
                    where: { userId: actorId },
                    include: {
                        departments: true,
                        company: true,
                    },
                    orderBy: [{ name: 'asc' }],
                });
                const companyMap = new Map();
                for (const site of assignedSites) {
                    const company = site.company;
                    if (!company) continue;
                    if (search && !String(company.name || '').toLowerCase().includes(search.toLowerCase())) {
                        continue;
                    }
                    if (!companyMap.has(company.id)) {
                        const { sites: _s, ...companyBase } = company;
                        companyMap.set(company.id, { ...companyBase, sites: [] });
                    }
                    const { company: _c, ...siteRow } = site;
                    companyMap.get(company.id).sites.push(siteRow);
                }
                const all = Array.from(companyMap.values());
                if (!pagination.paginate) {
                    return res.json(all);
                }
                return res.json(paginateArray(all, pagination));
            }

            let ownerUserIds;
            if (viewer.role === 'superadmin' && explicitOwnerId != null) {
                ownerUserIds = [explicitOwnerId];
            } else {
                const orgRootId = await getOrgRootUserId(actorId);
                ownerUserIds =
                    orgRootId != null ? await collectOrgSubtreeUserIds(orgRootId) : [actorId];
            }

            if (ownerUserIds.length === 0) {
                if (!pagination.paginate) return res.json([]);
                return res.json(
                    paginatedResponse([], {
                        page: pagination.page,
                        limit: pagination.limit,
                        total: 0,
                    }),
                );
            }

            return await sendCompanies({ userId: { in: ownerUserIds } });
        } catch (error) {
            console.error('Failed to fetch companies:', error);
            res.status(500).json({ error: 'Failed to fetch companies', details: error.message || String(error) });
        }
    });


    router.post('/companies', authenticateToken, checkTrialExpiration, async (req, res) => {
        const userId = req.user.id;
        const {
            name, industry, description, logo,
            contactNumber, streetAddress, city,
            state, country, postalCode, standards
        } = req.body;
        try {
            const parsedUserId = userId;

            // Enforce One Company Per User Rule
            if (parsedUserId) {
                const existingCompany = await prisma.company.findFirst({
                    where: { userId: parsedUserId }
                });
                if (existingCompany) {
                    return res.status(400).json({ error: 'User already has a registered company. Only one company is allowed per user.' });
                }
            }

            const sName = sanitizeOrganizationText(name, COMPANY_TEXT_LIMITS.name);
            if (!sName) {
                return res.status(400).json({ error: 'Company name is required' });
            }

            const streetAddressLenErr = organizationTextLengthError(
                streetAddress,
                COMPANY_TEXT_LIMITS.streetAddress,
                'Street address'
            );
            if (streetAddressLenErr) {
                return res.status(400).json({ error: streetAddressLenErr });
            }
            const sStreetAddress = sanitizeOrganizationText(streetAddress, COMPANY_TEXT_LIMITS.streetAddress);
            if (!sStreetAddress) {
                return res.status(400).json({ error: 'Street address is required' });
            }

            const sCity = sanitizePlainText(city, COMPANY_TEXT_LIMITS.city);
            const sCountry = sanitizePlainText(country, COMPANY_TEXT_LIMITS.country);

            const companyPhone = sanitizePhoneField(contactNumber, { countryName: country });
            if (!companyPhone) {
                return res.status(400).json({
                    error: phoneFieldValidationError(contactNumber, { countryName: country }, 'Contact number')
                        || 'Contact number is required.',
                });
            }

            const sanitizedLogo =
                logo === undefined || logo === null || logo === ''
                    ? undefined
                    : sanitizeLogoField(logo, COMPANY_TEXT_LIMITS.logo);
            if (logo && sanitizedLogo === null) {
                return res.status(400).json({ error: 'Logo image is too large. Use a smaller file (under 10MB).' });
            }
            if (logo && sanitizedLogo === '') {
                return res.status(400).json({ error: 'Invalid logo image. Use PNG or JPEG.' });
            }

            const company = await prisma.company.create({
                data: {
                    name: sName,
                    industry: sanitizePlainText(industry, COMPANY_TEXT_LIMITS.industry),
                    description: sanitizePlainText(description, COMPANY_TEXT_LIMITS.description, { preserveNewlines: true }),
                    logo: sanitizedLogo,
                    contactNumber: companyPhone,
                    streetAddress: sStreetAddress,
                    city: sCity,
                    state: sanitizePlainText(state, COMPANY_TEXT_LIMITS.state),
                    country: sCountry,
                    postalCode: sanitizePlainText(postalCode, COMPANY_TEXT_LIMITS.postalCode),
                    isoStandards: sanitizeStringArray(standards),
                    // Automatically set legacy fields for compatibility
                    location: `${sCity || ''}, ${sCountry || ''}`.trim().replace(/^, |,$/, ''),
                    contactDetails: companyPhone,
                    userId: parsedUserId
                },
            });
            res.status(201).json(company);
        } catch (error) {
            console.error('Error creating company:', error);
            res.status(500).json({ error: 'Failed to create company' });
        }
    });

    // Update a company
    router.put('/companies/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        const actorId = Number(req.user.id);
        const {
            name, industry, description, logo,
            contactNumber, streetAddress, city,
            state, country, postalCode, standards
        } = req.body;
        try {
            const companyIdNum = Number.parseInt(id, 10);
            if (Number.isNaN(companyIdNum)) {
                return res.status(400).json({ error: 'Invalid company id' });
            }
            const existing = await prisma.company.findUnique({
                where: { id: companyIdNum },
                select: { userId: true, city: true, country: true, contactNumber: true }
            });
            if (!existing || existing.userId == null) {
                return res.status(404).json({ error: 'Company not found' });
            }
            if (!(await actorCanAccessTargetUser(actorId, existing.userId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const data = {};
            if (name !== undefined) {
                const s = sanitizeOrganizationText(name, COMPANY_TEXT_LIMITS.name);
                if (!s) {
                    return res.status(400).json({ error: 'Company name is required' });
                }
                data.name = s;
            }
            if (industry !== undefined) {
                data.industry = sanitizePlainText(industry, COMPANY_TEXT_LIMITS.industry);
            }
            if (description !== undefined) {
                data.description = sanitizePlainText(description, COMPANY_TEXT_LIMITS.description, { preserveNewlines: true });
            }
            if (logo !== undefined) {
                if (logo === null || logo === '') {
                    data.logo = null;
                } else {
                    const sanitizedLogo = sanitizeLogoField(logo, COMPANY_TEXT_LIMITS.logo);
                    if (sanitizedLogo === null) {
                        return res.status(400).json({ error: 'Logo image is too large. Use a smaller file (under 10MB).' });
                    }
                    if (sanitizedLogo === '') {
                        return res.status(400).json({ error: 'Invalid logo image. Use PNG or JPEG.' });
                    }
                    data.logo = sanitizedLogo;
                }
            }
            if (streetAddress !== undefined) {
                const streetAddressLenErr = organizationTextLengthError(
                    streetAddress,
                    COMPANY_TEXT_LIMITS.streetAddress,
                    'Street address'
                );
                if (streetAddressLenErr) {
                    return res.status(400).json({ error: streetAddressLenErr });
                }
                const sStreetAddress = sanitizeOrganizationText(streetAddress, COMPANY_TEXT_LIMITS.streetAddress);
                if (!sStreetAddress) {
                    return res.status(400).json({ error: 'Street address is required' });
                }
                data.streetAddress = sStreetAddress;
            }
            if (state !== undefined) {
                data.state = sanitizePlainText(state, COMPANY_TEXT_LIMITS.state);
            }
            if (postalCode !== undefined) {
                data.postalCode = sanitizePlainText(postalCode, COMPANY_TEXT_LIMITS.postalCode);
            }
            if (standards !== undefined) {
                data.isoStandards = sanitizeStringArray(standards);
            }
            if (contactNumber !== undefined) {
                let countryName = country;
                if (countryName === undefined) {
                    countryName = existing.country;
                }
                const cn = sanitizePhoneField(contactNumber, { countryName });
                if (!cn) {
                    return res.status(400).json({
                        error: phoneFieldValidationError(contactNumber, { countryName }, 'Contact number')
                            || 'Contact number is required.',
                    });
                }
                data.contactNumber = cn;
                data.contactDetails = cn;
            }
            if (city !== undefined) {
                data.city = sanitizePlainText(city, COMPANY_TEXT_LIMITS.city);
            }
            if (country !== undefined) {
                data.country = sanitizePlainText(country, COMPANY_TEXT_LIMITS.country);
            }
            if (city !== undefined || country !== undefined) {
                const effCity = data.city !== undefined ? data.city : existing.city;
                const effCountry = data.country !== undefined ? data.country : existing.country;
                data.location = `${effCity || ''}, ${effCountry || ''}`.trim().replace(/^, |,$/, '');
            }

            if (Object.keys(data).length === 0) {
                return res.status(400).json({ error: 'No valid fields to update' });
            }

            const company = await prisma.company.update({
                where: { id: Number.parseInt(id) },
                data
            });
            res.json(company);
        } catch (error) {
            console.error('Error updating company:', error);
            res.status(500).json({ error: 'Failed to update company' });
        }
    });

    // Delete a company
    router.delete('/companies/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
        const { id } = req.params;
        const actorId = Number(req.user.id);
        try {
            const companyIdNum = Number.parseInt(id, 10);
            if (Number.isNaN(companyIdNum)) {
                return res.status(400).json({ error: 'Invalid company id' });
            }
            const existing = await prisma.company.findUnique({
                where: { id: companyIdNum },
                select: { userId: true }
            });
            if (!existing || existing.userId == null) {
                return res.status(404).json({ error: 'Company not found' });
            }
            if (!(await actorCanAccessTargetUser(actorId, existing.userId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            await prisma.company.delete({
                where: { id: companyIdNum },
            });
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting company:', error);
            res.status(500).json({ error: 'Failed to delete company' });
        }
    });


    return router;
}
