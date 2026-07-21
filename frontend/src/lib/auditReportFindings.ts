import type { ChecklistContent } from "@/data/auditTemplates";
import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import { collectAuditEvidenceMedia } from "@/lib/auditEvidenceCollection";

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

export function resolveChecklistContent(
    auditData: Record<string, unknown>,
    templateContent: ChecklistContent[] | undefined,
): ChecklistContent[] {
    const editable = auditData.editableChecklist as ChecklistContent[] | undefined;
    if (editable?.length) return editable;
    return templateContent || [];
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
        description: String(record.description || record.findingDetails || "").trim(),
        correction: String(record.correction || "").trim(),
        rootCause: String(record.rootCause || "").trim(),
        correctiveAction: String(record.correctiveAction || "").trim(),
        actionBy: String(record.actionBy || "").trim(),
        closeDate: String(record.closeDate || "").trim(),
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
