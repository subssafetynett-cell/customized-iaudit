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
} from "docx";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { auditTemplates, ChecklistContent, ClauseChecklistContent, ProcessAuditContent } from "@/data/auditTemplates";
import { sanitizeAuditEvidenceMediaMap, type AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import { collectAuditEvidenceMedia } from "@/lib/auditEvidenceCollection";
import {
    collectReportEvidenceFileList,
    collectReportEvidenceSources,
    dataUrlToUint8Array,
    prepareReportEvidenceImages,
    reportImageDisplayMm,
} from "@/lib/reportEvidenceImages";
import type { FindingsReportForm } from "@/lib/findingsReportForm";

const DOC_NUMBER = "SH-CP-FM-11";
const REPORT_TITLE = "Audit Findings Report";
const REVISION_NO = "03";
const SZL_LOGO_PATH = "/szl-logo.png";
const MARGIN = 14;
const FONT = "times";

export function getAuditData(plan: { auditData?: unknown }) {
    if (!plan.auditData) return {};
    return typeof plan.auditData === "string" ? JSON.parse(plan.auditData) : (plan.auditData as Record<string, unknown>);
}

export function auditReportBaseName(plan: { auditName?: string; id?: number }) {
    return `Audit_Findings_Report_${(plan.auditName || "Audit").replace(/[^a-z0-9]/gi, "_") || plan.id}`;
}

interface ReportContext {
    managementSystem: string;
    department: string;
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
}

function getReportContext(plan: Record<string, any>): ReportContext {
    const auditData = getAuditData(plan);
    const form = auditData.findingsReportForm as Partial<FindingsReportForm> | undefined;
    const globalInfo = (auditData.auditGlobalInfo as Record<string, string>) || {};
    const template = auditTemplates.find((t) => t.id === plan.templateId);

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

    const participants = keyPersonnel.length > 0 ? keyPersonnel : legacyParticipants;

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

    return {
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
            plan.auditProgram?.site?.name ||
            plan.location ||
            "—",
        auditDate: form?.auditDate || planAuditDate,
        auditors: form?.auditors || leadAuditor || "—",
        auditees: form?.auditees || auditees || "—",
        scope: form?.auditScope || plan.scope || "—",
        criteriaAndMethod: form?.auditCriteriaAndMethod || defaultCriteriaAndMethod,
        executiveSummary,
        nonConformances,
        participants,
        issueDate: form?.issueDate || planIssueDate,
        acknowledgement: {
            auditeeSignature: form?.acknowledgement?.auditeeSignature || "",
            auditeeDate: form?.acknowledgement?.auditeeDate || "",
            auditorSignature: form?.acknowledgement?.auditorSignature || "",
            auditorDate: form?.acknowledgement?.auditorDate || "",
        },
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

function checkPage(doc: jsPDF, y: number, need: number, pageH: number): number {
    if (y + need > pageH - 20) {
        doc.addPage();
        return MARGIN;
    }
    return y;
}

function drawSzlPdfHeader(doc: jsPDF, logo: { dataUrl: string; ratio: number } | null, issueDate: string): number {
    const pageW = doc.internal.pageSize.getWidth();
    const colW = (pageW - MARGIN * 2) / 3;
    const topRowH = 10;
    const logoRowH = 32;
    let y = MARGIN;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    doc.rect(MARGIN, y, colW, topRowH);
    doc.rect(MARGIN + colW, y, colW, topRowH);
    doc.rect(MARGIN + colW * 2, y, colW, topRowH);
    doc.text(`Doc. Number: ${DOC_NUMBER}`, MARGIN + 3, y + 6.5);
    doc.text(`Title: ${REPORT_TITLE}`, MARGIN + colW + 3, y + 6.5);
    doc.text(`Revision No: ${REVISION_NO}`, MARGIN + colW * 2 + 3, y + 6.5);
    y += topRowH;

    doc.rect(MARGIN, y, colW, logoRowH);
    doc.rect(MARGIN + colW, y, colW, logoRowH);
    doc.rect(MARGIN + colW * 2, y, colW, logoRowH);

    if (logo) {
        const imgW = colW - 10;
        const imgH = Math.min(logoRowH - 6, imgW * logo.ratio);
        doc.addImage(logo.dataUrl, "PNG", MARGIN + 5, y + (logoRowH - imgH) / 2, imgW, imgH, undefined, "FAST");
    }

    doc.text(`Issue Date: ${issueDate}`, MARGIN + colW * 2 + 3, y + logoRowH / 2 + 2);
    return y + logoRowH + 8;
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

function pdfSubHeading(doc: jsPDF, title: string, y: number): number {
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.text(title, MARGIN, y);
    return y + 6;
}

function pdfBodyText(doc: jsPDF, text: string, y: number, pageW: number): number {
    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text || "—", pageW - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    return y + lines.length * 5 + 4;
}

function pdfDottedLine(doc: jsPDF, label: string, y: number, pageW: number): number {
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.text(label, MARGIN, y);
    const labelW = doc.getTextWidth(label);
    const dots = ".".repeat(Math.floor((pageW - MARGIN * 2 - labelW - 4) / 2.2));
    doc.setFont(FONT, "normal");
    doc.text(dots, MARGIN + labelW + 4, y);
    return y + 10;
}

async function renderSzlReportHeaderAndMetadataAsync(doc: jsPDF, ctx: ReportContext): Promise<number> {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = MARGIN;

    const logo = await loadSzlLogoBase64();
    y = drawSzlPdfHeader(doc, logo, ctx.issueDate);

    y = pdfSectionHeading(doc, "1. MANAGEMENT SYSTEM :", y);
    y = checkPage(doc, y, 40, pageH);
    autoTable(doc, {
        startY: y,
        body: [
            [`MANAGEMENT SYSTEM : ${ctx.managementSystem}`],
            [`DEPARTMENT : ${ctx.department}`],
            [`DATE OF AUDIT : ${ctx.auditDate}`],
            [`AUDITORS : ${ctx.auditors}`],
            [`AUDITEES : ${ctx.auditees}`],
        ],
        theme: "grid",
        styles: { font: FONT, fontSize: 10, cellPadding: 5, minCellHeight: 12 },
        margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    y = checkPage(doc, y, 30, pageH);
    y = pdfSectionHeading(doc, "2. AUDIT SCOPE:", y);
    y = pdfBodyText(doc, ctx.scope, y, pageW);

    y = checkPage(doc, y, 30, pageH);
    y = pdfSectionHeading(doc, "3. AUDIT CRITERIA AND METHOD:", y);
    y = pdfBodyText(doc, ctx.criteriaAndMethod, y, pageW);

    return y;
}

function renderSzlReportSummaryAndSignatures(doc: jsPDF, ctx: ReportContext, y: number): number {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    y = checkPage(doc, y, 40, pageH);
    y = pdfSectionHeading(doc, "5. AUDIT SUMMARY", y);

    y = pdfSubHeading(doc, "5.1 Summary of Non-conformities:", y);
    if (ctx.nonConformances.length > 0) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(10);
        doc.text("Number    Statement of nonconformity", MARGIN, y);
        y += 6;
        ctx.nonConformances.forEach((nc, idx) => {
            y = checkPage(doc, y, 12, pageH);
            const line = `${idx + 1}.    ${nc.statement}`;
            const wrapped = doc.splitTextToSize(line, pageW - MARGIN * 2);
            doc.text(wrapped, MARGIN, y);
            y += wrapped.length * 5 + 3;
        });
    } else {
        y = pdfBodyText(doc, "No non-conformities recorded.", y, pageW);
    }

    y = checkPage(doc, y, 20, pageH);
    y = pdfSubHeading(doc, "5.2 General comment on system implementation:", y);
    y = pdfBodyText(doc, ctx.executiveSummary || "—", y, pageW);

    y = checkPage(doc, y, 50, pageH);
    y = pdfSubHeading(doc, "5.3 Key personnel interviewed:", y);
    const participantRows =
        ctx.participants.length > 0
            ? ctx.participants.map((p) => [p.name, p.position, p.department])
            : Array.from({ length: 4 }, () => ["", "", ""]);
    autoTable(doc, {
        startY: y,
        head: [["Name", "Position", "Department"]],
        body: participantRows,
        theme: "grid",
        styles: { font: FONT, fontSize: 10, cellPadding: 4, minCellHeight: 10 },
        headStyles: { fontStyle: "bold", fillColor: [255, 255, 255], textColor: [0, 0, 0] },
        margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    y = checkPage(doc, y, 50, pageH);
    y = pdfSectionHeading(doc, "6. ACKNOWLEDGEMENT OF FINDINGS:", y);

    if (ctx.acknowledgement.auditeeSignature || ctx.acknowledgement.auditeeDate) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(10);
        if (ctx.acknowledgement.auditeeSignature.startsWith("data:image/")) {
            doc.text("Auditee Signature: ", MARGIN, y);
            const labelW = doc.getTextWidth("Auditee Signature: ");
            try {
                const format = ctx.acknowledgement.auditeeSignature.includes("image/jpeg") ? "JPEG" : "PNG";
                doc.addImage(ctx.acknowledgement.auditeeSignature, format, MARGIN + labelW, y - 8, 40, 12, undefined, "FAST");
            } catch (e) {
                console.error("Failed to add auditee signature image to PDF", e);
                doc.text("[Invalid Image]", MARGIN + labelW, y);
            }
            y += 12;
        } else {
            doc.text(`Auditee Signature: ${ctx.acknowledgement.auditeeSignature || "—"}`, MARGIN, y);
            y += 6;
        }
        doc.text(`Date: ${ctx.acknowledgement.auditeeDate || "—"}`, MARGIN, y);
        y += 10;
    } else {
        y = pdfDottedLine(doc, "Auditee Signature", y, pageW);
        y = pdfDottedLine(doc, "Date", y, pageW);
        y += 4;
    }

    if (ctx.acknowledgement.auditorSignature || ctx.acknowledgement.auditorDate) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(10);
        if (ctx.acknowledgement.auditorSignature.startsWith("data:image/")) {
            doc.text("Auditor Signature: ", MARGIN, y);
            const labelW = doc.getTextWidth("Auditor Signature: ");
            try {
                const format = ctx.acknowledgement.auditorSignature.includes("image/jpeg") ? "JPEG" : "PNG";
                doc.addImage(ctx.acknowledgement.auditorSignature, format, MARGIN + labelW, y - 8, 40, 12, undefined, "FAST");
            } catch (e) {
                console.error("Failed to add auditor signature image to PDF", e);
                doc.text("[Invalid Image]", MARGIN + labelW, y);
            }
            y += 12;
        } else {
            doc.text(`Auditor Signature: ${ctx.acknowledgement.auditorSignature || "—"}`, MARGIN, y);
            y += 6;
        }
        doc.text(`Date: ${ctx.acknowledgement.auditorDate || "—"}`, MARGIN, y);
        y += 6;
    } else {
        y = pdfDottedLine(doc, "Auditor Signature", y, pageW);
        y = pdfDottedLine(doc, "Date", y, pageW);
    }

    return y;
}

/** Full audit execution report as PDF */
export async function generateAuditReportPdf(plan: Record<string, any>) {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const template = auditTemplates.find((t) => t.id === plan.templateId);
    const auditData = getAuditData(plan);
    const fileName = auditReportBaseName(plan);
    const ctx = getReportContext(plan);

    let y = await renderSzlReportHeaderAndMetadataAsync(doc, ctx);

    const sectionHeading = (title: string, startY: number) => {
        if (startY > pageH - 40) {
            doc.addPage();
            startY = MARGIN;
        }
        doc.setFont(FONT, "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(title, MARGIN, startY);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, startY + 1.2, MARGIN + doc.getTextWidth(title), startY + 1.2);
        doc.setFont(FONT, "normal");
        return startY + 10;
    };

    const hasDetailedRecord =
        auditData.checklistData ||
        auditData.clauseData ||
        auditData.nonConformances ||
        auditData.opportunities ||
        auditData.processAudits ||
        collectReportEvidenceSources(auditData).length > 0;

    if (hasDetailedRecord) {
        y = sectionHeading("4. DETAILED AUDIT RECORD", y);
    }

    if (auditData.summaryCounts) {
        const sc = auditData.summaryCounts as Record<string, string | number>;
        autoTable(doc, {
            startY: y,
            head: [["Compliant", "OFI", "Minor NCR", "Major NCR", "Positive"]],
            body: [[sc.compliant ?? "0", sc.ofi ?? "0", sc.minor ?? "0", sc.major ?? "0", sc.positive ?? "0"]],
            theme: "grid",
            styles: { font: FONT, fontSize: 9 },
            margin: { left: MARGIN, right: MARGIN },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    const clauseFilesForReport = sanitizeAuditEvidenceMediaMap(
        auditData.clauseFiles as Record<string, AuditEvidenceMedia[]> | undefined,
    );
    const genericFilesForReport = sanitizeAuditEvidenceMediaMap(
        auditData.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined,
    );

    if (auditData.checklistData && template?.content) {
        const checklistRows: string[][] = [];
        Object.entries(auditData.checklistData as Record<string, any>)
            .filter(([, v]) => v?.findings)
            .forEach(([idx, v]) => {
                const itemIndex = Number(idx);
                const item = (template.content as ChecklistContent[])[itemIndex];
                const clauseKey = item?.clause || String(idx);
                const attached = collectAuditEvidenceMedia(clauseFilesForReport, genericFilesForReport, clauseKey, {
                    checklistIndex: itemIndex,
                });
                const photoCount = attached.filter((m) => m.type.startsWith("image/")).length;
                const pdfCount = attached.filter((m) => m.type === "application/pdf").length;
                const attachmentNote = [
                    photoCount > 0 ? `${photoCount} photo(s)` : "",
                    pdfCount > 0 ? `${pdfCount} PDF(s)` : "",
                ]
                    .filter(Boolean)
                    .join(", ");
                const evidenceText = [v.evidence || "", attachmentNote ? `[${attachmentNote}]` : ""].filter(Boolean).join(" ");
                const detailsParts = [
                    v.description ? `Details: ${v.description}` : "",
                    v.correction ? `Correction: ${v.correction}` : "",
                    v.rootCause ? `Root Cause: ${v.rootCause}` : "",
                    v.correctiveAction ? `Corrective Action: ${v.correctiveAction}` : "",
                ].filter(Boolean).join("\n");
                const detailsText = detailsParts || "—";
                checklistRows.push([clauseKey, item?.question || "—", v.findings, evidenceText, detailsText]);
            });
        if (checklistRows.length > 0) {
            y = checkPage(doc, y, 20, pageH);
            y = sectionHeading("Checklist Findings", y);
            autoTable(doc, {
                startY: y,
                head: [["Clause", "Question", "Finding", "Evidence", "Details"]],
                body: checklistRows,
                styles: { font: FONT, fontSize: 8, overflow: "linebreak" },
                margin: { left: MARGIN, right: MARGIN },
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
            const attached = collectAuditEvidenceMedia(clauseFilesForReport, genericFilesForReport, clauseKey);
            const photoCount = attached.filter((m) => m.type.startsWith("image/")).length;
            const pdfCount = attached.filter((m) => m.type === "application/pdf").length;
            const attachmentNote = [
                photoCount > 0 ? `${photoCount} photo(s)` : "",
                pdfCount > 0 ? `${pdfCount} PDF(s)` : "",
            ]
                .filter(Boolean)
                .join(", ");
            const evidenceText = [v.evidence || "", attachmentNote ? `[${attachmentNote}]` : ""].filter(Boolean).join(" ");
            const detailsParts = [
                v.description ? `Details: ${v.description}` : "",
                v.correction ? `Correction: ${v.correction}` : "",
                v.rootCause ? `Root Cause: ${v.rootCause}` : "",
                v.correctiveAction ? `Corrective Action: ${v.correctiveAction}` : "",
            ].filter(Boolean).join("\n");
            const detailsText = detailsParts || "—";
            const requirement = [item.title, ...(item.subClauses || [])].filter(Boolean).join('\n');
            checklistRows.push([clauseKey, requirement, v.findingType, evidenceText, detailsText]);
        });
        if (checklistRows.length > 0) {
            y = checkPage(doc, y, 20, pageH);
            y = sectionHeading("Checklist Findings", y);
            autoTable(doc, {
                startY: y,
                head: [["Clause", "Requirement", "Finding", "Evidence", "Details"]],
                body: checklistRows,
                styles: { font: FONT, fontSize: 8, overflow: "linebreak" },
                margin: { left: MARGIN, right: MARGIN },
                theme: "grid",
            });
            y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
    }

    if (template?.type === "process-audit" && auditData.processAudits) {
        const processRows: string[][] = [];
        (auditData.processAudits as ProcessAuditContent[]).forEach((audit, index) => {
            if (!audit.findingType) return;
            const detailsParts = [
                audit.description ? `Details: ${audit.description}` : "",
                audit.correction ? `Correction: ${audit.correction}` : "",
                audit.rootCause ? `Root Cause: ${audit.rootCause}` : "",
                audit.correctiveAction ? `Corrective Action: ${audit.correctiveAction}` : "",
            ].filter(Boolean).join("\n");
            const detailsText = detailsParts || "—";
            processRows.push([
                String(index + 1),
                audit.processArea || "—",
                audit.auditees || "—",
                audit.evidence || "—",
                audit.conclusion || "—",
                audit.findingType,
                detailsText,
            ]);
        });
        if (processRows.length > 0) {
            y = checkPage(doc, y, 20, pageH);
            y = sectionHeading("Process Audit Record", y);
            autoTable(doc, {
                startY: y,
                head: [["No.", "Process Area", "Auditee(s)", "Evidence", "Conclusion", "Finding", "Details"]],
                body: processRows,
                styles: { font: FONT, fontSize: 8, overflow: "linebreak" },
                margin: { left: MARGIN, right: MARGIN },
                theme: "grid",
            });
            y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        }
    }

    const opportunities = ((auditData.opportunities as any[]) || []).filter((o) => o.opportunity);
    if (opportunities.length > 0) {
        y = checkPage(doc, y, 20, pageH);
        y = sectionHeading("Opportunities for Improvement", y);
        autoTable(doc, {
            startY: y,
            head: [["ID", "Clause", "Area", "Opportunity"]],
            body: opportunities.map((o) => [o.id, o.standardClause || "—", o.areaProcess || "—", o.opportunity || "—"]),
            styles: { font: FONT, fontSize: 8 },
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }

    const evidenceSources = collectReportEvidenceSources(auditData);
    const pdfImages = await prepareReportEvidenceImages(evidenceSources);
    const contentWidthMm = pageW - MARGIN * 2;

    if (pdfImages.length > 0) {
        y = checkPage(doc, y, 20, pageH);
        y = sectionHeading("Evidence & Uploaded Files", y);
        for (const img of pdfImages) {
            const isPdfPreview = img.context.includes("— PDF");
            const { w, h } = reportImageDisplayMm(img.widthPx, img.heightPx, contentWidthMm, isPdfPreview ? 120 : 85);
            y = checkPage(doc, y, h + 14, pageH);
            doc.setFont(FONT, "bold");
            doc.setFontSize(9);
            doc.text(`${img.context} — ${img.name}`, MARGIN, y);
            y += 5;
            try {
                doc.addImage(img.dataUrl, img.format, MARGIN, y, w, h, undefined, "FAST");
                y += h + 6;
            } catch {
                y += 8;
            }
        }
    }

    // Now render 5. AUDIT SUMMARY and 6. ACKNOWLEDGEMENT OF FINDINGS (Signatures)
    y = renderSzlReportSummaryAndSignatures(doc, ctx, y);

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont(FONT, "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.line(MARGIN, pageH - 12, pageW - MARGIN, pageH - 12);
        doc.text(`${DOC_NUMBER} — ${REPORT_TITLE}`, MARGIN, pageH - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageW - MARGIN, pageH - 7, { align: "right" });
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

function docxSubHeading(text: string) {
    return new Paragraph({
        children: [new TextRun({ text, bold: true })],
        spacing: { before: 160, after: 120 },
    });
}

/** Full audit execution report as Word */
export async function generateAuditReportDocx(plan: Record<string, any>) {
    const auditData = getAuditData(plan);
    const fileName = auditReportBaseName(plan);
    const ctx = getReportContext(plan);
    const template = auditTemplates.find((t) => t.id === plan.templateId);
    const logoBuffer = await loadSzlLogoBuffer();
    const children: (Paragraph | DocxTable)[] = [];

    const headerRow1 = new DocxTableRow({
        children: [
            docxBorderedCell([new Paragraph(`Doc. Number: ${DOC_NUMBER}`)]),
            docxBorderedCell([new Paragraph(`Title: ${REPORT_TITLE}`)]),
            docxBorderedCell([new Paragraph(`Revision No: ${REVISION_NO}`)]),
        ],
    });

    const logoParagraphs: Paragraph[] = logoBuffer
        ? [new Paragraph({ children: [new ImageRun({ data: logoBuffer, transformation: { width: 180, height: 103 } })] })]
        : [new Paragraph("")];

    const headerRow2 = new DocxTableRow({
        children: [
            docxBorderedCell(logoParagraphs),
            docxBorderedCell([new Paragraph("")]),
            docxBorderedCell([new Paragraph(`Issue Date: ${ctx.issueDate}`)]),
        ],
    });

    children.push(
        new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow1, headerRow2],
        }),
    );

    children.push(docxSectionHeading("1. MANAGEMENT SYSTEM :"));
    children.push(
        new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocxTableRow({ children: [docxBorderedCell([new Paragraph(`MANAGEMENT SYSTEM : ${ctx.managementSystem}`)], 100)] }),
                new DocxTableRow({ children: [docxBorderedCell([new Paragraph(`DEPARTMENT : ${ctx.department}`)], 100)] }),
                new DocxTableRow({ children: [docxBorderedCell([new Paragraph(`DATE OF AUDIT : ${ctx.auditDate}`)], 100)] }),
                new DocxTableRow({ children: [docxBorderedCell([new Paragraph(`AUDITORS : ${ctx.auditors}`)], 100)] }),
                new DocxTableRow({ children: [docxBorderedCell([new Paragraph(`AUDITEES : ${ctx.auditees}`)], 100)] }),
            ],
        }),
    );

    children.push(docxSectionHeading("2. AUDIT SCOPE:"));
    children.push(new Paragraph({ text: ctx.scope, spacing: { after: 200 } }));

    children.push(docxSectionHeading("3. AUDIT CRITERIA AND METHOD:"));
    children.push(new Paragraph({ text: ctx.criteriaAndMethod, spacing: { after: 200 } }));

    // --- 4. DETAILED AUDIT RECORD & EVIDENCE ---
    const evidenceSources = collectReportEvidenceSources(auditData);
    const wordImages = await prepareReportEvidenceImages(evidenceSources);
    const hasDetailedRecord =
        auditData.checklistData ||
        auditData.clauseData ||
        auditData.processAudits ||
        wordImages.length > 0;

    if (hasDetailedRecord) {
        children.push(docxSectionHeading("4. DETAILED AUDIT RECORD"));

        // Checklist / Clause Checklist Table / Process Audit Record Table
        if (template?.type === "checklist" && auditData.checklistData) {
            const rows: DocxTableRow[] = [
                new DocxTableRow({
                    children: [
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Clause", bold: true })] })], 10),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Question", bold: true })] })], 35),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Finding", bold: true })] })], 10),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Evidence", bold: true })] })], 20),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Details", bold: true })] })], 25),
                    ],
                }),
            ];

            Object.entries(auditData.checklistData as Record<string, any>)
                .filter(([, v]) => v?.findings)
                .forEach(([idx, v]) => {
                    const itemIndex = Number(idx);
                    const item = (template.content as ChecklistContent[])[itemIndex];
                    const clauseKey = item?.clause || String(idx);
                    
                    const detailsParts = [
                        v.description ? `Details: ${v.description}` : "",
                        v.correction ? `Correction: ${v.correction}` : "",
                        v.rootCause ? `Root Cause: ${v.rootCause}` : "",
                        v.correctiveAction ? `Corrective Action: ${v.correctiveAction}` : "",
                    ].filter(Boolean);
                    const detailsParagraphs = detailsParts.length > 0
                        ? detailsParts.map(line => new Paragraph({ children: [new TextRun({ text: line })] }))
                        : [new Paragraph("—")];

                    rows.push(
                        new DocxTableRow({
                            children: [
                                docxBorderedCell([new Paragraph(clauseKey)], 10),
                                docxBorderedCell([new Paragraph(item?.question || "—")], 35),
                                docxBorderedCell([new Paragraph(v.findings || "—")], 10),
                                docxBorderedCell([new Paragraph(v.evidence || "—")], 20),
                                docxBorderedCell(detailsParagraphs, 25),
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
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Clause", bold: true })] })], 10),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Requirement", bold: true })] })], 35),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Finding", bold: true })] })], 10),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Evidence", bold: true })] })], 20),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Details", bold: true })] })], 25),
                    ],
                }),
            ];

            (template.content as ClauseChecklistContent[]).forEach((item) => {
                const v = auditData.clauseData[item.clauseId];
                if (!v || !v.findingType) return;
                const clauseKey = item.clauseId;
                const requirement = [item.title, ...(item.subClauses || [])].filter(Boolean).join('\n');
                
                const detailsParts = [
                    v.description ? `Details: ${v.description}` : "",
                    v.correction ? `Correction: ${v.correction}` : "",
                    v.rootCause ? `Root Cause: ${v.rootCause}` : "",
                    v.correctiveAction ? `Corrective Action: ${v.correctiveAction}` : "",
                ].filter(Boolean);
                const detailsParagraphs = detailsParts.length > 0
                    ? detailsParts.map(line => new Paragraph({ children: [new TextRun({ text: line })] }))
                    : [new Paragraph("—")];

                rows.push(
                    new DocxTableRow({
                        children: [
                            docxBorderedCell([new Paragraph(clauseKey)], 10),
                            docxBorderedCell([new Paragraph(requirement)], 35),
                            docxBorderedCell([new Paragraph(v.findingType || "—")], 10),
                            docxBorderedCell([new Paragraph(v.evidence || "—")], 20),
                            docxBorderedCell(detailsParagraphs, 25),
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
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "No.", bold: true })] })], 5),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Process Area", bold: true })] })], 15),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Auditee(s)", bold: true })] })], 15),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Evidence", bold: true })] })], 20),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Conclusion", bold: true })] })], 15),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Finding", bold: true })] })], 10),
                        docxBorderedCell([new Paragraph({ children: [new TextRun({ text: "Details", bold: true })] })], 20),
                    ],
                }),
            ];

            (auditData.processAudits as ProcessAuditContent[]).forEach((audit, index) => {
                if (!audit.findingType) return;
                
                const detailsParts = [
                    audit.description ? `Details: ${audit.description}` : "",
                    audit.correction ? `Correction: ${audit.correction}` : "",
                    audit.rootCause ? `Root Cause: ${audit.rootCause}` : "",
                    audit.correctiveAction ? `Corrective Action: ${audit.correctiveAction}` : "",
                ].filter(Boolean);
                const detailsParagraphs = detailsParts.length > 0
                    ? detailsParts.map(line => new Paragraph({ children: [new TextRun({ text: line })] }))
                    : [new Paragraph("—")];

                rows.push(
                    new DocxTableRow({
                        children: [
                            docxBorderedCell([new Paragraph(String(index + 1))], 5),
                            docxBorderedCell([new Paragraph(audit.processArea || "—")], 15),
                            docxBorderedCell([new Paragraph(audit.auditees || "—")], 15),
                            docxBorderedCell([new Paragraph(audit.evidence || "—")], 20),
                            docxBorderedCell([new Paragraph(audit.conclusion || "—")], 15),
                            docxBorderedCell([new Paragraph(audit.findingType || "—")], 10),
                            docxBorderedCell(detailsParagraphs, 20),
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
        if (wordImages.length > 0) {
            children.push(docxSubHeading("Evidence & Uploaded Files"));
            for (const img of wordImages) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `${img.context} — ${img.name}`, bold: true })],
                        spacing: { before: 160, after: 80 },
                    }),
                );
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

    // --- 5. AUDIT SUMMARY ---
    children.push(docxSectionHeading("5. AUDIT SUMMARY"));
    children.push(docxSubHeading("5.1 Summary of Non-conformities:"));
    if (ctx.nonConformances.length > 0) {
        children.push(new Paragraph({ text: "Number    Statement of nonconformity", spacing: { after: 100 } }));
        ctx.nonConformances.forEach((nc, idx) => {
            children.push(new Paragraph({ text: `${idx + 1}.    ${nc.statement}`, spacing: { after: 80 } }));
        });
    } else {
        children.push(new Paragraph({ text: "No non-conformities recorded.", spacing: { after: 120 } }));
    }

    children.push(docxSubHeading("5.2 General comment on system implementation:"));
    children.push(new Paragraph({ text: ctx.executiveSummary || "—", spacing: { after: 200 } }));

    children.push(docxSubHeading("5.3 Key personnel interviewed:"));
    const participantRows =
        ctx.participants.length > 0
            ? ctx.participants
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
                            children: [p.name, p.position, p.department].map((v) => docxBorderedCell([new Paragraph(v || "")])),
                        }),
                ),
            ],
        }),
    );

    // --- 6. ACKNOWLEDGEMENT OF FINDINGS ---
    children.push(docxSectionHeading("6. ACKNOWLEDGEMENT OF FINDINGS:"));

    if (ctx.acknowledgement.auditeeSignature || ctx.acknowledgement.auditeeDate) {
        if (ctx.acknowledgement.auditeeSignature.startsWith("data:image/")) {
            try {
                const buffer = dataUrlToUint8Array(ctx.acknowledgement.auditeeSignature);
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Auditee Signature: " }),
                            new ImageRun({ data: buffer, transformation: { width: 120, height: 45 } })
                        ],
                        spacing: { after: 120 },
                    }),
                );
            } catch (e) {
                console.error("Failed to add auditee signature image to DOCX", e);
                children.push(
                    new Paragraph({
                        text: "Auditee Signature: [Invalid Image]",
                        spacing: { after: 120 },
                    }),
                );
            }
        } else {
            children.push(
                new Paragraph({
                    text: `Auditee Signature: ${ctx.acknowledgement.auditeeSignature || "—"}`,
                    spacing: { after: 120 },
                }),
            );
        }
        children.push(
            new Paragraph({
                text: `Date: ${ctx.acknowledgement.auditeeDate || "—"}`,
                spacing: { after: 200 },
            }),
        );
    } else {
        children.push(new Paragraph({ text: "Auditee Signature .................................................................", spacing: { after: 120 } }));
        children.push(new Paragraph({ text: "Date .................................................", spacing: { after: 200 } }));
    }

    if (ctx.acknowledgement.auditorSignature || ctx.acknowledgement.auditorDate) {
        if (ctx.acknowledgement.auditorSignature.startsWith("data:image/")) {
            try {
                const buffer = dataUrlToUint8Array(ctx.acknowledgement.auditorSignature);
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Auditor Signature: " }),
                            new ImageRun({ data: buffer, transformation: { width: 120, height: 45 } })
                        ],
                        spacing: { after: 120 },
                    }),
                );
            } catch (e) {
                console.error("Failed to add auditor signature image to DOCX", e);
                children.push(
                    new Paragraph({
                        text: "Auditor Signature: [Invalid Image]",
                        spacing: { after: 120 },
                    }),
                );
            }
        } else {
            children.push(
                new Paragraph({
                    text: `Auditor Signature: ${ctx.acknowledgement.auditorSignature || "—"}`,
                    spacing: { after: 120 },
                }),
            );
        }
        children.push(
            new Paragraph({
                text: `Date: ${ctx.acknowledgement.auditorDate || "—"}`,
                spacing: { after: 300 },
            }),
        );
    } else {
        children.push(new Paragraph({ text: "Auditor Signature .................................................................", spacing: { after: 120 } }));
        children.push(new Paragraph({ text: "Date .................................................", spacing: { after: 300 } }));
    }

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                    },
                },
                children,
            },
        ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
}

