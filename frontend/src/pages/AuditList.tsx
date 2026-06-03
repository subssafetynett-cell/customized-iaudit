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
import {
    MoreVertical, FileText, Trash2, Calendar, Clock, Search, Download, MapPin, Loader2
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { downloadAuditReport, type AuditReportFormat } from "@/utils/auditReportExport";
import ReusablePagination from "@/components/ReusablePagination";
import { TourStepPopover } from "@/components/TourStepPopover";
import {
    AUDIT_EXECUTE_TOUR_TOTAL_STEPS,
    getAuditExecuteTourStepConfig,
} from "@/lib/auditExecuteOnboardingTour";
import { cn } from "@/lib/utils";

const AuditList = () => {
    const [auditPlans, setAuditPlans] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedSite, setSelectedSite] = useState("all");
    const [loading, setLoading] = useState(true);
    /** e.g. "42-pdf" while generating a report for plan 42 */
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
    const navigate = useNavigate();
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
    const itemsPerPage = 8;

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const res = await apiFetch(`/audit-plans?scope=org`);
                const data = await res.json();
                setAuditPlans(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch audit plans:", error);
                toast.error("Failed to load audit plans");
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const handleDeletePlan = async (planId: number) => {
        try {
            const res = await apiFetch(`/audit-plans/${planId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setAuditPlans(prev => prev.filter(p => p.id !== planId));
                toast.success("Audit plan deleted successfully");
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

    const handleDownloadReport = async (planStub: { id: number; auditName?: string }, format: AuditReportFormat) => {
        const key = `${planStub.id}-${format}`;
        if (downloadingKey) return;

        const toastId = toast.loading(`Preparing ${formatLabels[format]} report…`);
        setDownloadingKey(key);

        try {
            const res = await apiFetch(`/audit-plans/${planStub.id}`);
            if (!res.ok) throw new Error("Could not load audit data for this report.");
            const plan = await res.json();

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

    const filteredPlansBySearch = auditPlans.filter(plan =>
        (plan.auditName && plan.auditName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (plan.executionId && plan.executionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (plan.location && plan.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getStatus = (plan: any) => {
        // Dummy logic for status, assuming available. 
        // In real app it comes from backend plan.status
        return plan.status || "In Progress";
    };

    const getProgress = (plan: any) => {
        // Use pre-calculated progress from backend for speed
        return plan.progress ?? 0;
    };

    const uniqueSites = React.useMemo(() => {
        const sites = auditPlans.map(plan => plan.auditProgram?.site?.name || plan.location).filter(Boolean);
        return ["all", ...Array.from(new Set(sites))];
    }, [auditPlans]);

    const filteredPlansBySite = filteredPlansBySearch.filter(plan => {
        if (selectedSite === "all") return true;
        const siteName = plan.auditProgram?.site?.name || plan.location;
        return siteName === selectedSite;
    });

    const filteredPlans = filteredPlansBySite.filter(plan => {
        if (statusFilter === "all") return true;
        return getStatus(plan).toLowerCase() === statusFilter.toLowerCase();
    });

    const counts = {
        all: filteredPlansBySite.length,
        draft: filteredPlansBySite.filter(p => getStatus(p) === "Draft").length,
        scheduled: filteredPlansBySite.filter(p => getStatus(p) === "Scheduled").length,
        inProgress: filteredPlansBySite.filter(p => getStatus(p) === "In Progress").length,
        completed: filteredPlansBySite.filter(p => getStatus(p) === "Completed").length,
        cancelled: filteredPlansBySite.filter(p => getStatus(p) === "Cancelled").length,
        postponed: filteredPlansBySite.filter(p => getStatus(p) === "Postponed").length,
    };

    const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
    const paginatedPlans = filteredPlans.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const tourTargetPlan =
        paginatedPlans[0] ?? filteredPlans[0] ?? auditPlans[0] ?? null;

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

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, selectedSite]);

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
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search audits..."
                                className="pl-9 w-[250px] h-12 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-1 focus-visible:ring-[#213847]/40"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {uniqueSites.length > 2 && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#213847]" />
                            <span className="text-sm font-bold text-[#213847]">Select Site</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {uniqueSites.map((site) => (
                                <button
                                    key={site}
                                    onClick={() => setSelectedSite(site)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${selectedSite === site
                                        ? "bg-[#213847] text-white border-[#213847] shadow-md"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-[#213847]/30 hover:bg-slate-50"
                                        }`}
                                >
                                    {site === "all" ? "All Sites" : site}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <Tabs defaultValue="all" onValueChange={setStatusFilter} className="w-full relative z-10 space-y-6">
                    <div className="bg-slate-50/50 rounded-xl p-1.5 inline-block border border-slate-100">
                        <TabsList className="bg-transparent h-auto p-0 space-x-2">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-600 data-[state=active]:text-[#213847] border-b-2 border-transparent data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                All <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.all}</span>
                            </TabsTrigger>
                            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Draft <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.draft}</span>
                            </TabsTrigger>
                            <TabsTrigger value="scheduled" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Scheduled <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.scheduled}</span>
                            </TabsTrigger>
                            <TabsTrigger value="in progress" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                In Progress <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.inProgress}</span>
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Completed <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.completed}</span>
                            </TabsTrigger>
                            <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Cancelled <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.cancelled}</span>
                            </TabsTrigger>
                            <TabsTrigger value="postponed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:text-[#213847] data-[state=active]:border-b-2 data-[state=active]:border-[#213847] data-[state=active]:rounded-b-none transition-none">
                                Postponed <span className="ml-2 bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md text-xs">{counts.postponed}</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

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
                                    <TableHead className="font-medium text-white h-12 py-3">Date & Time</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Lead Auditor</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Status</TableHead>
                                    <TableHead className="font-medium text-white h-12 py-3">Progress</TableHead>
                                    <TableHead className="text-right font-medium text-white h-12 py-3">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                                                <p className="text-sm font-medium text-slate-500">Loading audit plans...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredPlans.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center text-slate-500 font-medium">
                                            No audit plans found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedPlans.map((plan) => {
                                        const status = getStatus(plan);
                                        let timeString = "-";
                                        try {
                                            if (plan.itinerary) {
                                                const parsedItin = typeof plan.itinerary === 'string' ? JSON.parse(plan.itinerary) : plan.itinerary;
                                                if (Array.isArray(parsedItin) && parsedItin.length > 0) {
                                                    timeString = `${parsedItin[0].startTime} - ${parsedItin[parsedItin.length - 1].endTime}`;
                                                }
                                            }
                                        } catch (e) {
                                            console.warn("Failed to parse itinerary", e);
                                        }

                                        const isTourTargetRow =
                                            tourTargetPlan?.id === plan.id;
                                        return (
                                            <TableRow
                                                key={plan.id}
                                                className={cn(
                                                    "cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 group",
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
                                                        <span className="text-xs text-slate-400 font-medium">ISO Standards</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-bold py-5">
                                                    {plan.auditProgram?.site?.name || plan.location?.split(',')[0] || "Head Office"}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center text-slate-700 font-bold text-sm bg-slate-100 w-fit px-2 py-0.5 rounded-md gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                            {plan.date ? format(new Date(plan.date), "yyyy-MM-dd") : "TBD"}
                                                        </div>
                                                        <div className="flex items-center text-slate-500 text-xs font-semibold gap-1.5 px-2">
                                                            <Clock className="w-3.5 h-3.5 opacity-70" />
                                                            {timeString}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-600 py-5">
                                                    {plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : "-"}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <Badge variant="outline" className={`border-0 uppercase tracking-wider text-[10px] font-black px-2.5 py-1 ${status === 'In Progress' ? 'bg-amber-100 text-amber-700' : status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-500 min-w-[20px]">{getProgress(plan)}%</span>
                                                        <Progress value={getProgress(plan)} className={`w-16 h-1.5 bg-slate-100 ${getProgress(plan) === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-emerald-400"}`} />
                                                    </div>
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
                                                            title="Perform Audit"
                                                            onClick={() => {
                                                                const path =
                                                                    auditExecuteTourActive
                                                                        ? `/audit/execute/${plan.id}?auditExecuteTour=true&auditExecuteStep=4`
                                                                        : `/audit/execute/${plan.id}`;
                                                                navigate(path, {
                                                                    state: { plan },
                                                                });
                                                            }}
                                                        >
                                                            Perform Audit
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
                                                                    onClick={() => void handleDownloadReport(plan, "pdf")}
                                                                    className="gap-2 cursor-pointer"
                                                                >
                                                                    <FileText className="w-4 h-4 text-red-500" /> Download PDF
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    disabled={!!downloadingKey}
                                                                    onClick={() => void handleDownloadReport(plan, "docx")}
                                                                    className="gap-2 cursor-pointer"
                                                                >
                                                                    <FileText className="w-4 h-4 text-blue-500" /> Download Word
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    disabled={!!downloadingKey}
                                                                    onClick={() => void handleDownloadReport(plan, "excel")}
                                                                    className="gap-2 cursor-pointer"
                                                                >
                                                                    <FileText className="w-4 h-4 text-emerald-500" /> Download Excel
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2 cursor-pointer"
                                                                    onClick={() => {
                                                                        setPlanToDelete(plan);
                                                                        setIsDeleteDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" /> Delete Plan
                                                                </DropdownMenuItem>
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
                        totalItems={filteredPlans.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        className="mt-6"
                    />
                </Tabs>
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
