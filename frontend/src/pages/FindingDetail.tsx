import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Loader2, MessageSquareReply, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FindingDetailPanel,
    FindingStatusBadge,
} from "@/components/FindingDetailView";
import { SubmittedNcResponses } from "@/components/AuditeeNcResponseForm";
import { FindingAssigneeResponseForm } from "@/components/FindingAssigneeResponseForm";
import { FindingReporterReviewPanel } from "@/components/FindingReporterReviewPanel";
import { useStoredUser } from "@/hooks/useStoredUser";
import {
    fetchFindingById,
    findingActionByDisplay,
    isNcFindingType,
    splitFindingCapaHistory,
    TYPE_CONFIG,
    type Finding,
} from "@/lib/auditFindings";
import {
    FindingResponseVersionTabs,
} from "@/components/FindingResponseVersionTabs";
import {
    canUserRespondToNc,
    findNonconformanceForFinding,
    formatNcDate,
    formatNcStatusLabel,
    formatNcUserLabel,
    type NonconformanceSummary,
} from "@/lib/nonconformanceApi";
import { downloadCapaResponsePdf } from "@/utils/capaResponsePdf";
import { cn } from "@/lib/utils";
import { TourStepPopover } from "@/components/TourStepPopover";
import {
    AUDIT_FINDINGS_TOUR_STEP,
    AUDIT_FINDINGS_TOUR_TOTAL_STEPS,
    clearFindingsTourPath,
    getAuditFindingsTourStepConfig,
    getNextFindingsTourStep,
    getPrevFindingsTourStep,
    loadFindingsTourPath,
    type FindingsTourPath,
} from "@/lib/auditFindingsOnboardingTour";

function findingAssigneeEmail(finding: Finding) {
    if (finding.assignToEmail?.trim()) {
        return finding.assignToEmail.toLowerCase().trim();
    }
    const labeled = finding.assignTo?.match(/\(([^\s@]+@[^\s@]+\.[^\s@]+)\)\s*$/);
    if (labeled?.[1]) return labeled[1].toLowerCase().trim();
    if (finding.assignTo?.includes("@")) {
        return finding.assignTo.toLowerCase().trim();
    }
    return "";
}

function findingRaisedByEmail(finding: Finding) {
    if (finding.raisedByEmail?.trim()) {
        return finding.raisedByEmail.toLowerCase().trim();
    }
    const labeled = (finding.raisedBy || finding.raisedByName || "").match(
        /\(([^\s@]+@[^\s@]+\.[^\s@]+)\)\s*$/,
    );
    if (labeled?.[1]) return labeled[1].toLowerCase().trim();
    const raw = (finding.raisedBy || finding.raisedByName || "").trim();
    if (raw.includes("@")) return raw.toLowerCase();
    return "";
}

function isFindingAssignedToViewer(finding: Finding, email: string) {
    return Boolean(email && findingAssigneeEmail(finding) === email);
}

function isFindingRaisedByViewer(
    finding: Finding,
    email: string,
    viewerId: number | null | undefined,
) {
    if (email && findingRaisedByEmail(finding) === email) return true;
    if (
        viewerId &&
        finding.createdByUserId &&
        Number(finding.createdByUserId) === viewerId
    ) {
        return true;
    }
    return false;
}

function hasAssigneeResponse(finding: Finding) {
    return Boolean(
        finding.rootCause?.trim() ||
            finding.correctiveAction?.trim() ||
            finding.correction?.trim() ||
            finding.capaForm,
    );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <div className="text-sm font-medium text-slate-800 break-words">{value || "—"}</div>
        </div>
    );
}

