import {
    auditTemplates,
    ChecklistContent,
    parseAuditPlanTemplateIds,
} from "@/data/auditTemplates";
import { collectAuditEvidenceFromData } from "@/lib/auditEvidenceCollection";
import { apiFetch } from "@/lib/api";
import {
    getEoshCapabilityBannerCopy,
    isEoshScoredCapabilityChecklist,
} from "@/lib/eoshChecklistUi";
import {
    getQfsKoreBannerCopy,
    isQfsKoreScoredChecklist,
} from "@/lib/qfsKoreChecklistUi";

export type FindingType = "OFI" | "Minor" | "Major" | "NC";

export type FindingStatus =
    | "Opened"
    | "Closed"
    | "Accepted"
    | "Responded"
    | "New Response";

export type FindingCapaReview = {
    decision: "ACCEPT" | "REJECT";
    reason?: string;
    reviewedAt: string;
    reviewedByName?: string;
};

export type FindingCapaHistoryEntry = {
    submittedAt: string;
    capaForm?: Record<string, unknown>;
    rootCause?: string;
    correction?: string;
    correctiveAction?: string;
    findingDetails?: string;
};

export function isNcFindingType(type: FindingType): boolean {
    return type === "Minor" || type === "Major" || type === "NC";
}

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
    raisedBy?: string;
    raisedByName?: string;
    raisedByEmail?: string;
    escalationTo?: string;
    escalationToName?: string;
    escalationToEmail?: string;
    escalationDate?: string;
    moduleName?: string;
    createdByUserId?: number;
    isOverridden?: boolean;
    media?: { name: string; data: string; type: string }[];
    /** Structured CAPA / RCA response (Sections A–E) from assignee. */
    capaForm?: Record<string, unknown>;
    /** Prior submitted CAPA versions (newest last). */
    capaResponseHistory?: FindingCapaHistoryEntry[];
    /** Reporter accept / reject decisions. */
    capaReviews?: FindingCapaReview[];
    /** Latest reject reason when reopened. */
    rejectReason?: string;
}

/** Split CAPA history into current (latest) vs previous submissions. */
export function splitFindingCapaHistory(finding: Finding): {
    current: FindingCapaHistoryEntry | null;
    previous: FindingCapaHistoryEntry[];
} {
    const history = Array.isArray(finding.capaResponseHistory)
        ? [...finding.capaResponseHistory]
        : [];

    if (history.length > 0) {
        return {
            current: history[history.length - 1] ?? null,
            previous: history.slice(0, -1),
        };
    }

    if (
        finding.capaForm ||
        finding.rootCause?.trim() ||
        finding.correction?.trim() ||
        finding.correctiveAction?.trim()
    ) {
        return {
            current: {
                submittedAt: "",
                capaForm: finding.capaForm,
                rootCause: finding.rootCause,
                correction: finding.correction,
                correctiveAction: finding.correctiveAction,
                findingDetails: finding.findingDetails,
            },
            previous: [],
        };
    }

    return { current: null, previous: [] };
}

/** Human-readable module name for EOSH / QFS KORE checklists; null for ISO/other. */
export function resolveAuditModuleDisplayName(
    templateId?: string | null,
): string | null {
    if (!templateId) return null;
    if (isEoshScoredCapabilityChecklist(templateId)) {
        return getEoshCapabilityBannerCopy(templateId).sectionTitle;
    }
    if (isQfsKoreScoredChecklist(templateId)) {
        return getQfsKoreBannerCopy(templateId).sectionTitle;
    }
    return null;
}

