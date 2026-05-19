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
} from "docx";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { auditTemplates, ChecklistContent } from "@/data/auditTemplates";

const PRIMARY_COLOR = "213847";
const DARK_RGB: [number, number, number] = [33, 56, 71];

export function getAuditData(plan: { auditData?: unknown }) {
    if (!plan.auditData) return {};
    return typeof plan.auditData === "string" ? JSON.parse(plan.auditData) : (plan.auditData as Record<string, unknown>);
}

export function auditReportBaseName(plan: { auditName?: string; id?: number }) {
    return `Audit_Report_${(plan.auditName || "Audit").replace(/[^a-z0-9]/gi, "_") || plan.id}`;
}

async function loadLogoBase64(): Promise<string | null> {
    try {
        const response = await fetch("/iAudit Global-01.png");
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 120;
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                    if (width > height) {
                        height = Math.round((height * MAX) / width);
                        width = MAX;
                    } else {
                        width = Math.round((width * MAX) / height);
                        height = MAX;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d")!;
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    } catch {
        return null;
    }
}

async function loadLogoBuffer(): Promise<ArrayBuffer | null> {
    try {
        const response = await fetch("/iAudit Global-01.png");
        const blob = await response.blob();
        return await new Promise<ArrayBuffer>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 120;
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                    if (width > height) {
                        height = Math.round((height * MAX) / width);
                        width = MAX;
                    } else {
                        width = Math.round((width * MAX) / height);
                        height = MAX;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d")!;
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((compressedBlob) => {
                    if (compressedBlob) compressedBlob.arrayBuffer().then(resolve).catch(reject);
                    else reject(new Error("Canvas toBlob returned null"));
                }, "image/png");
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    } catch {
        return null;
    }
}

/** Full audit execution report as PDF */
export async function generateAuditReportPdf(plan: Record<string, any>) {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const MARGIN = 20;
    const CONTENT_WIDTH = pageW - MARGIN * 2;
    const template = auditTemplates.find((t) => t.id === plan.templateId);
    const auditData = getAuditData(plan);
    const fileName = auditReportBaseName(plan);

    const logo = await loadLogoBase64();
    let y = margin;
    if (logo) {
        doc.addImage(logo, "PNG", pageW / 2 - 12, y, 24, 24, undefined, "FAST");
        y += 30;
    }

    doc.setFillColor(...DARK_RGB);
    doc.rect(0, y, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AUDIT REPORT", MARGIN, y + 9);
    doc.setFont("helvetica", "normal");
    y += 22;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(plan.auditName || plan.auditType || "Audit", MARGIN, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, y);
    y += 10;

    const section = (title: string, startY: number) => {
        if (startY > pageH - 40) {
            doc.addPage();
            startY = margin;
        }
        doc.setFillColor(...DARK_RGB);
        doc.rect(margin, startY, pageW - margin * 2, 8, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 3, startY + 5.5);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        return startY + 12;
    };

    y = section("AUDIT INFORMATION", y);
    autoTable(doc, {
        startY: y,
        body: [
            ["Audit Name", plan.auditName || plan.auditType || "—"],
            ["Template", template?.title || plan.templateId || "—"],
            ["Status", plan.status || "—"],
            ["Date", plan.date ? format(new Date(plan.date), "yyyy-MM-dd") : "TBD"],
            ["Location", plan.auditProgram?.site?.name || plan.location || "—"],
            [
                "Lead Auditor",
                plan.leadAuditor
                    ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}`
                    : "—",
            ],
            ["Criteria", plan.criteria || "—"],
            ["Scope", plan.scope || "—"],
            ["Objective", plan.objective || "—"],
            ["Progress", `${plan.progress ?? auditData.progress ?? 0}%`],
        ],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: "bold", fillColor: [240, 243, 246], cellWidth: 45 } },
        margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    const itinerary = plan.itinerary
        ? typeof plan.itinerary === "string"
            ? JSON.parse(plan.itinerary)
            : plan.itinerary
        : [];
    if (Array.isArray(itinerary) && itinerary.length > 0) {
        y = section("AUDIT ITINERARY", y);
        autoTable(doc, {
            startY: y,
            head: [["Time", "Activity", "Auditee / Dept"]],
            body: itinerary.map((item: any) => [
                `${item.startTime || ""} - ${item.endTime || ""}`,
                item.activity || "",
                item.auditee || item.notes || "",
            ]),
            headStyles: { fillColor: DARK_RGB, fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            margin: { left: margin, right: margin },
            theme: "grid",
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (auditData.executiveSummary) {
        y = section("EXECUTIVE SUMMARY", y);
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(String(auditData.executiveSummary), CONTENT_WIDTH);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 8;
    }

    if (auditData.summaryCounts) {
        const sc = auditData.summaryCounts as Record<string, string | number>;
        y = section("FINDINGS SUMMARY", y);
        autoTable(doc, {
            startY: y,
            head: [["Compliant", "OFI", "Minor NCR", "Major NCR", "Positive"]],
            body: [
                [
                    sc.compliant ?? "0",
                    sc.ofi ?? "0",
                    sc.minor ?? "0",
                    sc.major ?? "0",
                    sc.positive ?? "0",
                ],
            ],
            headStyles: { fillColor: [16, 185, 129], fontSize: 9 },
            margin: { left: margin, right: margin },
            theme: "grid",
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    const participants = (auditData.participants as any[]) || [];
    if (participants.length > 0) {
        y = section("AUDIT PARTICIPANTS", y);
        autoTable(doc, {
            startY: y,
            head: [["Name", "Position", "Opening", "Closing", "Interviewed"]],
            body: participants.map((p) => [
                p.name || "—",
                p.position || "—",
                p.opening ? "Yes" : "No",
                p.closing ? "Yes" : "No",
                p.interviewed || "—",
            ]),
            headStyles: { fillColor: DARK_RGB, fontSize: 9 },
            margin: { left: margin, right: margin },
            theme: "grid",
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    const nonConformances = ((auditData.nonConformances as any[]) || []).filter((nc) => nc.statement);
    if (nonConformances.length > 0) {
        y = section("NON-CONFORMANCES", y);
        autoTable(doc, {
            startY: y,
            head: [["ID", "Clause", "Area", "Statement", "Due Date"]],
            body: nonConformances.map((nc) => [
                nc.id,
                nc.standardClause || "—",
                nc.areaProcess || "—",
                nc.statement || "—",
                nc.dueDate || "—",
            ]),
            headStyles: { fillColor: [239, 68, 68], fontSize: 8 },
            bodyStyles: { fontSize: 8, overflow: "linebreak" },
            margin: { left: margin, right: margin },
            theme: "grid",
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    const opportunities = ((auditData.opportunities as any[]) || []).filter((o) => o.opportunity);
    if (opportunities.length > 0) {
        y = section("OPPORTUNITIES FOR IMPROVEMENT", y);
        autoTable(doc, {
            startY: y,
            head: [["ID", "Clause", "Area", "Opportunity"]],
            body: opportunities.map((o) => [
                o.id,
                o.standardClause || "—",
                o.areaProcess || "—",
                o.opportunity || "—",
            ]),
            headStyles: { fillColor: [245, 158, 11], fontSize: 8 },
            margin: { left: margin, right: margin },
            theme: "grid",
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (auditData.checklistData && template?.content) {
        const checklistRows: string[][] = [];
        Object.entries(auditData.checklistData as Record<string, any>)
            .filter(([, v]) => v?.findings)
            .forEach(([idx, v]) => {
                const item = (template.content as ChecklistContent[])[Number(idx)];
                checklistRows.push([
                    item?.clause || idx,
                    item?.question || "—",
                    v.findings,
                    v.evidence || "",
                    v.description || "",
                ]);
            });
        if (checklistRows.length > 0) {
            y = section("CHECKLIST FINDINGS", y);
            autoTable(doc, {
                startY: y,
                head: [["Clause", "Question", "Finding", "Evidence", "Details"]],
                body: checklistRows,
                headStyles: { fillColor: DARK_RGB, fontSize: 8 },
                bodyStyles: { fontSize: 7, overflow: "linebreak" },
                margin: { left: margin, right: margin },
                theme: "grid",
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }
    }

    const processAudits = ((auditData.processAudits as any[]) || []).filter((pa) => pa.processArea);
    if (processAudits.length > 0) {
        y = section("PROCESS AUDITS", y);
        autoTable(doc, {
            startY: y,
            head: [["Process Area", "Auditees", "Evidence", "Conclusion"]],
            body: processAudits.map((pa) => [
                pa.processArea || "—",
                pa.auditees || "—",
                pa.evidence || "—",
                pa.conclusion || "—",
            ]),
            headStyles: { fillColor: DARK_RGB, fontSize: 8 },
            margin: { left: margin, right: margin },
            theme: "grid",
        });
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        doc.text(`${plan.auditName || "Audit"} Report`, margin, pageH - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 7, { align: "right" });
    }

    doc.save(`${fileName}.pdf`);
}

/** Full audit execution report as Word */
export async function generateAuditReportDocx(plan: Record<string, any>) {
    const template = auditTemplates.find((t) => t.id === plan.templateId);
    const auditData = getAuditData(plan);
    const fileName = auditReportBaseName(plan);
    const logoBuffer = await loadLogoBuffer();

    const children: any[] = [];
    const MARGIN_TWIPS = 1440;

    if (logoBuffer) {
        children.push(
            new Paragraph({
                children: [new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 60 } })],
                spacing: { after: 200 },
            })
        );
    }

    const heading = (text: string, color = PRIMARY_COLOR) =>
        new Paragraph({
            children: [new TextRun({ text, bold: true, size: 28, color })],
            spacing: { before: 400, after: 200 },
        });

    const kv = (label: string, value: string) =>
        new Paragraph({
            children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value || "N/A")],
            spacing: { after: 120 },
        });

    const kvTwoLine = (label: string, value: string) => [
        new Paragraph({
            children: [new TextRun({ text: `${label}:`, bold: true })],
            spacing: { before: 200 },
        }),
        new Paragraph({
            children: [new TextRun(value || "N/A")],
            spacing: { after: 200 },
        }),
    ];

    children.push(
        new Paragraph({
            children: [new TextRun({ text: "AUDIT REPORT", bold: true, size: 40, color: PRIMARY_COLOR })],
            spacing: { after: 400 },
        }),
        kv("Audit Name", plan.auditName || plan.auditType),
        kv("Status", plan.status || "—"),
        kv("Date", plan.date ? new Date(plan.date).toLocaleDateString() : "TBD"),
        kv("Location", plan.auditProgram?.site?.name || plan.location),
        kv(
            "Lead Auditor",
            plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : "-"
        ),
        kv("Criteria", plan.criteria),
        ...kvTwoLine("Scope", plan.scope),
        ...kvTwoLine("Objective", plan.objective)
    );

    const itinerary = plan.itinerary
        ? typeof plan.itinerary === "string"
            ? JSON.parse(plan.itinerary)
            : plan.itinerary
        : [];
    if (Array.isArray(itinerary) && itinerary.length > 0) {
        children.push(heading("Audit Itinerary"));
        const tableRows = [
            new DocxTableRow({
                children: [
                    new DocxTableCell({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: "Time", bold: true, color: "ffffff" })],
                            }),
                        ],
                        shading: { fill: PRIMARY_COLOR },
                    }),
                    new DocxTableCell({
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: "Activity", bold: true, color: "ffffff" })],
                            }),
                        ],
                        shading: { fill: PRIMARY_COLOR },
                    }),
                    new DocxTableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Auditee / Dept", bold: true, color: "ffffff" }),
                                ],
                            }),
                        ],
                        shading: { fill: PRIMARY_COLOR },
                    }),
                ],
            }),
            ...itinerary.map(
                (item: any) =>
                    new DocxTableRow({
                        children: [
                            new DocxTableCell({
                                children: [
                                    new Paragraph(`${item.startTime || ""} - ${item.endTime || ""}`),
                                ],
                            }),
                            new DocxTableCell({ children: [new Paragraph(item.activity || "")] }),
                            new DocxTableCell({
                                children: [new Paragraph(item.auditee || item.notes || "")],
                            }),
                        ],
                    })
            ),
        ];
        children.push(
            new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows,
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 2 },
                    bottom: { style: BorderStyle.SINGLE, size: 2 },
                    left: { style: BorderStyle.SINGLE, size: 2 },
                    right: { style: BorderStyle.SINGLE, size: 2 },
                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                    insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                },
            })
        );
    }

    if (auditData.executiveSummary) {
        children.push(heading("Executive Summary"));
        children.push(new Paragraph({ text: String(auditData.executiveSummary), spacing: { after: 200 } }));
    }

    if (auditData.nonConformances) {
        const ncs = (auditData.nonConformances as any[]).filter((nc) => nc.statement);
        if (ncs.length > 0) {
            children.push(heading("Non-Conformances", "DC2626"));
            ncs.forEach((nc) => {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${nc.id} (${nc.standardClause || ""}): `, bold: true }),
                            new TextRun(nc.statement),
                        ],
                        bullet: { level: 0 },
                        spacing: { after: 100 },
                    })
                );
            });
        }
    }

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: MARGIN_TWIPS,
                            right: MARGIN_TWIPS,
                            bottom: MARGIN_TWIPS,
                            left: MARGIN_TWIPS,
                        },
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
    const wb = XLSX.utils.book_new();

    const summaryData = [
        ["Field", "Value"],
        ["Audit Name", plan.auditName || plan.auditType || "N/A"],
        ["Template", template?.title || plan.templateId || "N/A"],
        ["Status", plan.status || "N/A"],
        ["Date", plan.date ? new Date(plan.date).toLocaleDateString() : "TBD"],
        ["Location", plan.auditProgram?.site?.name || plan.location || "N/A"],
        [
            "Lead Auditor",
            plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : "-",
        ],
        ["Scope", plan.scope || "N/A"],
        ["Objective", plan.objective || "N/A"],
        ["Saved Progress", `${auditData.progress ?? plan.progress ?? 0}%`],
        ["Last Saved", auditData.lastSaved ? new Date(String(auditData.lastSaved)).toLocaleString() : "Never"],
    ];
    if (auditData.executiveSummary) summaryData.push(["Executive Summary", String(auditData.executiveSummary)]);
    if (auditData.summaryCounts) {
        const sc = auditData.summaryCounts as Record<string, string | number>;
        summaryData.push(["Major NCs", sc.major || "0"]);
        summaryData.push(["Minor NCs", sc.minor || "0"]);
        summaryData.push(["OFIs", sc.ofi || "0"]);
        summaryData.push(["Positive Aspects", sc.positive || "0"]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    if ((auditData.participants as any[])?.length) {
        const pData = [["Name", "Position", "Opening Meeting", "Closing Meeting", "Interviewed"]];
        (auditData.participants as any[]).forEach((p) => {
            pData.push([
                p.name,
                p.position,
                p.opening ? "Yes" : "No",
                p.closing ? "Yes" : "No",
                p.interviewed || "",
            ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pData), "Participants");
    }

    if (auditData.checklistData && Object.keys(auditData.checklistData as object).length > 0 && template?.content) {
        const cData = [
            ["Clause", "Question", "Finding", "Evidence", "Description", "Correction", "Root Cause", "Corrective Action"],
        ];
        Object.entries(auditData.checklistData as Record<string, any>)
            .filter(([, v]) => v.findings)
            .forEach(([idx, v]) => {
                const item = (template.content as ChecklistContent[])[Number(idx)];
                cData.push([
                    item?.clause || idx,
                    item?.question || "-",
                    v.findings,
                    v.evidence || "",
                    v.description || "",
                    v.correction || "",
                    v.rootCause || "",
                    v.correctiveAction || "",
                ]);
            });
        if (cData.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cData), "Checklist");
    }

    if ((auditData.nonConformances as any[])?.some((nc) => nc.statement)) {
        const ncData = [["ID", "Standard Clause", "Area/Process", "Statement", "Due Date"]];
        (auditData.nonConformances as any[]).forEach((nc) =>
            ncData.push([nc.id, nc.standardClause, nc.areaProcess, nc.statement, nc.dueDate || ""])
        );
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ncData), "Non-Conformances");
    }

    if ((auditData.opportunities as any[])?.some((o) => o.opportunity)) {
        const oData = [["ID", "Standard Clause", "Area/Process", "Opportunity"]];
        (auditData.opportunities as any[]).forEach((o) =>
            oData.push([o.id, o.standardClause, o.areaProcess, o.opportunity])
        );
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(oData), "OFIs");
    }

    if ((auditData.positiveAspects as any[])?.some((pa) => pa.aspect)) {
        const paData = [["ID", "Standard Clause", "Area/Process", "Aspect"]];
        (auditData.positiveAspects as any[]).forEach((pa) =>
            paData.push([pa.id, pa.standardClause, pa.areaProcess, pa.aspect])
        );
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paData), "Positive Aspects");
    }

    if ((auditData.processAudits as any[])?.some((pa) => pa.processArea)) {
        const prData = [["Process Area", "Auditees", "Evidence", "Conclusion"]];
        (auditData.processAudits as any[]).forEach((pa) =>
            prData.push([pa.processArea, pa.auditees, pa.evidence, pa.conclusion])
        );
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prData), "Process Audits");
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
