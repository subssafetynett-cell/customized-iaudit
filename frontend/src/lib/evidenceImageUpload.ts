import { resolveApiUrl } from "./api";
import {
    forgetEvidenceUploadFile,
    rememberEvidenceUploadFile,
    setEvidenceUploadProgress,
    takeEvidenceUploadFile,
} from "./evidenceUploadProgress";

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

const COMPRESS_MAX_DIMENSION = 1280;
const COMPRESS_JPEG_QUALITY = 0.72;
const COMPRESS_TARGET_BYTES = 500_000;
const UPLOAD_CONCURRENCY = 3;

/**
 * Resize/compress via canvas → Blob (avoids huge intermediate base64 when uploading).
 */
async function compressImageFileToBlob(
    file: File,
): Promise<{ blob: Blob; mime: string }> {
    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(file);
        let width = bitmap.width;
        let height = bitmap.height;

        if (
            width <= COMPRESS_MAX_DIMENSION &&
            height <= COMPRESS_MAX_DIMENSION &&
            file.size <= COMPRESS_TARGET_BYTES
        ) {
            return { blob: file, mime: normalizeMime(file.type) || "image/jpeg" };
        }

        if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
            if (width > height) {
                height = Math.round((height * COMPRESS_MAX_DIMENSION) / width);
                width = COMPRESS_MAX_DIMENSION;
            } else {
                width = Math.round((width * COMPRESS_MAX_DIMENSION) / height);
                height = COMPRESS_MAX_DIMENSION;
            }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return { blob: file, mime: normalizeMime(file.type) || "image/jpeg" };
        ctx.drawImage(bitmap, 0, 0, width, height);

        const tryBlob = (mime: string, quality?: number) =>
            new Promise<Blob | null>((resolve) => {
                canvas.toBlob((b) => resolve(b), mime, quality);
            });

        // Prefer WebP when smaller; fall back to JPEG (server accepts both via jpeg/png; we upload jpeg).
        let best: Blob | null = await tryBlob("image/jpeg", COMPRESS_JPEG_QUALITY);
        let bestMime = "image/jpeg";

        if (best && best.size > COMPRESS_TARGET_BYTES) {
            for (const q of [0.62, 0.52, 0.42]) {
                const next = await tryBlob("image/jpeg", q);
                if (next && next.size < best.size) {
                    best = next;
                    bestMime = "image/jpeg";
                }
                if (best.size <= COMPRESS_TARGET_BYTES) break;
            }
        }

        // PNG diagrams may stay smaller as PNG
        if (normalizeMime(file.type) === "image/png") {
            const png = await tryBlob("image/png");
            if (png && (!best || (png.size < best.size && png.size <= COMPRESS_TARGET_BYTES))) {
                best = png;
                bestMime = "image/png";
            }
        }

        if (!best) return { blob: file, mime: normalizeMime(file.type) || "image/jpeg" };
        return { blob: best, mime: bestMime };
    } catch {
        return { blob: file, mime: normalizeMime(file.type) || "image/jpeg" };
    } finally {
        bitmap?.close();
    }
}

/**
 * Resize and compress an image data URL (fallback / Gap Analysis path).
 */
async function compressEvidenceImage(
    dataUrl: string,
    originalMime: string,
): Promise<{ dataUrl: string; mime: string }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (
                width <= COMPRESS_MAX_DIMENSION &&
                height <= COMPRESS_MAX_DIMENSION &&
                dataUrl.length <= COMPRESS_TARGET_BYTES * 1.4
            ) {
                resolve({ dataUrl, mime: originalMime });
                return;
            }

            if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * COMPRESS_MAX_DIMENSION) / width);
                    width = COMPRESS_MAX_DIMENSION;
                } else {
                    width = Math.round((width * COMPRESS_MAX_DIMENSION) / height);
                    height = COMPRESS_MAX_DIMENSION;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, width, height);

            let quality = COMPRESS_JPEG_QUALITY;
            let jpegUrl = canvas.toDataURL("image/jpeg", quality);
            while (jpegUrl.length > COMPRESS_TARGET_BYTES * 1.37 && quality > 0.4) {
                quality -= 0.1;
                jpegUrl = canvas.toDataURL("image/jpeg", quality);
            }

            if (originalMime === "image/png") {
                const pngUrl = canvas.toDataURL("image/png");
                if (pngUrl.length < jpegUrl.length && pngUrl.length <= COMPRESS_TARGET_BYTES * 1.4) {
                    resolve({ dataUrl: pngUrl, mime: "image/png" });
                    return;
                }
            }
            resolve({ dataUrl: jpegUrl, mime: "image/jpeg" });
        };
        img.onerror = () => resolve({ dataUrl, mime: originalMime });
        img.src = dataUrl;
    });
}

