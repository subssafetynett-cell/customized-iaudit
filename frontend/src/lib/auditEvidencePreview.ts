import {
    evidenceMediaDisplayUrl,
    type AuditEvidenceMedia,
} from "@/lib/evidenceImageUpload";

export function isPreviewableAuditEvidence(media: AuditEvidenceMedia): boolean {
    return media.type.startsWith("image/") || media.type === "application/pdf";
}

export function downloadAuditEvidenceMedia(media: AuditEvidenceMedia): void {
    const href = evidenceMediaDisplayUrl(media) || media.data;
    if (!href) return;
    // Hosted Cloudinary URLs: open/download via navigation; data URLs use download attribute.
    if (/^https?:\/\//i.test(href)) {
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = media.name || "attachment";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }
    const link = document.createElement("a");
    link.href = href;
    link.download = media.name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
