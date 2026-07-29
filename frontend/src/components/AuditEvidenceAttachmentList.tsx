import { useState } from "react";
import { Eye, FileText, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import { AuditEvidencePreviewDialog } from "@/components/AuditEvidencePreviewDialog";
import { cn } from "@/lib/utils";

type Props = {
    files: AuditEvidenceMedia[];
    onRemove?: (index: number) => void;
    onDescriptionChange?: (index: number, description: string) => void;
    onDescriptionBlur?: (index: number, description: string) => void;
    readOnly?: boolean;
    label?: string;
    className?: string;
    chipClassName?: string;
};

function isImageMedia(file: AuditEvidenceMedia): boolean {
    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("image/")) return true;
    const data = String(file.data || "");
    if (data.startsWith("data:image/")) return true;
    return /\.(png|jpe?g|webp|gif)$/i.test(file.name || "");
}

export function AuditEvidenceAttachmentList({
    files,
    onRemove,
    onDescriptionChange,
    onDescriptionBlur,
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
                        {imageEntries.map(({ file, index }) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="relative w-[88px] shrink-0 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden group"
                            >
                                <button
                                    type="button"
                                    className="block w-full"
                                    title="View image"
                                    onClick={() => openPreview(file)}
                                >
                                    <img
                                        src={file.data}
                                        alt={file.name}
                                        className="h-[72px] w-full object-cover bg-slate-100"
                                    />
                                </button>
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
                                        onChange={(e) => onDescriptionChange(index, e.target.value)}
                                        onBlur={(e) => onDescriptionBlur?.(index, e.target.value)}
                                        placeholder="Desc."
                                        className="h-7 text-[10px] border-0 border-t border-slate-100 rounded-none px-1.5"
                                    />
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}

                {otherEntries.length > 0 && (
                    <div className="flex flex-row flex-wrap gap-2">
                        {otherEntries.map(({ file, index }) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex flex-col gap-1.5 min-w-[160px] max-w-[220px]"
                            >
                                <div
                                    className={cn(
                                        "flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs shadow-sm",
                                        chipClassName,
                                    )}
                                >
                                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="max-w-[120px] truncate" title={file.name}>
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
                                            onClick={() => onRemove(index)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                {readOnly ? (
                                    file.description?.trim() ? (
                                        <p className="text-xs text-slate-600 pl-1">{file.description}</p>
                                    ) : null
                                ) : onDescriptionChange ? (
                                    <Input
                                        value={file.description || ""}
                                        onChange={(e) => onDescriptionChange(index, e.target.value)}
                                        onBlur={(e) => onDescriptionBlur?.(index, e.target.value)}
                                        placeholder="Description (optional)"
                                        className="h-8 text-xs border-slate-200"
                                    />
                                ) : null}
                            </div>
                        ))}
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
