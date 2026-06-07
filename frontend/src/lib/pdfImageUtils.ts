import html2canvas from "html2canvas";

/** JPEG quality for embedded photos/charts — sharp enough for print, small file size. */
export const PDF_EXPORT_JPEG_QUALITY = 0.88;

/** Logos in headers/footers — small on page, no need for large bitmaps. */
export const PDF_LOGO_MAX_PX = 120;

/** Evidence thumbnails in tables — ~960px keeps text in photos readable in PDF. */
export const PDF_EVIDENCE_MAX_PX = 960;

/** Max pixel width for chart captures before JPEG encode. */
export const PDF_CHART_MAX_WIDTH_PX = 1100;

/** html2canvas scale — 1.5 is sharp on screen/PDF without 2× PNG bloat. */
export const PDF_CHART_CAPTURE_SCALE = 1.5;

export type PdfRasterImage = {
    dataUrl: string;
    format: "JPEG" | "PNG";
    width: number;
    height: number;
    aspectRatio: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not load image for PDF export"));
        img.src = src;
    });
}

function scaleToMaxDim(
    width: number,
    height: number,
    maxDim: number,
): { width: number; height: number } {
    if (width <= maxDim && height <= maxDim) return { width, height };
    if (width >= height) {
        return { width: maxDim, height: Math.round((height * maxDim) / width) };
    }
    return { width: Math.round((width * maxDim) / height), height: maxDim };
}

/** Resize any image data URL and re-encode as JPEG (or small PNG when requested). */
export async function rasterizeForPdf(
    src: string,
    maxDim: number,
    quality: number = PDF_EXPORT_JPEG_QUALITY,
    preferPng = false,
): Promise<PdfRasterImage> {
    const img = await loadImage(src);
    const { width, height } = scaleToMaxDim(img.width, img.height, maxDim);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image for PDF export");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    if (preferPng && width <= 200 && height <= 200) {
        return {
            dataUrl: canvas.toDataURL("image/png"),
            format: "PNG",
            width,
            height,
            aspectRatio: height / width,
        };
    }

    return {
        dataUrl: canvas.toDataURL("image/jpeg", quality),
        format: "JPEG",
        width,
        height,
        aspectRatio: height / width,
    };
}

/** Capture a DOM chart/card as a compressed JPEG suitable for jsPDF. */
export async function captureElementForPdf(
    element: HTMLElement,
    maxWidthPx: number = PDF_CHART_MAX_WIDTH_PX,
    quality: number = PDF_EXPORT_JPEG_QUALITY,
): Promise<PdfRasterImage> {
    const rect = element.getBoundingClientRect();
    const scale = Math.min(
        PDF_CHART_CAPTURE_SCALE,
        maxWidthPx / Math.max(rect.width, 1),
    );

    const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
    });

    let width = canvas.width;
    let height = canvas.height;

    if (width > maxWidthPx) {
        height = Math.round((height * maxWidthPx) / width);
        width = maxWidthPx;
        const scaled = document.createElement("canvas");
        scaled.width = width;
        scaled.height = height;
        const ctx = scaled.getContext("2d");
        if (!ctx) throw new Error("Could not scale chart capture for PDF export");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(canvas, 0, 0, width, height);
        return {
            dataUrl: scaled.toDataURL("image/jpeg", quality),
            format: "JPEG",
            width,
            height,
            aspectRatio: height / width,
        };
    }

    return {
        dataUrl: canvas.toDataURL("image/jpeg", quality),
        format: "JPEG",
        width,
        height,
        aspectRatio: height / width,
    };
}