/**
 * Validates file type (extension + MIME + magic bytes), compresses, and returns a safe data URL.
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

    let dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });

    if (!isSafeEvidenceImageDataUrl(dataUrl)) {
        return { ok: false, error: EVIDENCE_IMAGE_ERROR_MESSAGE };
    }

    const compressed = await compressEvidenceImage(dataUrl, mime);
    dataUrl = compressed.dataUrl;

    if (dataUrl.length > AUDIT_EVIDENCE_IMAGE_DATA_URL_MAX) {
        return {
            ok: false,
            error: `Image is too large to save after encoding. Use a PNG or JPEG under ${EVIDENCE_IMAGE_MAX_BYTES / (1024 * 1024)} MB, or compress the photo and try again.`,
        };
    }

    return { ok: true, dataUrl };
}

export type AuditEvidenceUploadStatus = "pending" | "uploading" | "done" | "error";

export type AuditEvidenceMedia = {
    name: string;
    data: string;
    type: string;
    description?: string;
    /** Client-only — stripped before persist */
    clientId?: string;
    uploadStatus?: AuditEvidenceUploadStatus;
    uploadError?: string;
    /** Instant local thumbnail (blob:) while remote upload runs */
    localPreviewUrl?: string;
};

const EVIDENCE_DESCRIPTION_MAX = 500;

export function normalizeEvidenceDescription(
    description: string | undefined | null,
): string | undefined {
    if (!description || typeof description !== "string") return undefined;
    const trimmed = description.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, EVIDENCE_DESCRIPTION_MAX);
}

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

function newClientId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function validateImageFileQuick(file: File): Promise<string | null> {
    const ext = fileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return "Invalid file type. Only .png and .jpeg images are allowed.";
    }
    const mime = normalizeMime(file.type || "");
    if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
        return EVIDENCE_IMAGE_ERROR_MESSAGE;
    }
    if (file.size <= 0 || file.size > EVIDENCE_IMAGE_MAX_BYTES) {
        return `Image must be between 1 byte and ${EVIDENCE_IMAGE_MAX_BYTES / (1024 * 1024)} MB.`;
    }
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const effectiveMime = mime || (ext === ".png" ? "image/png" : "image/jpeg");
    if (!signatureMatchesMime(header, effectiveMime)) {
        return "File content does not match a valid PNG or JPEG image.";
    }
    return null;
}

async function validatePdfFileQuick(file: File): Promise<string | null> {
    const ext = fileExtension(file.name);
    if (!ALLOWED_DOC_EXT.has(ext)) {
        return "Only PDF documents are allowed for non-image uploads.";
    }
    const mime = normalizeMime(file.type || "");
    if (mime && !ALLOWED_DOC_MIME.has(mime)) {
        return "Invalid PDF file type.";
    }
    if (file.size <= 0 || file.size > AUDIT_EVIDENCE_DOC_MAX_BYTES) {
        return `PDF must be between 1 byte and ${AUDIT_EVIDENCE_DOC_MAX_BYTES / (1024 * 1024)} MB.`;
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
        return "File content does not match a valid PDF document.";
    }
    return null;
}

