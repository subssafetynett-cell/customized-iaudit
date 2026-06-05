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
