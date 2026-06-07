import { auditTemplates, ChecklistContent } from "@/data/auditTemplates";
import { collectAuditEvidenceFromData } from "@/lib/auditEvidenceCollection";
import { apiFetch } from "@/lib/api";

export type FindingType = "OFI" | "Minor" | "Major";
export type FindingStatus = "Opened" | "Closed";

export interface Finding {
    id: string;
    auditId: number;
    auditName: string;
    clauseRef: string;
    type: FindingType;
    status: FindingStatus;
    details: string;
    description: string;
    evidence?: string;
    findingDetails?: string;
    correction?: string;
    rootCause?: string;
    correctiveAction?: string;
    actionBy: string;
    closeDate: string;
    assignTo: string;
    assignToName?: string;
    assignToEmail?: string;
    createdByUserId?: number;
    isOverridden?: boolean;
    media?: { name: string; data: string; type: string }[];
}

export const TYPE_CONFIG: Record<
    FindingType,
    { label: string; bg: string; text: string; ring: string }
> = {
    OFI: {
        label: "OFI",
        bg: "bg-amber-100",
        text: "text-amber-800",
        ring: "ring-amber-300",
    },
    Minor: {
        label: "Minor N/C",
        bg: "bg-orange-100",
        text: "text-orange-800",
        ring: "ring-orange-300",
    },
    Major: {
        label: "Major N/C",
        bg: "bg-red-100",
        text: "text-red-800",
        ring: "ring-red-300",
    },
};

