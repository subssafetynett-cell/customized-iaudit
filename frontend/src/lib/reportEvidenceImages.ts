import { sanitizeAuditEvidenceMediaMap, type AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import * as pdfjs from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/** Target total encoded size for all embedded photos (~2–3 MB report). */
export const REPORT_IMAGES_BUDGET_BYTES = 2_400_000;

/** Max PDF pages rendered per uploaded document in exported reports. */
export const REPORT_PDF_MAX_PAGES_PER_FILE = 5;

let pdfWorkerReady: Promise<void> | null = null;

function initPdfWorker(): Promise<void> {
    return (async () => {
        const workerSrc = typeof pdfjsWorker === "string" ? pdfjsWorker.trim() : "";
        if (!workerSrc) {
            throw new Error("[reportEvidenceImages] PDF.js worker URL is missing or invalid");
        }

        try {
            const probe = await fetch(workerSrc, { method: "HEAD", cache: "force-cache" });
            if (!probe.ok) {
                throw new Error(`PDF.js worker not reachable (HTTP ${probe.status})`);
            }
        } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            throw new Error(`[reportEvidenceImages] PDF.js worker failed to load: ${detail}`);
        }

        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    })();
}

async function ensurePdfWorker(): Promise<void> {
    if (!pdfWorkerReady) {
        pdfWorkerReady = initPdfWorker();
    }

    try {
        await pdfWorkerReady;
    } catch (err) {
        pdfWorkerReady = null;
        throw err;
    }
}

export type ReportEvidenceSource = {
    name: string;
    data: string;
    type: string;
    context: string;
    description?: string;
};

export type PreparedReportImage = {
    name: string;
    context: string;
    dataUrl: string;
    format: "JPEG" | "PNG";
    widthPx: number;
    heightPx: number;
    description?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not load image for report"));
        img.src = src;
    });
}

