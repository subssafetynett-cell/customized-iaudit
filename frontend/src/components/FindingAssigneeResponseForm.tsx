import { useMemo, useState, useRef, type ReactNode } from "react";
import { FileText, Loader2, Plus, Save, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FindingResponseVersionTabs } from "@/components/FindingResponseVersionTabs";
import {
    findingActionByDisplay,
    notifyFindingResponse,
    saveFindingOverride,
    splitFindingCapaHistory,
    TYPE_CONFIG,
    type Finding,
} from "@/lib/auditFindings";
import {
    createEmptyCapaForm,
    getCapaFormMissingForSubmit,
    parseCapaForm,
    summarizeCapaForm,
    type CapaActionRow,
    type CapaFiveWhyRow,
    type CapaOtherAreaRow,
    type FindingCapaForm,
} from "@/lib/findingCapaForm";
import {
    processAuditEvidenceFileList,
    type AuditEvidenceMedia,
} from "@/lib/evidenceImageUpload";
import {
    submitNonconformanceResponse,
    type NonconformanceSummary,
} from "@/lib/nonconformanceApi";
import { cn } from "@/lib/utils";

type Props = {
    finding: Finding;
    /** When set, response is submitted to the formal NC workflow. */
    nonconformanceId?: number | null;
    /** True when editing an existing submitted / draft response. */
    isEditing?: boolean;
    onSubmitted: (result: {
        finding: Finding;
        nonconformance?: NonconformanceSummary;
    }) => void;
    onCancel?: () => void;
};

function SectionTitle({ children }: { children: ReactNode }) {
    return (
        <div className="bg-[#1e3a5f] text-white px-3 py-2.5 text-sm font-bold tracking-wide uppercase border border-slate-400">
            {children}
        </div>
    );
}

function SubHead({ children }: { children: ReactNode }) {
    return (
        <div className="bg-[#d6e6f2] border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900">
            {children}
        </div>
    );
}

function CellLabel({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "bg-[#eef4f9] border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-800",
                className,
            )}
        >
            {children}
        </div>
    );
}

function FieldCell({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("border border-slate-300 bg-white p-1.5", className)}>
            {children}
        </div>
    );
}

const inputCls = "h-9 border-slate-200 bg-white text-sm";
const areaCls = "min-h-[72px] border-slate-200 bg-white text-sm resize-y";

