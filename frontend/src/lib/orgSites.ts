/** Flatten nested company → sites into API-shaped site rows (with company relation). */
export function sitesFromCompanies(
    companies: Array<{
        id: string | number;
        name: string;
        sites?: Array<Record<string, unknown> & { id: string | number; name: string }>;
    }>,
): Array<Record<string, unknown> & { id: number; name: string; company: { id: unknown; name: string } }> {
    const list: Array<
        Record<string, unknown> & { id: number; name: string; company: { id: unknown; name: string } }
    > = [];
    for (const company of companies) {
        for (const site of company.sites ?? []) {
            const id = Number.parseInt(String(site.id), 10);
            if (!Number.isFinite(id) || id < 1) continue;
            list.push({
                ...site,
                id,
                name: String(site.name ?? ""),
                company: { id: company.id, name: company.name },
            });
        }
    }
    return list.sort((a, b) =>
        `${a.company.name} ${a.name}`.localeCompare(`${b.company.name} ${b.name}`),
    );
}

/** Site.userId is reserved for auditee assignment; legacy rows may still reference the creator. */
export function siteHasAssignedAuditee(
    site: { userId?: number | string | null },
    auditeeUserIds: ReadonlySet<number>,
): boolean {
    const uid = Number.parseInt(String(site.userId ?? ""), 10);
    return Number.isFinite(uid) && uid >= 1 && auditeeUserIds.has(uid);
}

export function siteAvailableForAuditeeInvite(
    site: { userId?: number | string | null },
    auditeeUserIds: ReadonlySet<number>,
): boolean {
    return !siteHasAssignedAuditee(site, auditeeUserIds);
}
