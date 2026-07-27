import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    findingActionByDisplay,
    type Finding,
} from "@/lib/auditFindings";
import {
    createEmptyCapaForm,
    parseCapaForm,
    type CapaActionRow,
    type FindingCapaForm,
} from "@/lib/findingCapaForm";
import type { NonconformanceResponse } from "@/lib/nonconformanceApi";
import {
    applyBuiltWithIauditPdfFooter,
    IAUDIT_FOOTER_LOGO_SRC,
    IAUDIT_FOOTER_RESERVE_MM,
    loadImageAsset,
    type PdfImageAsset,
} from "@/utils/pdfBranding";

const MARGIN_X = 14;
const HEADER_TOP = 10;
const HEADER_ROW1_H = 9;
const HEADER_ROW2_H = 24;
const HEADER_GAP = 4;
/** Total vertical space reserved for the repeating document header. */
const HEADER_BLOCK_H = HEADER_TOP + HEADER_ROW1_H + HEADER_ROW2_H + HEADER_GAP;
const CONTENT_TOP = HEADER_BLOCK_H;
const FOOTER_RESERVE = IAUDIT_FOOTER_RESERVE_MM;
const SZL_LOGO_SRC = "/szl-logo.png";
const CAPA_DOC_NUMBER = "SH-CP-FM-15";
const CAPA_FORM_TITLE = "Corrective & Preventive Action Plan (CAPA) Form";
const CAPA_REVISION_NO = "06";

type CapaHeaderMeta = {
    docNumber: string;
    title: string;
    revisionNo: string;
    issueDate: string;
};

function text(value: unknown): string {
    const s = String(value ?? "").trim();
    return s || "—";
}

function yesNo(row: { yes?: boolean; no?: boolean }): string {
    if (row.yes) return "Yes";
    if (row.no) return "No";
    return "—";
}

function generateDocNumber(): string {
    return CAPA_DOC_NUMBER;
}

function formatIssueDate(d = new Date()): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
}

function resolveHeaderTitle(_finding: Finding): string {
    return CAPA_FORM_TITLE;
}

function actionRowsBody(rows: CapaActionRow[]): string[][] {
    const filled = rows.filter(
        (r) =>
            r.nonConformance.trim() ||
            r.proposedAction.trim() ||
            r.responsibility.trim() ||
            r.dueDate.trim() ||
            r.closedBySignature.trim(),
    );
    const source = filled.length > 0 ? filled : rows.slice(0, 1);
    return source.map((r) => [
        text(r.nonConformance),
        text(r.proposedAction),
        text(r.responsibility),
        text(r.dueDate),
        text(r.closedBySignature),
    ]);
}

function hasMeaningfulCapa(form: FindingCapaForm): boolean {
    return Boolean(
        form.whatHappened.trim() ||
            form.rootCauses.trim() ||
            form.fiveWhys.some((r) => r.rootCause.trim() || r.why1.trim()) ||
            form.correctionRows.some((r) => r.proposedAction.trim()) ||
            form.correctiveRows.some((r) => r.proposedAction.trim()) ||
            form.fishbone.method.trim() ||
            form.fishbone.manpower.trim(),
    );
}