function ActionPlanTable({
    title,
    rows,
    onChange,
    disabled,
}: {
    title: string;
    rows: CapaActionRow[];
    onChange: (rows: CapaActionRow[]) => void;
    disabled?: boolean;
}) {
    const update = (idx: number, patch: Partial<CapaActionRow>) => {
        onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };
    return (
        <div className="space-y-0">
            <SubHead>{title}</SubHead>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                        <tr>
                            {[
                                "Non Conformance",
                                "Proposed Action Steps",
                                "Responsibility",
                                "Due Date",
                                "Closed By Signature",
                                "",
                            ].map((h) => (
                                <th
                                    key={h || "x"}
                                    className="bg-[#eef4f9] border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-800"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx}>
                                <td className="border border-slate-300 p-1 align-top">
                                    <Textarea
                                        className="min-h-[56px] border-0 shadow-none focus-visible:ring-0 resize-y text-sm"
                                        value={row.nonConformance}
                                        disabled={disabled}
                                        onChange={(e) =>
                                            update(idx, { nonConformance: e.target.value })
                                        }
                                    />
                                </td>
                                <td className="border border-slate-300 p-1 align-top">
                                    <Textarea
                                        className="min-h-[56px] border-0 shadow-none focus-visible:ring-0 resize-y text-sm"
                                        value={row.proposedAction}
                                        disabled={disabled}
                                        onChange={(e) =>
                                            update(idx, { proposedAction: e.target.value })
                                        }
                                    />
                                </td>
                                <td className="border border-slate-300 p-1 align-top w-[140px]">
                                    <Input
                                        className={cn(inputCls, "border-0 shadow-none")}
                                        value={row.responsibility}
                                        disabled={disabled}
                                        onChange={(e) =>
                                            update(idx, { responsibility: e.target.value })
                                        }
                                    />
                                </td>
                                <td className="border border-slate-300 p-1 align-top w-[140px]">
                                    <Input
                                        type="date"
                                        className={cn(inputCls, "border-0 shadow-none")}
                                        value={row.dueDate}
                                        disabled={disabled}
                                        onChange={(e) =>
                                            update(idx, { dueDate: e.target.value })
                                        }
                                    />
                                </td>
                                <td className="border border-slate-300 p-1 align-top w-[140px]">
                                    <Input
                                        className={cn(inputCls, "border-0 shadow-none")}
                                        value={row.closedBySignature}
                                        disabled={disabled}
                                        onChange={(e) =>
                                            update(idx, {
                                                closedBySignature: e.target.value,
                                            })
                                        }
                                    />
                                </td>
                                <td className="border border-slate-300 p-1 w-10 align-middle text-center">
                                    {rows.length > 1 ? (
                                        <button
                                            type="button"
                                            className="text-slate-400 hover:text-red-500"
                                            disabled={disabled}
                                            onClick={() =>
                                                onChange(rows.filter((_, i) => i !== idx))
                                            }
                                            aria-label="Remove row"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="border border-t-0 border-slate-300 px-2 py-1.5 bg-slate-50">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={disabled}
                    onClick={() =>
                        onChange([
                            ...rows,
                            {
                                nonConformance: "",
                                proposedAction: "",
                                responsibility: "",
                                dueDate: "",
                                closedBySignature: "",
                            },
                        ])
                    }
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add row
                </Button>
            </div>
        </div>
    );
}

export function FindingAssigneeResponseForm({
    finding,
    nonconformanceId,
    isEditing = false,
    onSubmitted,
    onCancel,
}: Props) {
    const seedNc = [
        finding.description?.trim(),
        finding.details?.trim(),
        finding.evidence?.trim() ? `Evidence notes: ${finding.evidence.trim()}` : "",
    ]
        .filter(Boolean)
        .join("\n\n");

    const [form, setForm] = useState<FindingCapaForm>(() => {
        const parsed = parseCapaForm(finding.capaForm);
        if (parsed) return parsed;
        return createEmptyCapaForm({
            areaLineProcessAudit: [finding.auditName, finding.clauseRef, finding.moduleName]
                .filter(Boolean)
                .join(" · "),
            nonConformanceSummary: seedNc,
        });
    });
    const [evidenceFiles, setEvidenceFiles] = useState<AuditEvidenceMedia[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const actionRef = useRef<"send" | "draft">("send");

    const typeCfg = TYPE_CONFIG[finding.type];
    const raisedBy =
        (finding.raisedByName || finding.raisedBy || findingActionByDisplay(finding) || "")
            .replace(/\s*\([^)]*@[^)]*\)\s*$/, "")
            .trim() || "—";

    const patch = (partial: Partial<FindingCapaForm>) =>
        setForm((prev) => ({ ...prev, ...partial }));

    const patchFishbone = (key: keyof FindingCapaForm["fishbone"], value: string) =>
        setForm((prev) => ({
            ...prev,
            fishbone: { ...prev.fishbone, [key]: value },
        }));

    const updateFiveWhy = (idx: number, partial: Partial<CapaFiveWhyRow>) => {
        setForm((prev) => ({
            ...prev,
            fiveWhys: prev.fiveWhys.map((r, i) => (i === idx ? { ...r, ...partial } : r)),
        }));
    };

    const updateOtherArea = (idx: number, partial: Partial<CapaOtherAreaRow>) => {
        setForm((prev) => ({
            ...prev,
            otherAreaRows: prev.otherAreaRows.map((r, i) =>
                i === idx ? { ...r, ...partial } : r,
            ),
        }));
    };

    const handleEvidenceUpload = async (files: FileList | null) => {
        if (!files?.length) return;
        const { accepted, rejected } = await processAuditEvidenceFileList(files, {
            planId: finding.auditId,
        });
        if (rejected.length > 0) {
            toast.error(rejected[0].error || "Some files could not be uploaded");
        }
        if (accepted.length > 0) {
            setEvidenceFiles((prev) => [...prev, ...accepted]);
            toast.success(
                accepted.length === 1
                    ? "Evidence file added"
                    : `${accepted.length} evidence files added`,
            );
        }
    };

    const buildFindingPayload = (isDraft: boolean): Finding => {
        const summary = summarizeCapaForm(form);
        const earliestDue =
            [...form.correctionRows, ...form.correctiveRows, ...form.preventiveRows]
                .map((r) => r.dueDate.trim())
                .filter(Boolean)
                .sort()[0] || finding.closeDate || "";

        const priorHistory = Array.isArray(finding.capaResponseHistory)
            ? [...finding.capaResponseHistory]
            : [];

        let nextHistory = priorHistory;
        if (!isDraft) {
            const isResubmit =
                priorHistory.length > 0 ||
                finding.status === "New Response" ||
                finding.status === "Responded" ||
                Boolean(finding.rejectReason?.trim());
            const archived: typeof priorHistory = [];
            if (isResubmit && priorHistory.length === 0 && finding.capaForm) {
                archived.push({
                    submittedAt: new Date().toISOString(),
                    capaForm: finding.capaForm,
                    rootCause: finding.rootCause,
                    correction: finding.correction,
                    correctiveAction: finding.correctiveAction,
                    findingDetails: finding.findingDetails,
                });
            }
            nextHistory = [
                ...priorHistory,
                ...archived,
                {
                    submittedAt: new Date().toISOString(),
                    capaForm: form as unknown as Record<string, unknown>,
                    rootCause: summary.rootCause,
                    correction: summary.correction,
                    correctiveAction: summary.correctiveAction,
                    findingDetails: summary.findingDetails,
                },
            ];
        }

        return {
            ...finding,
            rootCause: summary.rootCause,
            correction: summary.correction,
            correctiveAction: summary.correctiveAction,
            findingDetails: summary.findingDetails || finding.findingDetails || "",
            details: [
                finding.details?.trim(),
                summary.preventiveAction
                    ? `Preventive Action(s): ${summary.preventiveAction}`
                    : "",
            ]
                .filter(Boolean)
                .join("\n"),
            closeDate: earliestDue,
            status: isDraft ? finding.status : "New Response",
            media: [...(finding.media || []), ...evidenceFiles],
            capaForm: form as unknown as Record<string, unknown>,
            capaResponseHistory: nextHistory,
            rejectReason: isDraft ? finding.rejectReason : "",
        };
    };

    const handleSaveDraft = async () => {
        actionRef.current = "draft";
        setSubmitting(true);
        try {
            const updatedFinding = buildFindingPayload(true);
            await saveFindingOverride(updatedFinding);
            toast.success("Draft saved successfully");
            onSubmitted({ finding: updatedFinding });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save draft");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendToReporter = async () => {
        const missing = getCapaFormMissingForSubmit(form);
        if (missing.length > 0) {
            toast.error(`Please complete: ${missing.join(", ")}`);
            return;
        }

        actionRef.current = "send";
        setSubmitting(true);
        try {
            const updatedFinding = buildFindingPayload(false);
            const summary = summarizeCapaForm(form);
            const wasUpdate =
                isEditing ||
                Boolean(finding.capaForm) ||
                Boolean(finding.rootCause?.trim()) ||
                finding.status === "Responded" ||
                finding.status === "New Response";

            if (nonconformanceId) {
                const nc = await submitNonconformanceResponse(nonconformanceId, {
                    rootCause: summary.rootCause,
                    immediateCorrection: summary.correction,
                    correctiveAction: summary.correctiveAction,
                    preventiveAction: summary.preventiveAction || undefined,
                    proposedCompletionDate: updatedFinding.closeDate || undefined,
                    additionalComments: [
                        wasUpdate
                            ? "CAPA / RCA response (Sections A–E) updated and resubmitted."
                            : "CAPA / RCA response (Sections A–E) submitted.",
                        summary.findingDetails,
                        form.probableCauses.trim()
                            ? `Probable causes: ${form.probableCauses.trim()}`
                            : "",
                        form.effectivenessCriteria.trim()
                            ? `Effectiveness criteria: ${form.effectivenessCriteria.trim()}`
                            : "",
                    ]
                        .filter(Boolean)
                        .join("\n\n"),
                    evidenceFilenames: evidenceFiles.map((f) => f.name),
                });

                try {
                    await saveFindingOverride(updatedFinding);
                } catch {
                    // NC submit already succeeded; finding sync is best-effort.
                }

                toast.success(
                    wasUpdate
                        ? "Updated response sent to reporter"
                        : "Response sent to reporter",
                );
                onSubmitted({ finding: updatedFinding, nonconformance: nc });
                return;
            }

            await saveFindingOverride(updatedFinding);
            try {
                await notifyFindingResponse(updatedFinding, { isUpdate: wasUpdate });
            } catch (notifyErr) {
                console.error(notifyErr);
                toast.message("Response saved", {
                    description:
                        "Could not email the reporter — they can still see it under Raised by me.",
                });
            }
            toast.success(
                wasUpdate
                    ? "Updated response sent to reporter"
                    : "Response sent to reporter",
            );
            onSubmitted({ finding: updatedFinding });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send response");
        } finally {
            setSubmitting(false);
        }
    };

    const canSend = !submitting;
    const { current: currentSubmitted, previous: olderResponses } = useMemo(
        () => splitFindingCapaHistory(finding),
        [finding],
    );
    // While editing/resubmitting, show the last submitted version under Previous.
    const previousForTabs = useMemo(() => {
        if (!isEditing) return [];
        if (olderResponses.length > 0) return olderResponses;
        return currentSubmitted ? [currentSubmitted] : [];
    }, [isEditing, olderResponses, currentSubmitted]);

    const formBody = (
        <div className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <h2 className="text-base font-semibold text-[#213847]">
                    {isEditing
                        ? "Edit response — CAPA / RCA form"
                        : "Respond to finding — CAPA / RCA form"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                    {isEditing
                        ? "Update Sections A–E as needed, then save as draft or send to the reporter again."
                        : "Complete Sections A–E below, then save as draft or send to the reporter."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span
                        className={cn(
                            "inline-flex px-2.5 py-1 rounded-full font-bold ring-1",
                            typeCfg.bg,
                            typeCfg.text,
                            typeCfg.ring,
                        )}
                    >
                        {typeCfg.label}
                    </span>
                    <span className="inline-flex px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-700">
                        {finding.clauseRef}
                    </span>
                    <span className="inline-flex px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-700">
                        Raised by: {raisedBy}
                    </span>
                </div>
            </div>

            <div className="space-y-4 p-3 sm:p-4">
                {/* SECTION A */}
                <section>
                    <SectionTitle>Section A: Details of Non-Conformity</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                        <CellLabel>Date</CellLabel>
                        <CellLabel>Area / Line / Process / Audit</CellLabel>
                        <CellLabel>Process Owner</CellLabel>
                        <CellLabel>CAP No</CellLabel>
                        <CellLabel>RCA Team Members</CellLabel>
                        <FieldCell>
                            <Input
                                type="date"
                                className={inputCls}
                                value={form.date}
                                disabled={submitting}
                                onChange={(e) => patch({ date: e.target.value })}
                            />
                        </FieldCell>
                        <FieldCell>
                            <Input
                                className={inputCls}
                                value={form.areaLineProcessAudit}
                                disabled={submitting}
                                onChange={(e) =>
                                    patch({ areaLineProcessAudit: e.target.value })
                                }
                            />
                        </FieldCell>
                        <FieldCell>
                            <Input
                                className={inputCls}
                                value={form.processOwner}
                                disabled={submitting}
                                onChange={(e) => patch({ processOwner: e.target.value })}
                            />
                        </FieldCell>
                        <FieldCell>
                            <Input
                                className={inputCls}
                                value={form.capNo}
                                disabled={submitting}
                                onChange={(e) => patch({ capNo: e.target.value })}
                            />
                        </FieldCell>
                        <FieldCell>
                            <Input
                                className={inputCls}
                                value={form.rcaTeamMembers}
                                disabled={submitting}
                                onChange={(e) => patch({ rcaTeamMembers: e.target.value })}
                            />
                        </FieldCell>
                    </div>

                    <SubHead>Non-conformance details</SubHead>
                    <div className="grid grid-cols-1 md:grid-cols-[120px_1fr]">
                        {(
                            [
                                ["What", "What happened?", "whatHappened"],
                                ["Where", "Where did it happen?", "whereHappened"],
                                ["When", "When did it happen?", "whenHappened"],
                                ["Why", "Why was it a problem?", "whyProblem"],
                                ["Who", "Who was involved?", "whoInvolved"],
                                ["How", "How big was the problem?", "howBig"],
                            ] as const
                        ).map(([label, hint, key]) => (
                            <div key={key} className="contents">
                                <CellLabel>
                                    {label}
                                    <span className="block font-normal text-slate-500 mt-0.5">
                                        {hint}
                                    </span>
                                </CellLabel>
                                <FieldCell>
                                    <Textarea
                                        className={areaCls}
                                        value={form[key]}
                                        disabled={submitting}
                                        onChange={(e) => patch({ [key]: e.target.value })}
                                        placeholder={hint}
                                    />
                                </FieldCell>
                            </div>
                        ))}
                    </div>

                    <SubHead>
                        Description of incident of failure — What was observed before,
                        during and after the incident occurred
                    </SubHead>
                    <div className="grid grid-cols-1 md:grid-cols-3">
                        {(
                            [
                                ["Before", "observedBefore"],
                                ["During", "observedDuring"],
                                ["After", "observedAfter"],
                            ] as const
                        ).map(([label, key]) => (
                            <div key={key}>
                                <CellLabel>{label}:</CellLabel>
                                <FieldCell>
                                    <Textarea
                                        className={areaCls}
                                        value={form[key]}
                                        disabled={submitting}
                                        onChange={(e) => patch({ [key]: e.target.value })}
                                    />
                                </FieldCell>
                            </div>
                        ))}
                    </div>
                </section>

                {/* SECTION B */}
                <section>
                    <SectionTitle>
                        Section B: Multiple Method Root Cause Analysis
                    </SectionTitle>
                    <p className="border border-t-0 border-slate-300 px-3 py-2 text-xs text-slate-600 bg-slate-50">
                        Initiate the root cause analysis with the Fishbone method to map
                        out possible causes. Then apply the 5 Whys method to each probable
                        cause to isolate the true root cause.
                    </p>

                    <SubHead>Fish Bone Method</SubHead>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {(
                            [
                                ["Method", "method"],
                                ["Environment", "environment"],
                                ["Materials", "materials"],
                                ["Management", "management"],
                                ["Machine", "machine"],
                                ["Manpower", "manpower"],
                            ] as const
                        ).map(([label, key]) => (
                            <div key={key}>
                                <CellLabel>{label}</CellLabel>
                                <FieldCell>
                                    <Textarea
                                        className={areaCls}
                                        value={form.fishbone[key]}
                                        disabled={submitting}
                                        onChange={(e) => patchFishbone(key, e.target.value)}
                                        placeholder={`Possible ${label.toLowerCase()} causes…`}
                                    />
                                </FieldCell>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr]">
                        <CellLabel>Probable Causes:</CellLabel>
                        <FieldCell>
                            <Textarea
                                className={areaCls}
                                value={form.probableCauses}
                                disabled={submitting}
                                onChange={(e) => patch({ probableCauses: e.target.value })}
                            />
                        </FieldCell>
                    </div>

                    <SubHead>5 Whys Method</SubHead>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-sm">
                            <thead>
                                <tr>
                                    {[
                                        "Fishbone Probable Cause",
                                        "Why 1",
                                        "Why 2",
                                        "Why 3",
                                        "Why 4",
                                        "Why 5",
                                        "Root Cause",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="bg-[#eef4f9] border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-800"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {form.fiveWhys.map((row, idx) => (
                                    <tr key={idx}>
                                        {(
                                            [
                                                "fishboneCause",
                                                "why1",
                                                "why2",
                                                "why3",
                                                "why4",
                                                "why5",
                                                "rootCause",
                                            ] as const
                                        ).map((key) => (
                                            <td
                                                key={key}
                                                className="border border-slate-300 p-1 align-top"
                                            >
                                                <Textarea
                                                    className="min-h-[64px] border-0 shadow-none focus-visible:ring-0 resize-y text-sm"
                                                    value={row[key]}
                                                    disabled={submitting}
                                                    onChange={(e) =>
                                                        updateFiveWhy(idx, {
                                                            [key]: e.target.value,
                                                        })
                                                    }
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border border-t-0 border-slate-300 px-2 py-1.5 bg-slate-50 flex gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={submitting}
                            onClick={() =>
                                setForm((prev) => ({
                                    ...prev,
                                    fiveWhys: [
                                        ...prev.fiveWhys,
                                        {
                                            fishboneCause: "",
                                            why1: "",
                                            why2: "",
                                            why3: "",
                                            why4: "",
                                            why5: "",
                                            rootCause: "",
                                        },
                                    ],
                                }))
                            }
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add 5 Whys row
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr]">
                        <CellLabel>Root Cause(s):</CellLabel>
                        <FieldCell>
                            <Textarea
                                className={areaCls}
                                value={form.rootCauses}
                                disabled={submitting}
                                onChange={(e) => patch({ rootCauses: e.target.value })}
                                placeholder="Summarize the true root cause(s)…"
                            />
                        </FieldCell>
                    </div>
                </section>

                {/* SECTION C */}
                <section className="space-y-3">
                    <SectionTitle>
                        Section C: Actions to Eliminate the Cause of the Nonconformity
                    </SectionTitle>
                    <ActionPlanTable
                        title="Correction"
                        rows={form.correctionRows}
                        disabled={submitting}
                        onChange={(rows) => patch({ correctionRows: rows })}
                    />
                    <ActionPlanTable
                        title="Corrective Action Plan"
                        rows={form.correctiveRows}
                        disabled={submitting}
                        onChange={(rows) => patch({ correctiveRows: rows })}
                    />
                    <ActionPlanTable
                        title="Preventive Action Plan"
                        rows={form.preventiveRows}
                        disabled={submitting}
                        onChange={(rows) => patch({ preventiveRows: rows })}
                    />
                </section>

                {/* SECTION D */}
                <section>
                    <SectionTitle>
                        Section D: Evaluation of Corrective / Preventive Actions
                    </SectionTitle>
                    <SubHead>Effectiveness Criteria</SubHead>
                    <FieldCell>
                        <Textarea
                            className="min-h-[100px] border-slate-200 bg-white text-sm resize-y"
                            value={form.effectivenessCriteria}
                            disabled={submitting}
                            onChange={(e) =>
                                patch({ effectivenessCriteria: e.target.value })
                            }
                            placeholder="Describe how effectiveness will be verified…"
                        />
                    </FieldCell>
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                        <div className="grid grid-cols-[120px_1fr]">
                            <CellLabel>Verified By</CellLabel>
                            <FieldCell>
                                <Input
                                    className={inputCls}
                                    value={form.verifiedBy}
                                    disabled={submitting}
                                    onChange={(e) => patch({ verifiedBy: e.target.value })}
                                />
                            </FieldCell>
                        </div>
                        <div className="grid grid-cols-[120px_1fr]">
                            <CellLabel>Date</CellLabel>
                            <FieldCell>
                                <Input
                                    type="date"
                                    className={inputCls}
                                    value={form.verifiedDate}
                                    disabled={submitting}
                                    onChange={(e) =>
                                        patch({ verifiedDate: e.target.value })
                                    }
                                />
                            </FieldCell>
                        </div>
                    </div>
                </section>

                {/* SECTION E */}
                <section>
                    <SectionTitle>
                        Section E: Checking for Possibility of Occurrence in Other Areas
                    </SectionTitle>
                    <p className="border border-t-0 border-slate-300 px-3 py-2 text-xs text-slate-600 bg-slate-50">
                        Depending on the nature of the problem — check whether the same
                        issue could occur in other departments / areas.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-sm">
                            <thead>
                                <tr>
                                    {[
                                        "Department",
                                        "Yes",
                                        "No",
                                        "Action Taken",
                                        "Action By",
                                        "Date",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="bg-[#eef4f9] border border-slate-300 px-2 py-2 text-left text-xs font-semibold text-slate-800"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {form.otherAreaRows.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-slate-300 p-1">
                                            <Input
                                                className={cn(inputCls, "border-0 shadow-none")}
                                                value={row.department}
                                                disabled={submitting}
                                                onChange={(e) =>
                                                    updateOtherArea(idx, {
                                                        department: e.target.value,
                                                    })
                                                }
                                            />
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center w-14">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={row.yes}
                                                disabled={submitting}
                                                onChange={(e) =>
                                                    updateOtherArea(idx, {
                                                        yes: e.target.checked,
                                                        no: e.target.checked ? false : row.no,
                                                    })
                                                }
                                            />
                                        </td>
                                        <td className="border border-slate-300 p-1 text-center w-14">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={row.no}
                                                disabled={submitting}
                                                onChange={(e) =>
                                                    updateOtherArea(idx, {
                                                        no: e.target.checked,
                                                        yes: e.target.checked
                                                            ? false
                                                            : row.yes,
                                                    })
                                                }
                                            />
                                        </td>
                                        <td className="border border-slate-300 p-1">
                                            <Input
                                                className={cn(inputCls, "border-0 shadow-none")}
                                                value={row.actionTaken}
                                                disabled={submitting}
                                                onChange={(e) =>
                                                    updateOtherArea(idx, {
                                                        actionTaken: e.target.value,
                                                    })
                                                }
                                            />
                                        </td>
                                        <td className="border border-slate-300 p-1 w-[140px]">
                                            <Input
                                                className={cn(inputCls, "border-0 shadow-none")}
                                                value={row.actionBy}
                                                disabled={submitting}
                                                onChange={(e) =>
                                                    updateOtherArea(idx, {
                                                        actionBy: e.target.value,
                                                    })
                                                }
                                            />
                                        </td>
                                        <td className="border border-slate-300 p-1 w-[140px]">
                                            <Input
                                                type="date"
                                                className={cn(inputCls, "border-0 shadow-none")}
                                                value={row.date}
                                                disabled={submitting}
                                                onChange={(e) =>
                                                    updateOtherArea(idx, {
                                                        date: e.target.value,
                                                    })
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border border-t-0 border-slate-300 px-2 py-1.5 bg-slate-50">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={submitting}
                            onClick={() =>
                                setForm((prev) => ({
                                    ...prev,
                                    otherAreaRows: [
                                        ...prev.otherAreaRows,
                                        {
                                            department: "",
                                            yes: false,
                                            no: false,
                                            actionTaken: "",
                                            actionBy: "",
                                            date: "",
                                        },
                                    ],
                                }))
                            }
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add department row
                        </Button>
                    </div>
                </section>

                {/* Evidence */}
                <section>
                    <SectionTitle>Supporting Evidence</SectionTitle>
                    <FieldCell className="space-y-3 p-3">
                        <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                                type="file"
                                multiple
                                accept="image/png,image/jpeg,.png,.jpg,.jpeg,application/pdf,.pdf"
                                className="hidden"
                                disabled={submitting}
                                onChange={(e) => {
                                    void handleEvidenceUpload(e.target.files);
                                    e.target.value = "";
                                }}
                            />
                            <Upload className="h-4 w-4 text-slate-500" />
                            <span className="text-sm text-slate-600 text-center">
                                Attach evidence (PNG, JPEG, or PDF)
                            </span>
                        </label>
                        {evidenceFiles.length > 0 ? (
                            <ul className="space-y-1.5">
                                {evidenceFiles.map((file, idx) => (
                                    <li
                                        key={`${file.name}-${idx}`}
                                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                    >
                                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate flex-1">{file.name}</span>
                                        <button
                                            type="button"
                                            className="text-slate-400 hover:text-red-500"
                                            disabled={submitting}
                                            onClick={() =>
                                                setEvidenceFiles((prev) =>
                                                    prev.filter((_, i) => i !== idx),
                                                )
                                            }
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </FieldCell>
                </section>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border-t border-slate-200 bg-slate-50/50">
                <div>
                    {onCancel ? (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={submitting}
                            onClick={onCancel}
                            className="text-slate-500 hover:text-slate-800"
                        >
                            Cancel
                        </Button>
                    ) : null}
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => void handleSaveDraft()}
                        className="gap-1.5 border-slate-300"
                    >
                        {submitting && actionRef.current === "draft" ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save as Draft
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        disabled={!canSend}
                        onClick={() => void handleSendToReporter()}
                        className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-1.5"
                    >
                        {submitting && actionRef.current === "send" ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Sending…
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                {isEditing ? "Send update to Reporter" : "Send to Reporter"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <FindingResponseVersionTabs
            currentContent={formBody}
            previous={previousForTabs}
            currentLabel={isEditing ? "Edit response" : "Current response"}
            previousLabel="Previous response"
        />
    );
}
