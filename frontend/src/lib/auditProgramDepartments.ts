export type DepartmentOption = {
    id: string;
    name: string;
    code?: string;
    siteId: number;
    siteName: string;
    companyName: string;
};

export function departmentsFromCompanies(companies: any[]): DepartmentOption[] {
    const list: DepartmentOption[] = [];
    for (const company of companies ?? []) {
        for (const site of company.sites ?? []) {
            const siteId = Number.parseInt(String(site.id), 10);
            if (!Number.isFinite(siteId)) continue;
            for (const dept of site.departments ?? []) {
                const id = Number.parseInt(String(dept.id), 10);
                if (!Number.isFinite(id)) continue;
                list.push({
                    id: String(id),
                    name: String(dept.name ?? ""),
                    code: dept.code,
                    siteId,
                    siteName: String(site.name ?? ""),
                    companyName: String(company.name ?? ""),
                });
            }
        }
    }
    return list.sort((a, b) =>
        `${a.companyName} ${a.siteName} ${a.name}`.localeCompare(
            `${b.companyName} ${b.siteName} ${b.name}`,
        ),
    );
}

export function getDepartmentIdsFromScheduleData(scheduleData: unknown): string[] {
    if (!scheduleData || typeof scheduleData !== "object") return [];
    const ids = (scheduleData as Record<string, unknown>).departmentIds;
    return Array.isArray(ids) ? ids.map((id) => String(id)) : [];
}

export function resolveDepartmentsByIds(
    departmentIds: string[],
    companies: any[],
): DepartmentOption[] {
    if (!departmentIds.length) return [];
    const idSet = new Set(departmentIds.map(String));
    return departmentsFromCompanies(companies).filter((dept) => idSet.has(dept.id));
}

export function resolveDepartmentsFromProgram(
    program: { scheduleData?: unknown } | null | undefined,
    companies: any[],
): DepartmentOption[] {
    const ids = getDepartmentIdsFromScheduleData(program?.scheduleData);
    return resolveDepartmentsByIds(ids, companies);
}

export function formatDepartmentNames(departments: DepartmentOption[]): string {
    if (!departments.length) return "N/A";
    return departments.map((dept) => dept.name).join(", ");
}

export function formatDepartmentNamesWithSite(departments: DepartmentOption[]): string {
    if (!departments.length) return "N/A";
    return departments
        .map((dept) => `${dept.name} — ${dept.siteName}`)
        .join(", ");
}
