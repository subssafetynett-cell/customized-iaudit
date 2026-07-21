import { Camera, Upload } from "lucide-react";
import { AuditEvidenceAttachmentList } from "@/components/AuditEvidenceAttachmentList";
import {
    AUDIT_EVIDENCE_ACCEPT,
    type AuditEvidenceMedia,
} from "@/lib/evidenceImageUpload";
import { cn } from "@/lib/utils";

type Props = {
    files: AuditEvidenceMedia[];
    onUpload: (files: FileList | null) => void;
    onRemove: (index: number) => void;
    onDescriptionChange?: (index: number, description: string) => void;
    onDescriptionBlur?: (index: number, description: string) => void;
    readOnly?: boolean;
    className?: string;
    uploadId?: string;
};

const actionButtonClass =
    "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 cursor-pointer";

export function QuestionEvidenceUpload({
    files,
    onUpload,
    onRemove,
    onDescriptionChange,
    onDescriptionBlur,
    readOnly = false,
    className,
    uploadId,
}: Props) {
    if (readOnly && files.length === 0) return null;

    const resetAndUpload = (fileList: FileList | null, input: HTMLInputElement) => {
        onUpload(fileList);
        input.value = "";
    };

    return (
        <div className={cn("mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3", className)}>
            {!readOnly && (
                <div className="flex flex-wrap gap-2">
                    <label className={actionButtonClass}>
                        <Upload className="h-3.5 w-3.5 shrink-0" />
                        Upload evidence
                        <input
                            id={uploadId}
                            type="file"
                            multiple
                            accept={AUDIT_EVIDENCE_ACCEPT}
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
            )}
            <AuditEvidenceAttachmentList
                files={files}
                onRemove={onRemove}
                onDescriptionChange={onDescriptionChange}
                onDescriptionBlur={onDescriptionBlur}
                readOnly={readOnly}
                label="Attached evidence"
                chipClassName="text-[10px]"
            />
        </div>
    );
}
