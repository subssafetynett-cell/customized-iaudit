import { resolveApiUrl } from "@/lib/api";

export type AuditEvidenceUploadResult = {
    url: string;
    publicId?: string;
    type: string;
    name: string;
    bytes?: number;
    format?: string;
};

/**
 * Upload a validated evidence file to Cloudinary via the API.
 * Prefer compress-before-upload in evidenceImageUpload.ts for audit execute.
 * Throws on failure; callers may fall back to embedding a data URL.
 */
export async function uploadAuditEvidenceFile(
    file: File | Blob,
    options?: {
        planId?: string | number;
        fileName?: string;
        onProgress?: (pct: number) => void;
    },
): Promise<AuditEvidenceUploadResult> {
    const formData = new FormData();
    const name =
        options?.fileName ||
        (file instanceof File ? file.name : "evidence.bin");
    formData.append("file", file, name);
    if (options?.planId != null) {
        formData.append("planId", String(options.planId));
    }

    const data = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", resolveApiUrl("/uploads/audit-evidence"));
        xhr.withCredentials = true;
        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || !options?.onProgress) return;
            options.onProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
            try {
                const json = JSON.parse(xhr.responseText || "{}");
                if (xhr.status < 200 || xhr.status >= 300) {
                    const err = new Error(
                        typeof json.error === "string"
                            ? json.error
                            : "Failed to upload evidence",
                    ) as Error & { code?: string };
                    if (typeof json.code === "string") err.code = json.code;
                    reject(err);
                    return;
                }
                resolve(json);
            } catch {
                reject(new Error("Invalid upload response"));
            }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
    });

    if (!data.url || typeof data.url !== "string") {
        throw new Error("Upload succeeded but no file URL was returned.");
    }

    return {
        url: data.url,
        publicId: typeof data.publicId === "string" ? data.publicId : undefined,
        type:
            typeof data.type === "string" && data.type
                ? data.type
                : file.type || "application/octet-stream",
        name:
            typeof data.name === "string" && data.name.trim()
                ? data.name.trim()
                : name,
        bytes: typeof data.bytes === "number" ? data.bytes : file.size,
        format: typeof data.format === "string" ? data.format : undefined,
    };
}
