import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Table as DocxTable,
    TableRow as DocxTableRow,
    TableCell as DocxTableCell,
    WidthType,
    BorderStyle,
    UnderlineType,
    Header,
} from "docx";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { auditTemplates, ChecklistContent, ClauseChecklistContent, ProcessAuditContent } from "@/data/auditTemplates";
import { sanitizeAuditEvidenceMediaMap, type AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import {
    collectReportEvidenceFileList,
    collectReportEvidenceSources,
    dataUrlToUint8Array,
    prepareReportEvidenceImages,
    reportImageDisplayMm,
    measureEvidenceDescriptionBlock,
    evidenceVisualBlockHeightMm,
    EVIDENCE_TITLE_HEIGHT_MM,
    EVIDENCE_IMAGE_BOTTOM_GAP_MM,
    type PreparedReportImage,
    type ReportEvidenceSource,
} from "@/lib/reportEvidenceImages";
import {
    buildChecklistEvidenceSegments,
    buildClauseChecklistEvidenceSegments,
    buildProcessAuditEvidenceSegments,
    collectShownEvidenceSignatures,
    filterUnshownEvidenceSources,
    type ClauseEvidenceSegment,
} from "@/lib/reportClauseEvidence";
import {
    buildFindingEvidenceText,
    collectFindingAttachmentMedia,
    extractFindingDetailFields,
    findingDetailCells,
    FINDING_DETAIL_HEADERS,
    resolveChecklistContent,
} from "@/lib/auditReportFindings";
import type { FindingsReportForm } from "@/lib/findingsReportForm";
import {
    buildManagementMetadataRows,
    getManagementBoxRows,
    getCustomFieldsBySection,
    getFieldLabel,
    getSectionLabel,
    isFieldVisible,
    normalizeFindingsReportForm,
} from "@/lib/findingsReportForm";
import { apiFetch } from "@/lib/api";
import {
    formatDepartmentNames,
    resolveDepartmentsFromProgram,
} from "@/lib/auditProgramDepartments";
import {
    mergeAuditExecuteLayout,
    getSectionLabel as getExecuteSectionLabel,
    type AuditExecuteLayout,
} from "@/lib/auditExecuteLayout";

const DEFAULT_DOC_NUMBER = "SH-CP-FM-11";
const DEFAULT_REPORT_TITLE = "Audit Findings Report";
const DEFAULT_REVISION_NO = "03";
const SZL_LOGO_PATH = "/szl-logo.png";
const MARGIN = 14;
const FONT = "times";
const PDF_HEADER_TOP_ROW_H = 10;
const PDF_HEADER_LOGO_ROW_H = 32;
const PDF_HEADER_BOTTOM_GAP = 8;
const PDF_SECTION_BLUE: [number, number, number] = [41, 99, 170];
const DOCX_SECTION_BLUE = "29599F";
const MANAGEMENT_LABEL_COL_WIDTH_MM = 52;

type PdfPageLayout = {
    contentStartY: number;
    logo: { dataUrl: string; ratio: number } | null;
    form: FindingsReportForm;
};

let activePdfPageLayout: PdfPageLayout | null = null;

export function getAuditData(plan: { auditData?: unknown }) {
    if (!plan.auditData) return {};
    return typeof plan.auditData === "string" ? JSON.parse(plan.auditData) : (plan.auditData as Record<string, unknown>);
}

export function auditReportBaseName(plan: { auditName?: string; id?: number }) {
    return `Audit_Findings_Report_${(plan.auditName || "Audit").replace(/[^a-z0-9]/gi, "_") || plan.id}`;
}

interface ReportContext {
    docNumber: string;
    reportTitle: string;
    revisionNo: string;
    managementSystem: string;
    department: string;
    selectedDepartments: string;
    auditDate: string;
    auditors: string;
    auditees: string;
    scope: string;
    criteriaAndMethod: string;
    executiveSummary: string;
    nonConformances: { id: string; statement: string }[];
    participants: { name: string; position: string; department: string }[];
    issueDate: string;
    acknowledgement: {
        auditeeSignature: string;
        auditeeDate: string;
        auditorSignature: string;
        auditorDate: string;
    };
    findingsForm: FindingsReportForm;
    managementRows: { label: string; value: string }[];
}

function selectedDepartmentsFromSchedule(scheduleData: unknown): string {
    if (!scheduleData || typeof scheduleData !== "object") return "";
    const names = (scheduleData as Record<string, unknown>).departmentNames;
    if (!Array.isArray(names)) return "";
    return names.map((name) => String(name).trim()).filter(Boolean).join(", ");
}

async function resolveSelectedDepartmentsText(plan: Record<string, any>): Promise<string> {
    const fromSchedule = selectedDepartmentsFromSchedule(plan.auditProgram?.scheduleData);
    if (fromSchedule) return fromSchedule;

    try {
        const res = await apiFetch("/companies");
        if (!res.ok) return "";
        const companies = await res.json();
        const formatted = formatDepartmentNames(
            resolveDepartmentsFromProgram(plan.auditProgram, Array.isArray(companies) ? companies : []),
        );
        return formatted === "N/A" ? "" : formatted;
    } catch {
        return "";
    }
}

async function buildReportContext(plan: Record<string, any>): Promise<ReportContext> {
    const auditData = getAuditData(plan);
    const form = auditData.findingsReportForm as Partial<FindingsReportForm> | undefined;
    const globalInfo = (auditData.auditGlobalInfo as Record<string, string>) || {};
    const template = auditTemplates.find((t) => t.id === plan.templateId);

    const selectedDepartments = await resolveSelectedDepartmentsText(plan);

    const leadAuditor = plan.leadAuditor
        ? `${plan.leadAuditor.firstName || ""} ${plan.leadAuditor.lastName || ""}`.trim()
        : plan.leadAuditorName || "";

    const auditees = Array.isArray(plan.auditees)
        ? plan.auditees
              .map((a: unknown) =>
                  typeof a === "string" ? a : `${(a as { firstName?: string }).firstName || ""} ${(a as { lastName?: string }).lastName || ""}`.trim(),
              )
              .filter(Boolean)
              .join(", ")
        : plan.auditees || "";

    const planAuditDate = plan.date ? format(new Date(plan.date), "dd/MM/yy") : "—";
    const planIssueDate = plan.date ? format(new Date(plan.date), "dd/MM/yy") : format(new Date(), "dd/MM/yy");

    const keyPersonnel = (form?.keyPersonnel || [])
        .filter((p) => p.name?.trim() || p.position?.trim() || p.department?.trim())
        .map((p) => ({
            name: p.name || "",
            position: p.position || "",
            department: p.department || "",
        }));

    const legacyParticipants = ((auditData.participants as { name?: string; position?: string; interviewed?: string }[]) || [])
        .filter((p) => p.name?.trim())
        .map((p) => ({
            name: p.name || "",
            position: p.position || "",
            department: p.interviewed || "",
        }));

    const executePersonnel = (
        (auditData.participants as { name?: string; position?: string; interviewed?: string; department?: string }[]) ||
        []
    )
        .filter((p) => p.name?.trim())
        .map((p) => ({
            name: p.name || "",
            position: p.position || "",
            department: p.department || p.interviewed || "",
        }));

    const participants =
        keyPersonnel.length > 0
            ? keyPersonnel
            : legacyParticipants.length > 0
              ? legacyParticipants
              : executePersonnel;

    const nonConformances = ((auditData.nonConformances as { id?: string; statement?: string }[]) || [])
        .filter((nc) => nc.statement?.trim())
        .map((nc, i) => ({
            id: nc.id || String(i + 1),
            statement: nc.statement || "",
        }));

    const criteriaParts = [plan.criteria, plan.objective].filter(Boolean);
    const defaultCriteriaAndMethod =
        criteriaParts.length > 0
            ? criteriaParts.join(" — ")
            : "Internal audit against documented procedures and applicable standard requirements.";

    const executiveSummary = form?.generalComment?.trim()
        ? form.generalComment
        : String(auditData.executiveSummary || "");

    const findingsForm = normalizeFindingsReportForm({
        ...form,
        docNumber: form?.docNumber?.trim() || DEFAULT_DOC_NUMBER,
        reportTitle: form?.reportTitle?.trim() || DEFAULT_REPORT_TITLE,
        revisionNo: form?.revisionNo?.trim() || DEFAULT_REVISION_NO,
        managementSystem:
            form?.managementSystem ||
            globalInfo.clauseNo ||
            plan.criteria ||
            template?.standard ||
            plan.standard ||
            "—",
        department:
            form?.department ||
            globalInfo.department ||
            selectedDepartments ||
            plan.auditProgram?.site?.name ||
            plan.location ||
            "—",
        auditDate: form?.auditDate || planAuditDate,
        auditors: form?.auditors || leadAuditor || "—",
        auditees: form?.auditees || auditees || "—",
        auditScope: form?.auditScope || plan.scope || "—",
        auditCriteriaAndMethod: form?.auditCriteriaAndMethod || defaultCriteriaAndMethod,
        generalComment: executiveSummary,
        issueDate: form?.issueDate || planIssueDate,
        keyPersonnel: form?.keyPersonnel,
        acknowledgement: form?.acknowledgement,
        fieldLabels: form?.fieldLabels,
        hiddenFields: form?.hiddenFields,
        customFields: form?.customFields,
        sectionLabels: form?.sectionLabels,
    });

    const managementRows = buildManagementMetadataRows(findingsForm, {
        managementSystem: findingsForm.managementSystem,
        department: findingsForm.department,
        selectedDepartments,
        auditDate: findingsForm.auditDate,
        auditors: findingsForm.auditors,
        auditees: findingsForm.auditees,
    });

    return {
        docNumber: findingsForm.docNumber,
        reportTitle: findingsForm.reportTitle,
        revisionNo: findingsForm.revisionNo,
        managementSystem: findingsForm.managementSystem,
        department: findingsForm.department,
        selectedDepartments,
        auditDate: findingsForm.auditDate,
        auditors: findingsForm.auditors,
        auditees: findingsForm.auditees,
        scope: findingsForm.auditScope,
        criteriaAndMethod: findingsForm.auditCriteriaAndMethod,
        executiveSummary,
        nonConformances,
        participants,
        issueDate: findingsForm.issueDate,
        acknowledgement: {
            auditeeSignature: findingsForm.acknowledgement.auditeeSignature || "",
            auditeeDate: findingsForm.acknowledgement.auditeeDate || "",
            auditorSignature: findingsForm.acknowledgement.auditorSignature || "",
            auditorDate: findingsForm.acknowledgement.auditorDate || "",
        },
        findingsForm,
        managementRows,
    };
}

async function loadSzlLogoBase64(): Promise<{ dataUrl: string; ratio: number } | null> {
    try {
        const response = await fetch(SZL_LOGO_PATH);
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const MAX_W = 200;
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                if (width > MAX_W) {
                    height = Math.round((height * MAX_W) / width);
                    width = MAX_W;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d")!;
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve({ dataUrl: canvas.toDataURL("image/png"), ratio: height / width });
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    } catch {
        return null;
    }
}

async function loadSzlLogoBuffer(): Promise<ArrayBuffer | null> {
    try {
        const response = await fetch(SZL_LOGO_PATH);
        const blob = await response.blob();
        return await blob.arrayBuffer();
    } catch {
        return null;
    }
}

function computeSzlPdfHeaderContentStartY(form: FindingsReportForm, hasLogo: boolean): number {
    let y = MARGIN;

    const topFields = (
        [
            { key: "docNumber" as const },
            { key: "reportTitle" as const },
            { key: "revisionNo" as const },
        ] as const
    ).filter((field) => isFieldVisible(form, field.key));

    if (topFields.length > 0) {
        y += PDF_HEADER_TOP_ROW_H;
    }

    const showIssueDate = isFieldVisible(form, "issueDate");
    const documentCustomFields = getCustomFieldsBySection(form, "document");
    if (hasLogo || showIssueDate || documentCustomFields.length > 0) {
        y += PDF_HEADER_LOGO_ROW_H;
    }

    if (documentCustomFields.length > 0) {
        y += 4 + documentCustomFields.length * 6;
    }

    return y + PDF_HEADER_BOTTOM_GAP;
}

function checkPage(doc: jsPDF, y: number, need: number, pageH: number): number {
    if (y + need > pageH - 20) {
        doc.addPage();
        const layout = activePdfPageLayout;
        if (layout) {
            drawSzlPdfHeader(doc, layout.logo, layout.form);
            return layout.contentStartY;
        }
        return MARGIN;
    }
    return y;
}

function pdfAutoTable(doc: jsPDF, options: Parameters<typeof autoTable>[1]) {
    const layout = activePdfPageLayout;
    if (!layout) {
        autoTable(doc, options);
        return;
    }

    const baseMargin =
        options && typeof options.margin === "object" && options.margin !== null
            ? options.margin
            : {};

    autoTable(doc, {
        ...options,
        margin: {
            top: layout.contentStartY,
            left: MARGIN,
            right: MARGIN,
            ...baseMargin,
        },
        didDrawPage: (data) => {
            drawSzlPdfHeader(doc, layout.logo, layout.form);
            if (typeof options.didDrawPage === "function") {
                options.didDrawPage(data);
            }
        },
    });
}

async function embedPreparedImageInPdf(
    doc: jsPDF,
    img: PreparedReportImage,
    y: number,
    contentWidthMm: number,
    pageH: number,
): Promise<number> {
    const isPdfPreview = img.context.includes("— PDF");
    const { w, h } = reportImageDisplayMm(
        img.widthPx,
        img.heightPx,
        contentWidthMm,
        isPdfPreview ? 120 : 85,
    );
    const { lines: descLines, heightMm: descHeightMm } = measureEvidenceDescriptionBlock(
        doc,
        img.description,
        contentWidthMm,
        FONT,
    );
    y = checkPage(doc, y, evidenceVisualBlockHeightMm(h, descHeightMm), pageH);
    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`${img.name}`, MARGIN, y);
    y += EVIDENCE_TITLE_HEIGHT_MM;
    if (descLines.length > 0) {
        doc.setFont(FONT, "italic");
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(descLines, MARGIN, y);
        y += descHeightMm;
    }
    y = checkPage(doc, y, h + EVIDENCE_IMAGE_BOTTOM_GAP_MM, pageH);
    try {
        doc.addImage(img.dataUrl, img.format, MARGIN, y, w, h, undefined, "FAST");
        y += h + EVIDENCE_IMAGE_BOTTOM_GAP_MM;
    } catch {
        y += 8;
    }
    return y;
}

async function embedClauseEvidenceSegmentsInPdf(
    doc: jsPDF,
    segments: ClauseEvidenceSegment[],
    startY: number,
    pageH: number,
    contentWidthMm: number,
): Promise<number> {
    let y = startY;
    for (const segment of segments) {
        if (!segment.sources.length) continue;
        const prepared = await prepareReportEvidenceImages(segment.sources);
        if (!prepared.length) continue;
        y = checkPage(doc, y, 24, pageH);
        doc.setFont(FONT, "bold");
        doc.setFontSize(10);
        doc.setTextColor(33, 56, 71);
        doc.text(`Evidence — ${segment.clauseLabel}`, MARGIN, y);
        y += 7;
        for (const img of prepared) {
            y = await embedPreparedImageInPdf(doc, img, y, contentWidthMm, pageH);
        }
        y += 4;
    }
    return y;
}

function buildAllClauseEvidenceSegments(
    auditData: Record<string, unknown>,
    template: ReturnType<typeof auditTemplates.find>,
    clauseFiles: Record<string, import("@/lib/evidenceImageUpload").AuditEvidenceMedia[]>,
    genericFiles: Record<string, import("@/lib/evidenceImageUpload").AuditEvidenceMedia[]>,
): ClauseEvidenceSegment[] {
    const segments: ClauseEvidenceSegment[] = [];
    if (auditData.checklistData && template?.content) {
        segments.push(
            ...buildChecklistEvidenceSegments(
                auditData,
                template.content as ChecklistContent[],
                clauseFiles,
                genericFiles,
            ),
        );
    }
    if (template?.type === "clause-checklist" && template.content) {
        segments.push(
            ...buildClauseChecklistEvidenceSegments(
                auditData,
                template.content as ClauseChecklistContent[],
                clauseFiles,
                genericFiles,
            ),
        );
    }
    if (template?.type === "process-audit") {
        segments.push(...buildProcessAuditEvidenceSegments(auditData, genericFiles));
    }
    return segments;
}

async function appendClauseEvidenceToDocx(
    children: (Paragraph | DocxTable)[],
    segments: ClauseEvidenceSegment[],
): Promise<void> {
    for (const segment of segments) {
        if (!segment.sources.length) continue;
        const prepared = await prepareReportEvidenceImages(segment.sources);
        if (!prepared.length) continue;
        children.push(docxSubHeading(`Evidence — ${segment.clauseLabel}`));
        for (const img of prepared) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: img.name, bold: true })],
                    spacing: { before: 120, after: 60 },
                }),
            );
            if (img.description?.trim()) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: img.description.trim(), italics: true })],
                        spacing: { after: 80 },
                    }),
                );
            }
            try {
                const buffer = dataUrlToUint8Array(img.dataUrl);
                const maxW = 520;
                const aspect = img.widthPx / img.heightPx;
                let w = maxW;
                let h = Math.round(w / aspect);
                if (h > 360) {
                    h = 360;
                    w = Math.round(h * aspect);
                }
                children.push(
                    new Paragraph({
                        children: [new ImageRun({ data: buffer, transformation: { width: w, height: h } })],
                        spacing: { after: 200 },
                    }),
                );
            } catch {
                children.push(new Paragraph({ text: `(Could not embed ${img.name})`, spacing: { after: 120 } }));
            }
        }
    }
}

