import type { ChecklistContent } from "@/data/auditTemplates";
import {
    findAuditTemplate,
    parseAuditPlanTemplateIds,
} from "@/data/auditTemplates";
import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import { collectAuditEvidenceMedia } from "@/lib/auditEvidenceCollection";
import {
    eoshScoreFromFindings,
    isEoshScoredCapabilityChecklist,
} from "@/lib/eoshChecklistUi";
import {
    getQfsScoreMode,
    isQfsKoreScoredChecklist,
    needsQfsExceptionFollowUp,
    qfsScoreFromFindings,
    qfsScoreOptions,
    QFS_KORE_CHECKLIST_COLORS,
    type QfsScoreMode,
} from "@/lib/qfsKoreChecklistUi";

/** @deprecated Prefer buildChecklistReportTable — kept for ISO clause/process paths. */
export const FINDING_DETAIL_HEADERS = [
    "Description",
    "Correction",
    "Root Cause",
    "Corrective Action",
    "Action By",
    "Close Date",
    "Assign To",
] as const;

export type FindingDetailFields = {
    description: string;
    correction: string;
    rootCause: string;
    correctiveAction: string;
    actionBy: string;
    closeDate: string;
    assignTo: string;
};

export type ReportNonConformance = {
    id: string;
    statement: string;
    standardClause: string;
    areaProcess: string;
    dueDate: string;
    actionBy: string;
};

export type ChecklistReportColumn = {
    key: string;
    header: string;
    /** Header fill for QFS score columns (hex). */
    headerFillHex?: string;
};

export type ChecklistReportCell = {
    text: string;
    /** Cell background (hex), used for QFS selected score columns. */
    fillHex?: string;
    /** Text color when fillHex is a dark/red background. */
    textHex?: string;
    align?: "left" | "center" | "right";
};

export type ChecklistReportHeaderCell = {
    text: string;
    fillHex?: string;
    textHex?: string;
};

export function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "").trim();
    if (h.length !== 6) return [255, 255, 255];
    return [
        Number.parseInt(h.slice(0, 2), 16),
        Number.parseInt(h.slice(2, 4), 16),
        Number.parseInt(h.slice(4, 6), 16),
    ];
}

export function resolveChecklistContent(
    auditData: Record<string, unknown>,
    templateContent: ChecklistContent[] | undefined,
): ChecklistContent[] {
    const editable = auditData.editableChecklist as ChecklistContent[] | undefined;
    if (editable?.length) return editable;
    return templateContent || [];
}

export function isModuleAuditPlan(
    planOrTemplateId?: string | null,
    template?: { id?: string; module?: string } | null,
): boolean {
    if (template?.module === "EOSH" || template?.module === "QFS KORE") return true;
    const ids = parseAuditPlanTemplateIds(planOrTemplateId || template?.id);
    return ids.some(
        (id) => isEoshScoredCapabilityChecklist(id) || isQfsKoreScoredChecklist(id),
    );
}

/** Facet choices for EOSH / QFS module audits (Audit Details + report). */
export const MODULE_AUDIT_FACET_OPTIONS = [
    "Health and Safety",
    "Environmental",
    "Quality",
] as const;

export type ModuleAuditFacet = (typeof MODULE_AUDIT_FACET_OPTIONS)[number];

/** Read facet / category from top-level or active module store. */
export function resolveModuleAuditFacetCategory(
    auditData: Record<string, unknown> | null | undefined,
): { facet: string; category: string } {
    if (!auditData || typeof auditData !== "object") {
        return { facet: "", category: "" };
    }
    const top =
        auditData.auditGlobalInfo && typeof auditData.auditGlobalInfo === "object"
            ? (auditData.auditGlobalInfo as Record<string, string>)
            : {};
    let facet = String(top.facet || "").trim();
    let category = String(top.category || "").trim();
    if (facet || category) return { facet, category };

    const store =
        auditData.moduleDataByTemplateId &&
        typeof auditData.moduleDataByTemplateId === "object"
            ? (auditData.moduleDataByTemplateId as Record<
                  string,
                  { auditGlobalInfo?: Record<string, string> }
              >)
            : null;
    if (!store) return { facet: "", category: "" };

    const active = String(auditData.activeModuleId || "").trim();
    const order = active
        ? [active, ...Object.keys(store).filter((k) => k !== active)]
        : Object.keys(store);
    for (const key of order) {
        const info = store[key]?.auditGlobalInfo;
        if (!info || typeof info !== "object") continue;
        facet = String(info.facet || "").trim();
        category = String(info.category || "").trim();
        if (facet || category) return { facet, category };
    }
    return { facet: "", category: "" };
}

