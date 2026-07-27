import { useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FindingResponseVersionTabs } from "@/components/FindingResponseVersionTabs";
import {
    formatNcDate,
    submitNonconformanceResponse,
    type NonconformanceResponse,
    type NonconformanceSummary,
} from "@/lib/nonconformanceApi";
import type { FindingCapaHistoryEntry } from "@/lib/auditFindings";

type FormProps = {
    nonconformanceId: number;
    onSubmitted: (updated: NonconformanceSummary) => void;
};

export function AuditeeNcResponseForm({ nonconformanceId, onSubmitted }: FormProps) {
    const [rootCause, setRootCause] = useState("");
    const [immediateCorrection, setImmediateCorrection] = useState("");
    const [correctiveAction, setCorrectiveAction] = useState("");
    const [preventiveAction, setPreventiveAction] = useState("");
    const [proposedCompletionDate, setProposedCompletionDate] = useState("");
    const [additionalComments, setAdditionalComments] = useState("");
    const [evidenceFilenames, setEvidenceFilenames] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const canSubmit =
        rootCause.trim().length > 0 && correctiveAction.trim().length > 0 && !submitting;

    const handleFiles = (files: FileList | null) => {
        if (!files?.length) return;
        const names = Array.from(files)
            .map((f) => f.name.trim())
            .filter(Boolean);
        setEvidenceFilenames((prev) => [...new Set([...prev, ...names])]);
    };

    const handleSubmit = async () => {
        if (!rootCause.trim()) {
            toast.error("Root Cause is required");
            return;
        }
        if (!correctiveAction.trim()) {
            toast.error("Corrective Action is required");
            return;
        }
        setSubmitting(true);
        try {
            const updated = await submitNonconformanceResponse(nonconformanceId, {
                rootCause: rootCause.trim(),
                immediateCorrection: immediateCorrection.trim() || undefined,
                correctiveAction: correctiveAction.trim(),
                preventiveAction: preventiveAction.trim() || undefined,
                proposedCompletionDate: proposedCompletionDate || undefined,
                additionalComments: additionalComments.trim() || undefined,
                evidenceFilenames,
            });
            toast.success("Response submitted successfully");
            onSubmitted(updated);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to submit response");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#213847]">Submit Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                        Root Cause <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        className="min-h-[90px] bg-slate-50 border-slate-200"
                        value={rootCause}
                        onChange={(e) => setRootCause(e.target.value)}
                        placeholder="Why did this nonconformance occur?"
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                        Immediate Correction
                    </Label>
                    <Textarea
                        className="min-h-[80px] bg-slate-50 border-slate-200"
                        value={immediateCorrection}
                        onChange={(e) => setImmediateCorrection(e.target.value)}
                        placeholder="Immediate action taken..."
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                        Corrective Action <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                        className="min-h-[90px] bg-slate-50 border-slate-200"
                        value={correctiveAction}
                        onChange={(e) => setCorrectiveAction(e.target.value)}
                        placeholder="Action to prevent recurrence..."
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                        Preventive Action
                    </Label>
                    <Textarea
                        className="min-h-[80px] bg-slate-50 border-slate-200"
                        value={preventiveAction}
                        onChange={(e) => setPreventiveAction(e.target.value)}
                        placeholder="Preventive measures..."
                        disabled={submitting}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">
                            Proposed Completion Date
                        </Label>
                        <Input
                            type="date"
                            className="h-10 bg-slate-50 border-slate-200"
                            value={proposedCompletionDate}
                            onChange={(e) => setProposedCompletionDate(e.target.value)}
                            disabled={submitting}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Evidence Upload</Label>
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            disabled={submitting}
                            onChange={(e) => {
                                handleFiles(e.target.files);
                                e.target.value = "";
                            }}
                        />
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-600">
                            Attach evidence files (filenames are saved)
                        </span>
                    </label>
                    {evidenceFilenames.length > 0 && (
                        <ul className="space-y-1.5 mt-2">
                            {evidenceFilenames.map((name) => (
                                <li
                                    key={name}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate flex-1">{name}</span>
                                    <button
                                        type="button"
                                        className="text-slate-400 hover:text-red-500"
                                        disabled={submitting}
                                        onClick={() =>
                                            setEvidenceFilenames((prev) =>
                                                prev.filter((n) => n !== name),
                                            )
                                        }
                                        aria-label={`Remove ${name}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                        Additional Comments
                    </Label>
                    <Textarea
                        className="min-h-[80px] bg-slate-50 border-slate-200"
                        value={additionalComments}
                        onChange={(e) => setAdditionalComments(e.target.value)}
                        placeholder="Any additional notes..."
                        disabled={submitting}
                    />
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => void handleSubmit()}
                        className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-1.5"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Submitting…
                            </>
                        ) : (
                            "Submit Response"
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function ResponseField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">
                {value?.trim() ? value : "—"}
            </p>
        </div>
    );
}

type ListProps = {
    responses: NonconformanceResponse[];
};

export function SubmittedNcResponses({ responses }: ListProps) {
    if (!responses.length) {
        return (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No responses submitted yet.
            </p>
        );
    }

    const sorted = [...responses].sort((a, b) => (a.version || 0) - (b.version || 0));
    const current = sorted[sorted.length - 1]!;
    const previousEntries: FindingCapaHistoryEntry[] = sorted.slice(0, -1).map((r) => ({
        submittedAt: r.submittedAt,
        rootCause: r.rootCause,
        correction: r.immediateCorrection || undefined,
        correctiveAction: r.correctiveAction,
        findingDetails: [
            r.preventiveAction?.trim()
                ? `Preventive Action: ${r.preventiveAction.trim()}`
                : "",
            r.additionalComments?.trim() || "",
        ]
            .filter(Boolean)
            .join("\n\n"),
    }));

    const renderResponse = (response: NonconformanceResponse) => (
        <div
            key={response.id}
            className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#213847]">
                    Submitted Response
                    <span className="ml-2 text-xs font-bold text-slate-500">
                        Version {response.version}
                    </span>
                </p>
                <p className="text-xs text-slate-500">
                    Submitted {formatNcDate(response.submittedAt)}
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResponseField label="Root Cause" value={response.rootCause} />
                <ResponseField
                    label="Immediate Correction"
                    value={response.immediateCorrection}
                />
                <ResponseField
                    label="Corrective Action"
                    value={response.correctiveAction}
                />
                <ResponseField
                    label="Preventive Action"
                    value={response.preventiveAction}
                />
                <ResponseField
                    label="Proposed Completion Date"
                    value={formatNcDate(response.proposedCompletionDate)}
                />
                <ResponseField
                    label="Additional Comments"
                    value={response.additionalComments}
                />
            </div>
            <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Evidence
                </p>
                {(response.evidenceFilenames?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500">No evidence attached.</p>
                ) : (
                    <ul className="space-y-1">
                        {response.evidenceFilenames!.map((name) => (
                            <li
                                key={`${response.id}-${name}`}
                                className="flex items-center gap-2 text-sm text-slate-700"
                            >
                                <FileText className="h-3.5 w-3.5 text-slate-400" />
                                {name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );

    return (
        <FindingResponseVersionTabs
            currentContent={renderResponse(current)}
            previous={previousEntries}
            currentLabel="Current response"
            previousLabel="Previous response"
        />
    );
}
