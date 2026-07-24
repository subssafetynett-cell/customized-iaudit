import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    raiseNonconformance,
    type NonconformanceSummary,
} from "@/lib/nonconformanceApi";

export type AuditeeOption = {
    id: number;
    label: string;
};

type Props = {
    auditPlanId: number;
    findingId: string;
    findingTitle: string;
    findingDescription: string;
    /** Existing NC for this finding, if already raised. */
    existing?: NonconformanceSummary | null;
    auditees: AuditeeOption[];
    readOnly?: boolean;
    className?: string;
    onRaised?: (nc: NonconformanceSummary) => void;
};

export function RaiseNonconformanceCard({
    auditPlanId,
    findingId,
    findingTitle,
    findingDescription,
    existing = null,
    auditees,
    readOnly = false,
    className,
    onRaised,
}: Props) {
    const navigate = useNavigate();
    const [assigneeId, setAssigneeId] = useState<string>("");
    const [dueDate, setDueDate] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [raised, setRaised] = useState<NonconformanceSummary | null>(existing);

    useEffect(() => {
        setRaised(existing ?? null);
    }, [existing?.id, existing?.ncNumber, existing?.status]);

    useEffect(() => {
        // Reset draft fields when switching findings.
        setAssigneeId("");
        setDueDate("");
    }, [findingId]);

    const descriptionOk = findingDescription.trim().length > 0;
    const canRaise =
        !readOnly &&
        !raised &&
        Boolean(assigneeId) &&
        Boolean(dueDate) &&
        descriptionOk;

    const statusLabel = raised
        ? String(raised.status || "ASSIGNED")
        : "Not Raised";

    const disableReason = useMemo(() => {
        if (readOnly) return "Read-only";
        if (raised) return null;
        if (!descriptionOk) return "Add a finding description first";
        if (!assigneeId) return "Select an auditee";
        if (!dueDate) return "Select a due date";
        return null;
    }, [readOnly, raised, descriptionOk, assigneeId, dueDate]);

    const handleRaise = async () => {
        if (!canRaise) return;
        setSubmitting(true);
        try {
            const nc = await raiseNonconformance({
                auditPlanId,
                findingId,
                assigneeId: Number(assigneeId),
                dueDate,
                findingTitle: findingTitle.trim() || undefined,
                findingDescription: findingDescription.trim(),
            });
            setRaised(nc);
            onRaised?.(nc);
            toast.success(`Nonconformance ${nc.ncNumber} raised successfully`);
        } catch (err) {
            const e = err as Error & {
                status?: number;
                existingId?: number;
                existingNcNumber?: string;
            };
            if (e.status === 409 && e.existingNcNumber) {
                const recovered: NonconformanceSummary = {
                    id: Number(e.existingId) || 0,
                    ncNumber: e.existingNcNumber,
                    auditPlanId,
                    findingId,
                    findingTitle,
                    findingDescription,
                    severity: "Minor",
                    assigneeId: Number(assigneeId) || 0,
                    reviewerId: 0,
                    dueDate: dueDate || null,
                    status: "ASSIGNED",
                    createdAt: new Date().toISOString(),
                };
                setRaised(recovered);
                onRaised?.(recovered);
                toast.message(`Already raised as ${e.existingNcNumber}`);
            } else {
                toast.error(e.message || "Failed to raise nonconformance");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleView = () => {
        if (!raised?.id) return;
        navigate(`/nonconformances/${raised.id}`);
    };

    if (raised) {
        return (
            <div
                className={cn(
                    "rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm",
                    className,
                )}
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Nonconformance Raised
                        </div>
                        <p className="text-sm font-semibold text-emerald-900 tracking-tight">
                            {raised.ncNumber}
                        </p>
                        <p className="text-xs text-emerald-700">
                            Status:{" "}
                            <span className="font-semibold uppercase tracking-wide">
                                {statusLabel}
                            </span>
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleView}
                        disabled={!raised.id}
                        className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 gap-1.5 shrink-0"
                    >
                        <Eye className="h-4 w-4" />
                        View Nonconformance
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
                className,
            )}
        >
            <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                    Raise Nonconformance
                </h4>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {statusLabel}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                        Assign To (Auditee) *
                    </Label>
                    <Select
                        value={assigneeId || undefined}
                        onValueChange={setAssigneeId}
                        disabled={readOnly || submitting}
                    >
                        <SelectTrigger className="h-9 bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Select auditee" />
                        </SelectTrigger>
                        <SelectContent>
                            {auditees.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No auditees available — create one under Users
                                </div>
                            ) : (
                                auditees.map((a) => (
                                    <SelectItem key={a.id} value={String(a.id)}>
                                        {a.label}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                        Due Date *
                    </Label>
                    <Input
                        type="date"
                        className="h-9 bg-slate-50 border-slate-200"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={readOnly || submitting}
                    />
                </div>
            </div>

            {!descriptionOk && (
                <p className="mt-2 text-xs text-amber-700">
                    Fill in the finding description before raising a Nonconformance.
                </p>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500">
                    {disableReason && !submitting ? disableReason : "\u00A0"}
                </p>
                <Button
                    type="button"
                    size="sm"
                    disabled={!canRaise || submitting}
                    onClick={() => void handleRaise()}
                    className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-1.5"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Raising…
                        </>
                    ) : (
                        "Raise Nonconformance"
                    )}
                </Button>
            </div>
        </div>
    );
}
