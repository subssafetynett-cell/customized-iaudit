import type jsPDF from "jspdf";
import {
    AlignmentType,
    BorderStyle,
    Footer,
    ImageRun,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
} from "docx";

export const IAUDIT_FOOTER_LOGO_SRC = "/iAudit Global-01.png";
/** Bottom margin reserved for footer content in PDF autoTable (mm). */
export const IAUDIT_FOOTER_RESERVE_MM = 22;
/** Default footer logo width in PDF (mm). */
export const IAUDIT_FOOTER_LOGO_SIZE_MM = 11;
/** Slightly larger footer logo for audit plan PDF exports (mm). */
export const IAUDIT_AUDIT_PLAN_FOOTER_LOGO_SIZE_MM = 14;
/** Default footer logo width in DOCX (px). */
export const IAUDIT_FOOTER_LOGO_SIZE_PX = 18;
/** Slightly larger footer logo for audit plan DOCX exports (px). */
export const IAUDIT_AUDIT_PLAN_FOOTER_LOGO_SIZE_PX = 24;

export type PdfImageAsset = { dataUrl: string; format: "PNG" | "JPEG"; ratio: number };

export async function loadImageAsset(src: string, maxDim = 120): Promise<PdfImageAsset | null> {
    if (!src?.trim()) return null;
    try {
        return await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d")!;
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                const usePng = src.startsWith("data:image/png") || /\.png(\?|$)/i.test(src);
                resolve({
                    dataUrl: canvas.toDataURL(usePng ? "image/png" : "image/jpeg", 0.85),
                    format: usePng ? "PNG" : "JPEG",
                    ratio: height / width,
                });
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    } catch {
        return null;
    }
}

export async function imageAssetToBuffer(asset: PdfImageAsset | null): Promise<ArrayBuffer | null> {
    if (!asset) return null;
    const res = await fetch(asset.dataUrl);
    return res.arrayBuffer();
}

export function resolveProgramCompany(program: any, sitesList: any[]) {
    const nested = program?.site?.company;
    if (nested?.name) {
        return { name: nested.name, logo: nested.logo || null };
    }
    const siteId = program?.siteId ?? program?.site?.id;
    const site = sitesList.find((s: any) => String(s.id) === String(siteId));
    if (site?.company?.name) {
        return { name: site.company.name, logo: site.company.logo || null };
    }
    return { name: "N/A", logo: null };
}

export function addBuiltWithIauditPdfFooter(
    doc: jsPDF,
    iauditAsset: PdfImageAsset | null,
    margin = 20,
    logoSizeMm = IAUDIT_FOOTER_LOGO_SIZE_MM,
) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    const bottomMargin = 8;
    const gapAfterLine = 3;
    const logoW = logoSizeMm;
    const logoH = iauditAsset ? logoW * iauditAsset.ratio : 4;
    const rowHeight = Math.max(logoH, 4);
    const lineY = pageHeight - bottomMargin - rowHeight - gapAfterLine;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    if (iauditAsset) {
        const logoX = pageWidth - margin - logoW;
        const logoY = pageHeight - bottomMargin - logoH;

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const textBaseline = logoY + logoH / 2 + 0.9;
        doc.text("Built with", logoX - 2.5, textBaseline, { align: "right" });

        doc.addImage(iauditAsset.dataUrl, iauditAsset.format, logoX, logoY, logoW, logoH);
        return;
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Built with iAudit", pageWidth - margin, pageHeight - bottomMargin, { align: "right" });
}

export function applyBuiltWithIauditPdfFooter(
    doc: jsPDF,
    iauditAsset: PdfImageAsset | null,
    margin = 20,
    logoSizeMm = IAUDIT_FOOTER_LOGO_SIZE_MM,
) {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        addBuiltWithIauditPdfFooter(doc, iauditAsset, margin, logoSizeMm);
    }
}

const invisibleCellBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const invisibleTableBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

export function buildIauditDocxFooter(
    iauditLogoBuffer: ArrayBuffer | null,
    logoRatio = 1,
    logoWidthPx = IAUDIT_FOOTER_LOGO_SIZE_PX,
): Footer {
    const logoPx = logoWidthPx;
    const logoHeight = Math.round(logoPx * logoRatio);

    const brandingCells = iauditLogoBuffer
        ? [
              new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  borders: invisibleCellBorder,
                  children: [
                      new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          spacing: { before: 0, after: 0 },
                          children: [new TextRun({ text: "Built with", color: "646464", size: 14 })],
                      }),
                  ],
              }),
              new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  borders: invisibleCellBorder,
                  children: [
                      new Paragraph({
                          spacing: { before: 0, after: 0, left: 80 },
                          children: [
                              new ImageRun({
                                  data: iauditLogoBuffer,
                                  transformation: { width: logoPx, height: logoHeight },
                              }),
                          ],
                      }),
                  ],
              }),
          ]
        : [
              new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  borders: invisibleCellBorder,
                  children: [
                      new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [new TextRun({ text: "Built with iAudit", color: "646464", size: 14 })],
                      }),
                  ],
              }),
          ];

    return new Footer({
        children: [
            new Paragraph({
                border: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "C8C8C8", space: 1 },
                },
                spacing: { after: 80 },
            }),
            new Table({
                alignment: AlignmentType.RIGHT,
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: invisibleTableBorders,
                rows: [new TableRow({ children: brandingCells })],
            }),
        ],
    });
}
