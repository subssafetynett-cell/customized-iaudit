import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Image as ImageIcon, Loader2, MessageSquareReply } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AuditeeNcResponseForm,
    SubmittedNcResponses,
} from "@/components/AuditeeNcResponseForm";
import { AuditorNcReviewForm } from "@/components/AuditorNcReviewForm";
import { useStoredUser } from "@/hooks/useStoredUser";
import { fetchFindingById, type Finding } from "@/lib/auditFindings";
import { formatUserDisplayName } from "@/lib/userRoles";
import {
    canAuditeeSubmitNcResponse,
    canShowNcReviewSection,
    canSubmitNcReview,
    clauseFromFindingId,
    formatNcDate,
    formatNcStatusLabel,
    formatNcUserLabel,
    getNonconformanceById,
    type NonconformanceActivity,
    type NonconformanceResponse,
    type NonconformanceReview,
    type NonconformanceSummary,
} from "@/lib/nonconformanceApi";

type PlanContext = {
    auditName?: string | null;
    companyName?: string | null;
    siteName?: string | null;
    leadAuditorLabel?: string | null;
    leadAuditorId?: number | null;
    auditorIds?: number[];
};

type TimelineItem = {
    id: string;
    title: string;
    detail: string;
    at: string;
    actor: string;
};

const SEVERITY_BADGE: Record<string, string> = {
    Minor: "bg-orange-100 text-orange-800",
    Major: "bg-red-100 text-red-800",
};

const STATUS_BADGE: Record<string, string> = {
    ASSIGNED: "bg-sky-50 text-sky-700",
    RESPONSE_SUBMITTED: "bg-amber-50 text-amber-800",
    CHANGES_REQUESTED: "bg-orange-50 text-orange-800",
    CLOSED: "bg-emerald-50 text-emerald-700",
};

function DetailField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <div className="text-sm font-medium text-slate-800 break-words">{value || "—"}</div>
        </div>
    );
}

