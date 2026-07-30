import { useEffect, useState } from "react";
import { Check, Eye, FileText, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    evidenceMediaDisplayUrl,
    type AuditEvidenceMedia,
} from "@/lib/evidenceImageUpload";
import { subscribeEvidenceUploadProgress } from "@/lib/evidenceUploadProgress";
import { AuditEvidencePreviewDialog } from "@/components/AuditEvidencePreviewDialog";
import { cn } from "@/lib/utils";

type Props = {
    files: AuditEvidenceMedia[];
    onRemove?: (index: number) => void;
    onDescriptionChange?: (index: number, description: string) => void;
    onDescriptionBlur?: (index: number, description: string) => void;
    onRetryUpload?: (index: number, clientId: string) => void;
    readOnly?: boolean;
    label?: string;
    className?: string;
    chipClassName?: string;
};

function isImageMedia(file: AuditEvidenceMedia): boolean {
    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("image/")) return true;
    const data = String(file.data || "");
    if (data.startsWith("data:image/") || data.startsWith("blob:")) return true;
    return /\.(png|jpe?g|webp|gif)$/i.test(file.name || "");
}

function UploadProgressBar({ clientId }: { clientId: string }) {
    const [progress, setProgress] = useState(0);
    useEffect(() => subscribeEvidenceUploadProgress(clientId, setProgress), [clientId]);
    return (
        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/30">
                <div
                    className="h-full rounded-full bg-emerald-400 transition-[width] duration-150"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="mt-0.5 text-center text-[9px] font-semibold text-white tabular-nums">
                {progress}%
            </p>
        </div>
    );
}

export function AuditEvidenceAttachmentList({
    files,
    onRemove,
    onDescriptionChange,
    onDescriptionBlur,
    onRetryUpload,
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

    const imageEntries = files
        .map((file, index) => ({ file, index }))
        .filter(({ file }) => isImageMedia(file));
    const otherEntries = files
        .map((file, index) => ({ file, index }))
        .filter(({ file }) => !isImageMedia(file));

    return (
        <>
            <div className={cn("flex flex-col gap-2 pointer-events-auto", className)}>
                <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>

                {imageEntries.length > 0 && (
                    <div className="flex flex-row flex-wrap gap-2">
                        {imageEntries.map(({ file, index }) => {
                            const uploading =
                                file.uploadStatus === "pending" ||
                                file.uploadStatus === "uploading";
                            const errored = file.uploadStatus === "error";
                            const done = !file.uploadStatus || file.uploadStatus === "done";
                            return (
                                <div
                                    key={file.clientId || `${file.name}-${index}`}
                                    className="relative w-[88px] shrink-0 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden group"
                                >
                                    <button
                                        type="button"
                                        className="block w-full"
                                        title="View image"
                                        onClick={() => openPreview(file)}
                                    >
                                        <img
                                            src={evidenceMediaDisplayUrl(file)}
                                            alt={file.name}
                                            className="h-[72px] w-full object-cover bg-slate-100"
                                        />
                                    </button>
                                    {uploading && file.clientId && (
                                        <UploadProgressBar clientId={file.clientId} />
                                    )}
                                    {done && file.uploadStatus === "done" && (
                                        <span className="absolute top-1 right-1 rounded-full bg-emerald-500 p-0.5 text-white shadow">
                                            <Check className="h-2.5 w-2.5" />
                                        </span>
                                    )}
                                    {errored && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 px-1">
                                            <p className="text-[9px] font-semibold text-white text-center leading-tight">
                                                Failed
                                            </p>
                                            {file.clientId && onRetryUpload && (
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-700"
                                                    onClick={() =>
                                                        onRetryUpload(index, file.clientId!)
                                                    }
                                                    title="Retry upload"
                                                >
                                                    <RotateCcw className="h-2.5 w-2.5" />
                                                    Retry
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-1 px-1.5 py-1 border-t border-slate-100 bg-slate-50/80">
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
                                                onClick={() => onRemove(index)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    {readOnly ? (
                                        file.description?.trim() ? (
                                            <p className="text-[10px] text-slate-600 px-1.5 pb-1 line-clamp-2">
                                                {file.description}
                                            </p>
                                        ) : null
                                    ) : onDescriptionChange ? (
                                        <Input
                                            value={file.description || ""}
                                            onChange={(e) =>
                                                onDescriptionChange(index, e.target.value)
                                            }
                                            onBlur={(e) =>
                                                onDescriptionBlur?.(index, e.target.value)
                                            }
                                            placeholder="Desc."
                                            className="h-7 text-[10px] border-0 border-t border-slate-100 rounded-none px-1.5"
                                        />
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}

                {otherEntries.length > 0 && (
                    <div className="flex flex-row flex-wrap gap-2">
                        {otherEntries.map(({ file, index }) => {
                            const uploading =
                                file.uploadStatus === "pending" ||
                                file.uploadStatus === "uploading";
                            const errored = file.uploadStatus === "error";
                            return (
                                <div
                                    key={file.clientId || `${file.name}-${index}`}
                                    className="flex flex-col gap-1.5 min-w-[160px] max-w-[220px]"
                                >
                                    <div
                                        className={cn(
                                            "relative flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs shadow-sm",
                                            chipClassName,
                                        )}
                                    >
                                        {uploading ? (
                                            <Loader2 className="w-4 h-4 text-emerald-600 shrink-0 animate-spin" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                        )}
                                        <span className="max-w-[120px] truncate" title={file.name}>
                                            {file.name}
                                        </span>
                                        {file.uploadStatus === "done" && (
                                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        )}
                                        <button
                                            type="button"
                                            className="text-slate-400 hover:text-emerald-600 transition-colors"
                                            title="View attachment"
                                            onClick={() => openPreview(file)}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        {errored && file.clientId && onRetryUpload && (
                                            <button
                                                type="button"
                                                className="text-amber-600 hover:text-amber-700 transition-colors"
                                                title="Retry upload"
                                                onClick={() =>
                                                    onRetryUpload(index, file.clientId!)
                                                }
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {!readOnly && onRemove && (
                                            <button
                                                type="button"
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                title="Remove attachment"
                                                onClick={() => onRemove(index)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {uploading && file.clientId && (
                                            <div className="absolute inset-x-1 bottom-0.5">
                                                <UploadProgressBar clientId={file.clientId} />
                                            </div>
                                        )}
                                    </div>
                                    {readOnly ? (
                                        file.description?.trim() ? (
                                            <p className="text-xs text-slate-600 pl-1">
                                                {file.description}
                                            </p>
                                        ) : null
                                    ) : onDescriptionChange ? (
                                        <Input
                                            value={file.description || ""}
                                            onChange={(e) =>
                                                onDescriptionChange(index, e.target.value)
                                            }
                                            onBlur={(e) =>
                                                onDescriptionBlur?.(index, e.target.value)
                                            }
                                            placeholder="Description (optional)"
                                            className="h-8 text-xs border-slate-200"
                                        />
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AuditEvidencePreviewDialog
                media={previewMedia}
                open={previewOpen}
                onOpenChange={setPreviewOpen}
            />
        </>
    );
}
