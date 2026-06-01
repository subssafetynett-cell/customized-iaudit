import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    Building2,
    MapPin,
    Users,
    Briefcase,
    ClipboardList,
    ClipboardCheck,
    Check,
    Circle,
    ArrowRight,
    FileCheck,
    ChevronDown,
    AlertTriangle,
    FileText,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import { apiFetch } from "@/lib/api";
import {
    FOUNDATION_SETUP_STEPS,
    AUDIT_WORKFLOW_STEPS,
    beginFoundationStep,
} from "@/lib/onboardingGettingStarted";
import { startAuditTour } from "@/lib/startAuditTour";
import { startAuditPlanTour } from "@/lib/startAuditPlanTour";
import { startAuditExecuteTour } from "@/lib/startAuditExecuteTour";
import { startAuditFindingsTour } from "@/lib/startAuditFindingsTour";
import { startAuditTemplatesTour } from "@/lib/startAuditTemplatesTour";
import {
    fetchGapAnalysesPersisted,
    fetchSelfAssessmentsPersisted,
} from "@/lib/userPersistedData";
import { computeAuditWorkflowCompletion } from "@/lib/auditWorkflowCompletion";
import { cn } from "@/lib/utils";

const STEP_ICONS = [
    Building2,
    MapPin,
    Briefcase,
    Users,
    ClipboardCheck,
    ClipboardList,
] as const;

const AUDIT_STEP_ICONS = [
    FileCheck,
    ClipboardCheck,
    ClipboardList,
    AlertTriangle,
    FileText,
] as const;

function OnboardingStepBadge({ step }: { step: number }) {
    return (
        <span className="inline-flex items-center justify-center rounded-full bg-[#ecfdf5] text-[#166534] text-xs font-bold px-2.5 py-0.5 mb-2">
            Step {step}
        </span>
    );
}

function StepCardIcon({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#213847] text-white">
            {children}
        </div>
    );
}

