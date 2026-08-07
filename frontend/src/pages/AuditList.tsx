import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { auditPlanQueryKey } from "@/lib/auditPlanExecute";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { downloadAuditReport, type AuditReportFormat } from "@/utils/auditReportExport";
import ReusablePagination from "@/components/ReusablePagination";
import { buildPageQuery, parsePaginatedResponse } from "@/lib/pagination";
import { TourStepPopover } from "@/components/TourStepPopover";
import {
    AUDIT_EXECUTE_TOUR_STEP,
    AUDIT_EXECUTE_TOUR_TOTAL_STEPS,
    getAuditExecuteTourStepConfig,
} from "@/lib/auditExecuteOnboardingTour";
import {
    AUDIT_PLAN_TOUR_STEP,
    AUDIT_PLAN_TOUR_TOTAL_STEPS,
    clearAuditPlanTourContext,
    getAuditPlanTourStepConfig,
    loadAuditPlanTourContext,
} from "@/lib/auditPlanOnboardingTour";
import { cn } from "@/lib/utils";
import {
    getPlanModuleOptions,
    getPlanModulesProgressMap,
    getPlanOverallChecklistProgress,
    lifecycleFromModulePercents,
    scopePlanToModule,
} from "@/lib/auditPlanModules";
import {
  getAuditPlanStatusLabel,
  isAuditPlanCompleted,
  parseAuditData,
} from "@/lib/auditCompletion";
import { useAuditeeReadOnly } from "@/lib/auditeeAccess";
import {
    findAuditTemplates,
    getAuditPlanTemplateLabel,
    parseAuditPlanTemplateIds,
    resolveAuditPlanStandards,
    type AuditTemplate,
} from "@/data/auditTemplates";
import { resolveAuditModuleDisplayName } from "@/lib/auditFindings";
import { AuditModuleSelectDialog } from "@/components/AuditModuleSelectDialog";
import {
    MoreVertical, FileText, Trash2, Calendar, Search, Download, Loader2, ArrowUpDown
} from "lucide-react";
/** Subtitle under Audit column: module name(s) or ISO Standards. */
function resolveAuditListTypeLabel(plan: {
    templateId?: string | null;
    auditProgram?: {
        isoStandard?: string | null;
        scheduleData?: {
            criteriaType?: string;
            moduleFamily?: string | null;
        } | null;
    } | null;
}): string {
    const templates = findAuditTemplates(plan.templateId);
    const moduleTemplates = templates.filter(
        (t) => t.module === "EOSH" || t.module === "QFS KORE",
    );
    if (moduleTemplates.length > 0) {
        const labels = moduleTemplates.map((t) => getAuditPlanTemplateLabel(t));
        return [...new Set(labels)].join("; ");
    }

    const performModules = getPlanModuleOptions(
        plan.templateId,
        plan.auditProgram?.isoStandard,
    );
    if (performModules.length === 1 && performModules[0].isTripleMapping) {
        const stds = resolveAuditPlanStandards(
            String(plan.auditProgram?.isoStandard || ""),
            plan.auditProgram?.isoStandard,
        );
        return stds.length > 0 ? stds.join(", ") : "IMS Checklist";
    }
    if (performModules.length === 1 && performModules[0].standard) {
        return performModules[0].standard;
    }

    const fromIds = parseAuditPlanTemplateIds(plan.templateId)
        .map((id) => resolveAuditModuleDisplayName(id))
        .filter((name): name is string => Boolean(name?.trim()));
    if (fromIds.length > 0) {
        return [...new Set(fromIds)].join("; ");
    }

    const iso = String(plan.auditProgram?.isoStandard || "");
    if (iso.includes("EOSH Module:")) return "EOSH";
    if (iso.includes("QFS KORE Module:")) return "QFS KORE";

    const schedule = plan.auditProgram?.scheduleData;
    if (schedule?.criteriaType === "module") {
        if (schedule.moduleFamily === "eosh") return "EOSH";
        if (schedule.moduleFamily === "qfs-kore") return "QFS KORE";
        return "Module";
    }

    // Prefer named ISO checklist titles when present.
    const isoTemplates = templates.filter(
        (t) => t.module !== "EOSH" && t.module !== "QFS KORE",
    );
    if (isoTemplates.length > 0) {
        const labels = isoTemplates.map((t) => t.standard || t.title).filter(Boolean);
        if (labels.length > 0) return [...new Set(labels)].join("; ");
    }
    if (iso.trim()) return iso.trim();

    return "ISO Standards";
}

function isModuleAuditListPlan(plan: Parameters<typeof resolveAuditListTypeLabel>[0]): boolean {
    const templates = findAuditTemplates(plan.templateId);
    if (templates.some((t) => t.module === "EOSH" || t.module === "QFS KORE")) {
        return true;
    }
    const ids = parseAuditPlanTemplateIds(plan.templateId);
    if (
        ids.some(
            (id) =>
                id.toLowerCase().includes("eosh-") ||
                id.toLowerCase().includes("qfs-kore"),
        )
    ) {
        return true;
    }
    const iso = String(plan.auditProgram?.isoStandard || "");
    if (iso.includes("EOSH Module:") || iso.includes("QFS KORE Module:")) {
        return true;
    }
    const schedule = plan.auditProgram?.scheduleData;
    return schedule?.criteriaType === "module";
}