export function resolveReportTemplate(plan: {
    templateId?: string | null;
}) {
    return findAuditTemplate(plan.templateId) ?? null;
}

export function resolveQfsScoreModeForPlan(plan: {
    templateId?: string | null;
}): QfsScoreMode | null {
    const id = parseAuditPlanTemplateIds(plan.templateId).find((tid) =>
        isQfsKoreScoredChecklist(tid),
    );
    if (!id) return null;
    return getQfsScoreMode(id);
}

export function planIsQfsModule(plan: { templateId?: string | null }): boolean {
    return resolveQfsScoreModeForPlan(plan) != null;
}

function personLabel(record: Record<string, unknown>, keys: {
    name?: string;
    email?: string;
    raw?: string;
}): string {
    const name = keys.name ? String(record[keys.name] || "").trim() : "";
    const email = keys.email ? String(record[keys.email] || "").trim() : "";
    const raw = keys.raw ? String(record[keys.raw] || "").trim() : "";
    if (name && email && !name.includes("@")) return `${name} (${email})`;
    return name || raw || email || "";
}

export function extractFindingDetailFields(
    record: Record<string, unknown> | null | undefined,
): FindingDetailFields {
    if (!record) {
        return {
            description: "",
            correction: "",
            rootCause: "",
            correctiveAction: "",
            actionBy: "",
            closeDate: "",
            assignTo: "",
        };
    }

    const assignToParts = [
        record.assignToName,
        record.assignToEmail,
        record.assignTo,
    ]
        .map((value) => (value ? String(value).trim() : ""))
        .filter(Boolean);

    return {
        description: String(
            record.description || record.findingDetails || record.details || "",
        ).trim(),
        correction: String(record.correction || "").trim(),
        rootCause: String(record.rootCause || "").trim(),
        correctiveAction: String(record.correctiveAction || "").trim(),
        actionBy: String(record.actionBy || "").trim(),
        closeDate: String(record.closeDate || record.targetDate || "").trim(),
        assignTo: assignToParts.join(" — "),
    };
}

export function findingDetailCells(
    fields: FindingDetailFields,
    emptyValue = "",
): string[] {
    return [
        fields.description || emptyValue,
        fields.correction || emptyValue,
        fields.rootCause || emptyValue,
        fields.correctiveAction || emptyValue,
        fields.actionBy || emptyValue,
        fields.closeDate || emptyValue,
        fields.assignTo || emptyValue,
    ];
}

function cellValue(value: unknown): string {
    return value == null ? "" : String(value).trim();
}

/** Format EOSH/QFS score codes for a single finding column (non-EOSH modules). */
export function formatChecklistFindingLabel(findings?: string | null): string {
    const raw = String(findings || "").trim();
    if (!raw) return "";
    if (raw === "OK") return "OK";
    if (raw === "Not OK" || raw === "NotOK") return "Not OK (NC)";
    if (raw === "2" || raw === "C") return "2 — Compliance";
    if (raw === "1" || raw === "OFI") return "1 — Exceptions / OFI";
    if (raw === "0" || raw === "NC" || raw === "Min" || raw === "Maj" || raw === "Minor" || raw === "Major") {
        if (raw === "Maj" || raw === "Major") return "0 — Major";
        if (raw === "Min" || raw === "Minor") return "0 — Minor";
        return "0 — Non-Compliance (NC)";
    }
    return raw;
}

/** EOSH report columns: put the point value (2/1/0) in the matching column — not a tick. */
export function eoshScoreColumnValues(findings?: string | null): {
    score2: string;
    score1: string;
    score0: string;
} {
    const score = eoshScoreFromFindings(findings);
    return {
        score2: score === "2" ? "2" : "",
        score1: score === "1" ? "1" : "",
        score0: score === "0" ? "0" : "",
    };
}

type ChecklistRowValues = Record<string, string>;

function extractModuleNcFields(record: Record<string, unknown>): ChecklistRowValues {
    return {
        details: cellValue(record.details || record.description || record.findingDetails),
        raisedBy: personLabel(record, {
            name: "raisedByName",
            email: "raisedByEmail",
            raw: "raisedBy",
        }),
        assignTo: personLabel(record, {
            name: "assignToName",
            email: "assignToEmail",
            raw: "assignTo",
        }),
        targetDate: cellValue(record.targetDate || record.closeDate),
        escalationTo: personLabel(record, {
            name: "escalationToName",
            email: "escalationToEmail",
            raw: "escalationTo",
        }),
        escalationDate: cellValue(record.escalationDate),
    };
}