export default function GettingStarted() {
    const navigate = useNavigate();
    const { companies } = useCompanyStore();
    const [userName, setUserName] = useState("there");
    const [userCount, setUserCount] = useState(0);
    const [gapAnalysisCount, setGapAnalysisCount] = useState(0);
    const [selfAssessmentCount, setSelfAssessmentCount] = useState(0);
    const [stepsOpen, setStepsOpen] = useState(false);
    const [auditStepsOpen, setAuditStepsOpen] = useState(false);
    const [auditPrograms, setAuditPrograms] = useState<unknown[]>([]);
    const [auditPlans, setAuditPlans] = useState<any[]>([]);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const first = user.firstName?.trim() || "";
            setUserName(first || "there");
            const userId = user.id ?? user._id;
            if (userId) {
                void (async () => {
                    const { analyses } = await fetchGapAnalysesPersisted();
                    setGapAnalysisCount(Array.isArray(analyses) ? analyses.length : 0);
                    const { assessments } = await fetchSelfAssessmentsPersisted();
                    setSelfAssessmentCount(
                        Array.isArray(assessments) ? assessments.length : 0,
                    );
                })();
            }
        } catch {
            setUserName("there");
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                const userId = user.id ?? user._id;
                const fetches: Promise<void>[] = [
                    apiFetch("/users").then(async (usersRes) => {
                        if (!cancelled && usersRes.ok) {
                            const data = await usersRes.json();
                            setUserCount(Array.isArray(data) ? data.length : 0);
                        }
                    }),
                ];
                if (userId) {
                    fetches.push(
                        apiFetch(`/audit-programs?scope=org`).then(async (res) => {
                            if (!cancelled && res.ok) {
                                const data = await res.json();
                                setAuditPrograms(Array.isArray(data) ? data : []);
                            }
                        }),
                        apiFetch(
                            `/audit-plans?scope=org&includeData=true`,
                        ).then(async (res) => {
                            if (!cancelled && res.ok) {
                                const data = await res.json();
                                setAuditPlans(Array.isArray(data) ? data : []);
                            }
                        }),
                    );
                }
                await Promise.all(fetches);
            } catch {
                // optional counts
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const totalSites = useMemo(
        () => companies.reduce((acc, c) => acc + (c.sites?.length ?? 0), 0),
        [companies],
    );
    const totalDepartments = useMemo(
        () =>
            companies.reduce(
                (acc, c) =>
                    acc +
                    (c.sites?.reduce((s, site) => s + (site.departments?.length ?? 0), 0) ?? 0),
                0,
            ),
        [companies],
    );

    const stepCompleted = useMemo(
        () => ({
            company: companies.length > 0,
            sites: totalSites > 0,
            departments: totalDepartments > 0,
            users: userCount > 0,
            "self-assessment": selfAssessmentCount > 0,
            "gap-analysis": gapAnalysisCount > 0,
        }),
        [
            companies.length,
            totalSites,
            totalDepartments,
            userCount,
            selfAssessmentCount,
            gapAnalysisCount,
        ],
    );

    const completedCount = FOUNDATION_SETUP_STEPS.filter(
        (s) => stepCompleted[s.id as keyof typeof stepCompleted],
    ).length;
    const progressPercent = Math.round(
        (completedCount / FOUNDATION_SETUP_STEPS.length) * 100,
    );
    const allFoundationComplete = completedCount === FOUNDATION_SETUP_STEPS.length;

    const auditStepCompleted = useMemo(
        () => computeAuditWorkflowCompletion(auditPrograms, auditPlans),
        [auditPrograms, auditPlans],
    );

    const auditCompletedCount = AUDIT_WORKFLOW_STEPS.filter(
        (s) => auditStepCompleted[s.id as keyof typeof auditStepCompleted],
    ).length;
    const auditProgressPercent = Math.round(
        (auditCompletedCount / AUDIT_WORKFLOW_STEPS.length) * 100,
    );
    const allAuditComplete =
        auditCompletedCount === AUDIT_WORKFLOW_STEPS.length;

    return (
        <div className="min-h-full bg-slate-50/80 pb-12">
            <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 space-y-8">
                <div className="flex items-start gap-4">
                    <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ecfdf5] to-emerald-100 shadow-sm ring-1 ring-emerald-100"
                        aria-hidden
                    >
                        <Sparkles className="h-7 w-7 text-[#1e855e]" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111827]">
                            Welcome {userName}
                        </h1>
                        <p className="text-sm text-slate-500 mt-2 max-w-xl">
                            Follow these two steps to get started with iAudit—set up your
                            organization, then begin auditing.
                        </p>
                    </div>
                </div>

                {/* Step 1 — Set up your organization */}
                <div>
                    <OnboardingStepBadge step={1} />
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardContent className="p-0">
                            <div className="px-6 py-5 border-b border-slate-100">
                                <div className="flex gap-4">
                                    <StepCardIcon>
                                        <Building2 className="h-6 w-6" />
                                    </StepCardIcon>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg font-bold text-[#111827]">
                                            Set up your organization
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Complete these six steps from company creation
                                            through self assessment and gap analysis.
                                        </p>
                                        <div className="mt-4 flex items-center gap-3">
                                            <Progress
                                                value={progressPercent}
                                                className="h-2 flex-1 bg-slate-100 [&>div]:bg-[#1e855e]"
                                            />
                                            <span className="text-xs font-semibold text-slate-500 shrink-0">
                                                {completedCount}/
                                                {FOUNDATION_SETUP_STEPS.length} complete
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Collapsible open={stepsOpen} onOpenChange={setStepsOpen}>
                                <CollapsibleTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                                    >
                                        <span className="text-sm font-semibold text-[#111827]">
                                            {stepsOpen
                                                ? "Hide setup steps"
                                                : "View all 6 setup steps"}
                                            {allFoundationComplete && (
                                                <span className="ml-2 text-xs font-medium text-[#1e855e]">
                                                    (all complete)
                                                </span>
                                            )}
                                        </span>
                                        <ChevronDown
                                            className={cn(
                                                "h-5 w-5 shrink-0 text-slate-400 transition-transform",
                                                stepsOpen && "rotate-180",
                                            )}
                                        />
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <ul className="divide-y divide-slate-100">
                                        {FOUNDATION_SETUP_STEPS.map((step, index) => {
                                            const done =
                                                stepCompleted[
                                                    step.id as keyof typeof stepCompleted
                                                ];
                                            const Icon = STEP_ICONS[index] ?? Building2;
                                            return (
                                                <li
                                                    key={step.id}
                                                    className="flex items-start gap-4 px-6 py-5 hover:bg-slate-50/80 transition-colors"
                                                >
                                                    <div
                                                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                                                            done
                                                                ? "border-[#1e855e] bg-[#1e855e] text-white"
                                                                : "border-slate-200 bg-white text-slate-400"
                                                        }`}
                                                    >
                                                        {done ? (
                                                            <Check
                                                                className="h-4 w-4"
                                                                strokeWidth={3}
                                                            />
                                                        ) : (
                                                            <Circle className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p
                                                                    className={`text-sm font-bold text-[#111827] ${
                                                                        done
                                                                            ? "line-through text-slate-400"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    {step.title}
                                                                </p>
                                                                <p className="text-sm text-slate-500 mt-0.5">
                                                                    {step.description}
                                                                </p>
                                                            </div>
                                                            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#1e855e]">
                                                                <Icon className="h-4 w-4" />
                                                            </div>
                                                        </div>
                                                        {!done && (
                                                            <Button
                                                                type="button"
                                                                variant="link"
                                                                className="h-auto p-0 mt-2 text-[#1e855e] font-semibold text-sm hover:text-[#166534]"
                                                                onClick={() =>
                                                                    beginFoundationStep(
                                                                        navigate,
                                                                        step.path,
                                                                    )
                                                                }
                                                            >
                                                                Start step
                                                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </CollapsibleContent>
                            </Collapsible>
                        </CardContent>
                    </Card>
                </div>

                {/* Step 2 — How to start audits? */}
                <div>
                    <OnboardingStepBadge step={2} />
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardContent className="p-0">
                            <div className="px-6 py-5 border-b border-slate-100">
                                <div className="flex gap-4">
                                    <StepCardIcon>
                                        <FileCheck className="h-6 w-6" />
                                    </StepCardIcon>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg font-bold text-[#111827]">
                                            How to start audits?
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Follow the auditing workflow from program creation
                                            through templates and findings.
                                        </p>
                                        <div className="mt-4 flex items-center gap-3">
                                            <Progress
                                                value={auditProgressPercent}
                                                className="h-2 flex-1 bg-slate-100 [&>div]:bg-[#1e855e]"
                                            />
                                            <span className="text-xs font-semibold text-slate-500 shrink-0">
                                                {auditCompletedCount}/
                                                {AUDIT_WORKFLOW_STEPS.length} complete
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Collapsible
                                open={auditStepsOpen}
                                onOpenChange={setAuditStepsOpen}
                            >
                                <CollapsibleTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors"
                                    >
                                        <span className="text-sm font-semibold text-[#111827]">
                                            {auditStepsOpen
                                                ? "Hide auditing workflow"
                                                : "View auditing workflow"}
                                            {allAuditComplete && (
                                                <span className="ml-2 text-xs font-medium text-[#1e855e]">
                                                    (all complete)
                                                </span>
                                            )}
                                        </span>
                                        <ChevronDown
                                            className={cn(
                                                "h-5 w-5 shrink-0 text-slate-400 transition-transform",
                                                auditStepsOpen && "rotate-180",
                                            )}
                                        />
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <ul className="divide-y divide-slate-100 border-t border-slate-100">
                                        {AUDIT_WORKFLOW_STEPS.map((step, index) => {
                                            const done =
                                                auditStepCompleted[
                                                    step.id as keyof typeof auditStepCompleted
                                                ];
                                            const Icon =
                                                AUDIT_STEP_ICONS[index] ?? FileCheck;
                                            const isAuditProgram =
                                                step.id === "audit-program";
                                            return (
                                                <li
                                                    key={step.id}
                                                    className="flex items-start gap-4 px-6 py-5 hover:bg-slate-50/80 transition-colors"
                                                >
                                                    <div
                                                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                                                            done
                                                                ? "border-[#1e855e] bg-[#1e855e] text-white"
                                                                : "border-slate-200 bg-white text-slate-400"
                                                        }`}
                                                    >
                                                        {done ? (
                                                            <Check
                                                                className="h-4 w-4"
                                                                strokeWidth={3}
                                                            />
                                                        ) : (
                                                            <Circle className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p
                                                                    className={`text-sm font-bold text-[#111827] ${
                                                                        done
                                                                            ? "line-through text-slate-400"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    {step.title}
                                                                </p>
                                                                <p className="text-sm text-slate-500 mt-0.5 max-w-lg">
                                                                    {step.description}
                                                                </p>
                                                                <Button
                                                                    type="button"
                                                                    variant="link"
                                                                    className="h-auto p-0 mt-2 text-[#1e855e] font-semibold text-sm hover:text-[#166534]"
                                                                    onClick={() => {
                                                                        if (
                                                                            step.id ===
                                                                            "audit-program"
                                                                        ) {
                                                                            startAuditTour(
                                                                                navigate,
                                                                            );
                                                                        } else if (
                                                                            step.id ===
                                                                            "audit-plan"
                                                                        ) {
                                                                            startAuditPlanTour(
                                                                                navigate,
                                                                            );
                                                                        } else if (
                                                                            step.id ===
                                                                            "audits"
                                                                        ) {
                                                                            startAuditExecuteTour(
                                                                                navigate,
                                                                            );
                                                                        } else if (
                                                                            step.id ===
                                                                            "findings"
                                                                        ) {
                                                                            startAuditFindingsTour(
                                                                                navigate,
                                                                            );
                                                                        } else if (
                                                                            step.id ===
                                                                            "audit-templates"
                                                                        ) {
                                                                            startAuditTemplatesTour(
                                                                                navigate,
                                                                            );
                                                                        } else {
                                                                            navigate(
                                                                                step.path,
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    Go to step
                                                                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#1e855e]">
                                                                <Icon className="h-4 w-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </CollapsibleContent>
                            </Collapsible>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