/** Prefer full CAPA payload; fall back to flat finding / NC response fields. */
export function resolveCapaFormForFinding(
    finding: Finding,
    ncResponses?: NonconformanceResponse[] | null,
): FindingCapaForm {
    const parsed = parseCapaForm(finding.capaForm);
    if (parsed && hasMeaningfulCapa(parsed)) return parsed;

    const form =
        parsed ||
        createEmptyCapaForm({
            areaLineProcessAudit: [
                finding.auditName,
                finding.clauseRef,
                finding.moduleName,
            ]
                .filter(Boolean)
                .join(" · "),
            nonConformanceSummary: [
                finding.description?.trim(),
                finding.details?.trim(),
            ]
                .filter(Boolean)
                .join("\n\n"),
        });

    const latestNc =
        Array.isArray(ncResponses) && ncResponses.length > 0
            ? [...ncResponses].sort((a, b) => (b.version || 0) - (a.version || 0))[0]
            : null;

    const rootCause =
        finding.rootCause?.trim() || latestNc?.rootCause?.trim() || form.rootCauses;
    const correction =
        finding.correction?.trim() ||
        latestNc?.immediateCorrection?.trim() ||
        "";
    const corrective =
        finding.correctiveAction?.trim() ||
        latestNc?.correctiveAction?.trim() ||
        "";
    const preventive = latestNc?.preventiveAction?.trim() || "";
    const due =
        finding.closeDate?.trim() ||
        (latestNc?.proposedCompletionDate
            ? String(latestNc.proposedCompletionDate).slice(0, 10)
            : "") ||
        "";

    form.rootCauses = rootCause || form.rootCauses;

    if (!form.correctionRows.some((r) => r.proposedAction.trim()) && correction) {
        form.correctionRows = [
            {
                nonConformance: finding.description?.trim() || "",
                proposedAction: correction,
                responsibility: "",
                dueDate: due,
                closedBySignature: "",
            },
        ];
    }
    if (!form.correctiveRows.some((r) => r.proposedAction.trim()) && corrective) {
        form.correctiveRows = [
            {
                nonConformance: finding.description?.trim() || "",
                proposedAction: corrective,
                responsibility: "",
                dueDate: due,
                closedBySignature: "",
            },
        ];
    }
    if (!form.preventiveRows.some((r) => r.proposedAction.trim()) && preventive) {
        form.preventiveRows = [
            {
                nonConformance: finding.description?.trim() || "",
                proposedAction: preventive,
                responsibility: "",
                dueDate: due,
                closedBySignature: "",
            },
        ];
    }

    const details =
        finding.findingDetails?.trim() || latestNc?.additionalComments?.trim() || "";
    if (details && !form.whatHappened.trim()) {
        const pick = (label: string) => {
            const re = new RegExp(`${label}:\\s*([^\\n]+)`, "i");
            return details.match(re)?.[1]?.trim() || "";
        };
        form.whatHappened = pick("What") || details;
        form.whereHappened = form.whereHappened || pick("Where");
        form.whenHappened = form.whenHappened || pick("When");
        form.whyProblem = form.whyProblem || pick("Why");
        form.whoInvolved = form.whoInvolved || pick("Who");
        form.howBig = form.howBig || pick("How");
        form.observedBefore = form.observedBefore || pick("Before");
        form.observedDuring = form.observedDuring || pick("During");
        form.observedAfter = form.observedAfter || pick("After");
    }

    return form;
}

function drawWrappedText(
    doc: jsPDF,
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight = 3.6,
    maxLines = 3,
) {
    const lines = doc.splitTextToSize(value, maxWidth) as string[];
    const shown = lines.slice(0, maxLines);
    shown.forEach((line, idx) => {
        doc.text(line, x, y + idx * lineHeight);
    });
}