function extractIsoDetailFields(record: Record<string, unknown>): ChecklistRowValues {
    const fields = extractFindingDetailFields(record);
    return {
        description: fields.description,
        correction: fields.correction,
        rootCause: fields.rootCause,
        correctiveAction: fields.correctiveAction,
        actionBy: fields.actionBy,
        closeDate: fields.closeDate,
        assignTo: fields.assignTo,
    };
}

function detailFieldsHaveValues(details: ChecklistRowValues): boolean {
    return Object.values(details).some((value) => Boolean(value?.trim()));
}

/**
 * True when a checklist/clause/process row should include NC / CAPA / exception extras
 * (same gate as the execute UI — not for compliant-only questions).
 */
export function checklistRowHasFindingExtras(
    record: Record<string, unknown> | null | undefined,
    options?: {
        isModule?: boolean;
        isEosh?: boolean;
        qfsScoreMode?: QfsScoreMode | null;
    },
): boolean {
    if (!record) return false;
    const findingType = cellValue(record.findingType);
    if (["Minor", "Major", "OFI", "Min", "Maj", "NC"].includes(findingType)) return true;

    const findings = cellValue(record.findings);
    if (["NC", "Not OK", "NotOK", "Min", "Maj", "OFI", "Minor", "Major"].includes(findings)) {
        return true;
    }
    const score = eoshScoreFromFindings(findings);
    if (options?.isEosh && (score === "0" || score === "1")) return true;
    if (options?.qfsScoreMode) {
        const qfs = qfsScoreFromFindings(findings, options.qfsScoreMode);
        if (needsQfsExceptionFollowUp(qfs, options.qfsScoreMode)) return true;
    }

    const details = options?.isModule
        ? extractModuleNcFields(record)
        : extractIsoDetailFields(record);
    return detailFieldsHaveValues(details);
}

const ISO_DETAIL_COLUMNS: ChecklistReportColumn[] = [
    { key: "description", header: "Description" },
    { key: "correction", header: "Correction" },
    { key: "rootCause", header: "Root Cause" },
    { key: "correctiveAction", header: "Corrective Action" },
    { key: "actionBy", header: "Action By" },
    { key: "closeDate", header: "Close Date" },
    { key: "assignTo", header: "Assign To" },
];

/** EOSH score columns — values are points (2 / 1 / 0), not ticks. */
const EOSH_SCORE_COLUMNS: ChecklistReportColumn[] = [
    { key: "score2", header: "Compliance (2)" },
    { key: "score1", header: "Exceptions (1)" },
    { key: "score0", header: "Non-Compliance (0)" },
];

function qfsScoreColumnsForMode(mode: QfsScoreMode): ChecklistReportColumn[] {
    return qfsScoreOptions(mode).map((opt) => ({
        key: `qfs_${opt.val}`,
        header: opt.label,
        headerFillHex: opt.headerBg,
    }));
}

/**
 * Build checklist table for audit reports:
 * - includes every question
 * - optional columns only appear when at least one row has a value
 * - NC / CAPA / exception detail columns are NOT inlined on every question
 *   (see buildChecklistFindingExtraBlocks — rendered under the raised question)
 * - EOSH uses Compliance(2) / Exceptions(1) / Non-Compliance(0) with point values
 * - QFS uses green / amber / red filled cells for the selected score (no ticks)
 */
