import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
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
    AUDIT_EXECUTE_TOUR_TOTAL_STEPS,
    getAuditExecuteTourStepConfig,
} from "@/lib/auditExecuteOnboardingTour";
import { cn } from "@/lib/utils";
import {
  getAuditPlanStatusLabel,
  isAuditPlanCompleted,
} from "@/lib/auditCompletion";
import { useAuditeeReadOnly } from "@/lib/auditeeAccess";
import {
    findAuditTemplates,
    getAuditPlanTemplateLabel,
    parseAuditPlanTemplateIds,
    type AuditTemplate,
} from "@/data/auditTemplates";
import { resolveAuditModuleDisplayName } from "@/lib/auditFindings";
import {
    getPlanModuleOptions,
    scopePlanToModule,
} from "@/lib/auditPlanModules";
import { AuditModuleSelectDialog } from "@/components/AuditModuleSelectDialog";
import {
    MoreVertical, FileText, Trash2, Calendar, Search, Download, Loader2
} from "lucide-react";
/** Subtitle under Audit column: module name(s) or ISO Standards. */
function resolveAuditListTypeLabel(plan: {
    templateId?: string | null;
    auditProgram?: {
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

    const fromIds = parseAuditPlanTemplateIds(plan.templateId)
        .map((id) => resolveAuditModuleDisplayName(id))
        .filter((name): name is string => Boolean(name?.trim()));
    if (fromIds.length > 0) {
        return [...new Set(fromIds)].join("; ");
    }

    const schedule = plan.auditProgram?.scheduleData;
    if (schedule?.criteriaType === "module") {
        if (schedule.moduleFamily === "eosh") return "EOSH";
        if (schedule.moduleFamily === "qfs-kore") return "QFS KORE";
        return "Module";
    }

    return "ISO Standards";
}

function isModuleAuditListPlan(plan: Parameters<typeof resolveAuditListTypeLabel>[0]): boolean {
    return resolveAuditListTypeLabel(plan) !== "ISO Standards";
}

type AuditTypeFilter = "all" | "module" | "iso";

const AuditList = () => {
    const [auditPlans, setAuditPlans] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<AuditTypeFilter>("all");
    const [selectedSite, setSelectedSite] = useState("all");
    const [loading, setLoading] = useState(true);
    /** True while refetching after filters/page change — keep prior rows visible. */
    const [refreshing, setRefreshing] = useState(false);
    const hasLoadedOnceRef = React.useRef(false);
    /** e.g. "42-pdf" while generating a report for plan 42 */
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
    const [modulePicker, setModulePicker] = useState<{
        mode: "perform" | "download";
        plan: any;
        modules: AuditTemplate[];
        selectedModuleId: string | null;
        downloadFormat?: AuditReportFormat;
    } | null>(null);
    const navigate = useNavigate();
    const isAuditeeReadOnly = useAuditeeReadOnly();
    const [searchParams, setSearchParams] = useSearchParams();
    const auditExecuteTourActive = searchParams.get("auditExecuteTour") === "true";
    const auditExecuteTourStep = Math.min(
        AUDIT_EXECUTE_TOUR_TOTAL_STEPS,
        Math.max(1, parseInt(searchParams.get("auditExecuteStep") || "1", 10)),
    );
    const auditExecuteTourStepConfig =
        getAuditExecuteTourStepConfig(auditExecuteTourStep);

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

    const tourExecuteHighlight = (step: number) =>
        auditExecuteTourActive && auditExecuteTourStep === step
            ? "relative z-[60] ring-[4px] ring-emerald-500/80 ring-offset-2 rounded-xl"
            : "";

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

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, selectedSite, typeFilter]);

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
            });
            const res = await apiFetch(`/audit-plans${qs}`);
            const data = await res.json();
            const parsed = parsePaginatedResponse<any>(data, currentPage, itemsPerPage);
            setAuditPlans(parsed.items);
            setTotalItems(parsed.total);
            hasLoadedOnceRef.current = true;
        } catch (error) {
            console.error("Failed to fetch audit plans:", error);
            toast.error("Failed to load audit plans");
            setAuditPlans([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void fetchPlans();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch, selectedSite, typeFilter]);

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
        navigate(qs ? `${basePath}?${qs}` : basePath, {
            state: {
                plan,
                activeModuleId: moduleId || undefined,
                lockModule: Boolean(moduleId),
            },
        });
    };

    const handlePerformAuditClick = (plan: any) => {
        const modules = getPlanModuleOptions(plan.templateId);
        if (modules.length > 1) {
            setModulePicker({
                mode: "perform",
                plan,
                modules,
                selectedModuleId: modules[0]?.id ?? null,
            });
            return;
        }
        navigateToPerformAudit(plan, modules[0]?.id);
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
        const modules = getPlanModuleOptions(plan.templateId);
        if (modules.length > 1) {
            setModulePicker({
                mode: "download",
                plan,
                modules,
                selectedModuleId: modules[0]?.id ?? null,
                downloadFormat: format,
            });
            return;
        }
        void handleDownloadReport(plan, format, modules[0]?.id);
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
    const paginatedPlans = auditPlans;
    const uniqueSites = siteOptions;

    const tourTargetPlan =
        paginatedPlans[0] ?? auditPlans[0] ?? null;

    const handleAuditExecuteTourNext = () => {
        if (auditExecuteTourStep === 3) {
            if (!tourTargetPlan?.id) {
                toast.error(
                    "No audit plans found. Create an audit plan first, then return to run the audit.",
                );
                return;
            }
            navigate(
                `/audit/execute/${tourTargetPlan.id}?auditExecuteTour=true&auditExecuteStep=4`,
                { state: { plan: tourTargetPlan } },
            );
            return;
        }
        if (auditExecuteTourStep >= AUDIT_EXECUTE_TOUR_TOTAL_STEPS) {
            exitAuditExecuteTour();
            navigate("/getting-started");
            toast.success("Audits tour complete!");
            return;
        }
        setAuditExecuteTourStep(auditExecuteTourStep + 1);
    };

    const handleAuditExecuteTourBack = () => {
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
            <div className="w-full max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                            Audit Active List
                        </h2>
                        <p className="text-sm text-[#64748B] font-medium">
                            View and manage all your verified audit plans.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div
                            className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm"
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
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search audits..."
                                className="pl-9 w-full sm:w-[250px] h-12 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full relative z-10 space-y-6">
                    <div
                        id="tour-step-audit-plans-list"
                        className={cn(
                            "bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative z-10 w-full",
                            tourExecuteHighlight(2),
                        )}
                    >
                        <Table>
                            <TableHeader className="bg-[#213847]">
                                <TableRow className="hover:bg-[#213847] border-none">
                                    <TableHead className="font-medium text-white h-12 py-3">Plan Name</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Audit</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Site</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Date</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Lead Auditor</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Status</TableHead>
                                    <TableHead className="text-right font-medium text-white h-12 py-3">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
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
                                    paginatedPlans.map((plan) => {
                                        const auditTypeLabel = resolveAuditListTypeLabel(plan);
                                        const isTourTargetRow =
                                            tourTargetPlan?.id === plan.id;
                                        return (
                                            <TableRow
                                                key={plan.id}
                                                className={cn(
                                                    "cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 group",
                                                    refreshing && "opacity-60",
                                                    auditExecuteTourActive &&
                                                        auditExecuteTourStep === 2 &&
                                                        isTourTargetRow &&
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
                                                                    tourExecuteHighlight(3),
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

            {auditExecuteTourActive &&
                auditExecuteTourStep <= 3 &&
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
