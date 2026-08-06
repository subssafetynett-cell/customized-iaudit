import { CLAUSE_MATRIX, type ClauseMatrixRow } from "./clauseMapping";
import type { AuditTemplate, ChecklistContent } from "./auditTemplateTypes";

export const IMS_INTEGRATED_CHECKLIST_ID = "ims-integrated-checklist";

const IMS_ELIGIBLE_STANDARDS = ["ISO 9001", "ISO 14001", "ISO 45001"] as const;

function clauseTextExists(text: string | undefined): boolean {
    const t = String(text || "").trim();
    if (!t) return false;
    return !t.toLowerCase().includes("does not exist");
}

/** Build checklist rows from the integrated clause matrix (one row per auditable clause). */
function buildImsChecklistContent(): ChecklistContent[] {
    return CLAUSE_MATRIX.filter((row) => !row.isHeading)
        .filter(
            (row) =>
                clauseTextExists(row.iso9001) ||
                clauseTextExists(row.iso14001) ||
                clauseTextExists(row.iso45001),
        )
        .map((row) => {
            const parts = [row.iso9001, row.iso14001, row.iso45001].filter(clauseTextExists);
            return {
                clause: row.id,
                question: parts.join("\n\n"),
                findings: "",
                evidence: "",
                ofi: "",
            };
        });
}

/** Integrated IMS checklist — combines ISO 9001 / 14001 / 45001 in one triple-mapping table. */
export const IMS_INTEGRATED_CHECKLIST: AuditTemplate = {
    id: IMS_INTEGRATED_CHECKLIST_ID,
    title: "IMS Integrated Audit Checklist",
    standard: "IMS",
    type: "checklist",
    isIntegrated: true,
    isTripleMapping: true,
    findingScale: "ok-not-ok",
    description:
        "Integrated Management System audit checklist combining ISO 9001, ISO 14001, and ISO 45001 requirements in a single audit.",
    content: buildImsChecklistContent(),
};

/** True when 2+ selected standards are all IMS triple-mapping eligible (9001 / 14001 / 45001). */
export function isMultiIsoImsEligible(standards: string[]): boolean {
    if (standards.length <= 1) return false;
    return standards.every((std) => {
        const upper = std.toUpperCase();
        return IMS_ELIGIBLE_STANDARDS.some(
            (known) => upper.includes(known) || known.includes(upper),
        );
    });
}

/** Which ISO columns to show in the IMS triple-mapping table (only selected standards). */
export function resolveImsStandardFlags(standards: string[]): {
    iso9001: boolean;
    iso14001: boolean;
    iso45001: boolean;
} {
    const upper = standards.map((s) => s.toUpperCase());
    return {
        iso9001: upper.some((s) => s.includes("9001")),
        iso14001: upper.some((s) => s.includes("14001")),
        iso45001: upper.some((s) => s.includes("45001")),
    };
}

/** Clause question text for one matrix row, limited to selected ISO columns. */
export function imsClauseTextForRow(
    row: Pick<ClauseMatrixRow, "iso9001" | "iso14001" | "iso45001">,
    flags: ReturnType<typeof resolveImsStandardFlags>,
): string {
    const parts: string[] = [];
    if (flags.iso45001 && clauseTextExists(row.iso45001)) parts.push(row.iso45001);
    if (flags.iso14001 && clauseTextExists(row.iso14001)) parts.push(row.iso14001);
    if (flags.iso9001 && clauseTextExists(row.iso9001)) parts.push(row.iso9001);
    return parts.join("\n\n");
}