export default function FindingDetail() {
    const { auditId, findingId } = useParams<{ auditId: string; findingId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useStoredUser();
    const responseRef = useRef<HTMLDivElement | null>(null);

    const auditFindingsTourActive = searchParams.get("auditFindingsTour") === "true";
    const auditFindingsTourStep = Math.min(
        AUDIT_FINDINGS_TOUR_TOTAL_STEPS,
        Math.max(1, parseInt(searchParams.get("auditFindingsStep") || "1", 10)),
    );
    const findingsTourPath: FindingsTourPath | null =
        (searchParams.get("findingsTourPath") === "assigned" ||
        searchParams.get("findingsTourPath") === "raised"
            ? (searchParams.get("findingsTourPath") as FindingsTourPath)
            : null) || loadFindingsTourPath();
    const auditFindingsTourStepConfig =
        getAuditFindingsTourStepConfig(auditFindingsTourStep);

    const setAuditFindingsTourStep = (step: number) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("auditFindingsTour", "true");
                next.set("auditFindingsStep", String(step));
                if (findingsTourPath) next.set("findingsTourPath", findingsTourPath);
                return next;
            },
            { replace: true },
        );
    };

    const exitAuditFindingsTour = () => {
        clearFindingsTourPath();
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("auditFindingsTour");
                next.delete("auditFindingsStep");
                next.delete("findingsTourPath");
                return next;
            },
            { replace: true },
        );
    };

    const tourFindingsHighlight = (step: number) =>
        auditFindingsTourActive && auditFindingsTourStep === step
            ? "relative z-[60] ring-[4px] ring-emerald-500/80 ring-offset-2 rounded-xl"
            : "";

    const [finding, setFinding] = useState<Finding | null>(null);
    const [nc, setNc] = useState<NonconformanceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showResponseForm, setShowResponseForm] = useState(
        searchParams.get("respond") === "1",
    );
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    const parsedAuditId = Number(auditId);
    const decodedFindingId = findingId ? decodeURIComponent(findingId) : "";

    const loadDetail = useCallback(async () => {
        if (!Number.isInteger(parsedAuditId) || parsedAuditId <= 0 || !decodedFindingId) {
            setFinding(null);
            setNc(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [findingRow, ncRow] = await Promise.all([
                fetchFindingById(parsedAuditId, decodedFindingId),
                findNonconformanceForFinding(parsedAuditId, decodedFindingId).catch(() => null),
            ]);
            setFinding(findingRow);
            setNc(ncRow);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load finding");
            setFinding(null);
            setNc(null);
        } finally {
            setLoading(false);
        }
    }, [decodedFindingId, parsedAuditId]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    const viewerEmail = String(user?.email ?? "").toLowerCase().trim();
    const viewerId = user?.id != null ? Number(user.id) : null;
    const respondUser = {
        id: user?.id as number | string | undefined,
        email: typeof user?.email === "string" ? user.email : null,
    };
    const isNc = finding ? isNcFindingType(finding.type) : false;
    const isOfi = finding?.type === "OFI";
    const isRespondableType = isNc || isOfi;
    const isFindingAssignee = finding
        ? isFindingAssignedToViewer(finding, viewerEmail)
        : false;
    const isNcAssigneeIdentity = Boolean(
        nc &&
            ((respondUser.id != null &&
                Number(nc.assigneeId) === Number(respondUser.id)) ||
                (viewerEmail &&
                    String(nc.assignee?.email ?? "")
                        .toLowerCase()
                        .trim() === viewerEmail)),
    );
    /** Finding assignee and/or formal NC assignee — either may open the respond CTA. */
    const isAssignee = isFindingAssignee || isNcAssigneeIdentity;
    const isRaisedByMe = finding
        ? isFindingRaisedByViewer(finding, viewerEmail, viewerId)
        : false;
    const findingClosed = finding?.status === "Closed";
    const ncClosed = String(nc?.status ?? "").trim().toUpperCase() === "CLOSED";
    const ncStatusAllowsResponse = (() => {
        const status = String(nc?.status ?? "").trim().toUpperCase();
        return (
            status === "ASSIGNED" ||
            status === "CHANGES_REQUESTED" ||
            status === "RESPONSE_SUBMITTED"
        );
    })();
    const canRespondViaNc =
        canUserRespondToNc(nc, respondUser) ||
        Boolean(nc && isFindingAssignee && ncStatusAllowsResponse && !findingClosed) ||
        Boolean(nc && isNcAssigneeIdentity && ncStatusAllowsResponse && !findingClosed);
    // Assigned NC/OFI findings can use the CAPA form when not closed,
    // even if the formal NC row failed to load or id formats differ.
    const canRespondViaFinding =
        isFindingAssignee &&
        isRespondableType &&
        !findingClosed &&
        !ncClosed &&
        (!nc || ncStatusAllowsResponse);
    const canRespond =
        !findingClosed && !ncClosed && (canRespondViaNc || canRespondViaFinding);
    const showRespondCta =
        Boolean(finding) &&
        isAssignee &&
        isRespondableType &&
        canRespond &&
        !showResponseForm;

    // If ?respond=1 was set but the user cannot respond, fall back to the CTA banner.
    useEffect(() => {
        if (!loading && showResponseForm && !canRespond) {
            setShowResponseForm(false);
        }
    }, [loading, showResponseForm, canRespond]);

    const isEditingExistingResponse =
        Boolean(finding) &&
        (hasAssigneeResponse(finding!) || (nc?.responses?.length ?? 0) > 0);
    const showSubmittedFindingResponse =
        Boolean(finding) &&
        hasAssigneeResponse(finding!) &&
        isAssignee &&
        !showResponseForm;

    const capaVersions = finding ? splitFindingCapaHistory(finding) : null;

    const canDownloadResponse =
        Boolean(finding) &&
        (isAssignee || isRaisedByMe) &&
        (hasAssigneeResponse(finding!) || (nc?.responses?.length ?? 0) > 0);

    const typeConfig = finding
        ? TYPE_CONFIG[
              finding.type === "OFI"
                  ? "OFI"
                  : isNcFindingType(finding.type)
                    ? "NC"
                    : finding.type
          ]
        : null;
    const raisedByDisplay = useMemo(() => {
        if (!finding) return "—";
        const raw =
            finding.raisedByName?.trim() ||
            finding.raisedBy?.trim() ||
            findingActionByDisplay(finding);
        return raw.replace(/\s*\([^)]*@[^)]*\)\s*$/, "").trim() || "—";
    }, [finding]);

    const backHref =
        (location.state as { returnTab?: string } | null)?.returnTab === "assigned"
            ? "/audit-findings?tab=assigned"
            : "/audit-findings";

    const openResponseForm = () => {
        setShowResponseForm(true);
        if (
            auditFindingsTourActive &&
            auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.RESPOND
        ) {
            setAuditFindingsTourStep(AUDIT_FINDINGS_TOUR_STEP.CAPA_FORM);
        }
        requestAnimationFrame(() => {
            responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    useEffect(() => {
        if (
            !auditFindingsTourActive ||
            !canRespond ||
            loading
        ) {
            return;
        }
        if (
            (auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.CAPA_FORM ||
                auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.SAVE_DRAFT ||
                auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.SEND) &&
            !showResponseForm
        ) {
            setShowResponseForm(true);
        }
    }, [
        auditFindingsTourActive,
        auditFindingsTourStep,
        canRespond,
        loading,
        showResponseForm,
    ]);

    const handleAuditFindingsTourNext = () => {
        if (auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.RESPOND) {
            if (canRespond) {
                toast.message("Click Respond findings to open the CAPA / RCA form.");
            } else {
                setAuditFindingsTourStep(AUDIT_FINDINGS_TOUR_STEP.COMPLETE);
            }
            return;
        }
        if (auditFindingsTourStep >= AUDIT_FINDINGS_TOUR_STEP.COMPLETE) {
            exitAuditFindingsTour();
            navigate("/nonconformances?findingsTourHandoff=1");
            return;
        }
        const path: FindingsTourPath =
            findingsTourPath ??
            (isAssignee ? "assigned" : "raised");
        if (
            auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.DETAILS &&
            (path === "raised" || !canRespond)
        ) {
            setAuditFindingsTourStep(AUDIT_FINDINGS_TOUR_STEP.COMPLETE);
            return;
        }
        setAuditFindingsTourStep(getNextFindingsTourStep(auditFindingsTourStep, path));
    };

    const handleAuditFindingsTourBack = () => {
        if (auditFindingsTourStep <= AUDIT_FINDINGS_TOUR_STEP.DETAILS) {
            const tab =
                findingsTourPath === "assigned" ? "assigned" : "raised";
            navigate(
                `/audit-findings?tab=${tab}&auditFindingsTour=true&auditFindingsStep=${AUDIT_FINDINGS_TOUR_STEP.VIEW}&findingsTourPath=${tab}`,
            );
            return;
        }
        const path =
            findingsTourPath ??
            (isAssignee ? "assigned" : isRaisedByMe ? "raised" : "raised");
        const prev = getPrevFindingsTourStep(auditFindingsTourStep, path);
        if (
            prev < AUDIT_FINDINGS_TOUR_STEP.CAPA_FORM &&
            showResponseForm &&
            auditFindingsTourStep >= AUDIT_FINDINGS_TOUR_STEP.CAPA_FORM
        ) {
            setShowResponseForm(false);
        }
        setAuditFindingsTourStep(prev);
    };

    const handleDownloadResponse = async () => {
        if (!finding) return;
        setDownloadingPdf(true);
        try {
            await downloadCapaResponsePdf(finding, nc?.responses);
            toast.success("CAPA response PDF downloaded");
        } catch (err) {
            console.error(err);
            toast.error(
                err instanceof Error ? err.message : "Failed to download response form",
            );
        } finally {
            setDownloadingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading finding...
                </div>
            </div>
        );
    }

    if (!finding) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-white">
                <p className="text-sm text-muted-foreground">Finding not found</p>
                <Button variant="outline" onClick={() => navigate("/audit-findings")}>
                    Back to findings
                </Button>
            </div>
        );
    }

    const ncResponses = nc?.responses ?? [];

    return (
        <div className="h-full bg-slate-50/60">
            {auditFindingsTourActive && (
                <div className="fixed inset-0 bg-slate-900/10 z-[40] pointer-events-none" />
            )}
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <div
                    id="tour-step-finding-details"
                    className={cn(
                        "space-y-6",
                        tourFindingsHighlight(AUDIT_FINDINGS_TOUR_STEP.DETAILS),
                    )}
                >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 -ml-2 text-slate-500 hover:text-slate-800"
                            onClick={() => navigate(backHref)}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Findings
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-[#213847]">
                                Finding details
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                                {finding.auditName}
                                {finding.moduleName ? ` · ${finding.moduleName}` : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {typeConfig ? (
                            <Badge
                                className={cn(
                                    "border-none font-bold",
                                    typeConfig.bg,
                                    typeConfig.text,
                                )}
                            >
                                {typeConfig.label}
                            </Badge>
                        ) : null}
                        <FindingStatusBadge status={finding.status} />
                        {nc ? (
                            <Badge className="bg-slate-100 text-slate-700 border-none">
                                {nc.ncNumber}
                            </Badge>
                        ) : null}
                        {canRespond && !showResponseForm ? (
                            <Button
                                id="tour-step-respond-findings"
                                type="button"
                                size="sm"
                                className={cn(
                                    "gap-1.5 bg-[#213847] hover:bg-[#213847]/90 text-white",
                                    tourFindingsHighlight(AUDIT_FINDINGS_TOUR_STEP.RESPOND),
                                )}
                                onClick={openResponseForm}
                            >
                                {isEditingExistingResponse ? (
                                    <>
                                        <Pencil className="h-4 w-4" />
                                        Edit response
                                    </>
                                ) : (
                                    <>
                                        <MessageSquareReply className="h-4 w-4" />
                                        Respond findings
                                    </>
                                )}
                            </Button>
                        ) : null}
                        {canDownloadResponse ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-slate-300"
                                disabled={downloadingPdf}
                                onClick={() => void handleDownloadResponse()}
                            >
                                {downloadingPdf ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                Download response
                            </Button>
                        ) : null}
                    </div>
                </div>

                {String(nc?.status ?? "").trim().toUpperCase() === "ESCALATED" ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3">
                        <p className="text-sm font-semibold text-red-800">
                            Nonconformance Escalated
                        </p>
                        <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
                            This nonconformance was escalated because it passed the escalation date without a response. Responses are locked.
                        </p>
                    </div>
                ) : null}

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#213847]">Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <DetailField label="Audit" value={finding.auditName} />
                        <DetailField label="Clause / item" value={finding.clauseRef} />
                        {finding.moduleName ? (
                            <DetailField label="Module" value={finding.moduleName} />
                        ) : null}
                        <DetailField label="Raised by" value={raisedByDisplay} />
                        <DetailField label="Assigned to" value={finding.assignTo?.trim() || "—"} />
                        <DetailField label="Target date" value={finding.closeDate?.trim() || "—"} />
                        <DetailField
                            label="Escalation to"
                            value={
                                (finding.escalationToName || finding.escalationTo || "")
                                    .replace(/\s*\([^)]*@[^)]*\)\s*$/, "")
                                    .trim() || "—"
                            }
                        />
                        <DetailField
                            label="Escalation date"
                            value={finding.escalationDate?.trim() || "—"}
                        />
                        {nc ? (
                            <>
                                <DetailField
                                    label="NC status"
                                    value={formatNcStatusLabel(nc.status)}
                                />
                                <DetailField
                                    label="Due date"
                                    value={formatNcDate(nc.dueDate)}
                                />
                                <DetailField
                                    label="Reviewer"
                                    value={formatNcUserLabel(nc.reviewer)}
                                />
                            </>
                        ) : null}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#213847]">
                            Finding information
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            View-only — comments, evidence, and attachments from the audit.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <FindingDetailPanel finding={finding} />
                    </CardContent>
                </Card>
                </div>

                {finding.rejectReason?.trim() && isAssignee ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3">
                        <p className="text-sm font-semibold text-red-800">
                            Response rejected — revise and resubmit
                        </p>
                        <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
                            {finding.rejectReason.trim()}
                        </p>
                    </div>
                ) : null}

                {isRaisedByMe ? (
                    <FindingReporterReviewPanel
                        finding={finding}
                        nonconformance={nc}
                        reviewerName={
                            `${String(user?.firstName ?? "")} ${String(user?.lastName ?? "")}`.trim() ||
                            String(user?.name ?? "") ||
                            String(user?.email ?? "") ||
                            undefined
                        }
                        onUpdated={({ finding: updated, nonconformance }) => {
                            setFinding(updated);
                            if (nonconformance) setNc(nonconformance);
                            void loadDetail();
                        }}
                    />
                ) : null}

                {nc && ncResponses.length > 0 && !isRaisedByMe ? (
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <CardTitle className="text-base text-[#213847]">
                                Submitted responses
                            </CardTitle>
                            {canDownloadResponse ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 border-slate-300 shrink-0"
                                    disabled={downloadingPdf}
                                    onClick={() => void handleDownloadResponse()}
                                >
                                    {downloadingPdf ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    Download filled form
                                </Button>
                            ) : null}
                        </CardHeader>
                        <CardContent>
                            <SubmittedNcResponses responses={ncResponses} />
                        </CardContent>
                    </Card>
                ) : null}

                {showSubmittedFindingResponse ? (
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                                <CardTitle className="text-base text-[#213847]">
                                    Your submitted response
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Your CAPA / RCA response is on file for this finding.
                                    {(capaVersions?.previous.length ?? 0) > 0
                                        ? " Switch tabs to compare with a previous submission."
                                        : ""}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                                {isAssignee && canRespond ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="gap-1.5 bg-[#213847] hover:bg-[#213847]/90 text-white"
                                        onClick={openResponseForm}
                                    >
                                        <Pencil className="h-4 w-4" />
                                        Edit response
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 border-slate-300"
                                    disabled={downloadingPdf}
                                    onClick={() => void handleDownloadResponse()}
                                >
                                    {downloadingPdf ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="h-4 w-4" />
                                    )}
                                    Download filled form
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <FindingResponseVersionTabs
                                previous={capaVersions?.previous ?? []}
                                currentLabel="Current response"
                                previousLabel="Previous response"
                                currentContent={
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <DetailField
                                            label="Incident / observations"
                                            value={finding.findingDetails}
                                        />
                                        <DetailField
                                            label="Root cause"
                                            value={finding.rootCause}
                                        />
                                        <DetailField
                                            label="Correction(s)"
                                            value={finding.correction}
                                        />
                                        <DetailField
                                            label="Corrective action(s)"
                                            value={finding.correctiveAction}
                                        />
                                        <DetailField
                                            label="Expected completion date"
                                            value={finding.closeDate}
                                        />
                                        <DetailField
                                            label="Status"
                                            value={
                                                <FindingStatusBadge status={finding.status} />
                                            }
                                        />
                                    </div>
                                }
                            />
                        </CardContent>
                    </Card>
                ) : null}

                {showRespondCta ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div>
                            <p className="text-sm font-semibold text-[#213847]">
                                {isEditingExistingResponse
                                    ? "Update your response?"
                                    : "Ready to respond?"}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {canRespond
                                    ? isEditingExistingResponse
                                        ? "Edit your CAPA / RCA form and send the updated response to the reporter."
                                        : "Submit your root cause analysis and corrective actions."
                                    : findingClosed || ncClosed
                                      ? "This finding is closed."
                                      : "You cannot edit this response right now."}
                            </p>
                        </div>
                        {canRespond ? (
                            <Button
                                type="button"
                                className="bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 shrink-0"
                                onClick={openResponseForm}
                            >
                                {isEditingExistingResponse ? (
                                    <>
                                        <Pencil className="h-4 w-4" />
                                        Edit response
                                    </>
                                ) : (
                                    <>
                                        <MessageSquareReply className="h-4 w-4" />
                                        Respond findings
                                    </>
                                )}
                            </Button>
                        ) : null}
                    </div>
                ) : null}

                {showResponseForm && canRespond ? (
                    <div
                        ref={responseRef}
                        id="tour-step-capa-form"
                        className={cn(
                            tourFindingsHighlight(AUDIT_FINDINGS_TOUR_STEP.CAPA_FORM),
                        )}
                    >
                        <FindingAssigneeResponseForm
                            key={`${finding.id}-edit-${isEditingExistingResponse ? "1" : "0"}`}
                            finding={finding}
                            nonconformanceId={canRespondViaNc ? nc?.id ?? null : null}
                            isEditing={isEditingExistingResponse}
                            onCancel={() => setShowResponseForm(false)}
                            onSubmitted={({ finding: updated, nonconformance }) => {
                                setFinding(updated);
                                if (nonconformance) setNc(nonconformance);
                                setShowResponseForm(false);
                                void loadDetail();
                            }}
                            highlightSaveDraft={
                                auditFindingsTourActive &&
                                auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.SAVE_DRAFT
                            }
                            highlightSend={
                                auditFindingsTourActive &&
                                auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.SEND
                            }
                        />
                    </div>
                ) : null}

                {!isAssignee ? (
                    <div className="flex justify-end">
                        <Button variant="outline" asChild className="gap-2">
                            <Link
                                to={`/audit/execute/${finding.auditId}`}
                                state={{
                                    focusFindings: true,
                                    focusFindingId: finding.id,
                                }}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Open in audit
                            </Link>
                        </Button>
                    </div>
                ) : null}
            </div>

            {auditFindingsTourActive &&
                auditFindingsTourStep >= AUDIT_FINDINGS_TOUR_STEP.DETAILS &&
                auditFindingsTourStepConfig && (
                    <TourStepPopover
                        key={auditFindingsTourStep}
                        targetId={auditFindingsTourStepConfig.targetId}
                        step={auditFindingsTourStep}
                        totalSteps={AUDIT_FINDINGS_TOUR_TOTAL_STEPS}
                        title={auditFindingsTourStepConfig.title}
                        description={auditFindingsTourStepConfig.description}
                        position={auditFindingsTourStepConfig.position}
                        onNext={handleAuditFindingsTourNext}
                        onBack={handleAuditFindingsTourBack}
                        onClose={() => {
                            exitAuditFindingsTour();
                            navigate("/getting-started");
                        }}
                        hideNext={
                            auditFindingsTourStep === AUDIT_FINDINGS_TOUR_STEP.RESPOND
                        }
                    />
                )}
        </div>
    );
}