async function readValidatedPdfFile(file: File): Promise<EvidenceImageValidationResult> {
    const err = await validatePdfFileQuick(file);
    if (err) return { ok: false, error: err };

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

type CloudinaryUploadOptions = {
    planId?: string | number;
    onProgress?: (pct: number) => void;
};

/**
 * Upload a Blob/File to Cloudinary via XHR (upload progress).
 */
function uploadBlobToCloudinary(
    blob: Blob,
    fileName: string,
    options: CloudinaryUploadOptions = {},
): Promise<string> {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", blob, fileName);
        if (options.planId != null) {
            formData.append("planId", String(options.planId));
        }

        const xhr = new XMLHttpRequest();
        xhr.open("POST", resolveApiUrl("/uploads/audit-evidence"));
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || !options.onProgress) return;
            options.onProgress(Math.round((event.loaded / event.total) * 100));
        };

        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(`Upload failed (${xhr.status})`));
                return;
            }
            try {
                const json = JSON.parse(xhr.responseText || "{}");
                if (json.url) resolve(String(json.url));
                else reject(new Error("No URL returned"));
            } catch {
                reject(new Error("Invalid upload response"));
            }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onabort = () => reject(new Error("Upload aborted"));
        xhr.send(formData);
    });
}

/**
 * Try uploading a file to Cloudinary (compress images first). Returns URL or null.
 */
async function tryCloudinaryUpload(
    file: File,
    options: CloudinaryUploadOptions = {},
): Promise<string | null> {
    try {
        let uploadBlob: Blob = file;
        let uploadName = file.name;

        if (isLikelyImageFile(file)) {
            const compressed = await compressImageFileToBlob(file);
            uploadBlob = compressed.blob;
            const ext = compressed.mime === "image/png" ? "png" : "jpg";
            uploadName = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;
            options.onProgress?.(15);
        }

        const url = await uploadBlobToCloudinary(uploadBlob, uploadName, {
            ...options,
            onProgress: (pct) => {
                // Reserve 0–15 for compress; map network to 15–100
                const mapped = isLikelyImageFile(file)
                    ? 15 + Math.round(pct * 0.85)
                    : pct;
                options.onProgress?.(mapped);
            },
        });
        return url;
    } catch {
        return null;
    }
}

/**
 * Validate a single audit evidence file (photo or PDF).
 * Compresses images, uploads to Cloudinary; falls back to base64 inline data.
 */
export async function readValidatedAuditEvidenceFile(
    file: File,
    options: CloudinaryUploadOptions = {},
): Promise<
    | { ok: true; media: AuditEvidenceMedia }
    | { ok: false; error: string }
> {
    if (isLikelyImageFile(file) || isLikelyPdfFile(file)) {
        const cloudinaryUrl = await tryCloudinaryUpload(file, options);
        if (cloudinaryUrl) {
            const mime = isLikelyImageFile(file)
                ? (normalizeMime(file.type || "") || "image/jpeg")
                : "application/pdf";
            return {
                ok: true,
                media: {
                    name: file.name,
                    data: cloudinaryUrl,
                    type: mime,
                    uploadStatus: "done",
                },
            };
        }
    }

    if (isLikelyImageFile(file)) {
        const imageResult = await readValidatedEvidenceImageFile(file);
        if (imageResult.ok === false) {
            return { ok: false, error: imageResult.error };
        }
        const mime = imageResult.dataUrl.startsWith("data:image/png")
            ? "image/png"
            : "image/jpeg";
        return {
            ok: true,
            media: {
                name: file.name,
                data: imageResult.dataUrl,
                type: mime,
                uploadStatus: "done",
            },
        };
    }

    if (isLikelyPdfFile(file)) {
        const pdfResult = await readValidatedPdfFile(file);
        if (pdfResult.ok === false) {
            return { ok: false, error: pdfResult.error };
        }
        return {
            ok: true,
            media: {
                name: file.name,
                data: pdfResult.dataUrl,
                type: "application/pdf",
                uploadStatus: "done",
            },
        };
    }

    return { ok: false, error: AUDIT_EVIDENCE_UNSUPPORTED_MESSAGE };
}

export type AuditEvidenceBatchResult = {
    accepted: AuditEvidenceMedia[];
    rejected: { fileName: string; error: string }[];
};

async function mapPool<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await worker(items[i], i);
        }
    });
    await Promise.all(runners);
    return results;
}

