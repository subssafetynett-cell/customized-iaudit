import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";

export function isPreviewableAuditEvidence(media: AuditEvidenceMedia): boolean {
    return media.type.startsWith("image/") || media.type === "application/pdf";
}

export function downloadAuditEvidenceMedia(media: AuditEvidenceMedia): void {
    const link = document.createElement("a");
    link.href = media.data;
    link.download = media.name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