export const STATUS_CONFIG: Record<FindingStatus, { className: string }> = {
    Opened: {
        className: "bg-sky-50 text-sky-700 ring-sky-200",
    },
    Closed: {
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
};

function assignToLabel(entry: { assignTo?: string; assignToName?: string; assignToEmail?: string }) {
    const name = entry.assignToName?.trim();
    const email = entry.assignToEmail?.trim();
    if (name && email) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    return entry.assignTo?.trim() || "";
}

export function normalizeFindingStatus(raw: unknown): FindingStatus | null {
    if (raw === true) return "Closed";
    if (raw === false) return "Opened";
    const s = String(raw ?? "").trim().toLowerCase();
    if (!s) return null;
    if (["closed", "close", "resolved", "complete", "completed"].includes(s)) return "Closed";
    if (["opened", "open", "active", "pending"].includes(s)) return "Opened";
    return null;
}

export function resolveFindingStatus(entry: {
    status?: string;
    findingStatus?: string;
    isClosed?: boolean | string;
}): FindingStatus {
    return (
        normalizeFindingStatus(entry.status) ??
        normalizeFindingStatus(entry.findingStatus) ??
        normalizeFindingStatus(entry.isClosed) ??
        "Opened"
    );
}

function buildStructuredFindingFields(entry: {
    evidence?: string;
    findingDetails?: string;
    correction?: string;
    rootCause?: string;
    correctiveAction?: string;
    description?: string;
    descriptionText?: string;
    actionBy?: string;
    closeDate?: string;
    assignTo?: string;
    assignToName?: string;
    assignToEmail?: string;
    status?: string;
    findingStatus?: string;
    isClosed?: boolean | string;
    createdByUserId?: number;
}) {
    const evidence = entry.evidence?.trim() || "";
    const findingDetails = entry.findingDetails?.trim() || "";
    const correction = entry.correction?.trim() || "";
    const rootCause = entry.rootCause?.trim() || "";
    const correctiveAction = entry.correctiveAction?.trim() || "";
    const description = entry.description?.trim() || entry.descriptionText?.trim() || "";
    const details = [
        evidence || null,
        findingDetails || null,
        correction ? `Correction: ${correction}` : null,
        rootCause ? `Root Cause: ${rootCause}` : null,
        correctiveAction ? `Corrective Action: ${correctiveAction}` : null,
    ]
        .filter(Boolean)
        .join("\n");

    return {
        evidence,
        findingDetails,
        correction,
        rootCause,
        correctiveAction,
        description,
        details,
        actionBy: entry.actionBy?.trim() || "",
        closeDate: entry.closeDate?.trim() || "",
        assignTo: assignToLabel(entry),
        assignToName: entry.assignToName?.trim() || "",
        assignToEmail: entry.assignToEmail?.trim() || "",
        createdByUserId:
            typeof entry.createdByUserId === "number"
                ? entry.createdByUserId
                : entry.createdByUserId != null
                  ? Number(entry.createdByUserId) || undefined
                  : undefined,
        status: resolveFindingStatus(entry),
    };
}


function parseFindingsOverrides(plan: { findingsData?: unknown }) {
    if (!plan.findingsData) return {};
    return typeof plan.findingsData === "string"
        ? JSON.parse(plan.findingsData)
        : (plan.findingsData as Record<string, Partial<Finding>>);
}

export function mergeFindingWithOverrides(
    finding: Finding,
    overrides: Record<string, Partial<Finding>>,
): Finding {
    const override = overrides[finding.id];
    if (!override) return finding;
    const merged: Finding = {
        ...finding,
        ...override,
        isOverridden: true,
    };
    merged.status =
        normalizeFindingStatus(override.status) ?? resolveFindingStatus(merged);
    return merged;
}

export function extractFindings(plan: {
    id: number;
    auditName?: string;
    auditData?: unknown;
    templateId?: string;
    findingsData?: unknown;
}): Finding[] {
    const results: Finding[] = [];
    const auditName: string = plan.auditName || `Audit #${plan.id}`;

    if (!plan.auditData) {
        return results;
    }

    let data: Record<string, unknown>;
    try {
        data =
            typeof plan.auditData === "string"
                ? JSON.parse(plan.auditData)
                : (plan.auditData as Record<string, unknown>);
    } catch {
        return results;
    }

    if (!data || typeof data !== "object") {
        return results;
    }

    const mapType = (raw: unknown): FindingType | null => {
        if (!raw || typeof raw !== "string") return null;
        const normalized = raw.trim().toLowerCase();
        if (
            normalized === "c" ||
            normalized === "compliant" ||
            normalized === "compliance" ||
            normalized === ""
        ) {
            return null;
        }
        if (normalized.includes("ofi") || normalized.includes("opportunity")) return "OFI";
        if (normalized === "min" || normalized.includes("minor")) return "Minor";
        if (normalized === "maj" || normalized.includes("major")) return "Major";
        if (
            normalized === "nc" ||
            normalized.includes("non-conformance") ||
            normalized.includes("nonconformance")
        ) {
            return "Minor";
        }
        return null;
    };

    const getFT = (obj: Record<string, unknown> | null | undefined): FindingType | null => {
        if (!obj) return null;
        return (
            mapType(obj.findings) ||
            mapType(obj.findingType) ||
            mapType(obj.category) ||
            mapType(obj.type)
        );
    };

    const safeParse = (input: unknown) => {
        if (typeof input === "string") {
            try {
                return JSON.parse(input);
            } catch {
                return input;
            }
        }
        return input;
    };

    const collectClauseMedia = (
        auditData: Record<string, unknown>,
        clauseKey: string,
        options?: { checklistIndex?: number; processAuditIndex?: number },
    ) => collectAuditEvidenceFromData(auditData, clauseKey, options);

    const clauseData = safeParse(data.clauseData);
    const editableChecklist = safeParse(data.editableChecklist);

    if (clauseData && typeof clauseData === "object") {
        Object.entries(clauseData as Record<string, Record<string, unknown>>).forEach(
            ([clauseId, entry]) => {
                const ft = getFT(entry);
                if (ft) {
                    const modifiedClause = Array.isArray(editableChecklist)
                        ? editableChecklist.find(
                              (c: { clauseId?: string }) => c.clauseId === clauseId,
                          )
                        : null;

                    const requirementText = modifiedClause
                        ? [modifiedClause.title, ...(modifiedClause.subClauses || [])]
                              .filter(Boolean)
                              .join("\n")
                        : String(entry.title || "");

                    const fields = buildStructuredFindingFields(entry);
                    results.push({
                        id: `clause-${plan.id}-${clauseId}`,
                        auditId: plan.id,
                        auditName,
                        clauseRef: `Clause ${clauseId}`,
                        type: ft,
                        ...fields,
                        description:
                            fields.description || requirementText || "No description provided",
                        media: collectClauseMedia(data, clauseId),
                    });
                }
            },
        );
    }

    const checklistData = safeParse(data.checklistData);
    if (checklistData && typeof checklistData === "object") {
        const templateContent = (() => {
            if (Array.isArray(editableChecklist)) return editableChecklist;
            const tmplId = plan.templateId;
            if (!tmplId) return null;
            const tmpl = auditTemplates.find((t) => t.id === tmplId);
            if (!tmpl) return null;
            return tmpl.content as ChecklistContent[];
        })();

        Object.entries(checklistData as Record<string, Record<string, unknown>>).forEach(
            ([idx, entry]) => {
                const ft = getFT(entry);
                if (ft) {
                    const itemIndex = Number(idx);
                    const templateItem = Array.isArray(templateContent)
                        ? templateContent[itemIndex]
                        : null;
                    const clauseRef = entry.clause
                        ? `Clause ${entry.clause}`
                        : templateItem?.clause
                          ? `Clause ${templateItem.clause}`
                          : `Item ${itemIndex + 1}`;

                    const clauseKey = entry.clause || templateItem?.clause || String(itemIndex);
                    const fields = buildStructuredFindingFields(entry);
                    results.push({
                        id: `checklist-${plan.id}-${idx}`,
                        auditId: plan.id,
                        auditName,
                        clauseRef,
                        type: ft,
                        ...fields,
                        description:
                            fields.description ||
                            templateItem?.question ||
                            "No description provided",
                        media: collectClauseMedia(data, String(clauseKey), {
                            checklistIndex: itemIndex,
                        }),
                    });
                }
            },
        );
    }

    const extraItems = safeParse(data.extraChecklistItems);
    if (extraItems && typeof extraItems === "object") {
        Object.entries(extraItems as Record<string, unknown[]>).forEach(([clause, items]) => {
            if (Array.isArray(items)) {
                items.forEach((item, idx) => {
                    const ft = getFT(item);
                    if (ft) {
                        const fields = buildStructuredFindingFields(item);
                        results.push({
                            id: `extra-${plan.id}-${clause}-${idx}`,
                            auditId: plan.id,
                            auditName,
                            clauseRef: `Clause ${clause} (Custom)`,
                            type: ft,
                            ...fields,
                            description: fields.description || item.question || "",
                            media: collectClauseMedia(data, clause, { checklistIndex: idx }),
                        });
                    }
                });
            }
        });
    }

    const processAudits = safeParse(data.processAudits);
    if (processAudits && Array.isArray(processAudits)) {
        processAudits.forEach((audit: Record<string, unknown>, idx: number) => {
            const ft = getFT(audit);
            if (ft) {
                const fields = buildStructuredFindingFields({
                    ...audit,
                    description: audit.description || audit.processArea,
                });
                results.push({
                    id: `process-${plan.id}-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef:
                        (audit.refNo as string) ||
                        (audit.clauseNo as string) ||
                        `Process #${idx + 1}`,
                    type: ft,
                    ...fields,
                    details: [
                        (audit.evidence as string)?.trim(),
                        (audit.conclusion as string)?.trim(),
                        fields.details,
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    description: fields.description || (audit.processArea as string) || "",
                    media: collectClauseMedia(
                        data,
                        (audit.refNo as string) || (audit.clauseNo as string) || String(idx),
                        { processAuditIndex: idx },
                    ),
                });
            }
        });
    }

    if (Array.isArray(data.opportunities)) {
        data.opportunities.forEach((opt: Record<string, string>, idx: number) => {
            if (opt.opportunity?.trim()) {
                results.push({
                    id: `summary-ofi-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef: opt.standardClause || "Summary OFI",
                    type: "OFI",
                    details: opt.areaProcess || "",
                    description: opt.opportunity,
                    actionBy: "",
                    closeDate: "",
                    assignTo: "",
                    status: "Opened",
                });
            }
        });
    }

    if (Array.isArray(data.nonConformances)) {
        data.nonConformances.forEach((ncr: Record<string, unknown>, idx: number) => {
            const statement = String(ncr.statement ?? "");
            if (statement.trim()) {
                const isMajor =
                    String(ncr.id ?? "").includes("Maj") ||
                    statement.toLowerCase().includes("major");
                results.push({
                    id: `summary-ncr-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef: String(ncr.standardClause || "Summary NCR"),
                    type: isMajor ? "Major" : "Minor",
                    details: String(ncr.areaProcess || ""),
                    description: statement,
                    actionBy: String(ncr.actionBy || ""),
                    closeDate: String(ncr.dueDate || ""),
                    assignTo: "",
                    status: resolveFindingStatus(ncr),
                });
            }
        });
    }

    if (Array.isArray(data.auditFindings)) {
        data.auditFindings.forEach((finding: Record<string, unknown>, idx: number) => {
            const ft = getFT(finding);
            const details = String(finding.details ?? "");
            if (ft && details.trim()) {
                results.push({
                    id: `auditfindings-${idx}`,
                    auditId: plan.id,
                    auditName,
                    clauseRef:
                        String(finding.clauseNo || finding.refNo || "") || "General Finding",
                    type: ft,
                    details: finding.refNo ? `Ref: ${finding.refNo}` : "",
                    description: details,
                    actionBy: "",
                    closeDate: "",
                    assignTo: "",
                    status: resolveFindingStatus(finding),
                });
            }
        });
    }

    const SEVERITY: Record<FindingType, number> = { OFI: 1, Minor: 2, Major: 3 };
    const seen = new Map<string, Finding>();
    results.forEach((f) => {
        const key = `${f.auditId}::${f.id}::${f.clauseRef}`;
        const existing = seen.get(key);
        if (!existing || SEVERITY[f.type] > SEVERITY[existing.type]) {
            seen.set(key, f);
        }
    });

    return Array.from(seen.values());
}

export async function fetchFindingById(
    auditId: number,
    findingId: string,
): Promise<Finding | null> {
    const res = await apiFetch(`/audit-plans/${auditId}`);
    if (!res.ok) return null;
    const plan = await res.json();
    const base = extractFindings(plan).find((f) => f.id === findingId);
    if (!base) return null;
    const overrides = parseFindingsOverrides(plan);
    return mergeFindingWithOverrides(base, overrides);
}

export async function saveFindingOverride(updated: Finding): Promise<void> {
    const resPlan = await apiFetch(`/audit-plans/${updated.auditId}`);
    if (!resPlan.ok) throw new Error("Plan not found");
    const plan = await resPlan.json();
    if (!plan) throw new Error("Plan not found");

    const currentOverrides = parseFindingsOverrides(plan);
    const newOverrides = {
        ...currentOverrides,
        [updated.id]: {
            description: updated.description,
            actionBy: updated.actionBy,
            details: updated.details,
            assignTo: updated.assignTo,
            assignToName: updated.assignToName,
            assignToEmail: updated.assignToEmail,
            createdByUserId: updated.createdByUserId,
            closeDate: updated.closeDate,
            status: updated.status,
            media: updated.media,
        },
    };

    const resUpdate = await apiFetch(`/audit-plans/${updated.auditId}`, {
        method: "PUT",
        body: JSON.stringify({ findingsData: newOverrides }),
    });

    if (!resUpdate.ok) throw new Error("Failed to update");
}