/** Process multiple files in parallel (bounded); skips invalid ones. */
export async function processAuditEvidenceFileList(
    files: FileList | null,
    options: CloudinaryUploadOptions = {},
): Promise<AuditEvidenceBatchResult> {
    if (!files || files.length === 0) {
        return { accepted: [], rejected: [] };
    }
    const list = Array.from(files);
    const outcomes = await mapPool(list, UPLOAD_CONCURRENCY, async (file) => {
        const result = await readValidatedAuditEvidenceFile(file, options);
        return { file, result };
    });

    const accepted: AuditEvidenceMedia[] = [];
    const rejected: { fileName: string; error: string }[] = [];
    for (const { file, result } of outcomes) {
        if (result.ok === false) {
            rejected.push({ fileName: file.name, error: result.error });
        } else {
            accepted.push(result.media);
        }
    }
    return { accepted, rejected };
}

export type PreparedEvidenceUploads = {
    /** Immediate UI items (local blob preview). */
    pending: AuditEvidenceMedia[];
    jobs: { clientId: string; file: File }[];
    rejected: { fileName: string; error: string }[];
};

/**
 * Sync validation + instant local previews. Upload happens via {@link runEvidenceUploadJobs}.
 */
export async function prepareEvidenceUploads(
    files: FileList | null,
): Promise<PreparedEvidenceUploads> {
    if (!files || files.length === 0) {
        return { pending: [], jobs: [], rejected: [] };
    }

    const pending: AuditEvidenceMedia[] = [];
    const jobs: { clientId: string; file: File }[] = [];
    const rejected: { fileName: string; error: string }[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (isLikelyImageFile(file)) {
            const err = await validateImageFileQuick(file);
            if (err) {
                rejected.push({ fileName: file.name, error: err });
                continue;
            }
            const clientId = newClientId();
            const localPreviewUrl = URL.createObjectURL(file);
            rememberEvidenceUploadFile(clientId, file);
            pending.push({
                clientId,
                name: file.name,
                data: localPreviewUrl,
                type: normalizeMime(file.type) || "image/jpeg",
                localPreviewUrl,
                uploadStatus: "pending",
            });
            jobs.push({ clientId, file });
            continue;
        }

        if (isLikelyPdfFile(file)) {
            const err = await validatePdfFileQuick(file);
            if (err) {
                rejected.push({ fileName: file.name, error: err });
                continue;
            }
            const clientId = newClientId();
            const localPreviewUrl = URL.createObjectURL(file);
            rememberEvidenceUploadFile(clientId, file);
            pending.push({
                clientId,
                name: file.name,
                data: localPreviewUrl,
                type: "application/pdf",
                localPreviewUrl,
                uploadStatus: "pending",
            });
            jobs.push({ clientId, file });
            continue;
        }

        rejected.push({ fileName: file.name, error: AUDIT_EVIDENCE_UNSUPPORTED_MESSAGE });
    }

    return { pending, jobs, rejected };
}

export type EvidenceUploadJobResult = {
    clientId: string;
    ok: boolean;
    media?: AuditEvidenceMedia;
    error?: string;
};

/**
 * Background upload for items created by {@link prepareEvidenceUploads}.
 * Calls onItemUpdate as each file finishes (or fails with base64 fallback).
 */
export async function runEvidenceUploadJobs(
    jobs: { clientId: string; file: File }[],
    options: {
        planId?: string | number;
        onItemStart?: (clientId: string) => void;
        onItemUpdate?: (clientId: string, media: AuditEvidenceMedia) => void;
    } = {},
): Promise<EvidenceUploadJobResult[]> {
    return mapPool(jobs, UPLOAD_CONCURRENCY, async ({ clientId, file }) => {
        options.onItemStart?.(clientId);
        setEvidenceUploadProgress(clientId, 5);

        const result = await readValidatedAuditEvidenceFile(file, {
            planId: options.planId,
            onProgress: (pct) => setEvidenceUploadProgress(clientId, pct),
        });

        const prior = takeEvidenceUploadFile(clientId);
        const localPreview =
            prior && isLikelyImageFile(prior) ? URL.createObjectURL(prior) : undefined;

        if (result.ok === false) {
            const failed: AuditEvidenceMedia = {
                clientId,
                name: file.name,
                data: localPreview || "",
                type: isLikelyPdfFile(file)
                    ? "application/pdf"
                    : normalizeMime(file.type) || "image/jpeg",
                localPreviewUrl: localPreview,
                uploadStatus: "error",
                uploadError: result.error,
            };
            options.onItemUpdate?.(clientId, failed);
            setEvidenceUploadProgress(clientId, 0);
            return { clientId, ok: false, error: result.error, media: failed };
        }

        const done: AuditEvidenceMedia = {
            ...result.media,
            clientId,
            uploadStatus: "done",
            localPreviewUrl: undefined,
        };
        // Revoke blob preview once remote URL is ready
        options.onItemUpdate?.(clientId, done);
        setEvidenceUploadProgress(clientId, 100);
        forgetEvidenceUploadFile(clientId);
        return { clientId, ok: true, media: done };
    });
}

