import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas'; // Import html2canvas
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, BorderStyle, HeadingLevel, AlignmentType, Header, Footer } from 'docx';
import { saveAs } from 'file-saver';

export const generatePDF = async (
    analysisData: any,
    pieChartRef: HTMLElement | null,
    barChartRef: HTMLElement | null,
    userLogo?: string | null
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // --- Page 1: Cover Page ---

    // Logo placeholder (Assuming logo is available at /iAudit Global-01.png)
    // We need to load image first
    // Logo loading to Data URL
    // Logo loading to Data URL
    let logoDataUrl: string | null = null;
    let logoRatio = 0.3; // Default aspect ratio

    try {
        const logoUrl = '/iAudit Global-01.png';
        const result = await new Promise<{ url: string, ratio: number }>((resolve, reject) => {
            const img = new Image();
            img.src = logoUrl;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0);
                resolve({
                    url: canvas.toDataURL("image/png"),
                    ratio: img.height / img.width
                });
            };
            img.onerror = reject;
        });
        logoDataUrl = result.url;
        logoRatio = result.ratio;
    } catch (e) {
        console.warn("Logo not found", e);
    }

    // Load User Logo
    let userLogoData: string | null = null;
    let userLogoRatio = 0.3;

    if (userLogo) {
        try {
            const result = await new Promise<{ url: string, ratio: number }>((resolve, reject) => {
                const img = new Image();
                img.src = userLogo;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0);
                    resolve({
                        url: canvas.toDataURL("image/png"),
                        ratio: img.height / img.width
                    });
                };
                img.onerror = reject;
            });
            userLogoData = result.url;
            userLogoRatio = result.ratio;
        } catch (e) {
            console.warn("User Logo not found", e);
        }
    }
    const logoY = 10;
    let finalLogoHeight = 0;
    if (userLogoData) {
        const maxWidth = 30;
        const maxHeight = 20;
        let width = maxWidth;
        let height = width * userLogoRatio;

        if (height > maxHeight) {
            height = maxHeight;
            width = height / userLogoRatio;
        }
        finalLogoHeight = height;
    }

    const headerBottom = userLogoData ? (logoY + finalLogoHeight + 10) : 30; // 10 padding or default 30

    const addUserLogo = (doc: jsPDF) => {
        if (userLogoData) {
            // Re-calculate width for drawing to be safe, or just use logic if we stored it.
            // But simpler to just re-run the simple math or capture it.
            // Let's re-run for safety in draw callback context if needed, but actually we can just use the same logic.
            const maxWidth = 30;
            const maxHeight = 20;
            let width = maxWidth;
            let height = width * userLogoRatio;
            if (height > maxHeight) {
                height = maxHeight;
                width = height / userLogoRatio;
            }
            doc.addImage(userLogoData, 'PNG', margin, logoY, width, height);
        }
    };

    // State to track pages where logo/footer has explicitly been drawn
    let lastLogoPage = 0;

    const drawHeaderFooter = (doc: jsPDF) => {
        const currentPage = (doc.internal as any).getCurrentPageInfo().pageNumber;
        if (lastLogoPage !== currentPage) {
            addUserLogo(doc);
            addFooter(doc);
            lastLogoPage = currentPage;
        }
    };

    // Add Logo centered
    const logoWidth = 60;
    const logoHeight = logoWidth * logoRatio; // Fixed height for consistency
    let startY = 60;

    // Add Header Logo to Page 1
    addUserLogo(doc);

    // Title position fixed
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    // Standard space for logo: ~40 units. Start text below that.
    doc.text("Gap Analysis Report", pageWidth / 2, headerBottom, { align: "center" });

    // Table position
    startY = headerBottom + 10;

    // User Details Table (Custom styling to match dark theme look in PDF if possible, or clean list)
    // The user requested a specific table look. We'll use autoTable for this.

    const detailsData = [
        ["Name of Company", analysisData.companyName],
        ...(analysisData.auditCompany ? [["Company Being Audited", analysisData.auditCompany]] : []),
        ["Audit Date", analysisData.auditDate],
        ["ISO Standard", analysisData.standard],
        ["Location of Audit", analysisData.location],
        ["Company Representatives", analysisData.representatives],
        ["Name of Auditor", analysisData.auditorName],
        ["Contact email", analysisData.contactEmail],
        ["Scope of Audit", analysisData.scope]
    ];

    autoTable(doc, {
        startY: startY,
        body: detailsData,
        theme: 'grid',
        styles: {
            fontSize: 11,
            cellPadding: 6,
            lineColor: [200, 200, 200], // Light grey border
            lineWidth: 0.1,
            textColor: [50, 50, 50]
        },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 60 }, // Header-like column
            1: { cellWidth: 'auto' }
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
        }
    });


    // --- Footer Helper ---
    const addFooter = (doc: jsPDF) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

        // Logo & Text
        if (logoDataUrl) {
            const footerLogoWidth = 40;
            const footerLogoHeight = footerLogoWidth * logoRatio;

            // Draw Logo (Bottom Right, Below Line)
            const logoX = pageWidth - margin - footerLogoWidth;
            // Line is at pageHeight - 20. We want logo below it.
            // Let's place top of logo at pageHeight - 30 due to significant whitespace
            doc.addImage(logoDataUrl, 'PNG', logoX, pageHeight - 30, footerLogoWidth, footerLogoHeight);

            // "Built with iAudit" Text (To the left of Logo, vertical align with logo middle approx)
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);
            // Center text roughly with logo
            const textY = pageHeight - 30 + (footerLogoHeight / 2) + 1;
            doc.text("Built with ", logoX - 2, textY, { align: "right" });
        } else {
            // Fallback if no logo
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text("Built with iAudit", pageWidth - margin, pageHeight - 12, { align: "right" });
        }
    };

    // Apply footer to Page 1
    // For Page 1, we manually added User Logo at line 94, but addFooter is separate.
    // Let's rely on our new helper for consistency, or just manually mark it.
    // Since we already did addUserLogo manually above, we should just correct the logic.
    // Actually, line 94 is before this. Let's assume Page 1 is handled manually or we can call drawHeaderFooter?
    // But Page 1 layout is unique (Title centered, etc).
    // Let's just track it.
    addFooter(doc);
    lastLogoPage = 1; // Mark Page 1 as done.

    // --- Page 2: Analytics & Summary ---
    doc.addPage();
    drawHeaderFooter(doc);

    doc.setFontSize(16);
    doc.text("Audit Result Summary", margin, headerBottom);

    let currentY = 30;

    // Pie Chart
    if (pieChartRef) {
        const pieCanvas = await html2canvas(pieChartRef, { scale: 2 });
        const pieImgData = pieCanvas.toDataURL('image/png');
        const pieImgWidth = 80;
        const pieImgHeight = (pieCanvas.height / pieCanvas.width) * pieImgWidth;

        doc.addImage(pieImgData, 'PNG', margin, currentY, pieImgWidth, pieImgHeight);

        // Add text summary next to pie chart if needed
        doc.setFontSize(12);
        doc.text(`Compliance Score: ${analysisData.scorePercentage}%`, margin + pieImgWidth + 10, currentY + 20);
        doc.text(`Status: ${analysisData.scorePercentage >= 70 ? 'Pass' : 'Requires Improvement'}`, margin + pieImgWidth + 10, currentY + 30);

        currentY += Math.max(pieImgHeight, 50) + 10;
    }

    // Bar Chart
    if (barChartRef) {
        doc.setFontSize(14);
        doc.text("Clause-wise Compliance", margin, currentY);
        currentY += 10;

        const barCanvas = await html2canvas(barChartRef, { scale: 2 });
        const barImgData = barCanvas.toDataURL('image/png');
        const barImgWidth = 180; // Full width essentially
        const barImgHeight = (barCanvas.height / barCanvas.width) * barImgWidth;

        doc.addImage(barImgData, 'PNG', margin, currentY, barImgWidth, barImgHeight);
        currentY += barImgHeight + 10;
    }

    // Update currentY check to force new page if table won't fit? 
    // autoTable handles page breaks, but we want footers on those pages too.

    // Score Table
    const questions = analysisData.questions || [];
    const clauses = Array.from(new Set(questions.map((q: any) => q.clause)));

    const scoreData = clauses.map((clause: any) => {
        const clauseQuestions = questions.filter((q: any) => q.clause === clause);
        const total = clauseQuestions.length;
        const comply = clauseQuestions.filter((q: any) => q.finding === 'Comply').length;
        const ofi = clauseQuestions.filter((q: any) => q.finding === 'OFI').length;
        const nc = clauseQuestions.filter((q: any) => q.finding === 'NC').length;
        const score = total > 0 ? Math.round((comply / total) * 100) : 0;
        return [clause, total, comply, ofi, nc, `${score}%`];
    });

    doc.setFontSize(14);
    doc.text("Detailed Scorecard", margin, currentY + 10);

    autoTable(doc, {
        startY: currentY + 15,
        head: [['Clause', 'Total Questions', 'Comply', 'OFI', 'NC', 'Score']],
        body: scoreData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        didDrawPage: (data) => {
            drawHeaderFooter(data.doc);
        },
        margin: { bottom: 25, top: headerBottom } // Ensure space for footer and header
    });


    // --- Page 3+: Detailed Questions ---
    doc.addPage();
    drawHeaderFooter(doc);

    doc.setFontSize(16);
    doc.text("Detailed Audit Findings", margin, headerBottom);

    // Pre-load evidence images for inline embedding
    const imgCellHeight = 36; // height for the image portion inside the cell
    const textRowHeight = 16;  // rough estimate for text portion above image
    const imageMap: Record<number, { dataUrl: string; w: number; h: number }> = {};
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i] as any;
        if (q.evidenceImage) {
            const img = new Image();
            await new Promise<void>((resolve) => {
                img.onload = () => { imageMap[i] = { dataUrl: q.evidenceImage, w: img.width, h: img.height }; resolve(); };
                img.onerror = () => resolve();
                img.src = q.evidenceImage;
            });
        }
    }

    const questionBody = questions.map((q: any, index: number) => {
        const hasImage = !!imageMap[index];
        // Always show evidence text; fall back to a label when empty + image present
        const evidenceText = q.evidence
            ? q.evidence
            : hasImage ? '[See image below]' : '-';
        return [
            index + 1,
            q.clause,
            q.text,
            q.finding || '-',
            {
                content: evidenceText,
                // Reserve room for text + gap + image
                styles: hasImage ? { minCellHeight: textRowHeight + 4 + imgCellHeight } : {}
            },
            q.actionPlan || '-'
        ];
    });

    autoTable(doc, {
        startY: 30,
        head: [['#', 'Clause', 'Question', 'Finding', 'Evidence', 'Action Plan']],
        body: questionBody,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 25 },
            2: { cellWidth: 50 },
            3: { cellWidth: 20, fontStyle: 'bold' },
            4: { cellWidth: 40 },
            5: { cellWidth: 'auto' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                const finding = data.cell.raw as string;
                if (finding === 'Comply') data.cell.styles.textColor = [46, 204, 113];
                if (finding === 'NC') data.cell.styles.textColor = [231, 76, 60];
                if (finding === 'OFI') data.cell.styles.textColor = [243, 156, 18];
            }
        },
        didDrawCell: (data) => {
            // Embed evidence image inside the Evidence column cell
            if (data.section === 'body' && data.column.index === 4) {
                const imgInfo = imageMap[data.row.index];
                if (imgInfo) {
                    const padding = 2;
                    const maxW = data.cell.width - padding * 2;
                    const maxH = imgCellHeight;
                    let drawW = Math.min(imgInfo.w, maxW);
                    let drawH = (imgInfo.h / imgInfo.w) * drawW;
                    if (drawH > maxH) {
                        drawH = maxH;
                        drawW = (imgInfo.w / imgInfo.h) * drawH;
                    }
                    // Place image at bottom of the cell, below text
                    const x = data.cell.x + padding;
                    const y = data.cell.y + data.cell.height - drawH - padding;
                    data.doc.addImage(imgInfo.dataUrl, 'PNG', x, y, drawW, drawH);
                }
            }
        },
        didDrawPage: (data) => {
            drawHeaderFooter(data.doc);
        },
        margin: { bottom: 25, top: 40 }
    });

    // Save the PDF
    doc.save(`gap-analysis-report-${analysisData.companyName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

export const generateWord = async (
    analysisData: any,
    pieChartRef: HTMLElement | null,
    barChartRef: HTMLElement | null,
    userLogo?: string | null
) => {
    // 1. Prepare Images
    // Logo
    let logoBuffer: ArrayBuffer | null = null;
    let logoRatio = 0.3; // Default

    try {
        const response = await fetch('/iAudit Global-01.png');
        if (response.ok) {
            logoBuffer = await response.arrayBuffer();

            // Get dimensions for aspect ratio
            const blob = new Blob([logoBuffer]);
            const url = URL.createObjectURL(blob);
            logoRatio = await new Promise<number>((resolve) => {
                const img = new Image();
                img.onload = () => {
                    resolve(img.height / img.width);
                    URL.revokeObjectURL(url);
                };
                img.onerror = () => {
                    resolve(0.3);
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            });
        }
    } catch (e) {
        console.error("Failed to load logo", e);
    }


    // Pie Chart
    let pieImageBuffer: ArrayBuffer | null = null;
    let pieWidth = 300;
    let pieHeight = 300;

    if (pieChartRef) {
        try {
            const canvas = await html2canvas(pieChartRef, { scale: 2, useCORS: true });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                pieImageBuffer = await blob.arrayBuffer();
                pieWidth = 300;
                pieHeight = (canvas.height / canvas.width) * pieWidth;
            }
        } catch (e) { console.error("Pie capture failed", e); }
    }

    // Bar Chart
    let barImageBuffer: ArrayBuffer | null = null;
    let barWidth = 550;
    let barHeight = 300;

    if (barChartRef) {
        try {
            const canvas = await html2canvas(barChartRef, { scale: 2, useCORS: true });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                barImageBuffer = await blob.arrayBuffer();
                barWidth = 550;
                barHeight = (canvas.height / canvas.width) * barWidth;
            }
        } catch (e) { console.error("Bar capture failed", e); }
    }


    // 2. Prepare Data Tables
    const detailsRows = [
        ["Name of Company", analysisData.companyName],
        ...(analysisData.auditCompany ? [["Company Being Audited", analysisData.auditCompany]] : []),
        ["Audit Date", analysisData.auditDate],
        ["ISO Standard", analysisData.standard],
        ["Location of Audit", analysisData.location],
        ["Company Representatives", analysisData.representatives],
        ["Name of Auditor", analysisData.auditorName],
        ["Contact email", analysisData.contactEmail],
        ["Scope of Audit", analysisData.scope]
    ].map(([key, value]) => (
        new TableRow({
            children: [
                new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "F0F0F0" },
                    children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
                    verticalAlign: AlignmentType.CENTER
                }),
                new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: value ? String(value) : '-' })] })],
                    verticalAlign: AlignmentType.CENTER
                }),
            ],
        })
    ));

    // Score Table Data
    const questions = analysisData.questions || [];
    const clauses = Array.from(new Set(questions.map((q: any) => q.clause)));
    const scoreRows = clauses.map((clause: any) => {
        const clauseQuestions = questions.filter((q: any) => q.clause === clause);
        const total = clauseQuestions.length;
        const comply = clauseQuestions.filter((q: any) => q.finding === 'Comply').length;
        const ofi = clauseQuestions.filter((q: any) => q.finding === 'OFI').length;
        const nc = clauseQuestions.filter((q: any) => q.finding === 'NC').length;
        const score = total > 0 ? Math.round((comply / total) * 100) : 0;

        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(clause as string)] }),
                new TableCell({ children: [new Paragraph(total.toString())] }),
                new TableCell({ children: [new Paragraph(comply.toString())] }),
                new TableCell({ children: [new Paragraph(ofi.toString())] }),
                new TableCell({ children: [new Paragraph(nc.toString())] }),
                new TableCell({ children: [new Paragraph(`${score}%`)] }),
            ]
        });
    });


    // Helper: convert base64 data URL to ArrayBuffer for docx ImageRun
    const base64ToAB = (dataUrl: string): ArrayBuffer => {
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const buffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
        return buffer;
    };

    // Helper: get image dimensions from data URL
    const getImgDimensions = (dataUrl: string): Promise<{ w: number; h: number }> =>
        new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.onerror = () => resolve({ w: 400, h: 300 });
            img.src = dataUrl;
        });

    // Detailed Questions Data
    const findingsRows: TableRow[] = [];
    for (const [index, q] of (questions as any[]).entries()) {
        let color = "000000";
        if (q.finding === 'Comply') color = "2ECC71";
        if (q.finding === 'NC') color = "E74C3C";
        if (q.finding === 'OFI') color = "F39C12";

        // Build Evidence cell children: text + optional image
        const evidenceCellChildren: Paragraph[] = [
            new Paragraph(q.evidence || '-')
        ];
        if (q.evidenceImage) {
            try {
                const imgBuffer = base64ToAB(q.evidenceImage);
                const { w, h } = await getImgDimensions(q.evidenceImage);
                const maxW = 120; // constrained to fit inside cell
                const imgW = Math.min(w, maxW);
                const imgH = (h / w) * imgW;
                evidenceCellChildren.push(
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: imgBuffer,
                                transformation: { width: imgW, height: imgH }
                            })
                        ]
                    })
                );
            } catch (e) {
                console.warn('Could not embed evidence image for Q', index + 1, e);
            }
        }

        findingsRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph((index + 1).toString())], width: { size: 5, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph(q.clause)], width: { size: 10, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph(q.text)], width: { size: 30, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q.finding || '-', color: color, bold: true })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: evidenceCellChildren, width: { size: 20, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph(q.actionPlan || '-')], width: { size: 25, type: WidthType.PERCENTAGE } }),
            ]
        }));
    }



    // 3. Document Structure
    const doc = new Document({
        styles: {
            paragraphStyles: [
                {
                    id: "Normal",
                    name: "Normal",
                    run: { size: 22 }, // 11pt
                },
                {
                    id: "Heading1",
                    name: "Heading 1",
                    basedOn: "Normal",
                    next: "Normal",
                    quickFormat: true,
                    run: { size: 32, bold: true, color: "2E86C1" },
                    paragraph: { spacing: { before: 240, after: 120 } },
                },
            ],
        },
        sections: [{
            properties: {},
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({ text: "Built with ", color: "646464", size: 20 }),
                                ...(logoBuffer ? [new ImageRun({
                                    data: logoBuffer,
                                    transformation: { width: 40, height: 40 * logoRatio },
                                })] : [new TextRun({ text: "iAudit", color: "646464", size: 20 })]),
                            ],
                            border: {
                                top: { style: BorderStyle.SINGLE, size: 6, color: "C8C8C8", space: 10 }
                            }
                        })
                    ]
                })
            },
            children: [
                // --- Cover Page ---
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: logoBuffer ? [new ImageRun({ data: logoBuffer, transformation: { width: 60, height: 60 * logoRatio } })] : [],
                }),
                new Paragraph({ text: "" }), // spacer
                new Paragraph({
                    text: "Gap Analysis Report",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }), // spacer
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: detailsRows,
                }),
                new Paragraph({ text: "", pageBreakBefore: true }),


                // --- Page 2: Analytics ---
                new Paragraph({ text: "Audit Result Summary", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ children: [new TextRun({ text: `Compliance Score: ${analysisData.scorePercentage}%`, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: `Status: ${analysisData.scorePercentage >= 70 ? 'Pass' : 'Requires Improvement'}`, bold: true })] }),
                new Paragraph({ text: "" }),

                // Pie Chart Image
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: pieImageBuffer ? [new ImageRun({ data: pieImageBuffer, transformation: { width: pieWidth, height: pieHeight } })] : [new TextRun("(Chart not captured)")],
                }),
                new Paragraph({ text: "" }),

                // Bar Chart Image
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: barImageBuffer ? [new ImageRun({ data: barImageBuffer, transformation: { width: barWidth, height: barHeight } })] : [new TextRun("(Chart not captured)")],
                }),
                new Paragraph({ text: "" }),

                // Scorecard Table
                new Paragraph({ text: "Detailed Scorecard", heading: HeadingLevel.HEADING_1 }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: ["Clause", "Total", "Comply", "OFI", "NC", "Score"].map(h =>
                                new TableCell({ shading: { fill: "2980B9" }, children: [new Paragraph({ children: [new TextRun({ text: h, color: "FFFFFF", bold: true })] })] })
                            )
                        }),
                        ...scoreRows
                    ]
                }),
                new Paragraph({ text: "", pageBreakBefore: true }),

                // --- Page 3: Detailed Findings ---
                new Paragraph({ text: "Detailed Audit Findings", heading: HeadingLevel.HEADING_1 }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: ["#", "Clause", "Question", "Finding", "Evidence", "Action Plan"].map(h =>
                                new TableCell({ shading: { fill: "34495E" }, children: [new Paragraph({ children: [new TextRun({ text: h, color: "FFFFFF", bold: true })] })] })
                            )
                        }),
                        ...findingsRows
                    ]
                })

            ],
        }],
    });

    // 4. Generate and Save
    Packer.toBlob(doc).then((blob) => {
        saveAs(blob, `gap-analysis-report-${analysisData.companyName.replace(/\s+/g, '-').toLowerCase()}.docx`);
    });
};