/** Formal 2×3 document control header (matches CAPA form template). */
function drawCapaDocumentHeader(
    doc: jsPDF,
    meta: CapaHeaderMeta,
    szlLogo: PdfImageAsset | null = null,
) {
    const pageW = doc.internal.pageSize.getWidth();
    const tableW = pageW - MARGIN_X * 2;
    const x0 = MARGIN_X;
    const y0 = HEADER_TOP;
    const col1 = tableW * 0.28;
    const col2 = tableW * 0.44;
    const col3 = tableW * 0.28;
    const x1 = x0 + col1;
    const x2 = x1 + col2;
    const y1 = y0 + HEADER_ROW1_H;
    const y2 = y1 + HEADER_ROW2_H;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.setFillColor(255, 255, 255);

    // Outer box
    doc.rect(x0, y0, tableW, HEADER_ROW1_H + HEADER_ROW2_H, "S");
    // Horizontal divider
    doc.line(x0, y1, x0 + tableW, y1);
    // Vertical dividers
    doc.line(x1, y0, x1, y2);
    doc.line(x2, y0, x2, y2);

    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");
    doc.setFontSize(8);

    const pad = 1.8;
    doc.text(`Doc. Number: ${meta.docNumber}`, x0 + pad, y0 + 5.5);
    drawWrappedText(doc, `Title: ${meta.title}`, x1 + pad, y0 + 4.2, col2 - pad * 2, 3.4, 2);
    doc.text(`Revision No: ${meta.revisionNo}`, x2 + pad, y0 + 5.5);

    // Bottom-left: SZL company logo (first column of second row)
    if (szlLogo?.dataUrl) {
        const maxW = col1 - pad * 2;
        const maxH = HEADER_ROW2_H - 4;
        let imgW = maxW;
        let imgH = imgW * szlLogo.ratio;
        if (imgH > maxH) {
            imgH = maxH;
            imgW = imgH / szlLogo.ratio;
        }
        const imgX = x0 + (col1 - imgW) / 2;
        const imgY = y1 + (HEADER_ROW2_H - imgH) / 2;
        doc.addImage(
            szlLogo.dataUrl,
            szlLogo.format,
            imgX,
            imgY,
            imgW,
            imgH,
            undefined,
            "FAST",
        );
    }

    // Bottom-middle empty
    doc.text(`Issue Date: ${meta.issueDate}`, x2 + pad, y1 + 6);
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95);
    doc.rect(MARGIN_X, y, pageW - MARGIN_X * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, MARGIN_X + 2, y + 5.5);
    doc.setTextColor(30, 41, 59);
    return y + 12;
}

function ensureSpace(doc: jsPDF, y: number, needed = 40): number {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed < pageH - FOOTER_RESERVE) return y;
    doc.addPage();
    return CONTENT_TOP;
}

function tableMargins() {
    return {
        left: MARGIN_X,
        right: MARGIN_X,
        top: CONTENT_TOP,
        bottom: FOOTER_RESERVE,
    };
}

function kvTable(
    doc: jsPDF,
    startY: number,
    rows: [string, string][],
    colWidths?: [number, number],
): number {
    const pageW = doc.internal.pageSize.getWidth();
    const usable = pageW - MARGIN_X * 2;
    const left = colWidths?.[0] ?? usable * 0.28;
    const right = colWidths?.[1] ?? usable * 0.72;

    autoTable(doc, {
        startY,
        margin: tableMargins(),
        theme: "grid",
        styles: {
            fontSize: 8,
            cellPadding: 2.2,
            valign: "top",
            overflow: "linebreak",
            textColor: [30, 41, 59],
            lineColor: [148, 163, 184],
            lineWidth: 0.2,
        },
        columnStyles: {
            0: {
                cellWidth: left,
                fontStyle: "bold",
                fillColor: [238, 244, 249],
            },
            1: { cellWidth: right },
        },
        body: rows.map(([k, v]) => [k, v]),
        showHead: false,
    });
    return ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? startY) + 6;
}

function dataTable(
    doc: jsPDF,
    startY: number,
    head: string[],
    body: string[][],
    options?: { fontSize?: number },
): number {
    autoTable(doc, {
        startY,
        margin: tableMargins(),
        head: [head],
        body: body.length > 0 ? body : [head.map(() => "—")],
        theme: "grid",
        styles: {
            fontSize: options?.fontSize ?? 7.5,
            cellPadding: 1.8,
            valign: "top",
            overflow: "linebreak",
            textColor: [30, 41, 59],
            lineColor: [148, 163, 184],
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: [33, 56, 71],
            textColor: 255,
            fontStyle: "bold",
            fontSize: options?.fontSize ?? 7.5,
        },
    });
    return ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? startY) + 6;
}