function drawSzlPdfHeader(
    doc: jsPDF,
    logo: { dataUrl: string; ratio: number } | null,
    form: FindingsReportForm,
): number {
    const pageW = doc.internal.pageSize.getWidth();
    let y = MARGIN;

    const topFields = (
        [
            { key: "docNumber" as const, value: form.docNumber },
            { key: "reportTitle" as const, value: form.reportTitle },
            { key: "revisionNo" as const, value: form.revisionNo },
        ] as const
    ).filter((field) => isFieldVisible(form, field.key));

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    if (topFields.length > 0) {
        const colW = (pageW - MARGIN * 2) / 3;
        topFields.forEach((field, index) => {
            const x = MARGIN + colW * index;
            doc.rect(x, y, colW, PDF_HEADER_TOP_ROW_H);
            doc.text(
                `${getFieldLabel(form, field.key)}: ${field.value || "—"}`,
                x + 3,
                y + 6.5,
            );
        });
        for (let index = topFields.length; index < 3; index += 1) {
            doc.rect(MARGIN + colW * index, y, colW, PDF_HEADER_TOP_ROW_H);
        }
        y += PDF_HEADER_TOP_ROW_H;
    }

    const showIssueDate = isFieldVisible(form, "issueDate");
    const documentCustomFields = getCustomFieldsBySection(form, "document");
    const bottomRowFields = showIssueDate
        ? [{ label: getFieldLabel(form, "issueDate"), value: form.issueDate || "—" }]
        : [];

    if (logo || bottomRowFields.length > 0 || documentCustomFields.length > 0) {
        const colW = (pageW - MARGIN * 2) / 3;
        doc.rect(MARGIN, y, colW, PDF_HEADER_LOGO_ROW_H);
        doc.rect(MARGIN + colW, y, colW, PDF_HEADER_LOGO_ROW_H);
        doc.rect(MARGIN + colW * 2, y, colW, PDF_HEADER_LOGO_ROW_H);

        if (logo) {
            const imgW = colW - 10;
            const imgH = Math.min(PDF_HEADER_LOGO_ROW_H - 6, imgW * logo.ratio);
            doc.addImage(
                logo.dataUrl,
                "PNG",
                MARGIN + 5,
                y + (PDF_HEADER_LOGO_ROW_H - imgH) / 2,
                imgW,
                imgH,
                undefined,
                "FAST",
            );
        }

        if (bottomRowFields.length > 0) {
            doc.text(
                `${bottomRowFields[0].label}: ${bottomRowFields[0].value}`,
                MARGIN + colW * 2 + 3,
                y + 6.5,
            );
        }

        y += PDF_HEADER_LOGO_ROW_H;
    }

    if (documentCustomFields.length > 0) {
        y += 4;
        documentCustomFields.forEach((field) => {
            doc.text(`${field.label || "Field"}: ${field.value || "—"}`, MARGIN + 3, y);
            y += 6;
        });
    }

    return y + PDF_HEADER_BOTTOM_GAP;
}

