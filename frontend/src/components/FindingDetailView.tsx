import { useState } from "react";
import { Eye, FileText, Upload } from "lucide-react";
import {
    Finding,
    FindingStatus,
    STATUS_CONFIG,
} from "@/lib/auditFindings";
import type { AuditEvidenceMedia } from "@/lib/evidenceImageUpload";
import { AuditEvidencePreviewDialog } from "@/components/AuditEvidencePreviewDialog";

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${cfg.className}`}
        >
            {status}
        </span>
    );
}

function FindingDetailBlock({ label, value }: { label: string; value?: string }) {
    if (!value?.trim()) return null;
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                {value.trim()}
            </p>
        </div>
    );
}

export function FindingDetailsPreview({ finding }: { finding: Finding }) {
    const rows = [
        finding.evidence?.trim() ? { label: "Evidence", value: finding.evidence } : null,
        finding.findingDetails?.trim() ? { label: "Notes", value: finding.findingDetails } : null,
        finding.rootCause?.trim() ? { label: "Root cause", value: finding.rootCause } : null,
        finding.correctiveAction?.trim()
            ? { label: "Corrective action", value: finding.correctiveAction }
            : null,
    ].filter((row): row is { label: string; value: string } => row != null);

    if (rows.length === 0) {
        const fallback = finding.details?.trim();
        if (!fallback) return <span className="text-slate-400">—</span>;
        return (
            <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4 leading-snug">
                {fallback}
            </p>
        );
    }

    return (
        <div className="space-y-1 text-sm text-slate-600">
            {rows.map((row) => (
                <p key={row.label} className="leading-snug">
                    <span className="font-semibold text-slate-800">{row.label}:</span>{" "}
                    <span className="line-clamp-2">{row.value}</span>
                </p>
            ))}
        </div>
    );
}

function FindingAttachmentCard({
    media,
    onView,
}: {
    media: AuditEvidenceMedia;
    onView: (media: AuditEvidenceMedia) => void;
}) {
    const isImage = media.type.startsWith("image/");

    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            {isImage ? (
                <button
                    type="button"
                    className="block w-full"
                    onClick={() => onView(media)}
                    title="View attachment"
                >
                    <img
                        src={media.data}
                        alt={media.name}
                        className="w-full max-h-48 object-contain bg-slate-50 hover:opacity-95 transition-opacity"
                    />
                </button>
            ) : (
                <button
                    type="button"
                    className="flex w-full items-center gap-2 p-4 text-slate-500 hover:bg-slate-50 transition-colors"
                    onClick={() => onView(media)}
                    title="View attachment"
                >
                    <FileText className="w-8 h-8 shrink-0 text-emerald-600" />
                    <span className="text-sm truncate text-left">{media.name}</span>
                    <Eye className="w-4 h-4 ml-auto shrink-0 text-slate-400" />
                </button>
            )}
            <div className="flex items-center justify-between gap-2 px-2 py-1 border-t border-slate-100">
                <p className="text-[10px] text-slate-500 truncate">{media.name}</p>
                <button
                    type="button"
                    className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 shrink-0"
                    onClick={() => onView(media)}
                >
                    View
                </button>
            </div>
        </div>
    );
}

export function FindingDetailPanel({ finding }: { finding: Finding }) {
    const [previewMedia, setPreviewMedia] = useState<AuditEvidenceMedia | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const openPreview = (media: AuditEvidenceMedia) => {
        setPreviewMedia(media);
        setPreviewOpen(true);
    };

    return (
        <div className="space-y-4">
            <FindingDetailBlock label="Evidence" value={finding.evidence} />
            <FindingDetailBlock label="Notes" value={finding.findingDetails} />
            <FindingDetailBlock label="Correction" value={finding.correction} />
            <FindingDetailBlock label="Root cause" value={finding.rootCause} />
            <FindingDetailBlock label="Corrective action" value={finding.correctiveAction} />
            {!finding.evidence &&
            !finding.findingDetails &&
            !finding.correction &&
            !finding.rootCause &&
            !finding.correctiveAction &&
            finding.details?.trim() ? (
                <FindingDetailBlock label="Finding details" value={finding.details} />
            ) : null}

            <FindingDetailBlock label="Description" value={finding.description} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <FindingStatusBadge status={finding.status} />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action by</p>
                    <p className="text-sm text-slate-800">{finding.actionBy?.trim() || "—"}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target date</p>
                    <p className="text-sm text-slate-800">{finding.closeDate?.trim() || "—"}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned to</p>
                    <p className="text-sm text-slate-800">{finding.assignTo?.trim() || "—"}</p>
                </div>
            </div>

            {finding.media && finding.media.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        Evidence & attachments ({finding.media.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {finding.media.map((m, idx) => (
                            <FindingAttachmentCard
                                key={`${m.name}-${idx}`}
                                media={m}
                                onView={openPreview}
                            />
                        ))}
                    </div>
                </div>
            )}

            <AuditEvidencePreviewDialog
                media={previewMedia}
                open={previewOpen}
                onOpenChange={setPreviewOpen}
            />
        </div>
    );
}