function normalizeResponses(
    responses: NonconformanceResponse[] | undefined,
): NonconformanceResponse[] {
    if (!Array.isArray(responses)) return [];
    return [...responses].sort((a, b) => {
        const versionDiff = Number(b.version ?? 0) - Number(a.version ?? 0);
        if (versionDiff !== 0) return versionDiff;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
}

function collectAuditorIds(plan: Record<string, unknown> | null | undefined): number[] {
    if (!plan) return [];
    const ids = new Set<number>();
    const add = (raw: unknown) => {
        const n = Number(raw);
        if (Number.isInteger(n) && n > 0) ids.add(n);
    };
    const auditors = plan.auditors;
    if (Array.isArray(auditors)) {
        for (const a of auditors) {
            if (a && typeof a === "object" && "id" in a) add((a as { id: unknown }).id);
            else add(a);
        }
    }
    const program = plan.auditProgram as Record<string, unknown> | undefined;
    if (Array.isArray(program?.auditors)) {
        for (const a of program.auditors) {
            if (a && typeof a === "object" && "id" in a) add((a as { id: unknown }).id);
            else add(a);
        }
    }
    return [...ids];
}

function activityTitle(type: string): string {
    const t = String(type || "").toUpperCase();
    if (t === "RAISED") return "Nonconformance raised";
    if (t === "RESPONSE_SUBMITTED") return "Response submitted";
    if (t === "CHANGES_REQUESTED") return "Changes requested";
    if (t === "APPROVED") return "Response approved";
    if (t === "CLOSED") return "Nonconformance closed";
    return formatNcStatusLabel(type);
}

function buildTimelineFromActivities(
    activities: NonconformanceActivity[],
): TimelineItem[] {
    return [...activities]
        .sort((a, b) => {
            const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (t !== 0) return t;
            return Number(a.id) - Number(b.id);
        })
        .map((activity) => ({
            id: `activity-${activity.id}`,
            title: activityTitle(activity.type),
            detail: [activity.message, activity.comment?.trim()]
                .filter(Boolean)
                .join(" — "),
            at: activity.createdAt,
            actor: formatNcUserLabel(activity.actor),
        }));
}

function buildFallbackTimeline(
    nc: NonconformanceSummary,
    responses: NonconformanceResponse[],
    reviews: NonconformanceReview[],
): TimelineItem[] {
    const items: TimelineItem[] = [
        {
            id: "raised",
            title: "Nonconformance raised",
            detail: `${nc.ncNumber} assigned to ${formatNcUserLabel(nc.assignee)}`,
            at: nc.createdAt,
            actor: formatNcUserLabel(nc.createdBy),
        },
    ];

    for (const response of [...responses].reverse()) {
        items.push({
            id: `response-${response.id}`,
            title: `Response submitted (v${response.version})`,
            detail: "Auditee submitted a corrective action response",
            at: response.submittedAt,
            actor: formatNcUserLabel(response.submittedBy),
        });
    }

    const sortedReviews = [...reviews].sort(
        (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime(),
    );
    for (const review of sortedReviews) {
        const decision = String(review.decision || "").toUpperCase();
        const isApprove = decision === "APPROVE";
        items.push({
            id: `review-${review.id}`,
            title: isApprove ? "Approved & closed" : "Changes requested",
            detail: review.comment?.trim()
                ? review.comment.trim()
                : isApprove
                  ? "Response approved"
                  : "Changes requested",
            at: review.reviewedAt,
            actor: formatNcUserLabel(review.reviewedBy),
        });
    }

    return items;
}

export default function NonconformanceDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useStoredUser();
    const [nc, setNc] = useState<NonconformanceSummary | null>(null);
    const [finding, setFinding] = useState<Finding | null>(null);
    const [planContext, setPlanContext] = useState<PlanContext>({});
    const [loading, setLoading] = useState(true);

    const loadDetail = useCallback(async (opts?: { quiet?: boolean }) => {
        if (!id) return;
        if (!opts?.quiet) setLoading(true);
        try {
            const detail = await getNonconformanceById(id);
            setNc(detail);

            const [planRes, findingRow] = await Promise.all([
                apiFetch(`/audit-plans/${detail.auditPlanId}`),
                fetchFindingById(detail.auditPlanId, detail.findingId).catch(() => null),
            ]);

            setFinding(findingRow);

            if (planRes.ok) {
                const plan = await planRes.json();
                const site = plan?.auditProgram?.site;
                const company = site?.company;
                const lead = plan?.leadAuditor;
                const leadId =
                    plan?.leadAuditorId ??
                    lead?.id ??
                    plan?.auditProgram?.leadAuditorId ??
                    null;
                setPlanContext({
                    auditName: plan?.auditName || detail.auditPlan?.auditName || null,
                    companyName: company?.name || null,
                    siteName: site?.name || null,
                    leadAuditorLabel: lead
                        ? formatUserDisplayName(lead) || lead.email || null
                        : null,
                    leadAuditorId: leadId != null ? Number(leadId) : null,
                    auditorIds: collectAuditorIds(plan),
                });
            } else {
                setPlanContext({
                    auditName: detail.auditPlan?.auditName || null,
                });
            }
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Failed to load nonconformance");
            setNc(null);
        } finally {
            if (!opts?.quiet) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    const clauseLabel = useMemo(() => {
        if (finding?.clauseRef) return finding.clauseRef;
        if (nc?.findingTitle?.toLowerCase().includes("clause")) return nc.findingTitle;
        return clauseFromFindingId(nc?.findingId);
    }, [finding, nc]);

    const evidenceItems = finding?.media ?? [];
    const responses = useMemo(() => normalizeResponses(nc?.responses), [nc?.responses]);
    const reviews = useMemo(() => {
        const list = nc?.reviews ?? nc?.reviewHistory ?? [];
        return Array.isArray(list) ? list : [];
    }, [nc?.reviews, nc?.reviewHistory]);

    const isClosed = String(nc?.status ?? "").trim().toUpperCase() === "CLOSED";

    // Auditee response form only for assigned auditee; closed hides all actions.
    // Match by user id or email (same rules as finding detail "Respond to finding").
    const showAuditeeForm =
        !isClosed &&
        canAuditeeSubmitNcResponse(nc, {
            id: user?.id as number | string | undefined,
            email: typeof user?.email === "string" ? user.email : null,
        });

    const showReviewSection =
        !isClosed &&
        canShowNcReviewSection(nc, user, {
            leadAuditorId: planContext.leadAuditorId,
            auditorIds: planContext.auditorIds,
        });
    const reviewActionsEnabled = showReviewSection && canSubmitNcReview(nc);

    const timeline = useMemo(() => {
        if (!nc) return [];
        const activities = nc.activities ?? nc.activityHistory;
        if (Array.isArray(activities) && activities.length > 0) {
            return buildTimelineFromActivities(activities);
        }
        return buildFallbackTimeline(nc, responses, reviews);
    }, [nc, responses, reviews]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading nonconformance...
                </div>
            </div>
        );
    }

    if (!nc) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-white">
                <p className="text-sm text-muted-foreground">Nonconformance not found</p>
                <Button variant="outline" onClick={() => navigate("/nonconformances")}>
                    Back to list
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-50/60">
            <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 -ml-2 text-slate-500 hover:text-slate-800"
                            onClick={() => navigate("/nonconformances")}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Findings Dashboard
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-[#213847]">
                                {nc.ncNumber}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {nc.findingTitle || "Nonconformance detail"}
                            </p>
                        </div>
                    </div>
                    <Badge
                        className={`${STATUS_BADGE[String(nc.status)] || "bg-slate-100 text-slate-700"} border-none`}
                    >
                        {formatNcStatusLabel(nc.status)}
                    </Badge>
                </div>

                {isClosed ? (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-700" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold tracking-wide uppercase">
                                Closed
                            </p>
                            <p className="text-sm mt-0.5">
                                This nonconformance has been approved and closed
                                {nc.closedAt ? ` on ${formatNcDate(nc.closedAt)}` : ""}.
                            </p>
                        </div>
                    </div>
                ) : null}

                {showAuditeeForm && nc.findingId ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div>
                            <p className="text-sm font-semibold text-[#213847]">
                                Ready to respond?
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Submit your root cause analysis and corrective actions for this
                                nonconformance.
                            </p>
                        </div>
                        <Button
                            type="button"
                            className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 shrink-0"
                            onClick={() =>
                                navigate(
                                    `/audit-findings/${nc.auditPlanId}/${encodeURIComponent(nc.findingId)}?respond=1`,
                                )
                            }
                        >
                            <MessageSquareReply className="h-4 w-4" />
                            Respond to finding
                        </Button>
                    </div>
                ) : null}

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#213847]">Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <DetailField label="NC Number" value={nc.ncNumber} />
                        <DetailField
                            label="Status"
                            value={
                                <Badge
                                    className={`${STATUS_BADGE[String(nc.status)] || "bg-slate-100 text-slate-700"} border-none`}
                                >
                                    {formatNcStatusLabel(nc.status)}
                                </Badge>
                            }
                        />
                        <DetailField
                            label="Severity"
                            value={
                                <Badge
                                    className={`${SEVERITY_BADGE[String(nc.severity)] || "bg-slate-100 text-slate-700"} border-none`}
                                >
                                    {nc.severity}
                                </Badge>
                            }
                        />
                        <DetailField label="Finding" value={nc.findingTitle} />
                        <DetailField label="Clause" value={clauseLabel} />
                        <DetailField
                            label="Audit Name"
                            value={planContext.auditName || nc.auditPlan?.auditName || "—"}
                        />
                        <DetailField label="Company" value={planContext.companyName || "—"} />
                        <DetailField label="Site" value={planContext.siteName || "—"} />
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#213847]">Assignment</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <DetailField
                            label="Auditor"
                            value={
                                planContext.leadAuditorLabel ||
                                formatNcUserLabel(nc.createdBy)
                            }
                        />
                        <DetailField label="Auditee" value={formatNcUserLabel(nc.assignee)} />
                        <DetailField label="Reviewer" value={formatNcUserLabel(nc.reviewer)} />
                        <DetailField label="Due Date" value={formatNcDate(nc.dueDate)} />
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#213847]">Finding Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <DetailField
                            label="Description"
                            value={
                                <p className="whitespace-pre-wrap leading-relaxed text-slate-700 font-normal">
                                    {nc.findingDescription ||
                                        finding?.description ||
                                        "No description provided"}
                                </p>
                            }
                        />
                        <div className="space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Evidence
                            </p>
                            {evidenceItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No evidence attached.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {evidenceItems.map((file, idx) => (
                                        <a
                                            key={`${file.name}-${idx}`}
                                            href={file.data}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 hover:bg-slate-100 transition-colors"
                                        >
                                            {String(file.type || "").startsWith("image/") ? (
                                                <ImageIcon className="h-4 w-4 text-slate-500 shrink-0" />
                                            ) : (
                                                <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                                            )}
                                            <span className="text-sm text-slate-700 truncate">
                                                {file.name || `Evidence ${idx + 1}`}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                        {finding?.auditId ? (
                            <Link
                                to={`/audit/execute/${finding.auditId}`}
                                state={{ focusFindings: true, focusFindingId: nc.findingId }}
                                className="inline-flex text-sm font-medium text-[#1e855e] hover:underline"
                            >
                                Open source finding in audit
                            </Link>
                        ) : null}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#213847]">Activity Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {timeline.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activity yet.</p>
                        ) : (
                            <ol className="space-y-4">
                                {timeline.map((item) => (
                                    <li key={item.id} className="flex gap-3">
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                            <Clock3 className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">
                                                {item.title}
                                            </p>
                                            <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                                {item.detail}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {formatNcDate(item.at)}
                                                {item.actor && item.actor !== "—"
                                                    ? ` · ${item.actor}`
                                                    : ""}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                </Card>

                {showAuditeeForm ? (
                    <AuditeeNcResponseForm
                        nonconformanceId={nc.id}
                        onSubmitted={() => {
                            void loadDetail({ quiet: true });
                        }}
                    />
                ) : null}

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#213847]">
                            {showReviewSection ? "Submitted Response" : "Responses"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SubmittedNcResponses responses={responses} />
                    </CardContent>
                </Card>

                {showReviewSection ? (
                    <AuditorNcReviewForm
                        nonconformanceId={nc.id}
                        actionsEnabled={reviewActionsEnabled}
                        onReviewed={() => {
                            void loadDetail({ quiet: true });
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}