export function buildChecklistReportTable(options: {
    content: ChecklistContent[];
    checklistData: Record<string, Record<string, unknown>> | Record<string, any>;
    isModule: boolean;
    /** When true, render EOSH 2/1/0 score columns with point values instead of ticks. */
    isEosh?: boolean;
    /** When set, render QFS score columns with colored selected cells. */
    qfsScoreMode?: QfsScoreMode | null;
    collectEvidence: (clauseKey: string, itemIndex: number, textEvidence?: string) => string;
}): {
    headers: string[];
    rows: string[][];
    headerCells: ChecklistReportHeaderCell[];
    bodyCells: ChecklistReportCell[][];
    columns: ChecklistReportColumn[];
} {
    const {
        content,
        checklistData,
        isModule,
        isEosh = false,
        qfsScoreMode = null,
        collectEvidence,
    } = options;
    const isQfs = Boolean(qfsScoreMode);
    const showsIntent = content.some((item) => Boolean(item.intent?.trim()));

    const baseAlways: ChecklistReportColumn[] = [
        { key: "clause", header: "Clause" },
        { key: "question", header: "Question" },
    ];
    if (showsIntent) {
        baseAlways.push({ key: "intent", header: "Intent" });
    }

    const qfsColumns = isQfs && qfsScoreMode ? qfsScoreColumnsForMode(qfsScoreMode) : [];
    const scoreColumns: ChecklistReportColumn[] = isEosh
        ? EOSH_SCORE_COLUMNS
        : isQfs
          ? qfsColumns
          : [{ key: "finding", header: isModule ? "Score / Finding" : "Finding" }];

    const optionalExtra: ChecklistReportColumn[] = [
        { key: "evidence", header: "Evidence" },
        { key: "comment", header: "Comment" },
    ];

    type RowState = {
        values: ChecklistRowValues;
        qfsSelectedKey?: string;
        qfsFillHex?: string;
    };

    const rowStates: RowState[] = content.map((item, itemIndex) => {
        const raw = (checklistData?.[itemIndex] || {}) as Record<string, unknown>;
        const clauseKey = cellValue(raw.clause) || item.clause || String(itemIndex + 1);
        const evidenceText = collectEvidence(
            clauseKey,
            itemIndex,
            cellValue(raw.evidence),
        );
        const findingRaw = cellValue(raw.findings);
        const eoshScores = isEosh ? eoshScoreColumnValues(findingRaw) : null;

        const values: ChecklistRowValues = {
            clause: clauseKey,
            question: item.question || "",
            intent: item.intent || "",
            finding:
                isEosh || isQfs
                    ? ""
                    : isModule
                      ? formatChecklistFindingLabel(findingRaw) || findingRaw
                      : findingRaw,
            score2: eoshScores?.score2 || "",
            score1: eoshScores?.score1 || "",
            score0: eoshScores?.score0 || "",
            evidence: evidenceText,
            comment: cellValue(raw.ofi),
        };

        let qfsSelectedKey: string | undefined;
        let qfsFillHex: string | undefined;
        if (isQfs && qfsScoreMode) {
            const score = qfsScoreFromFindings(findingRaw, qfsScoreMode);
            for (const opt of qfsScoreOptions(qfsScoreMode)) {
                const key = `qfs_${opt.val}`;
                // Leave text empty — color fill indicates selection (no tick).
                values[key] = "";
                if (score === opt.val) {
                    qfsSelectedKey = key;
                    qfsFillHex = opt.headerBg;
                }
            }
        }

        return { values, qfsSelectedKey, qfsFillHex };
    });

    const fixedScoreLayout = isEosh || isQfs;
    const optionalPresent = [
        ...(fixedScoreLayout ? [] : scoreColumns),
        ...optionalExtra,
    ].filter((col) =>
        rowStates.some((row) => Boolean(row.values[col.key]?.trim())),
    );

    const columns = [
        ...baseAlways,
        ...(fixedScoreLayout ? scoreColumns : []),
        ...optionalPresent,
    ];

    const headerCells: ChecklistReportHeaderCell[] = columns.map((c) => ({
        text: c.header,
        fillHex: c.headerFillHex,
        textHex:
            c.headerFillHex === QFS_KORE_CHECKLIST_COLORS.nonCompliance
                ? "#FFFFFF"
                : undefined,
    }));

    const bodyCells: ChecklistReportCell[][] = rowStates.map((row) =>
        columns.map((c) => {
            const isQfsScoreCol = c.key.startsWith("qfs_");
            if (isQfsScoreCol && row.qfsSelectedKey === c.key && row.qfsFillHex) {
                return {
                    text: "",
                    fillHex: row.qfsFillHex,
                    textHex:
                        row.qfsFillHex === QFS_KORE_CHECKLIST_COLORS.nonCompliance
                            ? "#FFFFFF"
                            : "#111827",
                    align: "center",
                };
            }
            return {
                text: row.values[c.key] || "",
                align: isQfsScoreCol || c.key.startsWith("score") ? "center" : "left",
            };
        }),
    );

    const headers = headerCells.map((h) => h.text);
    const rows = bodyCells.map((row) => row.map((c) => c.text));

    return { headers, rows, headerCells, bodyCells, columns };
}

export type ChecklistFindingExtraField = {
    label: string;
    value: string;
};

