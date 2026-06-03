import { sanitizeAuditEvidenceMediaMap, type AuditEvidenceMedia } from "@/lib/evidenceImageUpload";

/** Target total encoded size for all embedded photos (~2–3 MB report). */
export const REPORT_IMAGES_BUDGET_BYTES = 2_400_000;

export type ReportEvidenceSource = {
    name: string;
    data: string;
    type: string;
    context: string;
};

export type PreparedReportImage = {
    name: string;
    context: string;
    dataUrl: string;
    format: "JPEG" | "PNG";
    widthPx: number;
    heightPx: number;
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
            });
        }
    }
    return out;
}

/** Gather image attachments only (for embedded photos in PDF/Word). */
export function collectReportEvidenceSources(
    auditData: Record<string, unknown>
): ReportEvidenceSource[] {
    return collectReportEvidenceFileList(auditData).filter((e) => e.type.startsWith("image/"));
}

/**
 * Resize and compress photos for PDF/Word export — sharp enough for audit evidence,
 * total size kept near REPORT_IMAGES_BUDGET_BYTES.
 */
export async function prepareReportEvidenceImages(
    sources: ReportEvidenceSource[],
    budgetBytes: number = REPORT_IMAGES_BUDGET_BYTES
): Promise<PreparedReportImage[]> {
    if (sources.length === 0) return [];

    let maxDim = 1400;
    let quality = 0.88;

    const compressAll = async () => {
        const results: PreparedReportImage[] = [];
        for (const src of sources) {
            const item = await renderCompressedJpeg(src.data, maxDim, quality);
            results.push({
                ...item,
                name: src.name,
                context: src.context,
            });
        }
        return results;
    };

    let prepared = await compressAll();
    let total = prepared.reduce((sum, p) => sum + estimateDataUrlBytes(p.dataUrl), 0);

    while (total > budgetBytes && quality > 0.58) {
        quality -= 0.06;
        prepared = await compressAll();
        total = prepared.reduce((sum, p) => sum + estimateDataUrlBytes(p.dataUrl), 0);
    }

    while (total > budgetBytes && maxDim > 880) {
        maxDim -= 120;
        prepared = await compressAll();
        total = prepared.reduce((sum, p) => sum + estimateDataUrlBytes(p.dataUrl), 0);
    }

    return prepared;
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
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
