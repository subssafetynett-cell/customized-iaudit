import { useState } from "react";
import { Eye, FileText, Trash2 } from "lucide-react";
import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import { AuditEvidencePreviewDialog } from "@/components/AuditEvidencePreviewDialog";
import { cn } from "@/lib/utils";

type Props = {
    files: AuditEvidenceMedia[];
    onRemove?: (index: number) => void;
    readOnly?: boolean;
    label?: string;
    className?: string;
    chipClassName?: string;
};

export function AuditEvidenceAttachmentList({
    files,
    onRemove,
    readOnly = false,
    label = "Attached Files",
    className,
    chipClassName,
}: Props) {
    const [previewMedia, setPreviewMedia] = useState<AuditEvidenceMedia | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    if (!files.length) return null;

    const openPreview = (file: AuditEvidenceMedia) => {
        setPreviewMedia(file);
        setPreviewOpen(true);
    };

    return (
        <>
            <div className={cn("flex flex-col gap-2 pointer-events-auto", className)}>
                <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
                <div className="flex flex-wrap gap-2">
                    {files.map((file, fileIdx) => (
                        <div
                            key={`${file.name}-${fileIdx}`}
                            className={cn(
                                "flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs shadow-sm",
                                chipClassName,
                            )}
                        >
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="max-w-[150px] truncate" title={file.name}>
                                {file.name}
                            </span>
                            <button
                                type="button"
                                className="text-slate-400 hover:text-emerald-600 transition-colors"
                                title="View attachment"
                                onClick={() => openPreview(file)}
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                            {!readOnly && onRemove && (
                                <button
                                    type="button"
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                    title="Remove attachment"
                                    onClick={() => onRemove(fileIdx)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <AuditEvidencePreviewDialog
                media={previewMedia}
                open={previewOpen}
                onOpenChange={setPreviewOpen}
            />
        </>
    );
}