/** Retry a failed upload by clientId (File retained in memory). */
export async function retryEvidenceUpload(
    clientId: string,
    options: {
        planId?: string | number;
        onItemUpdate?: (clientId: string, media: AuditEvidenceMedia) => void;
    } = {},
): Promise<EvidenceUploadJobResult> {
    const file = takeEvidenceUploadFile(clientId);
    if (!file) {
        return { clientId, ok: false, error: "Original file is no longer available. Please re-select it." };
    }
    const [result] = await runEvidenceUploadJobs([{ clientId, file }], options);
    return result;
}

export function revokeEvidencePreviewUrl(media: AuditEvidenceMedia | null | undefined) {
    const url = media?.localPreviewUrl || (media?.data?.startsWith("blob:") ? media.data : "");
    if (url?.startsWith("blob:")) {
        try {
            URL.revokeObjectURL(url);
        } catch {
            /* ignore */
        }
    }
    if (media?.clientId) forgetEvidenceUploadFile(media.clientId);
}

const SAFE_PDF_DATA_RE = /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/i;

function isCloudinaryUrl(data: string): boolean {
    return (
        data.startsWith("https://res.cloudinary.com/") ||
        data.startsWith("http://res.cloudinary.com/")
    );
}

function isPersistedEvidenceData(data: string): boolean {
    if (!data) return false;
    if (data.startsWith("blob:")) return false;
    if (isCloudinaryUrl(data)) return true;
    if (isSafeEvidenceImageDataUrl(data)) return true;
    if (SAFE_PDF_DATA_RE.test(data)) return true;
    return false;
}

/** Strip invalid / in-flight media before save/autosave. */
export function sanitizeAuditEvidenceMedia(
    media: AuditEvidenceMedia | null | undefined
): AuditEvidenceMedia | null {
    if (!media || typeof media !== "object") return null;
    if (media.uploadStatus === "pending" || media.uploadStatus === "uploading") {
        return null;
    }
    const name =
        typeof media.name === "string" && media.name.trim()
            ? media.name.trim().slice(0, 255)
            : "file";
    const type = typeof media.type === "string" ? media.type.toLowerCase() : "";
    const data = typeof media.data === "string" ? media.data.trim() : "";

    if (!isPersistedEvidenceData(data)) return null;

    if (isCloudinaryUrl(data)) {
        const description = normalizeEvidenceDescription(media.description);
        const mime =
            type.startsWith("image/") || type === "application/pdf"
                ? type
                : data.toLowerCase().includes(".pdf")
                  ? "application/pdf"
                  : "image/jpeg";
        return description
            ? { name, data, type: mime, description }
            : { name, data, type: mime };
    }

    if (type.startsWith("image/") || isSafeEvidenceImageDataUrl(data)) {
        const safe = sanitizeEvidenceImageDataUrl(data);
        if (!safe) return null;
        const mime = safe.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        const description = normalizeEvidenceDescription(media.description);
        return description
            ? { name, data: safe, type: mime, description }
            : { name, data: safe, type: mime };
    }
    if (
        (type === "application/pdf" || data.startsWith("data:application/pdf")) &&
        SAFE_PDF_DATA_RE.test(data) &&
        data.length <= AUDIT_EVIDENCE_PDF_DATA_URL_MAX
    ) {
        const description = normalizeEvidenceDescription(media.description);
        return description
            ? { name, data, type: "application/pdf", description }
            : { name, data, type: "application/pdf" };
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

/** Display URL for thumbnails (prefer local blob while uploading). */
export function evidenceMediaDisplayUrl(media: AuditEvidenceMedia): string {
    if (media.localPreviewUrl) return media.localPreviewUrl;
    return media.data || "";
}