/** One NC / exception block to render under its checklist question. */
export type ChecklistFindingExtraBlock = {
    itemIndex: number;
    clause: string;
    question: string;
    finding: string;
    /** Primary follow-up fields (matches execute UI order). */
    fields: ChecklistFindingExtraField[];
    /** Optional escalation — shown under an Escalation heading when present. */
    escalationFields: ChecklistFindingExtraField[];
    title: string;
};

function pushDetailField(
    list: ChecklistFindingExtraField[],
    details: ChecklistRowValues,
    key: string,
    label: string,
) {
    const value = details[key]?.trim();
    if (value) list.push({ label, value });
}

function moduleExtrasFieldsFromDetails(details: ChecklistRowValues): {
    fields: ChecklistFindingExtraField[];
    escalationFields: ChecklistFindingExtraField[];
} {
    const fields: ChecklistFindingExtraField[] = [];
    const escalationFields: ChecklistFindingExtraField[] = [];
    // Same order as the in-app exception follow-up panel.
    pushDetailField(fields, details, "raisedBy", "Raised by");
    pushDetailField(fields, details, "assignTo", "Assign to");
    pushDetailField(fields, details, "targetDate", "Target date");
    pushDetailField(fields, details, "details", "Details");
    pushDetailField(escalationFields, details, "escalationTo", "Escalation to");
    pushDetailField(escalationFields, details, "escalationDate", "Escalation date");
    return { fields, escalationFields };
}

function isoExtrasFieldsFromDetails(details: ChecklistRowValues): ChecklistFindingExtraField[] {
    const fields: ChecklistFindingExtraField[] = [];
    for (const col of ISO_DETAIL_COLUMNS) {
        pushDetailField(fields, details, col.key, col.header);
    }
    return fields;
}

/** Readable multiline text for PDF / Excel cells (label: value per line). */
export function formatFindingExtrasBlockText(block: ChecklistFindingExtraBlock): string {
    const lines: string[] = [block.title];
    if (block.finding.trim()) {
        lines.push(`Finding: ${block.finding}`);
    }
    for (const field of block.fields) {
        lines.push(`${field.label}: ${field.value}`);
    }
    if (block.escalationFields.length > 0) {
        lines.push("");
        lines.push("Escalation");
        for (const field of block.escalationFields) {
            lines.push(`${field.label}: ${field.value}`);
        }
    }
    return lines.join("\n");
}

/**
 * NC / exception / CAPA extras as per-question blocks (inline under the raised question).
 */
export function buildChecklistFindingExtraBlocks(options: {
    content: ChecklistContent[];
    checklistData: Record<string, Record<string, unknown>> | Record<string, any>;
    isModule: boolean;
    isEosh?: boolean;
    qfsScoreMode?: QfsScoreMode | null;
}): ChecklistFindingExtraBlock[] {
    const {
        content,
        checklistData,
        isModule,
        isEosh = false,
        qfsScoreMode = null,
    } = options;

    const blocks: ChecklistFindingExtraBlock[] = [];
    content.forEach((item, itemIndex) => {
        const raw = (checklistData?.[itemIndex] || {}) as Record<string, unknown>;
        if (
            !checklistRowHasFindingExtras(raw, {
                isModule,
                isEosh,
                qfsScoreMode,
            })
        ) {
            return;
        }
        const findingRaw = cellValue(raw.findings);
        const details = isModule
            ? extractModuleNcFields(raw)
            : extractIsoDetailFields(raw);
        if (!detailFieldsHaveValues(details) && !findingRaw && !cellValue(raw.findingType)) {
            return;
        }
        const finding = isModule
            ? formatChecklistFindingLabel(findingRaw) ||
              cellValue(raw.findingType) ||
              findingRaw
            : cellValue(raw.findingType) || findingRaw;
        const { fields, escalationFields } = isModule
            ? moduleExtrasFieldsFromDetails(details)
            : { fields: isoExtrasFieldsFromDetails(details), escalationFields: [] };
        if (fields.length === 0 && escalationFields.length === 0 && !finding) {
            return;
        }
        blocks.push({
            itemIndex,
            clause: cellValue(raw.clause) || item.clause || String(itemIndex + 1),
            question: item.question || "",
            finding,
            fields,
            escalationFields,
            title: isModule
                ? "Nonconformance / Exception Details"
                : "Finding / Nonconformance Details",
        });
    });
    return blocks;
}

/**
 * Flat / stacked table for Excel. Prefer buildChecklistFindingExtraBlocks for PDF/DOCX.
 */
