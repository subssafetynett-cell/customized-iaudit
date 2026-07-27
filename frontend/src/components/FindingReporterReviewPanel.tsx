import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    FindingResponseVersionTabs,
    ResponseVersionCard,
} from "@/components/FindingResponseVersionTabs";
import {
    isFindingAwaitingReporterReview,
    notifyFindingReview,
    saveFindingOverride,
    splitFindingCapaHistory,
    type Finding,
    type FindingCapaHistoryEntry,
    type FindingCapaReview,
} from "@/lib/auditFindings";
import {
    submitNonconformanceReview,
    type NonconformanceResponse,
    type NonconformanceSummary,
} from "@/lib/nonconformanceApi";
import { cn } from "@/lib/utils";

type Props = {
    finding: Finding;
    nonconformance?: NonconformanceSummary | null;
    reviewerName?: string;
    onUpdated: (result: {
        finding: Finding;
        nonconformance?: NonconformanceSummary;
    }) => void;
};

function formatWhen(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
}

export function FindingReporterReviewPanel({
    finding,
    nonconformance,
    reviewerName,
    onUpdated,
}: Props) {
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(null);

    const canReview =
        isFindingAwaitingReporterReview(finding) ||
        String(nonconformance?.status || "").toUpperCase() === "RESPONSE_SUBMITTED";
    const canTakeAction = canReview && finding.status !== "Closed";

    const { current, previous, ncCurrent, ncPrevious } = useMemo(() => {
        const capa = splitFindingCapaHistory(finding);
        const ncVersions = (nonconformance?.responses ?? [])
            .slice()
            .sort((a, b) => (a.version || 0) - (b.version || 0));

        const ncPrev = ncVersions.slice(0, -1);
        const ncCur = ncVersions.length > 0 ? ncVersions[ncVersions.length - 1] : null;

        return {
            current: capa.current,
            previous: capa.previous,
            ncCurrent: ncCur,
            ncPrevious: ncPrev,
        };
    }, [finding, nonconformance]);

    const reviews: FindingCapaReview[] = Array.isArray(finding.capaReviews)
        ? finding.capaReviews
        : [];

    const preferNc = (nonconformance?.responses?.length ?? 0) > 0;
    const previousForTabs: FindingCapaHistoryEntry[] = preferNc
        ? ncPrevious.map((r: NonconformanceResponse) => ({
              submittedAt: r.submittedAt,
              rootCause: r.rootCause,
              correction: r.immediateCorrection || undefined,
              correctiveAction: r.correctiveAction,
              findingDetails: r.additionalComments || undefined,
          }))
        : previous;

    const handleAcceptClose = async () => {
        setSubmitting("accept");
        try {
            let ncResult: NonconformanceSummary | undefined;
            if (nonconformance?.id) {
                try {
                    ncResult = await submitNonconformanceReview(nonconformance.id, {
                        decision: "APPROVE",
                        comment: "Accepted and closed by reporter.",
                    });
                } catch (ncErr) {
                    console.error(ncErr);
                }
            }

            const updated: Finding = {
                ...finding,
                status: "Closed",
                rejectReason: "",
                capaReviews: [
                    ...reviews,
                    {
                        decision: "ACCEPT",
                        reviewedAt: new Date().toISOString(),
                        reviewedByName: reviewerName,
                    },
                ],
            };
            await saveFindingOverride(updated);
            try {
                await notifyFindingReview(updated, {
                    decision: "ACCEPT",
                    nonconformanceId: nonconformance?.id,
                });
            } catch (notifyErr) {
                console.error(notifyErr);
            }
            toast.success("Response accepted — finding closed");
            onUpdated({ finding: updated, nonconformance: ncResult });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to accept response");
        } finally {
            setSubmitting(null);
        }
    };

    const handleRejectReopen = async () => {
        const reason = rejectReason.trim();
        if (!reason) {
            toast.error("Please enter a reason for rejecting");
            return;
        }
        setSubmitting("reject");
        try {
            let ncResult: NonconformanceSummary | undefined;
            if (nonconformance?.id) {
                try {
                    ncResult = await submitNonconformanceReview(nonconformance.id, {
                        decision: "REQUEST_CHANGES",
                        comment: reason,
                    });
                } catch (ncErr) {
                    console.error(ncErr);
                }
            }

            const updated: Finding = {
                ...finding,
                status: "Opened",
                rejectReason: reason,
                capaReviews: [
                    ...reviews,
                    {
                        decision: "REJECT",
                        reason,
                        reviewedAt: new Date().toISOString(),
                        reviewedByName: reviewerName,
                    },
                ],
            };
            await saveFindingOverride(updated);
            try {
                await notifyFindingReview(updated, {
                    decision: "REJECT",
                    reason,
                    nonconformanceId: nonconformance?.id,
                });
            } catch (notifyErr) {
                console.error(notifyErr);
            }
            toast.success("Response rejected — sent back to assignee");
            setRejectOpen(false);
            setRejectReason("");
            onUpdated({ finding: updated, nonconformance: ncResult });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to reject response");
        } finally {
            setSubmitting(null);
        }
    };

    const hasAnyResponse =
        Boolean(current) ||
        previous.length > 0 ||
        Boolean(ncCurrent) ||
        ncPrevious.length > 0 ||
        Boolean(finding.rootCause || finding.correction || finding.correctiveAction);

    if (!hasAnyResponse && !canReview) return null;

    const currentCard = preferNc && ncCurrent ? (
        <ResponseVersionCard
            title="Current response"
            submittedAt={ncCurrent.submittedAt}
            rootCause={ncCurrent.rootCause}
            correction={ncCurrent.immediateCorrection || undefined}
            correctiveAction={ncCurrent.correctiveAction}
            findingDetails={ncCurrent.additionalComments || undefined}
        />
    ) : current ? (
        <ResponseVersionCard
            title="Current response"
            submittedAt={current.submittedAt}
            rootCause={current.rootCause}
            correction={current.correction}
            correctiveAction={current.correctiveAction}
            findingDetails={current.findingDetails}
            capaForm={current.capaForm}
        />
    ) : finding.rootCause || finding.correction ? (
        <ResponseVersionCard
            title="Current response"
            rootCause={finding.rootCause}
            correction={finding.correction}
            correctiveAction={finding.correctiveAction}
            findingDetails={finding.findingDetails}
            capaForm={finding.capaForm}
        />
    ) : null;

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#213847]">
                    Response review
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Review the current CAPA response
                    {previousForTabs.length > 0
                        ? " (and previous submissions)"
                        : ""}
                    , then accept & close or reject & reopen.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {currentCard ? (
                    <FindingResponseVersionTabs
                        currentContent={currentCard}
                        previous={previousForTabs}
                        currentLabel="Current response"
                        previousLabel="Previous response"
                    />
                ) : null}

                {reviews.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Review history
                        </p>
                        {reviews.map((r, idx) => (
                            <p key={`${r.reviewedAt}-${idx}`} className="text-sm text-slate-700">
                                <span
                                    className={cn(
                                        "font-semibold",
                                        r.decision === "ACCEPT"
                                            ? "text-emerald-700"
                                            : "text-red-600",
                                    )}
                                >
                                    {r.decision === "ACCEPT" ? "Accepted" : "Rejected"}
                                </span>
                                {" · "}
                                {formatWhen(r.reviewedAt)}
                                {r.reviewedByName ? ` · ${r.reviewedByName}` : ""}
                                {r.reason ? (
                                    <span className="block text-slate-600 mt-0.5">
                                        Reason: {r.reason}
                                    </span>
                                ) : null}
                            </p>
                        ))}
                    </div>
                ) : null}

                {canTakeAction ? (
                    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
                        <p className="text-sm font-semibold text-[#213847]">
                            New response awaiting your decision
                        </p>
                        {!rejectOpen ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    type="button"
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                                    disabled={submitting != null}
                                    onClick={() => void handleAcceptClose()}
                                >
                                    {submitting === "accept" ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    Accept and close
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-red-200 text-red-700 hover:bg-red-50 gap-1.5"
                                    disabled={submitting != null}
                                    onClick={() => setRejectOpen(true)}
                                >
                                    <XCircle className="h-4 w-4" />
                                    Reject and reopen
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-600">
                                    Enter the reason for rejection. This is sent back to the
                                    responsible person.
                                </p>
                                <Textarea
                                    className="min-h-[96px] bg-white"
                                    value={rejectReason}
                                    disabled={submitting != null}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Why is this response being rejected?"
                                />
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        type="button"
                                        className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-1.5"
                                        disabled={submitting != null}
                                        onClick={() => void handleRejectReopen()}
                                    >
                                        {submitting === "reject" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-4 w-4" />
                                        )}
                                        Send back to assignee
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={submitting != null}
                                        onClick={() => {
                                            setRejectOpen(false);
                                            setRejectReason("");
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