function estimateDataUrlBytes(dataUrl: string): number {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    return Math.ceil((base64.length * 3) / 4);
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function scaleToMaxDim(
    width: number,
    height: number,
    maxDim: number
): { width: number; height: number } {
    if (width <= maxDim && height <= maxDim) return { width, height };
    if (width >= height) {
        return { width: maxDim, height: Math.round((height * maxDim) / width) };
    }
    return { width: Math.round((width * maxDim) / height), height: maxDim };
}

async function renderCompressedJpeg(
    dataUrl: string,
    maxDim: number,
    quality: number
): Promise<PreparedReportImage> {
    const img = await loadImage(dataUrl);
    const { width, height } = scaleToMaxDim(img.width, img.height, maxDim);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image for report");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL("image/jpeg", quality);
    return {
        name: "",
        context: "",
        dataUrl: out,
        format: "JPEG",
        widthPx: width,
        heightPx: height,
    };
}

function humanizeEvidenceKey(key: string): string {
    if (key.startsWith("clause_checklist_")) return `Checklist (${key.replace("clause_checklist_", "")})`;
    if (key.startsWith("section_")) return `Section ${Number(key.replace("section_", "")) + 1}`;
    if (key.startsWith("process_audit_")) return `Process audit ${Number(key.replace("process_audit_", "")) + 1}`;
    return `Clause ${key}`;
}

function isReportableEvidenceFile(type: string): boolean {
    return type.startsWith("image/") || type === "application/pdf";
}

/** Gather image + PDF attachments for Excel and document indexes. */
export function collectReportEvidenceFileList(
    auditData: Record<string, unknown>
): ReportEvidenceSource[] {
    const out: ReportEvidenceSource[] = [];
    const seen = new Set<string>();
    const clauseFiles = sanitizeAuditEvidenceMediaMap(
        auditData.clauseFiles as Record<string, AuditEvidenceMedia[]> | undefined
    );
    const genericFiles = sanitizeAuditEvidenceMediaMap(
        auditData.genericFiles as Record<string, AuditEvidenceMedia[]> | undefined
    );

    for (const [key, list] of Object.entries({ ...clauseFiles, ...genericFiles })) {
        for (const m of list) {
            if (!isReportableEvidenceFile(m.type)) continue;
            const sig = `${key}::${m.name}::${m.type}`;
            if (seen.has(sig)) continue;
            seen.add(sig);
            out.push({
                name: m.name,
                data: m.data,
                type: m.type,
                context: humanizeEvidenceKey(key),
                description: m.description?.trim() || undefined,
            });
        }
    }
    return out;
}

/** Gather image + PDF attachments for embedded visuals in PDF/Word exports. */
export function collectReportEvidenceSources(
    auditData: Record<string, unknown>
): ReportEvidenceSource[] {
    return collectReportEvidenceFileList(auditData);
}

async function renderPdfPagesAsJpegs(
    pdfDataUrl: string,
    maxPages: number = REPORT_PDF_MAX_PAGES_PER_FILE,
    maxDim: number = 1400,
    quality: number = 0.88,
): Promise<PreparedReportImage[]> {
    await ensurePdfWorker();
    const bytes = dataUrlToUint8Array(pdfDataUrl);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pageCount = Math.min(pdf.numPages, Math.max(1, maxPages));
    const out: PreparedReportImage[] = [];
    const skippedPages: number[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = maxDim / Math.max(baseViewport.width, baseViewport.height);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            skippedPages.push(pageNum);
            console.error(
                `[reportEvidenceImages] PDF page ${pageNum} skipped: canvas 2d context unavailable`,
            );
            continue;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        out.push({
            name: "",
            context: "",
            dataUrl: canvas.toDataURL("image/jpeg", quality),
            format: "JPEG",
            widthPx: canvas.width,
            heightPx: canvas.height,
        });
    }

    if (skippedPages.length > 0) {
        throw new Error(
            `PDF evidence render incomplete: omitted page(s) ${skippedPages.join(", ")} (canvas context unavailable)`,
        );
    }

    return out;
}

async function buildVisualsFromSources(
    sources: ReportEvidenceSource[],
    maxDim: number,
    quality: number,
): Promise<PreparedReportImage[]> {
    const results: PreparedReportImage[] = [];

    for (const src of sources) {
        if (src.type.startsWith("image/")) {
            const item = await renderCompressedJpeg(src.data, maxDim, quality);
            results.push({
                ...item,
                name: src.name,
                context: src.context,
                description: src.description,
            });
            continue;
        }

        if (src.type === "application/pdf") {
            try {
                const pages = await renderPdfPagesAsJpegs(src.data, REPORT_PDF_MAX_PAGES_PER_FILE, maxDim, quality);
                pages.forEach((page, index) => {
                    const pageLabel =
                        pages.length > 1 ? `${src.name} (page ${index + 1})` : src.name;
                    results.push({
                        ...page,
                        name: pageLabel,
                        context: `${src.context} — PDF`,
                        description: src.description,
                    });
                });
            } catch (error) {
                console.warn("Report PDF preview render failed", src.name, error);
            }
        }
    }

    return results;
}

/**
 * Resize/compress photos and render PDF pages for PDF/Word export.
 * Total size kept near REPORT_IMAGES_BUDGET_BYTES.
 */
export async function prepareReportEvidenceImages(
    sources: ReportEvidenceSource[],
    budgetBytes: number = REPORT_IMAGES_BUDGET_BYTES
): Promise<PreparedReportImage[]> {
    if (sources.length === 0) return [];

    let maxDim = 1400;
    let quality = 0.88;

    let prepared = await buildVisualsFromSources(sources, maxDim, quality);
    let total = prepared.reduce((sum, p) => sum + estimateDataUrlBytes(p.dataUrl), 0);

    while (total > budgetBytes && quality > 0.58) {
        quality -= 0.06;
        prepared = await buildVisualsFromSources(sources, maxDim, quality);
        total = prepared.reduce((sum, p) => sum + estimateDataUrlBytes(p.dataUrl), 0);
    }

    while (total > budgetBytes && maxDim > 880) {
        maxDim -= 120;
        prepared = await buildVisualsFromSources(sources, maxDim, quality);
        total = prepared.reduce((sum, p) => sum + estimateDataUrlBytes(p.dataUrl), 0);
    }

    return prepared;
}

/** Display size in mm for jsPDF (max width ~content, preserve aspect). */
export function reportImageDisplayMm(
    widthPx: number,
    heightPx: number,
    maxWidthMm: number,
    maxHeightMm: number
): { w: number; h: number } {
    const aspect = widthPx / heightPx;
    let w = maxWidthMm;
    let h = w / aspect;
    if (h > maxHeightMm) {
        h = maxHeightMm;
        w = h * aspect;
    }
    return { w, h };
}

export const EVIDENCE_TITLE_HEIGHT_MM = 5;
export const EVIDENCE_DESC_LINE_HEIGHT_MM = 4;
export const EVIDENCE_DESC_BOTTOM_GAP_MM = 2;
export const EVIDENCE_IMAGE_BOTTOM_GAP_MM = 6;

/** Measure wrapped description lines using the same font settings as PDF export. */
export function measureEvidenceDescriptionBlock(
    doc: import("jspdf").jsPDF,
    description: string | undefined,
    contentWidthMm: number,
    fontName = "helvetica",
): { lines: string[]; heightMm: number } {
    const trimmed = description?.trim();
    if (!trimmed) return { lines: [], heightMm: 0 };

    doc.setFont(fontName, "italic");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(trimmed, contentWidthMm);
    const heightMm =
        lines.length * EVIDENCE_DESC_LINE_HEIGHT_MM + EVIDENCE_DESC_BOTTOM_GAP_MM;
    return { lines, heightMm };
}

export function evidenceVisualBlockHeightMm(
    imageHeightMm: number,
    descriptionHeightMm: number,
): number {
    return (
        EVIDENCE_TITLE_HEIGHT_MM +
        descriptionHeightMm +
        imageHeightMm +
        EVIDENCE_IMAGE_BOTTOM_GAP_MM
    );
}

export type JsPdfEvidenceEmbedOptions = {
    margin?: number;
    pageHeightMm?: number;
    sectionTitle?: string;
    introText?: string;
};

/** Embed prepared evidence visuals into an existing jsPDF document. Returns updated Y. */
export function embedPreparedImagesInJsPdf(
    doc: import("jspdf").jsPDF,
    visuals: PreparedReportImage[],
    startY: number,
    options: JsPdfEvidenceEmbedOptions = {},
): number {
    if (visuals.length === 0) return startY;

    const margin = options.margin ?? 14;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = options.pageHeightMm ?? doc.internal.pageSize.getHeight();
    const contentWidthMm = pageW - margin * 2;
    let y = startY;

    const checkPage = (currentY: number, needMm: number) => {
        if (currentY + needMm > pageH - 25) {
            doc.addPage();
            return margin;
        }
        return currentY;
    };

    if (options.sectionTitle) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 56, 71);
        doc.text(options.sectionTitle, margin, y);
        y += 8;
    }

    if (options.introText) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(options.introText, margin, y);
        y += 8;
    }

    for (const img of visuals) {
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
        );
        y = checkPage(y, evidenceVisualBlockHeightMm(h, descHeightMm));
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 56, 71);
        doc.text(`${img.context} — ${img.name}`, margin, y);
        y += EVIDENCE_TITLE_HEIGHT_MM;
        if (descLines.length > 0) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            doc.text(descLines, margin, y);
            y += descHeightMm;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(33, 56, 71);
        y = checkPage(y, h + EVIDENCE_IMAGE_BOTTOM_GAP_MM);
        try {
            doc.addImage(img.dataUrl, img.format, margin, y, w, h, undefined, "FAST");
            y += h + EVIDENCE_IMAGE_BOTTOM_GAP_MM;
        } catch (e) {
            console.warn("Report PDF image embed failed", img.name, e);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`(Could not embed ${img.name})`, margin, y);
            y += 8;
        }
    }

    return y;
}

/** Build report evidence sources from finding attachment lists. */
export function findingMediaToReportSources(
    media: AuditEvidenceMedia[] | undefined,
    context: string,
): ReportEvidenceSource[] {
    if (!media?.length) return [];
    return media.map((m) => ({
        name: m.name,
        data: m.data,
        type: m.type,
        context,
        description: m.description?.trim() || undefined,
    }));
}