type AuditTypeFilter = "all" | "module" | "iso";
type AuditStatusTab = "planned" | "in_progress" | "completed";
type AuditListSortKey = "date" | "type";
type AuditListSortDir = "asc" | "desc";

const STATUS_TAB_TO_API: Record<AuditStatusTab, string> = {
    planned: "PLANNED",
    in_progress: "IN_PROGRESS",
    completed: "COMPLETED",
};

const AuditList = () => {
    const [auditPlans, setAuditPlans] = useState<any[]>(() => {
        const idParam =
            typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get("highlightPlanId")
                : null;
        const id = idParam ? Number.parseInt(idParam, 10) : NaN;
        const navPlan = (typeof window !== "undefined"
            ? (window.history.state?.usr as { savedPlan?: any } | null)?.savedPlan
            : null) ?? null;
        // React Router may not expose history.state.usr the same in all builds — also try session.
        const ctx = loadAuditPlanTourContext();
        const fromCtx = ctx?.plan;
        const seed =
            (navPlan && (!Number.isFinite(id) || Number(navPlan.id) === id) ? navPlan : null) ||
            (fromCtx && Number.isFinite(id) && Number(fromCtx.id) === id ? fromCtx : null) ||
            (fromCtx && !Number.isFinite(id) ? fromCtx : null);
        return seed ? [seed] : [];
    });
    const [highlightedPlan, setHighlightedPlan] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<AuditTypeFilter>("all");
    /** Default: latest audit date first. Audit column sorts by module / ISO type label. */
    const [sortKey, setSortKey] = useState<AuditListSortKey>("date");
    const [sortDir, setSortDir] = useState<AuditListSortDir>("desc");
    const [selectedSite, setSelectedSite] = useState("all");
    const seededOnMount = React.useRef(false);
    // Will set properly after we know if we had seed — use lazy init for loading
    const [loading, setLoading] = useState(() => {
        // Mirror seed logic lightly: if tour highlight + context plan, skip skeleton
        try {
            const idParam = new URLSearchParams(window.location.search).get("highlightPlanId");
            const id = idParam ? Number.parseInt(idParam, 10) : NaN;
            const ctx = loadAuditPlanTourContext();
            if (ctx?.plan && Number.isFinite(id) && Number(ctx.plan.id) === id) {
                seededOnMount.current = true;
                return false;
            }
            if (ctx?.plan && window.location.search.includes("auditPlanTour=true")) {
                seededOnMount.current = true;
                return false;
            }
        } catch {
            // ignore
        }
        return true;
    });
    /** True while refetching after filters/page change — keep prior rows visible. */
    const [refreshing, setRefreshing] = useState(false);
    const hasLoadedOnceRef = React.useRef(seededOnMount.current);
    const auditPlanTourToastShownRef = React.useRef(false);
    /** e.g. "42-pdf" while generating a report for plan 42 */
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
    const [modulePicker, setModulePicker] = useState<{
        mode: "perform" | "download";
        plan: any;
        modules: AuditTemplate[];
        selectedModuleId: string | null;
        downloadFormat?: AuditReportFormat;
        progressByModuleId: Record<string, number>;
        progressLoading: boolean;
    } | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const isAuditeeReadOnly = useAuditeeReadOnly();

    // Prefer React Router location.state for instant list after save/update.
    useEffect(() => {
        const navState = location.state as
            | { savedPlan?: any; auditPlanTourJustSaved?: boolean; savedMessage?: string }
            | null;
        const savedPlan = navState?.savedPlan;
        if (savedPlan?.id != null) {
            setAuditPlans((prev) => {
                if (prev.some((p) => Number(p.id) === Number(savedPlan.id))) return prev;
                return [savedPlan, ...prev];
            });
            setHighlightedPlan(savedPlan);
            setLoading(false);
            hasLoadedOnceRef.current = true;
        }
    }, [location.state]);

    const [searchParams, setSearchParams] = useSearchParams();
    const auditExecuteTourActive = searchParams.get("auditExecuteTour") === "true";
    const auditPlanTourActive = searchParams.get("auditPlanTour") === "true";
    const auditPlanTourStep = Math.min(
        AUDIT_PLAN_TOUR_TOTAL_STEPS,
        Math.max(1, parseInt(searchParams.get("auditPlanStep") || "1", 10)),
    );
    const auditPlanTourStepConfig = getAuditPlanTourStepConfig(auditPlanTourStep);
    const highlightPlanIdParam = searchParams.get("highlightPlanId");
    const highlightPlanId = highlightPlanIdParam ? parseInt(highlightPlanIdParam, 10) : NaN;
    const auditExecuteTourStep = Math.min(
        AUDIT_EXECUTE_TOUR_TOTAL_STEPS,
        Math.max(1, parseInt(searchParams.get("auditExecuteStep") || "1", 10)),
    );
    const auditExecuteTourStepConfig =
        getAuditExecuteTourStepConfig(auditExecuteTourStep);

    const statusFromUrl = searchParams.get("status");
    const initialStatusTab: AuditStatusTab =
        statusFromUrl === "planned" ||
        statusFromUrl === "in_progress" ||
        statusFromUrl === "completed"
            ? statusFromUrl
            : "planned";
    /** Status tab — default Planned; each click fetches that status from the API. */
    const [statusTab, setStatusTab] = useState<AuditStatusTab>(initialStatusTab);

    const setAuditExecuteTourStep = (step: number) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("auditExecuteTour", "true");
                next.set("auditExecuteStep", String(step));
                return next;
            },
            { replace: true },
        );
    };

    const exitAuditExecuteTour = () => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("auditExecuteTour");
                next.delete("auditExecuteStep");
                return next;
            },
            { replace: true },
        );
    };

    const exitAuditPlanTour = () => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("auditPlanTour");
                next.delete("auditPlanStep");
                next.delete("highlightPlanId");
                return next;
            },
            { replace: true },
        );
    };

    const tourExecuteHighlight = (step: number) =>
        auditExecuteTourActive && auditExecuteTourStep === step
            ? "relative z-[60] ring-[4px] ring-emerald-500/80 ring-offset-2 rounded-xl"
            : "";

    useEffect(() => {
        if (!auditPlanTourActive || auditPlanTourStep !== AUDIT_PLAN_TOUR_STEP.COMPLETE) {
            return;
        }
        setStatusTab("planned");

        const navState = location.state as
            | { auditPlanTourJustSaved?: boolean; savedMessage?: string }
            | null;
        if (navState?.auditPlanTourJustSaved && !auditPlanTourToastShownRef.current) {
            auditPlanTourToastShownRef.current = true;
            toast.success(navState.savedMessage || "Audit Plan saved successfully!");
            window.history.replaceState({}, document.title);
        }

        requestAnimationFrame(() => {
            document
                .getElementById("tour-step-created-audit-plan")
                ?.scrollIntoView({ block: "center" });
        });
    }, [auditPlanTourActive, auditPlanTourStep, auditPlans, highlightPlanId, location.state]);

    useEffect(() => {
        if (
            !auditPlanTourActive ||
            auditPlanTourStep !== AUDIT_PLAN_TOUR_STEP.COMPLETE ||
            !Number.isFinite(highlightPlanId)
        ) {
            return;
        }
        const inList = auditPlans.some((p) => Number(p.id) === highlightPlanId);
        if (inList) {
            setHighlightedPlan(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch(`/audit-plans/${highlightPlanId}`);
                if (!res.ok || cancelled) return;
                const plan = await res.json();
                if (!cancelled && plan?.id != null) {
                    setHighlightedPlan(plan);
                    setAuditPlans((prev) => {
                        if (prev.some((p) => Number(p.id) === Number(plan.id))) return prev;
                        return [plan, ...prev];
                    });
                }
            } catch {
                // list fetch may still surface the plan
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [auditPlanTourActive, auditPlanTourStep, highlightPlanId, auditPlans]);

    // Deletion State
    const [planToDelete, setPlanToDelete] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [siteOptions, setSiteOptions] = useState<string[]>(["all"]);
    const itemsPerPage = 8;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / itemsPerPage);

    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => window.clearTimeout(t);
    }, [searchQuery]);

    // After creating a plan, land on Planned with filters cleared so the new row is visible.
    useEffect(() => {
        if (searchParams.get("saved") !== "1") return;
        setStatusTab("planned");
        setSelectedSite("all");
        setTypeFilter("all");
        setSearchQuery("");
        setDebouncedSearch("");
        setCurrentPage(1);
        hasLoadedOnceRef.current = false;
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("saved");
                next.set("status", "planned");
                return next;
            },
            { replace: true },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after save redirect
    }, [searchParams.get("saved")]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, selectedSite, typeFilter, statusTab]);

    useEffect(() => {
        if (sortKey === "date") setCurrentPage(1);
    }, [sortKey, sortDir]);

    const dateOrderForApi = sortKey === "date" ? sortDir : "desc";

    const fetchPlans = async () => {
        const isInitial = !hasLoadedOnceRef.current;
        try {
            if (isInitial) setLoading(true);
            else setRefreshing(true);
            const qs = buildPageQuery({
                page: currentPage,
                limit: itemsPerPage,
                scope: "org",
                search: debouncedSearch || undefined,
                site: selectedSite !== "all" ? selectedSite : undefined,
                type: typeFilter !== "all" ? typeFilter : undefined,
                status: STATUS_TAB_TO_API[statusTab],
                // Server sorts by date for pagination; type sort is applied on the page.
                sort: "date",
                order: dateOrderForApi,
            });
            const res = await apiFetch(`/audit-plans${qs}`);
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(
                    (errBody as { error?: string; details?: string })?.details ||
                        (errBody as { error?: string })?.error ||
                        `Failed to load audit plans (${res.status})`,
                );
            }
            const data = await res.json();
            const parsed = parsePaginatedResponse<any>(data, currentPage, itemsPerPage);
            setAuditPlans((prev) => {
                // Keep a just-saved plan visible if the filtered page does not include it yet.
                if (
                    Number.isFinite(highlightPlanId) &&
                    !parsed.items.some((p) => Number(p.id) === highlightPlanId)
                ) {
                    const keep =
                        prev.find((p) => Number(p.id) === highlightPlanId) ||
                        highlightedPlan;
                    if (keep) return [keep, ...parsed.items];
                }
                return parsed.items;
            });
            setTotalItems(parsed.total);
            hasLoadedOnceRef.current = true;
        } catch (error) {
            console.error("Failed to fetch audit plans:", error);
            toast.error("Failed to load audit plans");
            if (!hasLoadedOnceRef.current) {
                setAuditPlans([]);
                setTotalItems(0);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void fetchPlans();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when tab/filters/page/date-sort change
    }, [currentPage, debouncedSearch, selectedSite, typeFilter, statusTab, dateOrderForApi]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Names only — full site rows are unnecessary for filter chips.
                const res = await apiFetch("/sites?minimal=1");
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const rows = Array.isArray(data)
                    ? data
                    : Array.isArray((data as { data?: unknown })?.data)
                      ? (data as { data: unknown[] }).data
                      : [];
                const names = rows
                    .map((s: any) => String(s?.name || "").trim())
                    .filter(Boolean);
                if (!cancelled) {
                    setSiteOptions(["all", ...Array.from(new Set(names))]);
                }
            } catch {
                /* ignore — site filter still works with typed values */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleDeletePlan = async (planId: number) => {
        try {
            const res = await apiFetch(`/audit-plans/${planId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Audit plan deleted successfully");
                void fetchPlans();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete audit plan");
        }
    };

    const formatLabels: Record<AuditReportFormat, string> = {
        pdf: "PDF",
        docx: "Word",
        excel: "Excel",
    };

    const navigateToPerformAudit = (plan: any, moduleId?: string) => {
        const basePath = `/audit/execute/${plan.id}`;
        const params = new URLSearchParams();
        if (auditExecuteTourActive) {
            params.set("auditExecuteTour", "true");
            params.set("auditExecuteStep", "4");
        }
        if (moduleId) params.set("module", moduleId);
        const qs = params.toString();
        // Seed execute query cache with the freshly fetched plan so reopen never
        // hydrates from a stale empty/partial cache.
        if (plan?.id && plan.auditData) {
            queryClient.setQueryData(auditPlanQueryKey(plan.id), plan);
        }
        navigate(qs ? `${basePath}?${qs}` : basePath, {
            state: {
                plan,
                activeModuleId: moduleId || undefined,
                lockModule: Boolean(moduleId),
            },
        });
    };

    const openModulePicker = async (
        mode: "perform" | "download",
        plan: any,
        downloadFormat?: AuditReportFormat,
    ) => {
        const modules = getPlanModuleOptions(
            plan.templateId,
            plan.auditProgram?.isoStandard,
        );
        // List payloads omit auditData — always load the full plan before opening/downloading.
        if (modules.length <= 1) {
            if (mode === "perform") {
                const toastId = toast.loading("Opening audit…");
                try {
                    const res = await apiFetch(`/audit-plans/${plan.id}`);
                    if (!res.ok) {
                        throw new Error(
                            res.status === 404
                                ? "Audit not found"
                                : "Failed to load audit details",
                        );
                    }
                    const fullPlan = await res.json();
                    toast.dismiss(toastId);
                    navigateToPerformAudit(fullPlan, modules[0]?.id);
                } catch (error) {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : "Failed to open audit",
                        { id: toastId },
                    );
                }
                return;
            }
            if (downloadFormat) {
                void handleDownloadReport(plan, downloadFormat, modules[0]?.id);
            }
            return;
        }

        setModulePicker({
            mode,
            plan,
            modules,
            selectedModuleId: modules[0]?.id ?? null,
            downloadFormat,
            progressByModuleId: getPlanModulesProgressMap(plan),
            progressLoading: true,
        });

        try {
            const res = await apiFetch(`/audit-plans/${plan.id}`);
            if (!res.ok) {
                setModulePicker((prev) =>
                    prev ? { ...prev, progressLoading: false } : prev,
                );
                return;
            }
            const fullPlan = await res.json();
            setModulePicker((prev) =>
                prev && String(prev.plan?.id) === String(plan.id) && prev.mode === mode
                    ? {
                          ...prev,
                          plan: fullPlan,
                          progressByModuleId: getPlanModulesProgressMap(fullPlan),
                          progressLoading: false,
                      }
                    : prev,
            );

            // Repair stale multi-module lifecycle: one finished checklist used to
            // mark the whole plan Completed. Rewrite aggregate progress quietly.
            void repairMultiModuleLifecycleProgress(fullPlan);
        } catch {
            setModulePicker((prev) =>
                prev ? { ...prev, progressLoading: false } : prev,
            );
        }
    };

    const repairMultiModuleLifecycleProgress = async (fullPlan: {
        id?: number;
        templateId?: string | null;
        auditData?: unknown;
        status?: string;
        progress?: number;
        auditProgram?: { isoStandard?: string };
    }) => {
        const ids = getPlanModuleOptions(
            fullPlan?.templateId,
            fullPlan?.auditProgram?.isoStandard,
        ).map((m) => m.id);
        if (!fullPlan?.id || ids.length <= 1 || fullPlan.auditData == null) return;

        const overall = getPlanOverallChecklistProgress(fullPlan);
        const expectedLabel = lifecycleFromModulePercents(
            ids.map((id) => overall.byModuleId[id] ?? 0),
        );
        const currentLabel = getAuditPlanStatusLabel(
            fullPlan as { id: number; templateId?: string; auditData?: unknown; status?: string; progress?: number },
        );
        const data = parseAuditData(fullPlan) || {};
        const storedMap = data.moduleProgressByTemplateId;
        const needsModuleMap =
            !storedMap ||
            typeof storedMap !== "object" ||
            ids.some(
                (id) =>
                    Number((storedMap as Record<string, unknown>)[id]) !==
                    (overall.byModuleId[id] ?? 0),
            );
        const storedProgress = Number(
            typeof fullPlan.progress === "number"
                ? fullPlan.progress
                : data.progress ?? 0,
        );
        const progressMismatch =
            !Number.isFinite(storedProgress) ||
            Math.round(storedProgress) !== overall.percent;

        if (expectedLabel === currentLabel && !needsModuleMap && !progressMismatch) {
            return;
        }

        try {
            await apiFetch(`/audit-plans/${fullPlan.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    auditData: {
                        ...data,
                        progress: overall.percent,
                        totalItems: overall.total > 0 ? overall.total : data.totalItems,
                        completedItems:
                            overall.total > 0 ? overall.completed : data.completedItems,
                        moduleProgressByTemplateId: overall.byModuleId,
                    },
                }),
            });
            // Refresh list so the audit moves to the correct status tab.
            void fetchPlans();
        } catch {
            /* non-blocking repair */
        }
    };

    const handlePerformAuditClick = (plan: any) => {
        void openModulePicker("perform", plan);
    };

    const handleDownloadReport = async (
        planStub: { id: number; auditName?: string; templateId?: string | null },
        format: AuditReportFormat,
        moduleId?: string,
    ) => {
        const key = `${planStub.id}-${format}${moduleId ? `-${moduleId}` : ""}`;
        if (downloadingKey) return;

        const toastId = toast.loading(`Preparing ${formatLabels[format]} report…`);
        setDownloadingKey(key);

        try {
            const res = await apiFetch(`/audit-plans/${planStub.id}`);
            if (!res.ok) {
                let detail = "";
                try {
                    const errBody = await res.json();
                    detail = String(errBody?.error || "");
                } catch {
                    /* ignore */
                }
                throw new Error(
                    detail || `Could not load audit data for this report (HTTP ${res.status}).`,
                );
            }
            let plan = await res.json();
            if (moduleId) {
                plan = scopePlanToModule(plan, moduleId);
            }

            toast.loading(`Generating ${formatLabels[format]} report…`, { id: toastId });
            await downloadAuditReport(plan, format);

            toast.success(`${formatLabels[format]} report downloaded`, { id: toastId });
        } catch (error) {
            console.error("Report download error:", error);
            toast.error(
                error instanceof Error ? error.message : `Failed to generate ${formatLabels[format]} report`,
                { id: toastId }
            );
        } finally {
            setDownloadingKey(null);
        }
    };

    const handleDownloadFormatClick = (plan: any, format: AuditReportFormat) => {
        void openModulePicker("download", plan, format);
    };

    const confirmModulePicker = () => {
        if (!modulePicker?.selectedModuleId) return;
        const { mode, plan, selectedModuleId, downloadFormat } = modulePicker;
        setModulePicker(null);
        if (mode === "perform") {
            navigateToPerformAudit(plan, selectedModuleId);
            return;
        }
        if (downloadFormat) {
            void handleDownloadReport(plan, downloadFormat, selectedModuleId);
        }
    };

    const filteredPlans = auditPlans;
    const uniqueSites = siteOptions;

    const toggleListSort = (key: AuditListSortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            return;
        }
        setSortKey(key);
        setSortDir(key === "date" ? "desc" : "asc");
    };

    /** Flat list — no Modules / ISO section headers. Type sort applied on this page. */
    const displayedPlans = React.useMemo(() => {
        const plans = [...auditPlans];
        if (sortKey !== "type") return plans;
        const mul = sortDir === "asc" ? 1 : -1;
        plans.sort((a, b) => {
            const aMod = isModuleAuditListPlan(a) ? 0 : 1;
            const bMod = isModuleAuditListPlan(b) ? 0 : 1;
            if (aMod !== bMod) return (aMod - bMod) * mul;
            return (
                resolveAuditListTypeLabel(a).localeCompare(
                    resolveAuditListTypeLabel(b),
                    undefined,
                    { sensitivity: "base" },
                ) * mul
            );
        });
        return plans;
    }, [auditPlans, sortKey, sortDir]);

    const tourTargetPlan = displayedPlans[0] ?? auditPlans[0] ?? null;

    const createdPlanTourTarget = Number.isFinite(highlightPlanId)
        ? auditPlans.find((p) => Number(p.id) === highlightPlanId) ??
          (highlightedPlan && Number(highlightedPlan.id) === highlightPlanId
              ? highlightedPlan
              : null)
        : null;

    const auditPlanCompleteTargetId = createdPlanTourTarget
        ? "tour-step-created-audit-plan"
        : "viewport";

    const handleAuditPlanTourNext = () => {
        exitAuditPlanTour();
        clearAuditPlanTourContext();
        navigate("/getting-started?nextAuditWorkflowStep=audits");
    };

    const handleAuditPlanTourBack = () => {
        const restored = loadAuditPlanTourContext();
        navigate(
            `/audit-program/create-plan?auditPlanTour=true&auditPlanStep=${AUDIT_PLAN_TOUR_STEP.SAVE}`,
            restored ? { state: restored } : undefined,
        );
    };

    const handleAuditExecuteTourNext = () => {
        if (auditExecuteTourStep === AUDIT_EXECUTE_TOUR_STEP.START) {
            if (!tourTargetPlan?.id) {
                toast.error(
                    "No audit plans found. Create an audit plan first, then return to run the audit.",
                );
                return;
            }
            navigate(
                `/audit/execute/${tourTargetPlan.id}?auditExecuteTour=true&auditExecuteStep=${AUDIT_EXECUTE_TOUR_STEP.OVERVIEW}`,
                { state: { plan: tourTargetPlan } },
            );
            return;
        }
        if (auditExecuteTourStep === AUDIT_EXECUTE_TOUR_STEP.COMPLETE_LIST) {
            exitAuditExecuteTour();
            navigate("/getting-started?nextAuditWorkflowStep=findings");
            return;
        }
        if (auditExecuteTourStep >= AUDIT_EXECUTE_TOUR_TOTAL_STEPS) {
            exitAuditExecuteTour();
            navigate("/getting-started?nextAuditWorkflowStep=findings");
            return;
        }
        setAuditExecuteTourStep(auditExecuteTourStep + 1);
    };

    const handleAuditExecuteTourBack = () => {
        if (auditExecuteTourStep === AUDIT_EXECUTE_TOUR_STEP.COMPLETE_LIST) {
            if (tourTargetPlan?.id) {
                navigate(
                    `/audit/execute/${tourTargetPlan.id}?auditExecuteTour=true&auditExecuteStep=${AUDIT_EXECUTE_TOUR_STEP.SAVE}`,
                    { state: { plan: tourTargetPlan } },
                );
                return;
            }
            exitAuditExecuteTour();
            navigate("/getting-started");
            return;
        }
        if (auditExecuteTourStep <= 1) {
            exitAuditExecuteTour();
            navigate("/getting-started");
            return;
        }
        setAuditExecuteTourStep(auditExecuteTourStep - 1);
    };

    // Filters are applied server-side; page resets when debounced search / filters change.

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-white relative">
            {auditExecuteTourActive && (
                <div className="fixed inset-0 bg-slate-900/10 z-[40] pointer-events-none" />
            )}
            <div className="w-full max-w-[1800px] mx-auto space-y-6 animate-in fade-in duration-500">
                {/* 1. Heading */}
                <div className="space-y-1 relative z-10">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        Audit Active List
                    </h2>
                    <p className="text-sm text-[#64748B] font-medium">
                        View and manage all your verified audit plans.
                    </p>
                </div>

                {/* 2. Search + type filters (All / Modules / ISO Standards) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 relative z-10 w-full">
                    <div className="relative flex-1 min-w-0 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search audits..."
                            className="pl-9 w-full h-12 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={selectedSite} onValueChange={setSelectedSite}>
                        <SelectTrigger
                            className="w-full sm:w-[180px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-[#213847]/40"
                            aria-label="Filter by site"
                        >
                            <SelectValue placeholder="All Sites" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-72">
                            <SelectItem value="all" className="rounded-lg cursor-pointer">
                                All Sites
                            </SelectItem>
                            {uniqueSites
                                .filter((site) => site !== "all")
                                .map((site) => (
                                    <SelectItem
                                        key={site}
                                        value={site}
                                        className="rounded-lg cursor-pointer"
                                    >
                                        {site}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                    <div
                        className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm sm:ml-auto"
                        role="group"
                        aria-label="Filter by audit type"
                    >
                        {(
                            [
                                { id: "all", label: "All" },
                                { id: "module", label: "Modules" },
                                { id: "iso", label: "ISO Standards" },
                            ] as const
                        ).map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setTypeFilter(opt.id)}
                                className={cn(
                                    "h-10 rounded-lg px-3.5 text-sm font-semibold transition-colors whitespace-nowrap",
                                    typeFilter === opt.id
                                        ? "bg-[#213847] text-white shadow-sm"
                                        : "text-slate-600 hover:bg-white hover:text-slate-900",
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3–4. Status tabs + audit list (Audits tour Step 2 targets this whole block) */}
                <div
                    id="tour-step-audit-plans-list"
                    className={cn(
                        "w-full relative z-10 space-y-4 rounded-xl",
                        tourExecuteHighlight(AUDIT_EXECUTE_TOUR_STEP.LIST) ||
                            tourExecuteHighlight(AUDIT_EXECUTE_TOUR_STEP.COMPLETE_LIST),
                    )}
                >
                <div
                    className="inline-flex h-12 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm relative z-10"
                    role="tablist"
                    aria-label="Filter by audit status"
                >
                    {(
                        [
                            {
                                id: "planned" as const,
                                label: "Planned",
                                active: "bg-blue-600 text-white shadow-sm",
                                idle: "text-blue-700 hover:bg-blue-50",
                            },
                            {
                                id: "in_progress" as const,
                                label: "In Progress",
                                active: "bg-amber-500 text-white shadow-sm",
                                idle: "text-amber-700 hover:bg-amber-50",
                            },
                            {
                                id: "completed" as const,
                                label: "Completed",
                                active: "bg-emerald-600 text-white shadow-sm",
                                idle: "text-emerald-700 hover:bg-emerald-50",
                            },
                        ]
                    ).map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            role="tab"
                            aria-selected={statusTab === opt.id}
                            onClick={() => {
                                if (statusTab === opt.id) return;
                                setAuditPlans([]);
                                setTotalItems(0);
                                hasLoadedOnceRef.current = false;
                                setStatusTab(opt.id);
                            }}
                            className={cn(
                                "h-10 rounded-lg px-4 text-sm font-semibold transition-colors whitespace-nowrap",
                                statusTab === opt.id ? opt.active : opt.idle,
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="w-full relative z-10 space-y-6">
                    <div
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative z-10 w-full"
                    >
                        <Table>
                            <TableHeader className="bg-[#213847]">
                                <TableRow className="hover:bg-[#213847] border-none">
                                    <TableHead className="font-medium text-white h-12 py-3">Plan Name</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleListSort("type")}
                                            className="inline-flex items-center gap-1.5 font-medium text-white hover:text-emerald-200 transition-colors"
                                            title="Sort by module / ISO standard"
                                            aria-label="Sort by module or ISO standard"
                                        >
                                            Audit
                                            <ArrowUpDown
                                                className={cn(
                                                    "w-3.5 h-3.5 opacity-70",
                                                    sortKey === "type" && "opacity-100 text-emerald-300",
                                                )}
                                            />
                                            {sortKey === "type" ? (
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-200/90">
                                                    {sortDir === "asc" ? "A–Z" : "Z–A"}
                                                </span>
                                            ) : null}
                                        </button>
                                    </TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Site</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleListSort("date")}
                                            className="inline-flex items-center gap-1.5 font-medium text-white hover:text-emerald-200 transition-colors"
                                            title="Sort by date"
                                            aria-label="Sort by date"
                                        >
                                            Date
                                            <ArrowUpDown
                                                className={cn(
                                                    "w-3.5 h-3.5 opacity-70",
                                                    sortKey === "date" && "opacity-100 text-emerald-300",
                                                )}
                                            />
                                            {sortKey === "date" ? (
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-200/90">
                                                    {sortDir === "desc" ? "Newest" : "Oldest"}
                                                </span>
                                            ) : null}
                                        </button>
                                    </TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Lead Auditor</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Status</TableHead>
                                    <TableHead className="text-right font-medium text-white h-12 py-3">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && auditPlans.length === 0 ? (
                                    Array.from({ length: itemsPerPage }).map((_, i) => (
                                        <TableRow key={`skel-${i}`} className="border-b border-slate-100">
                                            {Array.from({ length: 7 }).map((__, j) => (
                                                <TableCell key={j} className="py-5">
                                                    <div
                                                        className="h-4 rounded bg-slate-100 animate-pulse"
                                                        style={{ width: j === 6 ? "72px" : j === 0 ? "70%" : "55%", marginLeft: j === 6 ? "auto" : undefined }}
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : filteredPlans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center text-slate-500 font-medium">
                                            No audit plans found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayedPlans.map((plan) => {
                                        const auditTypeLabel = resolveAuditListTypeLabel(plan);
                                        const isTourTargetRow =
                                            tourTargetPlan?.id === plan.id;
                                        const isCreatedPlanTourRow =
                                            auditPlanTourActive &&
                                            auditPlanTourStep === AUDIT_PLAN_TOUR_STEP.COMPLETE &&
                                            createdPlanTourTarget?.id === plan.id;
                                        return (
                                            <TableRow
                                                key={plan.id}
                                                id={
                                                    isCreatedPlanTourRow
                                                        ? "tour-step-created-audit-plan"
                                                        : undefined
                                                }
                                                className={cn(
                                                    "cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 group",
                                                    refreshing && "opacity-60",
                                                    isCreatedPlanTourRow &&
                                                        "relative z-[60] ring-[4px] ring-emerald-500/80 ring-offset-2",
                                                )}
                                            >
                                                <TableCell className="font-bold text-slate-800 py-5">
                                                    {plan.auditName || "Unnamed Audit"}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700">{plan.executionId || "Standalone"}</span>
                                                        <span
                                                            className="text-xs text-slate-400 font-medium max-w-[220px] truncate"
                                                            title={auditTypeLabel}
                                                        >
                                                            {auditTypeLabel}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-bold py-5">
                                                    {plan.auditProgram?.site?.name || plan.location?.split(',')[0] || "Head Office"}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex items-center text-slate-700 font-bold text-sm bg-slate-100 w-fit px-2 py-0.5 rounded-md gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                        {plan.date ? format(new Date(plan.date), "yyyy-MM-dd") : "TBD"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-600 py-5">
                                                    {plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : "-"}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    {(() => {
                                                        const status = getAuditPlanStatusLabel(plan);
                                                        return (
                                                            <span
                                                                className={cn(
                                                                    "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold",
                                                                    status === "Completed"
                                                                        ? "bg-emerald-50 text-emerald-700"
                                                                        : status === "In Progress"
                                                                          ? "bg-amber-50 text-amber-700"
                                                                          : "bg-blue-50 text-blue-700",
                                                                )}
                                                            >
                                                                {status}
                                                            </span>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-right py-5">
                                                    <div className="flex justify-end items-center gap-2 pr-2">
                                                        <Button
                                                            id={
                                                                isTourTargetRow
                                                                    ? "tour-step-start-audit-eye"
                                                                    : undefined
                                                            }
                                                            variant="outline"
                                                            size="sm"
                                                            className={cn(
                                                                "h-8 px-3 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 rounded-md font-semibold",
                                                                isTourTargetRow &&
                                                                    tourExecuteHighlight(AUDIT_EXECUTE_TOUR_STEP.START),
                                                            )}
                                                            title={isAuditeeReadOnly ? "View audit" : "Perform Audit"}
                                                            onClick={() => handlePerformAuditClick(plan)}
                                                        >
                                                            {isAuditeeReadOnly ? "View Audit" : "Perform Audit"}
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={!!downloadingKey}
                                                                    className="w-8 h-8 text-slate-500 hover:bg-slate-100 rounded-full disabled:opacity-60"
                                                                    title={downloadingKey?.startsWith(`${plan.id}-`) ? "Downloading report…" : "Download report"}
                                                                >
                                                                    {downloadingKey?.startsWith(`${plan.id}-`) ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <Download className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuItem
                                                                    disabled={!!downloadingKey}
                                                                    onClick={() => handleDownloadFormatClick(plan, "pdf")}
                                                                    className="gap-2 cursor-pointer"
                                                                >
                                                                    <FileText className="w-4 h-4 text-red-500" /> Download PDF
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    disabled={!!downloadingKey}
                                                                    onClick={() => handleDownloadFormatClick(plan, "docx")}
                                                                    className="gap-2 cursor-pointer"
                                                                >
                                                                    <FileText className="w-4 h-4 text-blue-500" /> Download Word
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    disabled={!!downloadingKey}
                                                                    onClick={() => handleDownloadFormatClick(plan, "excel")}
                                                                    className="gap-2 cursor-pointer"
                                                                >
                                                                    <FileText className="w-4 h-4 text-emerald-500" /> Download Excel
                                                                </DropdownMenuItem>
                                                                {!isAuditeeReadOnly && (
                                                                <DropdownMenuItem 
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2 cursor-pointer"
                                                                    onClick={() => {
                                                                        setPlanToDelete(plan);
                                                                        setIsDeleteDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" /> Delete Plan
                                                                </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <ReusablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        className="mt-6"
                    />
                </div>
                </div>
            </div>
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl border-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-slate-800">Delete Audit Plan?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500">
                            This will permanently remove the audit plan for <span className="font-bold text-slate-700">{planToDelete?.auditName || planToDelete?.auditType}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200 font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => planToDelete && handleDeletePlan(planToDelete.id)}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                        >
                            Delete Plan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AuditModuleSelectDialog
                open={Boolean(modulePicker)}
                onOpenChange={(open) => {
                    if (!open) setModulePicker(null);
                }}
                title={
                    modulePicker?.mode === "download"
                        ? "Select checklist to download"
                        : "Select checklist to perform"
                }
                description={
                    modulePicker?.mode === "download"
                        ? `This audit has ${modulePicker?.modules.length ?? 0} modules. Choose one checklist to download separately.`
                        : `This audit has ${modulePicker?.modules.length ?? 0} modules. Choose one checklist to perform separately.`
                }
                modules={modulePicker?.modules ?? []}
                selectedModuleId={modulePicker?.selectedModuleId ?? null}
                progressByModuleId={modulePicker?.progressByModuleId}
                progressLoading={modulePicker?.progressLoading}
                onSelectModule={(moduleId) =>
                    setModulePicker((prev) =>
                        prev ? { ...prev, selectedModuleId: moduleId } : prev,
                    )
                }
                confirmLabel={
                    modulePicker?.mode === "download"
                        ? `Download ${modulePicker.downloadFormat ? formatLabels[modulePicker.downloadFormat] : "report"}`
                        : isAuditeeReadOnly
                          ? "View checklist"
                          : "Perform checklist"
                }
                onConfirm={confirmModulePicker}
            />

            {auditPlanTourActive &&
                auditPlanTourStep === AUDIT_PLAN_TOUR_STEP.COMPLETE &&
                auditPlanTourStepConfig && (
                    <TourStepPopover
                        key={`audit-plan-${auditPlanTourStep}-${auditPlanCompleteTargetId}`}
                        targetId={auditPlanCompleteTargetId}
                        step={auditPlanTourStep}
                        totalSteps={AUDIT_PLAN_TOUR_TOTAL_STEPS}
                        title={auditPlanTourStepConfig.title}
                        description={auditPlanTourStepConfig.description}
                        position={createdPlanTourTarget ? "bottom" : "center"}
                        onNext={handleAuditPlanTourNext}
                        onBack={handleAuditPlanTourBack}
                        onClose={() => {
                            exitAuditPlanTour();
                            clearAuditPlanTourContext();
                            navigate("/getting-started");
                        }}
                    />
                )}

            {auditExecuteTourActive &&
                (auditExecuteTourStep <= AUDIT_EXECUTE_TOUR_STEP.START ||
                    auditExecuteTourStep === AUDIT_EXECUTE_TOUR_STEP.COMPLETE_LIST) &&
                auditExecuteTourStepConfig && (
                    <TourStepPopover
                        key={auditExecuteTourStep}
                        targetId={auditExecuteTourStepConfig.targetId}
                        step={auditExecuteTourStep}
                        totalSteps={AUDIT_EXECUTE_TOUR_TOTAL_STEPS}
                        title={auditExecuteTourStepConfig.title}
                        description={auditExecuteTourStepConfig.description}
                        position={auditExecuteTourStepConfig.position}
                        onNext={handleAuditExecuteTourNext}
                        onBack={handleAuditExecuteTourBack}
                        onClose={() => {
                            exitAuditExecuteTour();
                            navigate("/getting-started");
                        }}
                    />
                )}
        </div>
    );
};

export default AuditList;
