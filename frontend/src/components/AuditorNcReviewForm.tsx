import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    submitNonconformanceReview,
    type NonconformanceSummary,
} from "@/lib/nonconformanceApi";

type Props = {
    nonconformanceId: number;
    actionsEnabled: boolean;
    onReviewed: (updated: NonconformanceSummary) => void;
};

export function AuditorNcReviewForm({
    nonconformanceId,
    actionsEnabled,
    onReviewed,
}: Props) {
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState<"REQUEST_CHANGES" | "APPROVE" | null>(
        null,
    );

    const busy = submitting != null;

    const handleReview = async (decision: "REQUEST_CHANGES" | "APPROVE") => {
        if (!actionsEnabled) return;
        const trimmed = comment.trim();
        if (decision === "REQUEST_CHANGES" && !trimmed) {
            toast.error("A comment is required when requesting changes");
            return;
        }
        setSubmitting(decision);
        try {
            const updated = await submitNonconformanceReview(nonconformanceId, {
                decision,
                comment: trimmed || undefined,
            });
            toast.success(
                decision === "APPROVE"
                    ? "Nonconformance approved and closed"
                    : "Changes requested",
            );
            onReviewed(updated);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to submit review");
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#213847]">Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!actionsEnabled ? (
                    <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                        Waiting for the auditee to resubmit a response before another review.
                    </p>
                ) : null}

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">
                        Reviewer Comment
                        {actionsEnabled ? (
                            <span className="ml-1 font-normal text-slate-400">
                                (required for Request Changes)
                            </span>
                        ) : null}
                    </Label>
                    <Textarea
                        className="min-h-[100px] bg-slate-50 border-slate-200"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add review feedback..."
                        disabled={busy || !actionsEnabled}
                    />
                </div>

                {actionsEnabled ? (
                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void handleReview("REQUEST_CHANGES")}
                            className="border-orange-300 text-orange-800 hover:bg-orange-50"
                        >
                            {submitting === "REQUEST_CHANGES" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    Requesting…
                                </>
                            ) : (
                                "Request Changes"
                            )}
                        </Button>
                        <Button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleReview("APPROVE")}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                            {submitting === "APPROVE" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    Approving…
                                </>
                            ) : (
                                "Approve & Close"
                            )}
                        </Button>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