export function buildChecklistFindingExtrasReportTable(options: {
    content: ChecklistContent[];
    checklistData: Record<string, Record<string, unknown>> | Record<string, any>;
    isModule: boolean;
    isEosh?: boolean;
    qfsScoreMode?: QfsScoreMode | null;
}): { headers: string[]; body: string[][] } | null {
    const blocks = buildChecklistFindingExtraBlocks(options);
    if (blocks.length === 0) return null;

    // Stacked rows (not a wide multi-column layout) so long questions stay readable.
    const headers = ["Clause", "Finding", "Field", "Value"];
    const body: string[][] = [];
    for (const block of blocks) {
        const allFields = [
            ...block.fields,
            ...(block.escalationFields.length > 0
                ? [{ label: "Escalation", value: "" }, ...block.escalationFields]
                : []),
        ];
        if (allFields.length === 0) {
            body.push([block.clause, block.finding, "", ""]);
            continue;
        }
        allFields.forEach((field, idx) => {
            body.push([
                idx === 0 ? block.clause : "",
                idx === 0 ? block.finding : "",
                field.label,
                field.value,
            ]);
        });
    }
    return { headers, body };
}

/** NC summary table — module shows module NC columns; omit empty columns.
 * Returns an empty body when no nonconformances were raised (callers should skip the section).
 */
export function buildNonConformanceReportTable(
    rows: ReportNonConformance[],
    isModule: boolean,
): { headers: string[]; body: string[][] } {
    const filled = rows.filter(
        (r) =>
            r.statement?.trim() ||
            r.standardClause?.trim() ||
            r.areaProcess?.trim() ||
            r.dueDate?.trim() ||
            r.actionBy?.trim(),
    );

    if (filled.length === 0) {
        return {
            headers: isModule
                ? ["Number", "Statement of Non-conformance"]
                : ["Number", "Statement of nonconformity"],
            body: [],
        };
    }

    if (!isModule) {
        return {
            headers: ["Number", "Statement of nonconformity"],
            body: filled.map((nc, idx) => [String(idx + 1), nc.statement || ""]),
        };
    }

    const candidates: { key: keyof ReportNonConformance; header: string }[] = [
        { key: "standardClause", header: "Standard & Clause No." },
        { key: "areaProcess", header: "Area / Process" },
        { key: "statement", header: "Statement of Non-conformance" },
        { key: "dueDate", header: "Due Date" },
        { key: "actionBy", header: "Action By" },
    ];

    const present = candidates.filter((c) =>
        filled.some((row) => Boolean(String(row[c.key] || "").trim())),
    );
    if (present.length === 0) {
        present.push({ key: "statement", header: "Statement of Non-conformance" });
    }

    const headers = ["Number", ...present.map((c) => c.header)];
    const body = filled.map((nc, idx) => [
        String(idx + 1),
        ...present.map((c) => String(nc[c.key] || "").trim()),
    ]);

    return { headers, body };
}

export function normalizeReportNonConformances(
    raw: unknown,
): ReportNonConformance[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((nc, i) => {
            const row = (nc || {}) as Record<string, unknown>;
            return {
                id: cellValue(row.id) || String(i + 1),
                statement: cellValue(row.statement),
                standardClause: cellValue(row.standardClause),
                areaProcess: cellValue(row.areaProcess),
                dueDate: cellValue(row.dueDate),
                actionBy: cellValue(row.actionBy),
            };
        })
        .filter(
            (nc) =>
                nc.statement ||
                nc.standardClause ||
                nc.areaProcess ||
                nc.dueDate ||
                nc.actionBy,
        );
}

export function buildFindingEvidenceText(
    textEvidence: string | undefined,
    attached: AuditEvidenceMedia[],
): string {
    const photoCount = attached.filter((m) => m.type.startsWith("image/")).length;
    const pdfCount = attached.filter((m) => m.type === "application/pdf").length;
    const attachmentNote = [
        photoCount > 0 ? `${photoCount} photo(s)` : "",
        pdfCount > 0 ? `${pdfCount} PDF(s)` : "",
    ]
        .filter(Boolean)
        .join(", ");

    return [textEvidence || "", attachmentNote ? `[${attachmentNote}]` : ""]
        .filter(Boolean)
        .join(" ");
}

export function collectFindingAttachmentMedia(
    clauseFiles: Record<string, AuditEvidenceMedia[]>,
    genericFiles: Record<string, AuditEvidenceMedia[]>,
    clauseKey: string,
    checklistIndex?: number,
): AuditEvidenceMedia[] {
    return collectAuditEvidenceMedia(clauseFiles, genericFiles, clauseKey, {
        checklistIndex,
    });
}
