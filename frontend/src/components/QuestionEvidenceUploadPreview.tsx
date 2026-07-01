import { Camera, FileText, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    files: File[];
    onUpload: (files: FileList | null) => void;
    onRemove: (index: number) => void;
    className?: string;
    uploadId?: string;
};

const actionButtonClass =
    "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 cursor-pointer";

export function QuestionEvidenceUploadPreview({
    files,
    onUpload,
    onRemove,
    className,
    uploadId,
}: Props) {
    const resetAndUpload = (fileList: FileList | null, input: HTMLInputElement) => {
        onUpload(fileList);
        input.value = "";
    };

    return (
        <div className={cn("mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3", className)}>
            <div className="flex flex-wrap gap-2">
                <label className={actionButtonClass}>
                    <Upload className="h-3.5 w-3.5 shrink-0" />
                    Upload evidence
                    <input
                        id={uploadId}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => resetAndUpload(e.target.files, e.target)}
                    />
                </label>
                <label className={actionButtonClass}>
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    Take picture
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => resetAndUpload(e.target.files, e.target)}
                    />
                </label>
            </div>
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {files.map((file, fileIdx) => (
                        <div
                            key={`${file.name}-${fileIdx}`}
                            className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-700 shadow-sm"
                        >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="max-w-[140px] truncate" title={file.name}>
                                {file.name}
                            </span>
                            <button
                                type="button"
                                className="text-slate-400 transition-colors hover:text-red-500"
                                onClick={() => onRemove(fileIdx)}
                                title="Remove attachment"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
