import { resolveApiUrl } from "@/lib/api";

export type CompanyLogoUploadResult = {
    url: string;
    publicId?: string;
    width?: number;
    height?: number;
};

/** Upload a company logo file to Cloudinary via the API (requires auth). */
export async function uploadCompanyLogoFile(file: File): Promise<CompanyLogoUploadResult> {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("logo", file);

    const response = await fetch(resolveApiUrl("/uploads/company-logo"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const err = new Error(
            typeof data.error === "string" ? data.error : "Failed to upload logo"
        ) as Error & { code?: string };
        if (typeof data.code === "string") err.code = data.code;
        throw err;
    }

    if (!data.url || typeof data.url !== "string") {
        throw new Error("Upload succeeded but no image URL was returned.");
    }

    return data as CompanyLogoUploadResult;
}
