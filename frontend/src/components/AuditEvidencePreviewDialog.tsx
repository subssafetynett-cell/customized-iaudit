import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import {
    downloadAuditEvidenceMedia,
    isPreviewableAuditEvidence,
} from "@/lib/auditEvidencePreview";

type Props = {
    media: AuditEvidenceMedia | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function AuditEvidencePreviewDialog({ media, open, onOpenChange }: Props) {
    const isImage = media?.type.startsWith("image/") ?? false;
    const isPdf = media?.type === "application/pdf";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] flex flex-col gap-4">
                <DialogHeader>
                    <DialogTitle className="truncate pr-6">{media?.name ?? "Attachment"}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-200 bg-slate-50">
                    {media && isImage && (
                        <img
                            src={media.data}
                            alt={media.name}
                            className="max-w-full h-auto mx-auto block"
                        />
                    )}
                    {media && isPdf && (
                        <iframe
                            src={media.data}
                            title={media.name}
                            className="w-full h-[70vh] min-h-[420px] bg-white"
                        />
                    )}
                    {media && !isPreviewableAuditEvidence(media) && (
                        <p className="p-6 text-sm text-slate-500">
                            Preview is not available for this file type. Use Download to open it locally.
                        </p>
                    )}
                </div>

                {media && (
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => downloadAuditEvidenceMedia(media)}
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
