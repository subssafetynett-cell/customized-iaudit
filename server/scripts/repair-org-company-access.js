/**
 * Repair legacy org links so existing invitees see the company owner's sites/departments.
 *
 * Problem: older invites sometimes have creatorId = null (orphan org root) or point at a
 * peer admin who does not own Company, while sites live under the real company owner.
 * New invites work because creatorId is set correctly under the owner tree.
 *
 * Usage (from server/):
 *   node scripts/repair-org-company-access.js           # dry-run report
 *   node scripts/repair-org-company-access.js --apply   # write creatorId fixes
 */
import prisma from '../src/prisma.js';
import {
    getOrgRootUserId,
    collectOrgSubtreeUserIds,
    invalidateOrgLookupCaches,
} from '../src/orgAccess.js';

const APPLY = process.argv.includes('--apply');

function normalizeName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

async function main() {
    const companies = await prisma.company.findMany({
        select: {
            id: true,
            name: true,
            userId: true,
            _count: { select: { sites: true } },
        },
        orderBy: { id: 'asc' },
    });

    const repairs = [];

    for (const company of companies) {
        const ownerId = Number(company.userId);
        if (!Number.isInteger(ownerId) || ownerId < 1) continue;
        if ((company._count?.sites ?? 0) < 1) continue;

        const ownerRoot = (await getOrgRootUserId(ownerId)) ?? ownerId;
        const subtreeIds = new Set(await collectOrgSubtreeUserIds(ownerRoot));
        subtreeIds.add(ownerId);

        // Orphan active users who do not own a company and are not already in this tree,
        // but share this company name via an empty duplicate company OR appear on programs.
        const emptyDupes = await prisma.company.findMany({
            where: {
                id: { not: company.id },
                name: { equals: company.name, mode: 'insensitive' },
                sites: { none: {} },
            },
            select: { userId: true, id: true, name: true },
        });

        for (const dupe of emptyDupes) {
            const orphanId = Number(dupe.userId);
            if (!Number.isInteger(orphanId) || orphanId < 1) continue;
            if (subtreeIds.has(orphanId)) continue;
            repairs.push({
                userId: orphanId,
                setCreatorId: ownerRoot,
                reason: `empty duplicate company "${dupe.name}" (#${dupe.id}) of real company #${company.id}`,
            });
        }

        const programLinked = await prisma.auditProgram.findMany({
            where: {
                site: { companyId: company.id },
                OR: [
                    { userId: { not: null } },
                    { leadAuditorId: { not: null } },
                    { auditors: { some: {} } },
                ],
            },
            select: {
                userId: true,
                leadAuditorId: true,
                auditors: { select: { id: true } },
            },
            take: 500,
        });

        const linkedUserIds = new Set();
        for (const program of programLinked) {
            if (program.userId) linkedUserIds.add(Number(program.userId));
            if (program.leadAuditorId) linkedUserIds.add(Number(program.leadAuditorId));
            for (const auditor of program.auditors || []) {
                linkedUserIds.add(Number(auditor.id));
            }
        }

        for (const linkedId of linkedUserIds) {
            if (!Number.isInteger(linkedId) || linkedId < 1) continue;
            if (subtreeIds.has(linkedId)) continue;
            const user = await prisma.user.findUnique({
                where: { id: linkedId },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    creatorId: true,
                    companies: { select: { id: true }, take: 1 },
                },
            });
            if (!user) continue;
            if (user.companies?.length) continue; // owns a company — do not re-parent
            if (user.creatorId != null) {
                const linkedRoot = await getOrgRootUserId(linkedId);
                if (linkedRoot === ownerRoot) continue;
            }
            repairs.push({
                userId: linkedId,
                setCreatorId: ownerRoot,
                reason: `linked via audit program on company #${company.id} (${company.name})`,
                email: user.email,
                role: user.role,
                previousCreatorId: user.creatorId,
            });
        }
    }

    // De-dupe by userId (last write wins — prefer company-owner root).
    const byUser = new Map();
    for (const row of repairs) {
        byUser.set(row.userId, row);
    }
    const unique = [...byUser.values()];

    console.log(`Found ${unique.length} user(s) to re-parent under company org roots.`);
    for (const row of unique) {
        console.log(
            `- user #${row.userId} ${row.email || ''} (${row.role || '?'}) creatorId ${row.previousCreatorId ?? 'null'} -> ${row.setCreatorId} :: ${row.reason}`,
        );
    }

    if (!APPLY) {
        console.log('\nDry run only. Re-run with --apply to write changes.');
        return;
    }

    let updated = 0;
    for (const row of unique) {
        await prisma.user.update({
            where: { id: row.userId },
            data: { creatorId: row.setCreatorId },
        });
        updated += 1;
    }
    invalidateOrgLookupCaches();
    console.log(`\nUpdated creatorId on ${updated} user(s). Org caches cleared.`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
