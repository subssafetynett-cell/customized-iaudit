/** Gap Analysis evidence uploads — PNG and JPEG only. */

export const EVIDENCE_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

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
    return isSafeEvidenceImageDataUrl(dataUrl) ? dataUrl : undefined;
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

    return { ok: true, dataUrl };
}