function formatChecklistClauseRef(options: {
    moduleName: string | null;
    clauseCode?: string;
    itemIndex: number;
}): string {
    const code = String(options.clauseCode || "").trim();
    if (options.moduleName) {
        return code ? `${options.moduleName} · ${code}` : options.moduleName;
    }
    if (code) return `Clause ${code}`;
    return `Item ${options.itemIndex + 1}`;
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
    NC: {
        label: "NC",
        bg: "bg-red-100",
        text: "text-red-800",
        ring: "ring-red-300",
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
        className: "bg-red-50 text-red-600 ring-red-200",
    },
    Closed: {
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    Accepted: {
        className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    Responded: {
        className: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    "New Response": {
        className: "bg-violet-50 text-violet-700 ring-violet-200",
    },
};

/** Select trigger colors for finding status on the Findings listing. */
export const STATUS_SELECT_CLASS: Record<FindingStatus, string> = {
    Opened: "border-red-200 bg-red-50 text-red-600 hover:bg-red-50 focus:ring-red-200",
    Closed: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-200",
    Accepted: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 focus:ring-blue-200",
    Responded: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 focus:ring-amber-200",
    "New Response":
        "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50 focus:ring-violet-200",
};

function assignToLabel(entry: { assignTo?: string; assignToName?: string; assignToEmail?: string }) {
    const name = entry.assignToName?.trim();
    const email = entry.assignToEmail?.trim();
    if (name && email) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    return entry.assignTo?.trim() || "";
}

function raisedByLabel(entry: {
    raisedBy?: string;
    raisedByName?: string;
    raisedByEmail?: string;
}) {
    const name = entry.raisedByName?.trim() || entry.raisedBy?.trim();
    const email = entry.raisedByEmail?.trim();
    if (name && email && !name.includes(email)) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    return "";
}

/** Display name for the Action By column — prefers Raised by from exception follow-up. */
export function findingActionByDisplay(finding: {
    raisedBy?: string;
    raisedByName?: string;
    raisedByEmail?: string;
    actionBy?: string;
    assignTo?: string;
    assignToName?: string;
}): string {
    return (
        raisedByLabel(finding) ||
        finding.actionBy?.trim() ||
        finding.assignToName?.trim() ||
        finding.assignTo?.trim() ||
        ""
    );
}

export function normalizeFindingStatus(raw: unknown): FindingStatus | null {
    if (raw === true) return "Closed";
    if (raw === false) return "Opened";
    const s = String(raw ?? "").trim().toLowerCase();
    if (!s) return null;
    if (["closed", "close", "resolved", "complete", "completed"].includes(s)) return "Closed";
    if (["accepted", "accept", "acknowledge", "acknowledged"].includes(s)) return "Accepted";
    if (
        [
            "new response",
            "new_response",
            "newresponse",
            "responded",
            "response",
            "response_submitted",
            "responsesubmitted",
        ].includes(s)
    ) {
        return "New Response";
    }
    if (["opened", "open", "active", "pending", "reopened"].includes(s)) return "Opened";
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

function escalationToLabel(entry: {
    escalationTo?: string;
    escalationToName?: string;
    escalationToEmail?: string;
}) {
    const name = entry.escalationToName?.trim() || entry.escalationTo?.trim();
    const email = entry.escalationToEmail?.trim();
    if (name && email && !name.includes("@")) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    return "";
}

function buildStructuredFindingFields(entry: {
    evidence?: string;
    findingDetails?: string;
    correction?: string;
    rootCause?: string;
    correctiveAction?: string;
    description?: string;
    descriptionText?: string;
    details?: string;
    actionBy?: string;
    closeDate?: string;
    targetDate?: string;
    assignTo?: string;
    assignToName?: string;
    assignToEmail?: string;
    raisedBy?: string;
    raisedByName?: string;
    raisedByEmail?: string;
    escalationTo?: string;
    escalationToName?: string;
    escalationToEmail?: string;
    escalationDate?: string;
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
    const ncDetails = entry.details?.trim() || "";
    const description =
        entry.description?.trim() ||
        entry.descriptionText?.trim() ||
        ncDetails ||
        "";
    const details = [
        ncDetails || null,
        evidence || null,
        findingDetails || null,
        correction ? `Correction: ${correction}` : null,
        rootCause ? `Root Cause: ${rootCause}` : null,
        correctiveAction ? `Corrective Action: ${correctiveAction}` : null,
    ]
        .filter(Boolean)
        .join("\n");

    const raisedBy = raisedByLabel(entry);
    const escalationTo = escalationToLabel(entry);

    return {
        evidence,
        findingDetails: findingDetails || ncDetails,
        correction,
        rootCause,
        correctiveAction,
        description,
        details,
        actionBy: entry.actionBy?.trim() || raisedBy || "",
        closeDate: entry.closeDate?.trim() || entry.targetDate?.trim() || "",
        assignTo: assignToLabel(entry),
        assignToName: entry.assignToName?.trim() || "",
        assignToEmail: entry.assignToEmail?.trim() || "",
        raisedBy,
        raisedByName: entry.raisedByName?.trim() || entry.raisedBy?.trim() || "",
        raisedByEmail: entry.raisedByEmail?.trim() || "",
        escalationTo,
        escalationToName:
            entry.escalationToName?.trim() || entry.escalationTo?.trim() || "",
        escalationToEmail: entry.escalationToEmail?.trim() || "",
        escalationDate: entry.escalationDate?.trim() || "",
        createdByUserId:
            typeof entry.createdByUserId === "number"
                ? entry.createdByUserId
                : entry.createdByUserId != null
                  ? Number(entry.createdByUserId) || undefined
                  : undefined,
        status: resolveFindingStatus(entry),
    };
}

function mediaFromFindingEntry(entry: {
    evidenceMedia?: { name: string; data: string; type: string; description?: string }[];
    media?: { name: string; data: string; type: string; description?: string }[];
}) {
    const fromEntry = Array.isArray(entry.evidenceMedia)
        ? entry.evidenceMedia
        : Array.isArray(entry.media)
          ? entry.media
          : [];
    return fromEntry
        .filter((m) => m && typeof m.data === "string" && m.data.trim())
        .map((m) => ({
            name: m.name || "file",
            data: m.data,
            type: m.type || "",
            description: m.description,
        }));
}

function mergeFindingMedia(
    ...lists: Array<{ name: string; data: string; type: string; description?: string }[] | undefined>
) {
    const media: { name: string; data: string; type: string; description?: string }[] = [];
    const seen = new Set<string>();
    for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const m of list) {
            if (!m?.data || typeof m.data !== "string") continue;
            const sig = `${m.name}::${m.data.slice(0, 40)}`;
            if (seen.has(sig)) continue;
            seen.add(sig);
            media.push({
                name: m.name || "file",
                data: m.data,
                type: m.type || "",
                description: m.description,
            });
        }
    }
    return media;
}


export function parseFindingsOverrides(plan: { findingsData?: unknown }) {
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
    // Prefer non-empty media so assignee responses don't wipe auditor evidence
    // and empty override media doesn't hide uploaded attachments.
    const overrideMedia = Array.isArray(override.media) ? override.media : null;
    const baseMedia = Array.isArray(finding.media) ? finding.media : [];
    if (!overrideMedia || overrideMedia.length === 0) {
        merged.media = baseMedia.length > 0 ? baseMedia : overrideMedia || [];
    } else if (baseMedia.length > 0) {
        const seen = new Set(
            overrideMedia.map((m) => `${m.name}::${String(m.data || "").slice(0, 40)}`),
        );
        merged.media = [
            ...overrideMedia,
            ...baseMedia.filter((m) => {
                const sig = `${m.name}::${String(m.data || "").slice(0, 40)}`;
                if (seen.has(sig)) return false;
                seen.add(sig);
                return true;
            }),
        ];
    }
    // Never let empty override fields wipe assignee / reporter identity used for
    // Assigned-to-me and "Respond to finding" visibility.
    const pickText = (overrideVal: unknown, baseVal: string | undefined) => {
        const next = typeof overrideVal === "string" ? overrideVal.trim() : "";
        if (next) return next;
        return baseVal?.trim() || "";
    };
    merged.assignToEmail = pickText(override.assignToEmail, finding.assignToEmail);
    merged.assignToName = pickText(override.assignToName, finding.assignToName);
    merged.assignTo = pickText(override.assignTo, finding.assignTo);
    merged.raisedByEmail = pickText(override.raisedByEmail, finding.raisedByEmail);
    merged.raisedByName = pickText(override.raisedByName, finding.raisedByName);
    merged.raisedBy = pickText(override.raisedBy, finding.raisedBy);
    if (override.createdByUserId == null && finding.createdByUserId != null) {
        merged.createdByUserId = finding.createdByUserId;
    }
    merged.status =
        normalizeFindingStatus(override.status) ?? resolveFindingStatus(merged);
    return merged;
}

export function getMergedPlanFindings(plan: {
    id: number;
    auditName?: string;
    auditData?: unknown;
    templateId?: string;
    findingsData?: unknown;
}): Finding[] {
    const overrides = parseFindingsOverrides(plan);
    return extractFindings(plan).map((finding) =>
        mergeFindingWithOverrides(finding, overrides),
    );
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
            normalized === "2" ||
            normalized === ""
        ) {
            return null;
        }
        // EOSH scored checklists: 1 / OFI = Meet with Exceptions, 0 / NC = Non Compliance
        if (normalized === "0" || normalized === "nc") return "NC";
        if (normalized === "1") return "OFI";
        if (normalized.includes("ofi") || normalized.includes("opportunity")) return "OFI";
        if (normalized === "min" || normalized.includes("minor")) return "Minor";
        if (normalized === "maj" || normalized.includes("major")) return "Major";
        if (
            normalized.includes("non-conformance") ||
            normalized.includes("nonconformance") ||
            normalized.includes("non compliance") ||
            normalized.includes("non-compliance")
        ) {
            return "NC";
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
                        media: mergeFindingMedia(
                            mediaFromFindingEntry(entry),
                            collectClauseMedia(data, clauseId),
                        ),
                    });
                }
            },
        );
    }

    const checklistData = safeParse(data.checklistData);
    const moduleStoreRaw = safeParse(data.moduleDataByTemplateId);
    const planTemplateIds = parseAuditPlanTemplateIds(plan.templateId);
    const activeModuleId =
        typeof data.activeModuleId === "string" && data.activeModuleId.trim()
            ? data.activeModuleId.trim()
            : planTemplateIds[0] || String(plan.templateId || "").trim() || "";

    type ChecklistSource = {
        templateId: string;
        checklistData: Record<string, Record<string, unknown>>;
        editableChecklist?: unknown;
        /** When true, finding ids stay `checklist-{planId}-{idx}` for backwards compatibility. */
        useLegacyFindingIds: boolean;
    };

    const checklistSources: ChecklistSource[] = [];
    const moduleStore =
        moduleStoreRaw && typeof moduleStoreRaw === "object"
            ? (moduleStoreRaw as Record<
                  string,
                  {
                      checklistData?: Record<string, Record<string, unknown>>;
                      editableChecklist?: unknown;
                  }
              >)
            : {};

    const moduleStoreKeys = Object.keys(moduleStore);
    if (moduleStoreKeys.length > 0) {
        const multiModule = moduleStoreKeys.length > 1 || planTemplateIds.length > 1;
        for (const templateId of moduleStoreKeys) {
            const mod = moduleStore[templateId];
            const modChecklist = safeParse(mod?.checklistData);
            if (!modChecklist || typeof modChecklist !== "object") continue;
            checklistSources.push({
                templateId,
                checklistData: modChecklist as Record<string, Record<string, unknown>>,
                editableChecklist: mod?.editableChecklist,
                useLegacyFindingIds: !multiModule && templateId === activeModuleId,
            });
        }
        // Top-level checklist may be ahead of the store for the active module.
        if (
            checklistData &&
            typeof checklistData === "object" &&
            activeModuleId &&
            !moduleStoreKeys.includes(activeModuleId)
        ) {
            checklistSources.push({
                templateId: activeModuleId,
                checklistData: checklistData as Record<string, Record<string, unknown>>,
                editableChecklist,
                useLegacyFindingIds: planTemplateIds.length <= 1,
            });
        } else if (
            checklistData &&
            typeof checklistData === "object" &&
            activeModuleId &&
            moduleStoreKeys.includes(activeModuleId)
        ) {
            // Prefer freshest top-level answers for the active module.
            const idx = checklistSources.findIndex((s) => s.templateId === activeModuleId);
            if (idx >= 0) {
                checklistSources[idx] = {
                    ...checklistSources[idx],
                    checklistData: checklistData as Record<string, Record<string, unknown>>,
                    editableChecklist:
                        Array.isArray(editableChecklist) && editableChecklist.length > 0
                            ? editableChecklist
                            : checklistSources[idx].editableChecklist,
                };
            }
        }
    } else if (checklistData && typeof checklistData === "object") {
        checklistSources.push({
            templateId: activeModuleId || String(plan.templateId || ""),
            checklistData: checklistData as Record<string, Record<string, unknown>>,
            editableChecklist,
            useLegacyFindingIds: true,
        });
    }

    for (const source of checklistSources) {
        const moduleName = resolveAuditModuleDisplayName(source.templateId);
        const templateContent = (() => {
            const fromMod = safeParse(source.editableChecklist);
            if (Array.isArray(fromMod) && fromMod.length > 0) return fromMod;
            if (Array.isArray(editableChecklist) && source.templateId === activeModuleId) {
                return editableChecklist;
            }
            const tmpl = auditTemplates.find((t) => t.id === source.templateId);
            if (!tmpl) return null;
            return tmpl.content as ChecklistContent[];
        })();

        Object.entries(source.checklistData).forEach(([idx, entry]) => {
            const ft = getFT(entry);
            if (!ft) return;
            const itemIndex = Number(idx);
            const templateItem = Array.isArray(templateContent)
                ? templateContent[itemIndex]
                : null;
            const clauseCode = String(
                entry.clause || templateItem?.clause || "",
            ).trim();
            const clauseRef = formatChecklistClauseRef({
                moduleName,
                clauseCode,
                itemIndex,
            });
            const findingId = source.useLegacyFindingIds
                ? `checklist-${plan.id}-${idx}`
                : `checklist-${plan.id}-${source.templateId}-${idx}`;
            const clauseKey = clauseCode || String(itemIndex);
            const fields = buildStructuredFindingFields(entry);
            results.push({
                id: findingId,
                auditId: plan.id,
                auditName,
                clauseRef,
                moduleName: moduleName || undefined,
                type: ft,
                ...fields,
                description:
                    fields.description ||
                    templateItem?.question ||
                    "No description provided",
                media: mergeFindingMedia(
                    mediaFromFindingEntry(entry),
                    collectClauseMedia(data, String(clauseKey), {
                        checklistIndex: itemIndex,
                    }),
                    collectClauseMedia(data, String(itemIndex), {
                        checklistIndex: itemIndex,
                    }),
                ),
            });
        });
    }

    const extraItems = safeParse(data.extraChecklistItems);
    if (extraItems && typeof extraItems === "object") {
        Object.entries(extraItems as Record<string, unknown[]>).forEach(([clause, items]) => {
            if (Array.isArray(items)) {
                items.forEach((item, idx) => {
                    const row =
                        item && typeof item === "object"
                            ? (item as Record<string, unknown>)
                            : {};
                    const ft = getFT(row);
                    if (ft) {
                        const fields = buildStructuredFindingFields(row);
                        results.push({
                            id: `extra-${plan.id}-${clause}-${idx}`,
                            auditId: plan.id,
                            auditName,
                            clauseRef: `Clause ${clause} (Custom)`,
                            type: ft,
                            ...fields,
                            description:
                                fields.description ||
                                (typeof row.question === "string" ? row.question : "") ||
                                "",
                            media: mergeFindingMedia(
                                mediaFromFindingEntry(row),
                                collectClauseMedia(data, clause, { checklistIndex: idx }),
                            ),
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
                    description: (audit.description || audit.processArea) as string | undefined,
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

    const SEVERITY: Record<FindingType, number> = { OFI: 1, NC: 2, Minor: 2, Major: 3 };
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

/** Maps stored finding id (e.g. clause-5-4.1) to AuditExecute scroll target element id. */
export function findingIdToExecuteDomId(findingId: string): string | null {
    const match = findingId.match(/^(clause|checklist|process)-\d+-(.+)$/);
    if (!match) return null;
    const [, source, key] = match;
    return `finding-${source}-${key}`;
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
            evidence: updated.evidence,
            findingDetails: updated.findingDetails,
            correction: updated.correction,
            rootCause: updated.rootCause,
            correctiveAction: updated.correctiveAction,
            assignTo: updated.assignTo,
            assignToName: updated.assignToName,
            assignToEmail: updated.assignToEmail,
            createdByUserId: updated.createdByUserId,
            closeDate: updated.closeDate,
            status: updated.status,
            media: updated.media,
            capaForm: updated.capaForm,
            capaResponseHistory: updated.capaResponseHistory,
            capaReviews: updated.capaReviews,
            rejectReason: updated.rejectReason,
        },
    };

    let existingAuditData: Record<string, unknown> = {};
    try {
        existingAuditData =
            typeof plan.auditData === "string"
                ? JSON.parse(plan.auditData)
                : ((plan.auditData as Record<string, unknown>) ?? {});
    } catch {
        existingAuditData = {};
    }

    const completionPlan = {
        id: plan.id,
        auditName: plan.auditName,
        templateId: plan.templateId,
        findingsData: newOverrides,
        auditData: existingAuditData,
    };
    const mergedFindings = getMergedPlanFindings(completionPlan);
    const progress = Number(existingAuditData.progress ?? 0);
    const auditCompleted =
        progress >= 100 &&
        (mergedFindings.length === 0 || mergedFindings.every((f) => f.status === "Closed"));

    const resUpdate = await apiFetch(`/audit-plans/${updated.auditId}`, {
        method: "PUT",
        body: JSON.stringify({
            findingsData: newOverrides,
            auditData: {
                ...existingAuditData,
                auditCompleted,
                completedAt: auditCompleted ? new Date().toISOString() : null,
            },
        }),
    });

    if (!resUpdate.ok) throw new Error("Failed to update");
}

/** Resolve raised-by email from a finding for reporter notifications. */
export function getFindingRaisedByEmail(finding: Finding): string {
    if (finding.raisedByEmail?.trim()) {
        return finding.raisedByEmail.toLowerCase().trim();
    }
    const labeled = (finding.raisedBy || finding.raisedByName || "").match(
        /\(([^\s@]+@[^\s@]+\.[^\s@]+)\)\s*$/,
    );
    if (labeled?.[1]) return labeled[1].toLowerCase().trim();
    const raw = (finding.raisedBy || finding.raisedByName || "").trim();
    if (raw.includes("@")) return raw.toLowerCase();
    return "";
}

/**
 * Email + in-app notification to the reporter after an assignee sends a response.
 * Formal NC responses already notify on the server; this covers informal findings.
 */
export async function notifyFindingResponse(
    finding: Finding,
    options?: { nonconformanceId?: number | null; isUpdate?: boolean },
): Promise<void> {
    const raisedByEmail = getFindingRaisedByEmail(finding);
    const raisedByUserId = finding.createdByUserId
        ? Number(finding.createdByUserId)
        : null;
    if (!raisedByEmail && !(Number.isInteger(raisedByUserId) && raisedByUserId! > 0)) {
        return;
    }

    const res = await apiFetch(
        `/audit-plans/${finding.auditId}/notify-finding-response`,
        {
            method: "POST",
            body: JSON.stringify({
                findingId: finding.id,
                findingRef: finding.clauseRef || finding.description || finding.id,
                raisedByEmail: raisedByEmail || undefined,
                raisedByUserId:
                    Number.isInteger(raisedByUserId) && raisedByUserId! > 0
                        ? raisedByUserId
                        : undefined,
                nonconformanceId: options?.nonconformanceId ?? null,
                isUpdate: Boolean(options?.isUpdate),
            }),
        },
    );
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to notify reporter",
        );
    }
}

export function getFindingAssigneeEmail(finding: Finding): string {
    if (finding.assignToEmail?.trim()) {
        return finding.assignToEmail.toLowerCase().trim();
    }
    const labeled = finding.assignTo?.match(/\(([^\s@]+@[^\s@]+\.[^\s@]+)\)\s*$/);
    if (labeled?.[1]) return labeled[1].toLowerCase().trim();
    if (finding.assignTo?.includes("@")) {
        return finding.assignTo.toLowerCase().trim();
    }
    return "";
}

export function isFindingAwaitingReporterReview(finding: Finding): boolean {
    return finding.status === "New Response" || finding.status === "Responded";
}

/**
 * Notify the assignee after the reporter accepts/closes or rejects/reopens.
 */
export async function notifyFindingReview(
    finding: Finding,
    options: {
        decision: "ACCEPT" | "REJECT";
        reason?: string;
        nonconformanceId?: number | null;
    },
): Promise<void> {
    const assignToEmail = getFindingAssigneeEmail(finding);
    if (!assignToEmail) return;

    const res = await apiFetch(
        `/audit-plans/${finding.auditId}/notify-finding-review`,
        {
            method: "POST",
            body: JSON.stringify({
                findingId: finding.id,
                findingRef: finding.clauseRef || finding.description || finding.id,
                assignToEmail,
                decision: options.decision,
                reason: options.reason || undefined,
                nonconformanceId: options.nonconformanceId ?? null,
            }),
        },
    );
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to notify assignee",
        );
    }
}