function subHead(doc: jsPDF, label: string, y: number): number {
    y = ensureSpace(doc, y, 20);
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(214, 230, 242);
    doc.rect(MARGIN_X, y, pageW - MARGIN_X * 2, 7, "F");
    doc.setDrawColor(148, 163, 184);
    doc.rect(MARGIN_X, y, pageW - MARGIN_X * 2, 7, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(label, MARGIN_X + 2, y + 4.8);
    return y + 9;
}

/**
 * Download the filled CAPA / RCA response as a multi-section PDF.
 * Every page gets the formal document-control header and Built-with iAudit footer.
 */
export async function downloadCapaResponsePdf(
    finding: Finding,
    ncResponses?: NonconformanceResponse[] | null,
): Promise<void> {
    const form = resolveCapaFormForFinding(finding, ncResponses);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const headerMeta: CapaHeaderMeta = {
        docNumber: generateDocNumber(),
        title: resolveHeaderTitle(finding),
        revisionNo: CAPA_REVISION_NO,
        issueDate: formatIssueDate(),
    };

    let iauditAsset: PdfImageAsset | null = null;
    let szlLogo: PdfImageAsset | null = null;
    try {
        const [iaudit, szl] = await Promise.all([
            loadImageAsset(IAUDIT_FOOTER_LOGO_SRC, 100),
            loadImageAsset(SZL_LOGO_SRC, 280),
        ]);
        iauditAsset = iaudit;
        szlLogo = szl;
    } catch {
        iauditAsset = null;
        szlLogo = null;
    }

    let y = CONTENT_TOP;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(finding.auditName || "Audit finding", MARGIN_X, y);
    y += 6;

    y = kvTable(doc, y, [
        ["Finding / clause", text(finding.clauseRef)],
        ["Module", text(finding.moduleName)],
        ["Type", text(finding.type)],
        ["Status", text(finding.status)],
        ["Raised by", text(findingActionByDisplay(finding))],
        ["Assigned to", text(finding.assignTo)],
        ["Target date", text(finding.closeDate)],
        ["Document number", headerMeta.docNumber],
    ]);

    // SECTION A
    y = ensureSpace(doc, y, 50);
    y = sectionTitle(doc, "SECTION A: DETAILS OF NON-CONFORMITY", y);
    y = kvTable(doc, y, [
        ["Date", text(form.date)],
        ["Area / Line / Process / Audit", text(form.areaLineProcessAudit)],
        ["Process Owner", text(form.processOwner)],
        ["CAP No", text(form.capNo)],
        ["RCA Team Members", text(form.rcaTeamMembers)],
    ]);

    y = subHead(doc, "Non-conformance details (5W1H)", y);
    y = kvTable(doc, y, [
        ["What — What happened?", text(form.whatHappened)],
        ["Where — Where did it happen?", text(form.whereHappened)],
        ["When — When did it happen?", text(form.whenHappened)],
        ["Why — Why was it a problem?", text(form.whyProblem)],
        ["Who — Who was involved?", text(form.whoInvolved)],
        ["How — How big was the problem?", text(form.howBig)],
    ]);

    y = subHead(
        doc,
        "Description of incident — observed before, during and after",
        y,
    );
    y = kvTable(doc, y, [
        ["Before", text(form.observedBefore)],
        ["During", text(form.observedDuring)],
        ["After", text(form.observedAfter)],
    ]);

    // SECTION B
    y = ensureSpace(doc, y, 50);
    y = sectionTitle(doc, "SECTION B: MULTIPLE METHOD ROOT CAUSE ANALYSIS", y);
    y = subHead(doc, "Fish Bone Method", y);
    y = kvTable(doc, y, [
        ["Method", text(form.fishbone.method)],
        ["Environment", text(form.fishbone.environment)],
        ["Materials", text(form.fishbone.materials)],
        ["Management", text(form.fishbone.management)],
        ["Machine", text(form.fishbone.machine)],
        ["Manpower", text(form.fishbone.manpower)],
    ]);
    y = kvTable(doc, y, [["Probable Causes", text(form.probableCauses)]]);

    y = subHead(doc, "5 Whys Method", y);
    y = ensureSpace(doc, y, 40);
    const fiveWhyBody = form.fiveWhys
        .filter((r) =>
            [
                r.fishboneCause,
                r.why1,
                r.why2,
                r.why3,
                r.why4,
                r.why5,
                r.rootCause,
            ].some((v) => String(v || "").trim()),
        )
        .map((r) => [
            text(r.fishboneCause),
            text(r.why1),
            text(r.why2),
            text(r.why3),
            text(r.why4),
            text(r.why5),
            text(r.rootCause),
        ]);
    y = dataTable(
        doc,
        y,
        ["Fishbone Probable Cause", "Why 1", "Why 2", "Why 3", "Why 4", "Why 5", "Root Cause"],
        fiveWhyBody.length > 0 ? fiveWhyBody : [["—", "—", "—", "—", "—", "—", "—"]],
        { fontSize: 6.5 },
    );
    y = kvTable(doc, y, [["Root Cause(s)", text(form.rootCauses)]]);

    // SECTION C
    y = ensureSpace(doc, y, 50);
    y = sectionTitle(
        doc,
        "SECTION C: ACTIONS TO ELIMINATE THE CAUSE OF THE NONCONFORMITY",
        y,
    );

    const actionHead = [
        "Non Conformance",
        "Proposed Action Steps",
        "Responsibility",
        "Due Date",
        "Closed By Signature",
    ];

    y = subHead(doc, "Correction", y);
    y = dataTable(doc, y, actionHead, actionRowsBody(form.correctionRows));

    y = ensureSpace(doc, y, 35);
    y = subHead(doc, "Corrective Action Plan", y);
    y = dataTable(doc, y, actionHead, actionRowsBody(form.correctiveRows));

    y = ensureSpace(doc, y, 35);
    y = subHead(doc, "Preventive Action Plan", y);
    y = dataTable(doc, y, actionHead, actionRowsBody(form.preventiveRows));

    // SECTION D
    y = ensureSpace(doc, y, 45);
    y = sectionTitle(
        doc,
        "SECTION D: EVALUATION OF CORRECTIVE / PREVENTIVE ACTIONS",
        y,
    );
    y = subHead(doc, "Effectiveness Criteria", y);
    y = kvTable(doc, y, [
        ["Effectiveness Criteria", text(form.effectivenessCriteria)],
        ["Verified By", text(form.verifiedBy)],
        ["Date", text(form.verifiedDate)],
    ]);

    // SECTION E
    y = ensureSpace(doc, y, 45);
    y = sectionTitle(
        doc,
        "SECTION E: POSSIBILITY OF OCCURRENCE IN OTHER AREAS",
        y,
    );
    const otherBody = form.otherAreaRows
        .filter(
            (r) =>
                r.department.trim() ||
                r.actionTaken.trim() ||
                r.actionBy.trim() ||
                r.date.trim() ||
                r.yes ||
                r.no,
        )
        .map((r) => [
            text(r.department),
            yesNo(r),
            text(r.actionTaken),
            text(r.actionBy),
            text(r.date),
        ]);
    y = dataTable(
        doc,
        y,
        ["Department", "Yes / No", "Action Taken", "Action By", "Date"],
        otherBody.length > 0 ? otherBody : [["—", "—", "—", "—", "—"]],
    );

    // Stamp header + Built with iAudit footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        drawCapaDocumentHeader(doc, headerMeta, szlLogo);
    }
    applyBuiltWithIauditPdfFooter(doc, iauditAsset, MARGIN_X);

    // Page numbers (left of footer area)
    for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(
            `Page ${i} of ${pageCount}`,
            MARGIN_X,
            doc.internal.pageSize.getHeight() - 8,
        );
    }

    const safeName = [
        "CAPA_Response",
        headerMeta.docNumber,
        finding.moduleName || finding.clauseRef,
        finding.id,
    ]
        .filter(Boolean)
        .join("_")
        .replace(/[^\w.-]+/g, "_")
        .slice(0, 120);

    doc.save(`${safeName || "CAPA_Response"}.pdf`);
}