function pdfSectionHeading(doc: jsPDF, title: string, y: number): number {
    doc.setFont(FONT, "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(title, MARGIN, y);
    const tw = doc.getTextWidth(title);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + 1.2, MARGIN + tw, y + 1.2);
    return y + 8;
}

function pdfBlueSectionHeading(doc: jsPDF, title: string, y: number): number {
    const pageW = doc.internal.pageSize.getWidth();
    const barH = 9;
    const textY = y + 6;
    doc.setFillColor(...PDF_SECTION_BLUE);
    doc.rect(MARGIN, y, pageW - MARGIN * 2, barH, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), MARGIN + 3, textY);
    doc.setTextColor(0, 0, 0);
    return y + barH + 4;
}

function renderManagementSystemSectionPdf(
    doc: jsPDF,
    form: FindingsReportForm,
    rows: { label: string; value: string }[],
    y: number,
    pageH: number,
): number {
    const boxRows = getManagementBoxRows(form, rows);
    if (boxRows.length === 0) return y;

    y = pdfBlueSectionHeading(doc, `${getSectionLabel(form, "managementSystem")} :`, y);
    y = checkPage(doc, y, 40, pageH);
    pdfAutoTable(doc, {
        startY: y,
        body: boxRows.map((row) => [
            { content: `${row.label} :`, styles: { fontStyle: "bold" } },
            row.value,
        ]),
        theme: "grid",
        styles: {
            font: FONT,
            fontSize: 10,
            cellPadding: 5,
            minCellHeight: 14,
            valign: "middle",
        },
        columnStyles: {
            0: { cellWidth: MANAGEMENT_LABEL_COL_WIDTH_MM },
            1: { cellWidth: "auto" },
        },
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
}

type PreviousFindingsBlock = {
    sectionLabel: string;
    closureLabel: string;
    content: string;
};

function resolvePreviousFindingsBlock(
    auditData: Record<string, unknown>,
): PreviousFindingsBlock | null {
    const content = String(auditData.previousFindings ?? "").trim();
    if (!content) return null;

    const layout = mergeAuditExecuteLayout(
        auditData.auditExecuteLayout as Partial<AuditExecuteLayout> | null,
    );

    return {
        sectionLabel: getExecuteSectionLabel(layout, "previousFindings"),
        closureLabel: getExecuteSectionLabel(layout, "previousFindingsClosure"),
        content,
    };
}

function pdfBorderedContentBox(doc: jsPDF, text: string, y: number, pageH: number): number {
    y = checkPage(doc, y, 20, pageH);
    pdfAutoTable(doc, {
        startY: y,
        body: [[text || "—"]],
        theme: "grid",
        styles: {
            font: FONT,
            fontSize: 10,
            cellPadding: 6,
            minCellHeight: 14,
            overflow: "linebreak",
        },
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
}

function renderBlueTextSectionPdf(
    doc: jsPDF,
    heading: string,
    content: string,
    y: number,
    pageH: number,
): number {
    y = checkPage(doc, y, 30, pageH);
    y = pdfBlueSectionHeading(doc, heading, y);
    return pdfBorderedContentBox(doc, content, y, pageH);
}

function renderPreviousFindingsSectionPdf(
    doc: jsPDF,
    auditData: Record<string, unknown>,
    y: number,
    pageH: number,
): number {
    const block = resolvePreviousFindingsBlock(auditData);
    if (!block) return y;

    y = checkPage(doc, y, 30, pageH);
    y = pdfSubHeading(doc, block.sectionLabel, y);
    pdfAutoTable(doc, {
        startY: y,
        head: [[{ content: block.closureLabel, styles: { fontStyle: "bold", fillColor: [245, 245, 245] } }]],
        body: [[block.content]],
        theme: "grid",
        styles: {
            font: FONT,
            fontSize: 10,
            cellPadding: 6,
            minCellHeight: 14,
            overflow: "linebreak",
        },
        headStyles: { fontStyle: "bold", fillColor: [245, 245, 245], textColor: [0, 0, 0] },
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
}

function pdfSubHeading(doc: jsPDF, title: string, y: number): number {
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(title, MARGIN, y);
    const tw = doc.getTextWidth(title);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + 1.2, MARGIN + tw, y + 1.2);
    return y + 8;
}

function pdfBodyText(doc: jsPDF, text: string, y: number, pageW: number): number {
    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text || "—", pageW - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    return y + lines.length * 5 + 4;
}

function pdfDottedLine(doc: jsPDF, label: string, y: number, pageW: number, x = MARGIN): number {
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label);
    const dots = ".".repeat(Math.floor((pageW - x - MARGIN - labelW - 4) / 2.2));
    doc.setFont(FONT, "normal");
    doc.text(dots, x + labelW + 4, y);
    return y + 10;
}

function renderPdfSignatureColumn(
    doc: jsPDF,
    label: string,
    signature: string,
    date: string,
    x: number,
    y: number,
    colWidth: number,
): number {
    let cy = y;
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${label}:`, x, cy);
    cy += 7;

    if (signature.startsWith("data:image/")) {
        try {
            const format = signature.includes("image/jpeg") ? "JPEG" : "PNG";
            doc.addImage(signature, format, x, cy, Math.min(colWidth - 6, 48), 14, undefined, "FAST");
            cy += 16;
        } catch {
            doc.setFont(FONT, "normal");
            doc.text("[Invalid Image]", x, cy);
            cy += 8;
        }
    } else if (signature.trim()) {
        doc.setFont(FONT, "normal");
        const lines = doc.splitTextToSize(signature, colWidth - 4);
        doc.text(lines, x, cy);
        cy += lines.length * 5 + 2;
    } else {
        doc.setFont(FONT, "normal");
        const dots = ".".repeat(Math.floor((colWidth - 4) / 2.2));
        doc.text(dots, x, cy);
        cy += 8;
    }

    doc.setFont(FONT, "bold");
    doc.text("Date:", x, cy);
    doc.setFont(FONT, "normal");
    const dateText = date.trim() || ".".repeat(Math.floor((colWidth - 20) / 2.2));
    doc.text(dateText, x + doc.getTextWidth("Date: ") + 2, cy);
    return cy + 12;
}

function renderAcknowledgementSectionPdf(
    doc: jsPDF,
    ctx: ReportContext,
    y: number,
    pageH: number,
    pageW: number,
): number {
    y = checkPage(doc, y, 50, pageH);
    y = pdfBlueSectionHeading(
        doc,
        `${getSectionLabel(ctx.findingsForm, "acknowledgement")}:`,
        y,
    );

    const colWidth = (pageW - MARGIN * 2 - 8) / 2;
    const leftX = MARGIN;
    const rightX = MARGIN + colWidth + 8;
    const startY = y + 4;
    const leftEnd = renderPdfSignatureColumn(
        doc,
        "Auditee Signature",
        ctx.acknowledgement.auditeeSignature,
        ctx.acknowledgement.auditeeDate,
        leftX,
        startY,
        colWidth,
    );
    const rightEnd = renderPdfSignatureColumn(
        doc,
        "Auditor Signature",
        ctx.acknowledgement.auditorSignature,
        ctx.acknowledgement.auditorDate,
        rightX,
        startY,
        colWidth,
    );
    return Math.max(leftEnd, rightEnd) + 4;
}

async function renderSzlReportHeaderAndMetadataAsync(
    doc: jsPDF,
    ctx: ReportContext,
    logo: { dataUrl: string; ratio: number } | null,
    auditData: Record<string, unknown>,
): Promise<number> {
    const pageH = doc.internal.pageSize.getHeight();
    let y = MARGIN;

    y = drawSzlPdfHeader(doc, logo, ctx.findingsForm);

    if (ctx.managementRows.length > 0) {
        y = renderManagementSystemSectionPdf(
            doc,
            ctx.findingsForm,
            ctx.managementRows,
            y,
            pageH,
        );
    }

    if (isFieldVisible(ctx.findingsForm, "auditScope")) {
        y = renderBlueTextSectionPdf(
            doc,
            `${getSectionLabel(ctx.findingsForm, "auditScope")}:`,
            ctx.scope,
            y,
            pageH,
        );
        for (const field of getCustomFieldsBySection(ctx.findingsForm, "content")) {
            y = checkPage(doc, y, 20, pageH);
            y = pdfSubHeading(doc, `${field.label}:`, y);
            y = pdfBorderedContentBox(doc, field.value, y, pageH);
        }
    }

    if (isFieldVisible(ctx.findingsForm, "auditCriteriaAndMethod")) {
        y = renderBlueTextSectionPdf(
            doc,
            `${getSectionLabel(ctx.findingsForm, "auditCriteria")}:`,
            ctx.criteriaAndMethod,
            y,
            pageH,
        );
    }

    y = renderPreviousFindingsSectionPdf(doc, auditData, y, pageH);

    return y;
}

function renderSzlReportSummaryAndSignatures(doc: jsPDF, ctx: ReportContext, y: number): number {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const form = ctx.findingsForm;

    y = checkPage(doc, y, 40, pageH);
    y = pdfBlueSectionHeading(doc, getSectionLabel(form, "auditSummary"), y);

    y = checkPage(doc, y, 20, pageH);
    y = pdfSubHeading(doc, `${getSectionLabel(form, "nonConformitiesSummary")}:`, y);
    const ncRows =
        ctx.nonConformances.length > 0
            ? ctx.nonConformances.map((nc, idx) => [String(idx + 1), nc.statement])
            : Array.from({ length: 6 }, () => ["", ""]);
    pdfAutoTable(doc, {
        startY: y,
        head: [["Number", "Statement of nonconformity"]],
        body: ncRows,
        theme: "grid",
        styles: { font: FONT, fontSize: 10, cellPadding: 4, minCellHeight: 10 },
        headStyles: { fontStyle: "bold", fillColor: [255, 255, 255], textColor: [0, 0, 0] },
        columnStyles: { 0: { cellWidth: 18 } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    if (isFieldVisible(form, "generalComment")) {
        y = checkPage(doc, y, 20, pageH);
        y = pdfSubHeading(doc, `${getSectionLabel(form, "generalComment")}:`, y);
        y = pdfBorderedContentBox(doc, ctx.executiveSummary || "", y, pageH);
    }

    y = checkPage(doc, y, 50, pageH);
    y = pdfSubHeading(doc, `${getSectionLabel(form, "keyPersonnel")}:`, y);
    const filledParticipants = ctx.participants.filter(
        (p) => p.name?.trim() || p.position?.trim() || p.department?.trim(),
    );
    const participantRows =
        filledParticipants.length > 0
            ? filledParticipants.map((p) => [p.name, p.position, p.department])
            : Array.from({ length: 4 }, () => ["", "", ""]);
    pdfAutoTable(doc, {
        startY: y,
        head: [["Name", "Position", "Department"]],
        body: participantRows,
        theme: "grid",
        styles: { font: FONT, fontSize: 10, cellPadding: 4, minCellHeight: 10 },
        headStyles: { fontStyle: "bold", fillColor: [255, 255, 255], textColor: [0, 0, 0] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    return renderAcknowledgementSectionPdf(doc, ctx, y, pageH, pageW);
}

/** Full audit execution report as PDF */
export async function generateAuditReportPdf(plan: Record<string, any>) {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const template = auditTemplates.find((t) => t.id === plan.templateId);
    const auditData = getAuditData(plan);
    const fileName = auditReportBaseName(plan);
    const ctx = await buildReportContext(plan);
    const logo = await loadSzlLogoBase64();
    const form = ctx.findingsForm;

    activePdfPageLayout = {
        contentStartY: computeSzlPdfHeaderContentStartY(form, !!logo),
        logo,
        form,
    };

    let y: number;
    try {
        y = await renderSzlReportHeaderAndMetadataAsync(doc, ctx, logo, auditData);

    const contentTop = activePdfPageLayout.contentStartY;
    const blueSectionHeading = (title: string, startY: number) => {
        if (startY > pageH - 40) {
            doc.addPage();
            drawSzlPdfHeader(doc, logo, form);
            startY = contentTop;
        }
        return pdfBlueSectionHeading(doc, title, startY);
    };
    const sectionHeading = (title: string, startY: number) => {
        if (startY > pageH - 40) {
            doc.addPage();
            drawSzlPdfHeader(doc, logo, form);
            startY = contentTop;
        }
        return pdfSubHeading(doc, title, startY);
    };

    const hasDetailedRecord =
        auditData.checklistData ||
        auditData.clauseData ||
        auditData.nonConformances ||
        auditData.opportunities ||
        auditData.processAudits ||
        collectReportEvidenceSources(auditData).length > 0;

    if (hasDetailedRecord) {
        y = blueSectionHeading("DETAILED AUDIT RECORD", y);
    }

    if (auditData.summaryCounts) {
        const sc = auditData.summaryCounts as Record<string, string | number>;
        pdfAutoTable(doc, {
            startY: y,
            head: [["Compliant", "OFI", "Minor NCR", "Major NCR", "Positive"]],
            body: [[sc.compliant ?? "0", sc.ofi ?? "0", sc.minor ?? "0", sc.major ?? "0", sc.positive ?? "0"]],
            theme: "grid",
            styles: { font: FONT, fontSize: 9 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    const clauseFilesForReport = sanitizeAuditEvidenceMediaMap(
        auditData.clauseFiles as Record<string, AuditEvidenceMedia[]> | undefined,
    );
    const genericFilesForReport = sanitizeAuditEvidenceMediaMap(
        auditData.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined,
    );
    const clauseEvidenceSegments = buildAllClauseEvidenceSegments(
        auditData,
        template,
        clauseFilesForReport,
        genericFilesForReport,
    );

    if (auditData.checklistData && template?.content) {
        const checklistRows: string[][] = [];
        const checklistContent = resolveChecklistContent(
            auditData,
            template.content as ChecklistContent[],
        );
        Object.entries(auditData.checklistData as Record<string, any>)
            .filter(([, v]) => v?.findings)
            .forEach(([idx, v]) => {
                const itemIndex = Number(idx);
                const item = checklistContent[itemIndex];
                const clauseKey = item?.clause || String(idx);
                const attached = collectFindingAttachmentMedia(
                    clauseFilesForReport,
                    genericFilesForReport,
                    clauseKey,
                    itemIndex,
                );
                const evidenceText = buildFindingEvidenceText(v.evidence, attached);
                const details = extractFindingDetailFields(v);
                checklistRows.push([
                    clauseKey,
                    item?.question || "—",
                    v.findings,
                    evidenceText || "—",
                    ...findingDetailCells(details, "—"),
                ]);
            });
        if (checklistRows.length > 0) {
            y = checkPage(doc, y, 20, pageH);
            y = sectionHeading("Checklist Findings", y);
            pdfAutoTable(doc, {
                startY: y,
                head: [["Clause", "Question", "Finding", "Evidence", ...FINDING_DETAIL_HEADERS]],
                body: checklistRows,
                styles: { font: FONT, fontSize: 7, overflow: "linebreak" },
                headStyles: { fontSize: 7 },
                theme: "grid",
            });
            y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
    }

    if (template?.type === "clause-checklist" && auditData.clauseData) {
        const checklistRows: string[][] = [];
        (template.content as ClauseChecklistContent[]).forEach((item) => {
            const v = auditData.clauseData[item.clauseId];
            if (!v || !v.findingType) return;
            const clauseKey = item.clauseId;
            const attached = collectFindingAttachmentMedia(
                clauseFilesForReport,
                genericFilesForReport,
                clauseKey,
            );
            const evidenceText = buildFindingEvidenceText(
                v.findingDetails || v.evidence,
                attached,
            );
            const details = extractFindingDetailFields(v);
            const requirement = [item.title, ...(item.subClauses || [])].filter(Boolean).join('\n');
            checklistRows.push([
                clauseKey,
                requirement,
                v.findingType,
                evidenceText || "—",
                ...findingDetailCells(details, "—"),
            ]);
        });
        if (checklistRows.length > 0) {
            y = checkPage(doc, y, 20, pageH);
            y = sectionHeading("Checklist Findings", y);
            pdfAutoTable(doc, {
                startY: y,
                head: [["Clause", "Requirement", "Finding", "Evidence", ...FINDING_DETAIL_HEADERS]],
                body: checklistRows,
                styles: { font: FONT, fontSize: 7, overflow: "linebreak" },
                headStyles: { fontSize: 7 },
                theme: "grid",
            });
            y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
    }

    if (template?.type === "process-audit" && auditData.processAudits) {
        const processRows: string[][] = [];
        (auditData.processAudits as ProcessAuditContent[]).forEach((audit, index) => {
            if (!audit.findingType) return;
            const details = extractFindingDetailFields(audit);
            processRows.push([
                String(index + 1),
                audit.processArea || "—",
                audit.auditees || "—",
                audit.evidence || "—",
                audit.conclusion || "—",
                audit.findingType,
                ...findingDetailCells(details, "—"),
            ]);
        });
        if (processRows.length > 0) {
            y = checkPage(doc, y, 20, pageH);
            y = sectionHeading("Process Audit Record", y);
            pdfAutoTable(doc, {
                startY: y,
                head: [["No.", "Process Area", "Auditee(s)", "Evidence", "Conclusion", "Finding", ...FINDING_DETAIL_HEADERS]],
                body: processRows,
                styles: { font: FONT, fontSize: 7, overflow: "linebreak" },
                headStyles: { fontSize: 7 },
                theme: "grid",
            });
            y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
    }

    const opportunities = ((auditData.opportunities as any[]) || []).filter((o) => o.opportunity);
    if (opportunities.length > 0) {
        y = checkPage(doc, y, 20, pageH);
        y = sectionHeading("Opportunities for Improvement", y);
        pdfAutoTable(doc, {
            startY: y,
            head: [["ID", "Clause", "Area", "Opportunity"]],
            body: opportunities.map((o) => [o.id, o.standardClause || "—", o.areaProcess || "—", o.opportunity || "—"]),
            styles: { font: FONT, fontSize: 8 },
            theme: "grid",
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    const contentWidthMm = pageW - MARGIN * 2;

    if (clauseEvidenceSegments.length > 0) {
        y = await embedClauseEvidenceSegmentsInPdf(
            doc,
            clauseEvidenceSegments,
            y,
            pageH,
            contentWidthMm,
        );
    }

    const shownEvidence = collectShownEvidenceSignatures(clauseEvidenceSegments);
    const remainingEvidence = filterUnshownEvidenceSources(
        collectReportEvidenceSources(auditData),
        shownEvidence,
    );
    const pdfImages = await prepareReportEvidenceImages(remainingEvidence);

    if (pdfImages.length > 0) {
        y = checkPage(doc, y, 20, pageH);
        y = sectionHeading("Additional Evidence", y);
        for (const img of pdfImages) {
            y = await embedPreparedImageInPdf(doc, img, y, contentWidthMm, pageH);
        }
    }

    // Now render 4. AUDIT SUMMARY and 5. ACKNOWLEDGEMENT OF FINDINGS (Signatures)
    y = renderSzlReportSummaryAndSignatures(doc, ctx, y);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawSzlPdfHeader(doc, logo, form);
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.line(MARGIN, pageH - 12, pageW - MARGIN, pageH - 12);
        doc.text(`${ctx.docNumber} — ${ctx.reportTitle}`, MARGIN, pageH - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageW - MARGIN, pageH - 7, { align: "right" });
    }
    } finally {
        activePdfPageLayout = null;
    }

    doc.save(`${fileName}.pdf`);
}

function docxBorderedCell(children: Paragraph[], widthPct = 33) {
    return new DocxTableCell({
        children,
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
        },
    });
}

function docxSectionHeading(text: string) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, underline: { type: UnderlineType.SINGLE } })],
        spacing: { before: 280, after: 160 },
    });
}

function docxBlueSectionHeading(text: string) {
    return new Paragraph({
        children: [
            new TextRun({
                text: text.toUpperCase(),
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                color: "FFFFFF",
            }),
        ],
        shading: { fill: DOCX_SECTION_BLUE },
        spacing: { before: 280, after: 120 },
    });
}

function buildManagementSystemSectionDocx(
    form: FindingsReportForm,
    rows: { label: string; value: string }[],
): (Paragraph | DocxTable)[] {
    const boxRows = getManagementBoxRows(form, rows);
    if (boxRows.length === 0) return [];

    return [
        docxBlueSectionHeading(`${getSectionLabel(form, "managementSystem")} :`),
        new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: boxRows.map(
                (row) =>
                    new DocxTableRow({
                        children: [
                            docxBorderedCell(
                                [
                                    new Paragraph({
                                        children: [
                                            new TextRun({ text: `${row.label} :`, bold: true }),
                                        ],
                                    }),
                                ],
                                32,
                            ),
                            docxBorderedCell([new Paragraph(row.value || "—")], 68),
                        ],
                    }),
            ),
        }),
    ];
}

function docxBorderedContentTable(text: string): DocxTable {
    return new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new DocxTableRow({
                children: [docxBorderedCell([new Paragraph(text || "—")], 100)],
            }),
        ],
    });
}

function buildBlueTextSectionDocx(heading: string, content: string): (Paragraph | DocxTable)[] {
    return [docxBlueSectionHeading(heading), docxBorderedContentTable(content)];
}

function buildAcknowledgementSectionDocx(ctx: ReportContext): (Paragraph | DocxTable)[] {
    const blocks: (Paragraph | DocxTable)[] = [
        docxBlueSectionHeading(`${getSectionLabel(ctx.findingsForm, "acknowledgement")}:`),
    ];

    const buildSignatureCell = (
        label: string,
        signature: string,
        date: string,
    ): DocxTableCell => {
        const children: Paragraph[] = [
            new Paragraph({
                children: [new TextRun({ text: `${label}:`, bold: true })],
                spacing: { after: 80 },
            }),
        ];

        if (signature.startsWith("data:image/")) {
            try {
                const buffer = dataUrlToUint8Array(signature);
                children.push(
                    new Paragraph({
                        children: [new ImageRun({ data: buffer, transformation: { width: 120, height: 45 } })],
                        spacing: { after: 80 },
                    }),
                );
            } catch {
                children.push(new Paragraph({ text: "[Invalid Image]", spacing: { after: 80 } }));
            }
        } else if (signature.trim()) {
            children.push(new Paragraph({ text: signature, spacing: { after: 80 } }));
        } else {
            children.push(
                new Paragraph({
                    text: ".................................................................",
                    spacing: { after: 80 },
                }),
            );
        }

        children.push(
            new Paragraph({
                text: `Date: ${date.trim() || "................................................."}`,
                spacing: { after: 80 },
            }),
        );

        return docxBorderedCell(children, 50);
    };

    blocks.push(
        new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocxTableRow({
                    children: [
                        buildSignatureCell(
                            "Auditee Signature",
                            ctx.acknowledgement.auditeeSignature,
                            ctx.acknowledgement.auditeeDate,
                        ),
                        buildSignatureCell(
                            "Auditor Signature",
                            ctx.acknowledgement.auditorSignature,
                            ctx.acknowledgement.auditorDate,
                        ),
                    ],
                }),
            ],
        }),
    );

    return blocks;
}

function buildPreviousFindingsSectionDocx(
    auditData: Record<string, unknown>,
): (Paragraph | DocxTable)[] {
    const block = resolvePreviousFindingsBlock(auditData);
    if (!block) return [];

    return [
        docxSubHeading(block.sectionLabel),
        new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocxTableRow({
                    children: [
                        docxBorderedCell(
                            [
                                new Paragraph({
                                    children: [new TextRun({ text: block.closureLabel, bold: true })],
                                }),
                            ],
                            100,
                        ),
                    ],
                }),
                new DocxTableRow({
                    children: [docxBorderedCell([new Paragraph(block.content)], 100)],
                }),
            ],
        }),
    ];
}

function docxSubHeading(text: string) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true, underline: { type: UnderlineType.SINGLE } })],
        spacing: { before: 200, after: 120 },
    });
}

const DOCX_FINDING_COL_WIDTH = 8;

function docxFindingDetailHeaderCells(): DocxTableCell[] {
    return FINDING_DETAIL_HEADERS.map((header) =>
        docxBorderedCell(
            [new Paragraph({ children: [new TextRun({ text: header, bold: true, size: 16 })] })],
            DOCX_FINDING_COL_WIDTH,
        ),
    );
}

function docxFindingDetailDataCells(fields: ReturnType<typeof extractFindingDetailFields>): DocxTableCell[] {
    return findingDetailCells(fields, "—").map((text) =>
        docxBorderedCell([new Paragraph({ children: [new TextRun({ text, size: 16 })] })], DOCX_FINDING_COL_WIDTH),
    );
}

function buildSzlDocxHeaderRows(
    form: FindingsReportForm,
    ctx: Pick<ReportContext, "docNumber" | "reportTitle" | "revisionNo" | "issueDate">,
    logoBuffer: ArrayBuffer | null,
): DocxTableRow[] {
    const rows: DocxTableRow[] = [];
    const topHeaderFields = (
        [
            { key: "docNumber" as const, value: ctx.docNumber },
            { key: "reportTitle" as const, value: ctx.reportTitle },
            { key: "revisionNo" as const, value: ctx.revisionNo },
        ] as const
    ).filter((field) => isFieldVisible(form, field.key));

    if (topHeaderFields.length > 0) {
        const widthPct = Math.floor(100 / 3);
        const topCells = Array.from({ length: 3 }, (_, index) => {
            const field = topHeaderFields[index];
            if (!field) {
                return docxBorderedCell([new Paragraph("")], widthPct);
            }
            return docxBorderedCell(
                [new Paragraph(`${getFieldLabel(form, field.key)}: ${field.value || "—"}`)],
                widthPct,
            );
        });
        rows.push(new DocxTableRow({ children: topCells }));
    }

    const logoParagraphs: Paragraph[] = logoBuffer
        ? [new Paragraph({ children: [new ImageRun({ data: logoBuffer, transformation: { width: 180, height: 103 } })] })]
        : [new Paragraph("")];
    const showIssueDate = isFieldVisible(form, "issueDate");

    if (logoBuffer || showIssueDate) {
        const widthPct = Math.floor(100 / 3);
        const bottomCells = [
            docxBorderedCell(logoParagraphs, widthPct),
            docxBorderedCell([new Paragraph("")], widthPct),
            showIssueDate
                ? docxBorderedCell(
                      [new Paragraph(`${getFieldLabel(form, "issueDate")}: ${ctx.issueDate || "—"}`)],
                      widthPct,
                  )
                : docxBorderedCell([new Paragraph("")], widthPct),
        ];
        rows.push(new DocxTableRow({ children: bottomCells }));
    }

    return rows;
}

function buildSzlDocxPageHeader(
    form: FindingsReportForm,
    ctx: Pick<ReportContext, "docNumber" | "reportTitle" | "revisionNo" | "issueDate">,
    logoBuffer: ArrayBuffer | null,
): Header | null {
    const rows = buildSzlDocxHeaderRows(form, ctx, logoBuffer);
    if (rows.length === 0) return null;
    return new Header({
        children: [
            new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows,
            }),
        ],
    });
}

/** Full audit execution report as Word */
export async function generateAuditReportDocx(plan: Record<string, any>) {
    const auditData = getAuditData(plan);
    const fileName = auditReportBaseName(plan);
    const ctx = await buildReportContext(plan);
    const template = auditTemplates.find((t) => t.id === plan.templateId);
    const logoBuffer = await loadSzlLogoBuffer();
    const form = ctx.findingsForm;
    const pageHeader = buildSzlDocxPageHeader(form, ctx, logoBuffer);
    const children: (Paragraph | DocxTable)[] = [];

    const documentCustomFields = getCustomFieldsBySection(form, "document");
    documentCustomFields.forEach((field) => {
        children.push(
            new Paragraph({
                text: `${field.label || "Field"}: ${field.value || "—"}`,
                spacing: { after: 120 },
            }),
        );
    });

    children.push(...buildManagementSystemSectionDocx(form, ctx.managementRows));

    if (isFieldVisible(form, "auditScope")) {
        children.push(...buildBlueTextSectionDocx(`${getSectionLabel(form, "auditScope")}:`, ctx.scope));
        getCustomFieldsBySection(form, "content").forEach((field) => {
            children.push(docxSubHeading(`${field.label}:`));
            children.push(docxBorderedContentTable(field.value));
        });
    }

    if (isFieldVisible(form, "auditCriteriaAndMethod")) {
        children.push(
            ...buildBlueTextSectionDocx(
                `${getSectionLabel(form, "auditCriteria")}:`,
                ctx.criteriaAndMethod,
            ),
        );
    }

    children.push(...buildPreviousFindingsSectionDocx(auditData));

    // --- 4. DETAILED AUDIT RECORD & EVIDENCE ---
    const clauseFilesForReport = sanitizeAuditEvidenceMediaMap(
        auditData.clauseFiles as Record<string, AuditEvidenceMedia[]> | undefined,
    );
    const genericFilesForReport = sanitizeAuditEvidenceMediaMap(
        auditData.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined,
    );
    const clauseEvidenceSegments = buildAllClauseEvidenceSegments(
        auditData,
        template,
        clauseFilesForReport,
        genericFilesForReport,
    );
    const shownEvidence = collectShownEvidenceSignatures(clauseEvidenceSegments);
    const remainingEvidence = filterUnshownEvidenceSources(
        collectReportEvidenceSources(auditData),
        shownEvidence,
    );
    const wordImages = await prepareReportEvidenceImages(remainingEvidence);
    const hasDetailedRecord =
        auditData.checklistData ||
        auditData.clauseData ||
        auditData.processAudits ||
        clauseEvidenceSegments.length > 0 ||
        wordImages.length > 0;

    if (hasDetailedRecord) {
        children.push(docxBlueSectionHeading("DETAILED AUDIT RECORD"));

        // Checklist / Clause Checklist Table / Process Audit Record Table
        if (template?.type === "checklist" && auditData.checklistData) {
            const checklistContent = resolveChecklistContent(
                auditData,
                template.content as ChecklistContent[],
            );
            const rows: DocxTableRow[] = [
                new DocxTableRow({
                    children: [
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Clause", bold: true })] })], 6),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Question", bold: true })] })], 18),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Finding", bold: true })] })], 6),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Evidence", bold: true })] })], 14),
                        ...docxFindingDetailHeaderCells(),
                    ],
                }),
            ];

            Object.entries(auditData.checklistData as Record<string, any>)
                .filter(([, v]) => v?.findings)
                .forEach(([idx, v]) => {
                    const itemIndex = Number(idx);
                    const item = checklistContent[itemIndex];
                    const clauseKey = item?.clause || String(idx);
                    const attached = collectFindingAttachmentMedia(
                        clauseFilesForReport,
                        genericFilesForReport,
                        clauseKey,
                        itemIndex,
                    );
                    const evidenceText = buildFindingEvidenceText(v.evidence, attached) || "—";
                    const details = extractFindingDetailFields(v);

                    rows.push(
                        new DocxTableRow({
                            children: [
                                docxBorderedCell([new Paragraph(clauseKey)], 6),
                                docxBorderedCell([new Paragraph(item?.question || "—")], 18),
                                docxBorderedCell([new Paragraph(v.findings || "—")], 6),
                                docxBorderedCell([new Paragraph(evidenceText)], 14),
                                ...docxFindingDetailDataCells(details),
                            ],
                        }),
                    );
                });

            if (rows.length > 1) {
                children.push(docxSubHeading("Checklist Findings"));
                children.push(
                    new DocxTable({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows,
                    }),
                );
            }
        } else if (template?.type === "clause-checklist" && auditData.clauseData) {
            const rows: DocxTableRow[] = [
                new DocxTableRow({
                    children: [
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Clause", bold: true })] })], 6),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Requirement", bold: true })] })], 18),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Finding", bold: true })] })], 6),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Evidence", bold: true })] })], 14),
                        ...docxFindingDetailHeaderCells(),
                    ],
                }),
            ];

            (template.content as ClauseChecklistContent[]).forEach((item) => {
                const v = auditData.clauseData[item.clauseId];
                if (!v || !v.findingType) return;
                const clauseKey = item.clauseId;
                const requirement = [item.title, ...(item.subClauses || [])].filter(Boolean).join('\n');
                const attached = collectFindingAttachmentMedia(
                    clauseFilesForReport,
                    genericFilesForReport,
                    clauseKey,
                );
                const evidenceText = buildFindingEvidenceText(v.findingDetails || v.evidence, attached) || "—";
                const details = extractFindingDetailFields(v);

                rows.push(
                    new DocxTableRow({
                        children: [
                            docxBorderedCell([new Paragraph(clauseKey)], 6),
                            docxBorderedCell([new Paragraph(requirement)], 18),
                            docxBorderedCell([new Paragraph(v.findingType || "—")], 6),
                            docxBorderedCell([new Paragraph(evidenceText)], 14),
                            ...docxFindingDetailDataCells(details),
                        ],
                    }),
                );
            });

            if (rows.length > 1) {
                children.push(docxSubHeading("Checklist Findings"));
                children.push(
                    new DocxTable({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows,
                    }),
                );
            }
        } else if (template?.type === "process-audit" && auditData.processAudits) {
            const rows: DocxTableRow[] = [
                new DocxTableRow({
                    children: [
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "No.", bold: true })] })], 4),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Process Area", bold: true })] })], 10),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Auditee(s)", bold: true })] })], 10),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Evidence", bold: true })] })], 12),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Conclusion", bold: true })] })], 10),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Finding", bold: true })] })], 6),
                        ...docxFindingDetailHeaderCells(),
                    ],
                }),
            ];

            (auditData.processAudits as ProcessAuditContent[]).forEach((audit, index) => {
                if (!audit.findingType) return;
                const details = extractFindingDetailFields(audit);

                rows.push(
                    new DocxTableRow({
                        children: [
                            docxBorderedCell([new Paragraph(String(index + 1))], 4),
                            docxBorderedCell([new Paragraph(audit.processArea || "—")], 10),
                            docxBorderedCell([new Paragraph(audit.auditees || "—")], 10),
                            docxBorderedCell([new Paragraph(audit.evidence || "—")], 12),
                            docxBorderedCell([new Paragraph(audit.conclusion || "—")], 10),
                            docxBorderedCell([new Paragraph(audit.findingType || "—")], 6),
                            ...docxFindingDetailDataCells(details),
                        ],
                    }),
                );
            });

            if (rows.length > 1) {
                children.push(docxSubHeading("Process Audit Record"));
                children.push(
                    new DocxTable({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows,
                    }),
                );
            }
        }
        await appendClauseEvidenceToDocx(children, clauseEvidenceSegments);
        if (wordImages.length > 0) {
            children.push(docxSubHeading("Additional Evidence"));
            for (const img of wordImages) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `${img.context} — ${img.name}`, bold: true })],
                        spacing: { before: 160, after: 80 },
                    }),
                );
                if (img.description?.trim()) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: img.description.trim(), italics: true })],
                            spacing: { after: 80 },
                        }),
                    );
                }
                try {
                    const buffer = dataUrlToUint8Array(img.dataUrl);
                    const maxW = 520;
                    const aspect = img.widthPx / img.heightPx;
                    let w = maxW;
                    let h = Math.round(w / aspect);
                    if (h > 360) {
                        h = 360;
                        w = Math.round(h * aspect);
                    }
                    children.push(
                        new Paragraph({
                            children: [new ImageRun({ data: buffer, transformation: { width: w, height: h } })],
                            spacing: { after: 240 },
                        }),
                    );
                } catch {
                    /* skip broken image */
                }
            }
        }
    }

    // --- 4. AUDIT SUMMARY ---
    children.push(docxBlueSectionHeading(getSectionLabel(form, "auditSummary")));
    children.push(docxSubHeading(`${getSectionLabel(form, "nonConformitiesSummary")}:`));
    const ncDocxRows =
        ctx.nonConformances.length > 0
            ? ctx.nonConformances.map((nc, idx) => [String(idx + 1), nc.statement])
            : Array.from({ length: 6 }, () => ["", ""]);
    children.push(
        new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocxTableRow({
                    children: ["Number", "Statement of nonconformity"].map((h) =>
                        docxBorderedCell([
                            new Paragraph({ children: [new TextRun({ text: h, bold: true })] }),
                        ]),
                    ),
                }),
                ...ncDocxRows.map(
                    (row) =>
                        new DocxTableRow({
                            children: [
                                docxBorderedCell([new Paragraph(row[0])], 18),
                                docxBorderedCell([new Paragraph(row[1])], 82),
                            ],
                        }),
                ),
            ],
        }),
    );

    if (isFieldVisible(form, "generalComment")) {
        children.push(docxSubHeading(`${getSectionLabel(form, "generalComment")}:`));
        children.push(docxBorderedContentTable(ctx.executiveSummary || ""));
    }

    children.push(docxSubHeading(`${getSectionLabel(form, "keyPersonnel")}:`));
    const filledDocxParticipants = ctx.participants.filter(
        (p) => p.name?.trim() || p.position?.trim() || p.department?.trim(),
    );
    const participantRows =
        filledDocxParticipants.length > 0
            ? filledDocxParticipants
            : Array.from({ length: 4 }, () => ({ name: "", position: "", department: "" }));
    children.push(
        new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocxTableRow({
                    children: ["Name", "Position", "Department"].map((h) =>
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: h, bold: true })] })]),
                    ),
                }),
                ...participantRows.map(
                    (p) =>
                        new DocxTableRow({
                            children: [p.name, p.position, p.department].map((v) =>
                                docxBorderedCell([new Paragraph(v || "")]),
                            ),
                        }),
                ),
            ],
        }),
    );

    children.push(...buildAcknowledgementSectionDocx(ctx));

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                    },
                },
                headers: pageHeader ? { default: pageHeader } : undefined,
                children,
            },
        ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
}

/** Full audit execution report as Excel */
export async function generateAuditReportExcel(plan: Record<string, any>) {
    const template = auditTemplates.find((t) => t.id === plan.templateId);
    const auditData = getAuditData(plan);
    const fileName = auditReportBaseName(plan);
    const ctx = await buildReportContext(plan);
    const wb = XLSX.utils.book_new();

    const form = ctx.findingsForm;
    const summaryData: string[][] = [["Field", "Value"]];

    const pushSummaryRow = (
        key: Parameters<typeof isFieldVisible>[1],
        value: string,
    ) => {
        if (!isFieldVisible(form, key)) return;
        summaryData.push([getFieldLabel(form, key), value || "—"]);
    };

    pushSummaryRow("docNumber", ctx.docNumber);
    pushSummaryRow("reportTitle", ctx.reportTitle);
    pushSummaryRow("revisionNo", ctx.revisionNo);
    pushSummaryRow("issueDate", ctx.issueDate);
    getCustomFieldsBySection(form, "document").forEach((field) => {
        summaryData.push([field.label || "Field", field.value || "—"]);
    });

    summaryData.push(["Audit Name", plan.auditName || plan.auditType || "N/A"]);

    for (const row of ctx.managementRows) {
        summaryData.push([row.label, row.value]);
    }

    pushSummaryRow("auditScope", ctx.scope);
    getCustomFieldsBySection(form, "content").forEach((field) => {
        summaryData.push([field.label || "Field", field.value || "—"]);
    });
    pushSummaryRow("auditCriteriaAndMethod", ctx.criteriaAndMethod);

    summaryData.push(["Template", template?.title || plan.templateId || "N/A"]);
    summaryData.push(["Status", plan.status || "N/A"]);
    summaryData.push(["Saved Progress", `${auditData.progress ?? plan.progress ?? 0}%`]);

    if (isFieldVisible(form, "generalComment") && ctx.executiveSummary) {
        summaryData.push([
            getSectionLabel(form, "generalComment"),
            ctx.executiveSummary,
        ]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    if (ctx.participants.length > 0) {
        const pData = [["Name", "Position", "Department"]];
        ctx.participants.forEach((p) => pData.push([p.name, p.position, p.department]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pData), "Personnel");
    }

    if (ctx.nonConformances.length > 0) {
        const ncData = [["No.", "Statement"]];
        ctx.nonConformances.forEach((nc, i) => ncData.push([String(i + 1), nc.statement]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ncData), "Non-Conformities");
    }

    const clauseFilesForExcel = sanitizeAuditEvidenceMediaMap(
        auditData.clauseFiles as Record<string, AuditEvidenceMedia[]> | undefined,
    );
    const genericFilesForExcel = sanitizeAuditEvidenceMediaMap(
        auditData.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined,
    );

    if (auditData.checklistData && Object.keys(auditData.checklistData as object).length > 0 && template?.content) {
        const checklistContent = resolveChecklistContent(
            auditData,
            template.content as ChecklistContent[],
        );
        const cData = [["Clause", "Question", "Finding", "Evidence", ...FINDING_DETAIL_HEADERS]];
        Object.entries(auditData.checklistData as Record<string, any>)
            .filter(([, v]) => v.findings)
            .forEach(([idx, v]) => {
                const itemIndex = Number(idx);
                const item = checklistContent[itemIndex];
                const clauseKey = item?.clause || String(idx);
                const attached = collectFindingAttachmentMedia(
                    clauseFilesForExcel,
                    genericFilesForExcel,
                    clauseKey,
                    itemIndex,
                );
                const evidenceText = buildFindingEvidenceText(v.evidence, attached);
                const details = extractFindingDetailFields(v);
                cData.push([
                    clauseKey,
                    item?.question || "-",
                    v.findings,
                    evidenceText,
                    ...findingDetailCells(details),
                ]);
            });
        if (cData.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cData), "Checklist");
    }

    if (template?.type === "clause-checklist" && auditData.clauseData) {
        const cData = [["Clause", "Requirement", "Finding", "Evidence", ...FINDING_DETAIL_HEADERS]];
        (template.content as ClauseChecklistContent[]).forEach((item) => {
            const v = auditData.clauseData[item.clauseId];
            if (!v || !v.findingType) return;
            const requirement = [item.title, ...(item.subClauses || [])].filter(Boolean).join('\n');
            const attached = collectFindingAttachmentMedia(
                clauseFilesForExcel,
                genericFilesForExcel,
                item.clauseId,
            );
            const evidenceText = buildFindingEvidenceText(v.findingDetails || v.evidence, attached);
            const details = extractFindingDetailFields(v);
            cData.push([
                item.clauseId,
                requirement,
                v.findingType,
                evidenceText,
                ...findingDetailCells(details),
            ]);
        });
        if (cData.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cData), "Checklist");
    }

    if (template?.type === "process-audit" && auditData.processAudits) {
        const cData = [["No.", "Process Area", "Auditee(s)", "Evidence", "Conclusion", "Finding", ...FINDING_DETAIL_HEADERS]];
        (auditData.processAudits as ProcessAuditContent[]).forEach((audit, index) => {
            if (!audit.findingType) return;
            const details = extractFindingDetailFields(audit);
            cData.push([
                String(index + 1),
                audit.processArea || "",
                audit.auditees || "",
                audit.evidence || "",
                audit.conclusion || "",
                audit.findingType,
                ...findingDetailCells(details),
            ]);
        });
        if (cData.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cData), "Process Audit");
    }

    const evidenceList = collectReportEvidenceFileList(auditData);
    if (evidenceList.length > 0) {
        const evData = [["Location", "File name", "Type"]];
        evidenceList.forEach((e) => {
            const typeLabel = e.type === "application/pdf" ? "PDF" : e.type.replace(/^image\//, "").toUpperCase() || "Image";
            evData.push([e.context, e.name, typeLabel]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(evData), "Evidence Files");
    }

    XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export type AuditReportFormat = "pdf" | "docx" | "excel";

export async function downloadAuditReport(plan: Record<string, any>, format: AuditReportFormat) {
    if (format === "pdf") {
        await generateAuditReportPdf(plan);
        return;
    }
    if (format === "docx") {
        await generateAuditReportDocx(plan);
        return;
    }
    if (format === "excel") {
        await generateAuditReportExcel(plan);
        return;
    }
}
