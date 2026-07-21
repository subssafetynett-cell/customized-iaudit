export type AuditFindingSource = {
    sourceKey: string;
    findingType: "OFI" | "Min" | "Maj";
    standardClause: string;
    areaProcess: string;
    statement: string;
    dueDate: string;
    actionBy: string;
};

export type OpportunityRow = {
    id: string;
    standardClause: string;
    areaProcess: string;
    opportunity: string;
    sourceKey?: string;
};

export type NonConformanceRow = {
    id: string;
    standardClause: string;
    areaProcess: string;
    statement: string;
    dueDate: string;
    actionBy: string;
    sourceKey?: string;
};

function normalizeFindingType(raw: string | undefined): "OFI" | "Min" | "Maj" | "C" | null {
    if (!raw) return null;
    const t = raw.trim();
    if (t === "C" || t === "Compliant") return "C";
    if (t === "OFI") return "OFI";
    if (t === "Min" || t === "Minor") return "Min";
    if (t === "Maj" || t === "Major") return "Maj";
    return null;
}

function truncate(text: string, max = 120): string {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t) return "";
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}

function buildStatement(data: Record<string, unknown>): string {
    const parts: string[] = [];
    const description = typeof data.description === "string" ? data.description.trim() : "";
    const correction = typeof data.correction === "string" ? data.correction.trim() : "";
    const rootCause = typeof data.rootCause === "string" ? data.rootCause.trim() : "";
    const correctiveAction =
        typeof data.correctiveAction === "string" ? data.correctiveAction.trim() : "";

    if (description) parts.push(description);
    if (correction) parts.push(`Correction: ${correction}`);
    if (rootCause) parts.push(`Root Cause: ${rootCause}`);
    if (correctiveAction) parts.push(`Corrective Action: ${correctiveAction}`);

    if (parts.length > 0) return parts.join("\n\n");

    const findingDetails =
        typeof data.findingDetails === "string" ? data.findingDetails.trim() : "";
    const evidence = typeof data.evidence === "string" ? data.evidence.trim() : "";
    return findingDetails || evidence;
}

export function collectAuditFindingSources(params: {
    checklistData?: Record<number, Record<string, unknown>>;
    editableChecklist?: Array<{ clause?: string; question?: string; clauseId?: string; title?: string }>;
    extraChecklistItems?: Record<string, Array<Record<string, unknown>>>;
    clauseData?: Record<string | number, Record<string, unknown>>;
}): AuditFindingSource[] {
    const {
        checklistData = {},
        editableChecklist = [],
        extraChecklistItems = {},
        clauseData = {},
    } = params;

    const sources: AuditFindingSource[] = [];

    Object.entries(checklistData).forEach(([idxStr, data]) => {
        const type = normalizeFindingType(String(data.findings ?? ""));
        if (!type || type === "C") return;

        const idx = Number(idxStr);
        const item = editableChecklist[idx];
        const clause = String(data.clause || item?.clause || "").trim();
        const question = String(item?.question || "").trim();

        sources.push({
            sourceKey: `checklist:${idxStr}`,
            findingType: type,
            standardClause: clause,
            areaProcess: truncate(question),
            statement: buildStatement(data),
            dueDate: typeof data.closeDate === "string" ? data.closeDate : "",
            actionBy: typeof data.actionBy === "string" ? data.actionBy : "",
        });
    });

    Object.entries(extraChecklistItems).forEach(([clause, items]) => {
        items.forEach((data, eqIdx) => {
            const type = normalizeFindingType(String(data.findings ?? ""));
            if (!type || type === "C") return;

            const question = String(data.question ?? "").trim();
            sources.push({
                sourceKey: `extra:${clause}:${eqIdx}`,
                findingType: type,
                standardClause: clause,
                areaProcess: truncate(question),
                statement: buildStatement(data),
                dueDate: "",
                actionBy: "",
            });
        });
    });

    Object.entries(clauseData).forEach(([key, data]) => {
        const type = normalizeFindingType(String(data.findingType ?? ""));
        if (!type || type === "C") return;

        const index = Number(key);
        const clauseFromList = Number.isFinite(index) ? editableChecklist[index] : undefined;
        const standardClause = String(
            data.clauseId || clauseFromList?.clauseId || key,
        ).trim();
        const areaProcess = truncate(
            String(data.title || clauseFromList?.title || ""),
        );

        sources.push({
            sourceKey: `clause:${key}`,
            findingType: type,
            standardClause,
            areaProcess,
            statement: buildStatement(data),
            dueDate: typeof data.closeDate === "string" ? data.closeDate : "",
            actionBy: typeof data.actionBy === "string" ? data.actionBy : "",
        });
    });

    return sources;
}

function renumberOpportunityRows(rows: OpportunityRow[]): OpportunityRow[] {
    return rows.map((row, index) => ({
        ...row,
        id: `OFI-${String(index + 1).padStart(2, "0")}`,
    }));
}

function renumberNcrRows(rows: NonConformanceRow[]): NonConformanceRow[] {
    return rows.map((row, index) => ({
        ...row,
        id: `NCR-${String(index + 1).padStart(2, "0")}`,
    }));
}

function rowsMatch<T>(a: T[], b: T[]): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function syncOpportunitiesFromSources(
    current: OpportunityRow[],
    sources: AuditFindingSource[],
): OpportunityRow[] {
    const ofiSources = sources.filter((source) => source.findingType === "OFI");
    const manualRows = current.filter((row) => !row.sourceKey);

    const syncedRows: OpportunityRow[] = ofiSources.map((source) => ({
        sourceKey: source.sourceKey,
        id: "",
        standardClause: source.standardClause,
        areaProcess: source.areaProcess,
        opportunity: source.statement,
    }));

    const merged = renumberOpportunityRows([...syncedRows, ...manualRows]);
    if (merged.length === 0) {
        return [{ id: "OFI-01", standardClause: "", areaProcess: "", opportunity: "" }];
    }
    return merged;
}

export function syncNonConformancesFromSources(
    current: NonConformanceRow[],
    sources: AuditFindingSource[],
): NonConformanceRow[] {
    const ncrSources = sources.filter(
        (source) => source.findingType === "Min" || source.findingType === "Maj",
    );
    const manualRows = current.filter((row) => !row.sourceKey);

    const syncedRows: NonConformanceRow[] = ncrSources.map((source) => ({
        sourceKey: source.sourceKey,
        id: "",
        standardClause: source.standardClause,
        areaProcess: source.areaProcess,
        statement: source.statement,
        dueDate: source.dueDate,
        actionBy: source.actionBy,
    }));

    const merged = renumberNcrRows([...syncedRows, ...manualRows]);
    if (merged.length === 0) {
        return [
            {
                id: "NCR-01",
                standardClause: "",
                areaProcess: "",
                statement: "",
                dueDate: "",
                actionBy: "",
            },
        ];
    }
    return merged;
}

export function applySyncedFindingsSummary(
    opportunities: OpportunityRow[],
    nonConformances: NonConformanceRow[],
    sources: AuditFindingSource[],
): { opportunities: OpportunityRow[]; nonConformances: NonConformanceRow[]; changed: boolean } {
    const nextOpportunities = syncOpportunitiesFromSources(opportunities, sources);
    const nextNonConformances = syncNonConformancesFromSources(nonConformances, sources);
    const changed =
        !rowsMatch(opportunities, nextOpportunities) ||
        !rowsMatch(nonConformances, nextNonConformances);

    return {
        opportunities: nextOpportunities,
        nonConformances: nextNonConformances,
        changed,
    };
}
