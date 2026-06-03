/** Gap Analysis & audit evidence uploads — PNG and JPEG only. */

/** Max raw file size before base64 encoding (~5 MiB). */
export const EVIDENCE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Max stored data-URL length for images (base64 expands ~4/3; must match server
 * AUDIT_EVIDENCE_IMAGE_MAX in textSanitize.js).
 */
export const AUDIT_EVIDENCE_IMAGE_DATA_URL_MAX = 8_000_000;

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const ALLOWED_EXTENSIONS = new Set([".png", ".jpeg", ".jpg"]);

export const EVIDENCE_IMAGE_ACCEPT = ".png,.jpeg,.jpg,image/png,image/jpeg";

export const EVIDENCE_IMAGE_ERROR_MESSAGE =
    "Only PNG or JPEG image files are allowed (max 5 MB).";

function fileExtension(name: string): string {
    const lower = name.toLowerCase().trim();
    const dot = lower.lastIndexOf(".");
    return dot >= 0 ? lower.slice(dot) : "";
}

function normalizeMime(mime: string): string {
    return mime.toLowerCase().split(";")[0].trim();
}

function hasPngSignature(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
    );
}

function hasJpegSignature(bytes: Uint8Array): boolean {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function signatureMatchesMime(bytes: Uint8Array, mime: string): boolean {
    if (mime === "image/png") return hasPngSignature(bytes);
    if (mime === "image/jpeg") return hasJpegSignature(bytes);
    return false;
}

/** True for data URLs produced only from validated PNG/JPEG uploads. */
export function isSafeEvidenceImageDataUrl(dataUrl: string): boolean {
    if (!dataUrl || typeof dataUrl !== "string") return false;
    const trimmed = dataUrl.trim().toLowerCase();
    return (
        trimmed.startsWith("data:image/png;base64,") ||
        trimmed.startsWith("data:image/jpeg;base64,")
    );
}

export function sanitizeEvidenceImageDataUrl(
    dataUrl: string | undefined | null
): string | undefined {
    if (!dataUrl) return undefined;
    if (!isSafeEvidenceImageDataUrl(dataUrl)) return undefined;
    if (dataUrl.length > AUDIT_EVIDENCE_IMAGE_DATA_URL_MAX) return undefined;
    return dataUrl;
}

export type EvidenceImageValidationResult =
    | { ok: true; dataUrl: string }
    | { ok: false; error: string };

/**
 * Validates file type (extension + MIME + magic bytes) and returns a safe data URL.
 */
export async function readValidatedEvidenceImageFile(
    file: File
): Promise<EvidenceImageValidationResult> {
    const ext = fileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return {
            ok: false,
            error: "Invalid file type. Only .png and .jpeg images are allowed.",
        };
    }

    const mime = normalizeMime(file.type || "");
    if (!ALLOWED_MIME_TYPES.has(mime)) {
        return {
            ok: false,
            error: EVIDENCE_IMAGE_ERROR_MESSAGE,
        };
    }

    if (file.size <= 0 || file.size > EVIDENCE_IMAGE_MAX_BYTES) {
        return {
            ok: false,
            error: `Image must be between 1 byte and ${EVIDENCE_IMAGE_MAX_BYTES / (1024 * 1024)} MB.`,
        };
    }

    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!signatureMatchesMime(header, mime)) {
        return {
            ok: false,
            error: "File content does not match a valid PNG or JPEG image.",
        };
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });

    if (!isSafeEvidenceImageDataUrl(dataUrl)) {
        return { ok: false, error: EVIDENCE_IMAGE_ERROR_MESSAGE };
    }

    if (dataUrl.length > AUDIT_EVIDENCE_IMAGE_DATA_URL_MAX) {
        return {
            ok: false,
            error: `Image is too large to save after encoding. Use a PNG or JPEG under ${EVIDENCE_IMAGE_MAX_BYTES / (1024 * 1024)} MB, or compress the photo and try again.`,
        };
    }

    return { ok: true, dataUrl };
}

export type AuditEvidenceMedia = { name: string; data: string; type: string };

export const AUDIT_EVIDENCE_DOC_MAX_BYTES = 10 * 1024 * 1024; // 10 MB raw PDF

/** Max stored PDF data-URL length (matches server AUDIT_EVIDENCE_PDF_MAX). */
export const AUDIT_EVIDENCE_PDF_DATA_URL_MAX = 15_000_000;

const ALLOWED_DOC_MIME = new Set(["application/pdf"]);
const ALLOWED_DOC_EXT = new Set([".pdf"]);

/** Images (PNG/JPEG) and PDF for audit execute evidence uploads. */
export const AUDIT_EVIDENCE_ACCEPT = `${EVIDENCE_IMAGE_ACCEPT},application/pdf,.pdf`;

export const AUDIT_EVIDENCE_UNSUPPORTED_MESSAGE =
    "This file is not supported. Use PNG or JPEG photos (max 5 MB) or PDF documents (max 10 MB).";

function isLikelyImageFile(file: File): boolean {
    const ext = fileExtension(file.name);
    if (ALLOWED_EXTENSIONS.has(ext)) return true;
    const mime = normalizeMime(file.type || "");
    return mime.startsWith("image/");
}

