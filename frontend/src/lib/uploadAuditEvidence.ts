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
 * Throws on failure; callers may fall back to embedding a data URL.
 */
export async function uploadAuditEvidenceFile(
    file: File,
    options?: { planId?: string | number },
): Promise<AuditEvidenceUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.planId != null) {
        formData.append("planId", String(options.planId));
    }

    const response = await fetch(resolveApiUrl("/uploads/audit-evidence"), {
        method: "POST",
        credentials: "include",
        body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const err = new Error(
            typeof data.error === "string" ? data.error : "Failed to upload evidence",
        ) as Error & { code?: string };
        if (typeof data.code === "string") err.code = data.code;
        throw err;
    }

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
                : file.name || "evidence",
        bytes: typeof data.bytes === "number" ? data.bytes : file.size,
        format: typeof data.format === "string" ? data.format : undefined,
    };
}