/** Full audit execution report as Excel */
export function generateAuditReportExcel(plan: Record<string, any>) {
    const template = auditTemplates.find((t) => t.id === plan.templateId);
    const auditData = getAuditData(plan);
    const fileName = auditReportBaseName(plan);
    const ctx = getReportContext(plan);
    const wb = XLSX.utils.book_new();

    const summaryData = [
        ["Field", "Value"],
        ["Document No.", DOC_NUMBER],
        ["Report Title", REPORT_TITLE],
        ["Revision", REVISION_NO],
        ["Issue Date", ctx.issueDate],
        ["Audit Name", plan.auditName || plan.auditType || "N/A"],
        ["Management System", ctx.managementSystem],
        ["Department", ctx.department],
        ["Audit Date", ctx.auditDate],
        ["Auditors", ctx.auditors],
        ["Auditees", ctx.auditees],
        ["Scope", ctx.scope],
        ["Criteria & Method", ctx.criteriaAndMethod],
        ["Template", template?.title || plan.templateId || "N/A"],
        ["Status", plan.status || "N/A"],
        ["Saved Progress", `${auditData.progress ?? plan.progress ?? 0}%`],
    ];
    if (ctx.executiveSummary) summaryData.push(["General Comment", ctx.executiveSummary]);
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
        const cData = [["Clause", "Question", "Finding", "Evidence", "Details", "Correction", "Root Cause", "Corrective Action"]];
        Object.entries(auditData.checklistData as Record<string, any>)
            .filter(([, v]) => v.findings)
            .forEach(([idx, v]) => {
                const itemIndex = Number(idx);
                const item = (template.content as ChecklistContent[])[itemIndex];
                const clauseKey = item?.clause || String(idx);
                cData.push([
                    clauseKey,
                    item?.question || "-",
                    v.findings,
                    v.evidence || "",
                    v.description || "",
                    v.correction || "",
                    v.rootCause || "",
                    v.correctiveAction || ""
                ]);
            });
        if (cData.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cData), "Checklist");
    }

    if (template?.type === "clause-checklist" && auditData.clauseData) {
        const cData = [["Clause", "Requirement", "Finding", "Evidence", "Details", "Correction", "Root Cause", "Corrective Action"]];
        (template.content as ClauseChecklistContent[]).forEach((item) => {
            const v = auditData.clauseData[item.clauseId];
            if (!v || !v.findingType) return;
            const requirement = [item.title, ...(item.subClauses || [])].filter(Boolean).join('\n');
            cData.push([
                item.clauseId,
                requirement,
                v.findingType,
                v.evidence || "",
                v.description || "",
                v.correction || "",
                v.rootCause || "",
                v.correctiveAction || ""
            ]);
        });
        if (cData.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cData), "Checklist");
    }

    if (template?.type === "process-audit" && auditData.processAudits) {
        const cData = [["No.", "Process Area", "Auditee(s)", "Evidence", "Conclusion", "Finding", "Details", "Correction", "Root Cause", "Corrective Action"]];
        (auditData.processAudits as ProcessAuditContent[]).forEach((audit, index) => {
            if (!audit.findingType) return;
            cData.push([
                String(index + 1),
                audit.processArea || "",
                audit.auditees || "",
                audit.evidence || "",
                audit.conclusion || "",
                audit.findingType,
                audit.description || "",
                audit.correction || "",
                audit.rootCause || "",
                audit.correctiveAction || ""
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
    generateAuditReportExcel(plan);
}