function isLikelyPdfFile(file: File): boolean {
    const ext = fileExtension(file.name);
    if (ALLOWED_DOC_EXT.has(ext)) return true;
    return normalizeMime(file.type || "") === "application/pdf";
}

async function readValidatedPdfFile(file: File): Promise<EvidenceImageValidationResult> {
    const ext = fileExtension(file.name);
    if (!ALLOWED_DOC_EXT.has(ext)) {
        return { ok: false, error: "Only PDF documents are allowed for non-image uploads." };
    }
    const mime = normalizeMime(file.type || "");
    if (mime && !ALLOWED_DOC_MIME.has(mime)) {
        return { ok: false, error: "Invalid PDF file type." };
    }
    if (file.size <= 0 || file.size > AUDIT_EVIDENCE_DOC_MAX_BYTES) {
        return {
            ok: false,
            error: `PDF must be between 1 byte and ${AUDIT_EVIDENCE_DOC_MAX_BYTES / (1024 * 1024)} MB.`,
        };
    }
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const isPdf =
        header.length >= 5 &&
        header[0] === 0x25 &&
        header[1] === 0x50 &&
        header[2] === 0x44 &&
        header[3] === 0x46 &&
        header[4] === 0x2d;
    if (!isPdf) {
        return { ok: false, error: "File content does not match a valid PDF document." };
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
    if (!dataUrl.startsWith("data:application/pdf;base64,")) {
        return { ok: false, error: "Could not read PDF file." };
    }
    if (dataUrl.length > AUDIT_EVIDENCE_PDF_DATA_URL_MAX) {
        return {
            ok: false,
            error: `PDF is too large to save after encoding. Use a file under ${AUDIT_EVIDENCE_DOC_MAX_BYTES / (1024 * 1024)} MB.`,
        };
    }
    return { ok: true, dataUrl };
}

/**
 * Validate a single audit evidence file (photo or PDF).
 */
export async function readValidatedAuditEvidenceFile(
    file: File
): Promise<
    | { ok: true; media: AuditEvidenceMedia }
    | { ok: false; error: string }
> {
    if (isLikelyImageFile(file)) {
        const imageResult = await readValidatedEvidenceImageFile(file);
        if (!imageResult.ok) {
            return { ok: false, error: imageResult.error };
        }
        const mime = imageResult.dataUrl.startsWith("data:image/png")
            ? "image/png"
            : "image/jpeg";
        return {
            ok: true,
            media: { name: file.name, data: imageResult.dataUrl, type: mime },
        };
    }

    if (isLikelyPdfFile(file)) {
        const pdfResult = await readValidatedPdfFile(file);
        if (!pdfResult.ok) {
            return { ok: false, error: pdfResult.error };
        }
        return {
            ok: true,
            media: {
                name: file.name,
                data: pdfResult.dataUrl,
                type: "application/pdf",
            },
        };
    }

    return { ok: false, error: AUDIT_EVIDENCE_UNSUPPORTED_MESSAGE };
}

export type AuditEvidenceBatchResult = {
    accepted: AuditEvidenceMedia[];
    rejected: { fileName: string; error: string }[];
};

/** Process multiple files; skips invalid ones and reports each failure. */
export async function processAuditEvidenceFileList(
    files: FileList | null
): Promise<AuditEvidenceBatchResult> {
    if (!files || files.length === 0) {
        return { accepted: [], rejected: [] };
    }
    const accepted: AuditEvidenceMedia[] = [];
    const rejected: { fileName: string; error: string }[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await readValidatedAuditEvidenceFile(file);
        if (result.ok) {
            accepted.push(result.media);
        } else {
            rejected.push({ fileName: file.name, error: result.error });
        }
    }
    return { accepted, rejected };
}

const SAFE_PDF_DATA_RE = /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/i;

/** Strip invalid media before save/autosave. */
export function sanitizeAuditEvidenceMedia(
    media: AuditEvidenceMedia | null | undefined
): AuditEvidenceMedia | null {
    if (!media || typeof media !== "object") return null;
    const name =
        typeof media.name === "string" && media.name.trim()
            ? media.name.trim().slice(0, 255)
            : "file";
    const type = typeof media.type === "string" ? media.type.toLowerCase() : "";
    const data = typeof media.data === "string" ? media.data.trim() : "";

    if (type.startsWith("image/")) {
        const safe = sanitizeEvidenceImageDataUrl(data);
        if (!safe) return null;
        const mime = safe.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        return { name, data: safe, type: mime };
    }
    if (
        type === "application/pdf" &&
        SAFE_PDF_DATA_RE.test(data) &&
        data.length <= AUDIT_EVIDENCE_PDF_DATA_URL_MAX
    ) {
        return { name, data, type: "application/pdf" };
    }
    return null;
}

export function sanitizeAuditEvidenceMediaMap(
    map: Record<string, AuditEvidenceMedia[]> | null | undefined
): Record<string, AuditEvidenceMedia[]> {
    if (!map || typeof map !== "object") return {};
    const out: Record<string, AuditEvidenceMedia[]> = {};
    for (const [key, list] of Object.entries(map)) {
        if (!Array.isArray(list)) continue;
        const safeKey = String(key).slice(0, 120);
        const items = list
            .map((m) => sanitizeAuditEvidenceMedia(m))
            .filter((m): m is AuditEvidenceMedia => m !== null);
        if (items.length > 0) out[safeKey] = items;
    }
    return out;
}
