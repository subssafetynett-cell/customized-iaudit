import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { sitesFromCompanies } from "@/lib/orgSites";
import { useCompanyStore } from "@/hooks/useCompanyStore";
import { Skeleton } from "@/components/ui/skeleton";
import { TopNav } from "@/components/TopNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
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
    Calendar, ClipboardCheck, Sparkles, ArrowRight, LayoutDashboard,
    Globe, LayoutGrid, List, MoreVertical, FileText, Trash2, Download, Eye, Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditeeReadOnly } from "@/lib/auditeeAccess";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import {
    applyBuiltWithIauditPdfFooter,
    buildIauditDocxFooter,
    IAUDIT_AUDIT_PLAN_FOOTER_LOGO_SIZE_MM,
    IAUDIT_AUDIT_PLAN_FOOTER_LOGO_SIZE_PX,
    IAUDIT_FOOTER_LOGO_SRC,
    IAUDIT_FOOTER_RESERVE_MM,
    imageAssetToBuffer,
    loadImageAsset,
    resolveProgramCompany,
} from "@/utils/pdfBranding";
import {
    formatDepartmentNames,
    resolveDepartmentsFromProgram,
} from "@/lib/auditProgramDepartments";
import { CLAUSE_MATRIX, ClauseMatrixRow } from "@/data/clauseMapping";
import { EOSH_EXCEL_MODULE_META } from "@/data/eoshExcelModuleTemplates";
import { QFS_KORE_EXCEL_MODULE_META } from "@/data/qfsKoreExcelModuleTemplates";
import { TourStepPopover } from "@/components/TourStepPopover";
import {
    AUDIT_PLAN_TOUR_STEP,
    AUDIT_PLAN_TOUR_TOTAL_STEPS,
    getAuditPlanTourStepConfig,
    saveAuditPlanTourContext,
} from "@/lib/auditPlanOnboardingTour";

interface Clause {
    id: string;
    name: string;
    isHeading?: boolean;
    standard?: string;
}

type ClauseDisplayRow = {
    key: string;
    name: string;
    isHeading?: boolean;
    standards: string[];
};

/** Group mapped multi-ISO clauses that share a base id (e.g. clause-1-9001 / clause-1-14001). */
function groupClausesByBaseId(clauses: Clause[]): Clause[][] {
    const groups = new Map<string, Clause[]>();
    clauses.forEach((clause) => {
        const lastDashIndex = clause.id.lastIndexOf("-");
        const baseId = lastDashIndex !== -1 ? clause.id.substring(0, lastDashIndex) : clause.id;
        if (!groups.has(baseId)) groups.set(baseId, []);
        groups.get(baseId)!.push(clause);
    });
    return Array.from(groups.values());
}

/** Collapse same-named standards into one row with multiple ISO badges. */
function flattenClauseGroupForDisplay(group: Clause[]): ClauseDisplayRow[] {
    const byName = new Map<string, ClauseDisplayRow>();
    for (const clause of group) {
        const key = clause.name;
        let row = byName.get(key);
        if (!row) {
            row = { key, name: clause.name, isHeading: clause.isHeading, standards: [] };
            byName.set(key, row);
        }
        if (clause.isHeading) row.isHeading = true;
        if (clause.standard && !row.standards.includes(clause.standard)) {
            row.standards.push(clause.standard);
        }
    }
    return Array.from(byName.values());
}

function ClauseGroupPreview({
    group,
    compact = false,
}: {
    group: Clause[];
    compact?: boolean;
}) {
    const rows = flattenClauseGroupForDisplay(group);
    return (
        <div
            className={cn(
                "w-full bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-col gap-1.5",
                compact ? "text-[10px] font-semibold text-slate-600" : "text-sm font-medium text-slate-500 md:w-fit",
            )}
        >
            {rows.map((row) => (
                <div key={row.key} className="flex items-center gap-2 min-w-0">
                    {row.standards.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 shrink-0">
                            {row.standards.map((std) => (
                                <span
                                    key={std}
                                    className={cn(
                                        "uppercase font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm",
                                        compact ? "text-[8px]" : "text-[10px]",
                                    )}
                                >
                                    {std}
                                </span>
                            ))}
                        </div>
                    )}
                    <span
                        className={cn(
                            "min-w-0 flex-1 truncate",
                            row.isHeading && "font-black text-slate-800",
                            !compact && "text-slate-700 font-semibold",
                        )}
                        title={row.name}
                    >
                        {row.name}
                    </span>
                </div>
            ))}
        </div>
    );
}

const EOSH_MODULE_PREFIX = "EOSH Module: ";
const QFS_MODULE_PREFIX = "QFS KORE Module: ";

function getModuleProgramMeta(program: any): {
    isModule: boolean;
    family: "eosh" | "qfs-kore" | null;
    modules: ReadonlyArray<{ id: string; sectionTitle: string }>;
    standardLabel: string;
} {
    const scheduleData = program?.scheduleData;
    const iso = String(program?.isoStandard || "");
    const familyFromData =
        scheduleData?.moduleFamily === "eosh" || scheduleData?.moduleFamily === "qfs-kore"
            ? (scheduleData.moduleFamily as "eosh" | "qfs-kore")
            : null;
    const isModule =
        scheduleData?.criteriaType === "module" ||
        iso.includes(EOSH_MODULE_PREFIX) ||
        iso.includes(QFS_MODULE_PREFIX);
    const family: "eosh" | "qfs-kore" | null =
        familyFromData ||
        (iso.includes(QFS_MODULE_PREFIX)
            ? "qfs-kore"
            : iso.includes(EOSH_MODULE_PREFIX)
              ? "eosh"
              : null);

    if (!isModule) {
        return { isModule: false, family: null, modules: [], standardLabel: "Custom" };
    }
    if (family === "qfs-kore") {
        return {
            isModule: true,
            family: "qfs-kore",
            modules: QFS_KORE_EXCEL_MODULE_META,
            standardLabel: "QFS KORE",
        };
    }
    return {
        isModule: true,
        family: "eosh",
        modules: EOSH_EXCEL_MODULE_META,
        standardLabel: "EOSH",
    };
}

function asListPayload(payload: unknown): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray((payload as { data?: unknown })?.data)) {
        return (payload as { data: unknown[] }).data;
    }
    if (Array.isArray((payload as { items?: unknown })?.items)) {
        return (payload as { items: unknown[] }).items;
    }
    return [];
}

type SitePlansCache = { programs: any[]; plans: any[] };

/** Survives remounts (tour create-plan → back) so Step 2 does not refetch from scratch. */
const auditPlanPageSiteCache: Record<string, SitePlansCache> = {};
const auditPlanPageInflight: Record<string, Promise<void>> = {};

function AuditPlansContentSkeleton({ viewMode }: { viewMode: "card" | "list" }) {
    if (viewMode === "list") {
        return (
            <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/50 bg-white"
                    >
                        <div className="flex items-center gap-4 flex-1">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-2/3 max-w-md" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <Card
                    key={i}
                    className="border border-slate-200/50 bg-white shadow-sm rounded-2xl p-6 flex flex-col gap-6"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <div className="flex gap-2 pt-2">
                        <Skeleton className="h-9 w-24 rounded-xl" />
                        <Skeleton className="h-9 w-9 rounded-xl" />
                    </div>
                </Card>
            ))}
        </div>
    );
}

const AuditProgramPage = () => {
    const { companies: storeCompanies, hasFetchedCompanies } = useCompanyStore();
    const [companies, setCompanies] = useState<any[]>(() => storeCompanies);
    /** Per-site cache — switching back to a loaded tab is instant (no refetch). */
    const [siteCache, setSiteCache] = useState<Record<string, SitePlansCache>>(() => ({
        ...auditPlanPageSiteCache,
    }));
    const siteCacheRef = useRef(siteCache);
    siteCacheRef.current = siteCache;
    const inflightSiteRef = useRef<Record<string, Promise<void>>>(auditPlanPageInflight);
    const warmSites = useMemo(() => {
        if (storeCompanies.length > 0) return sitesFromCompanies(storeCompanies);
        return [];
    }, [storeCompanies]);
    const [sites, setSites] = useState<any[]>(() => warmSites);
    const [sitesLoading, setSitesLoading] = useState(() => warmSites.length === 0);
    const [contentLoading, setContentLoading] = useState(false);
    const [downloading, setDownloading] = useState(false); // Added for download state
    const [viewMode, setViewMode] = useState<"card" | "list">("card");
    const [activeSiteId, setActiveSiteId] = useState<string>(() =>
        warmSites.length > 0 ? String(warmSites[0].id) : "",
    );
    const navigate = useNavigate();
    const isAuditeeReadOnly = useAuditeeReadOnly();
    const [searchParams, setSearchParams] = useSearchParams();
    const auditPlanTourActive = searchParams.get("auditPlanTour") === "true";
    const auditPlanTourStep = Math.min(
        AUDIT_PLAN_TOUR_TOTAL_STEPS,
        Math.max(1, parseInt(searchParams.get("auditPlanStep") || "1", 10)),
    );
    const auditPlanTourStepConfig = getAuditPlanTourStepConfig(auditPlanTourStep);

    const setAuditPlanTourStep = (step: number) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("auditPlanTour", "true");
                next.set("auditPlanStep", String(step));
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
                return next;
            },
            { replace: true },
        );
    };

    const tourPlanHighlight = (step: number) =>
        auditPlanTourActive && auditPlanTourStep === step
            ? "relative z-[60] ring-[4px] ring-emerald-500/80 ring-offset-2 rounded-xl"
            : "";

    const [showOnboardingGuide, setShowOnboardingGuide] = useState(searchParams.get("onboarding") === "true");
    const [isFinishing, setIsFinishing] = useState(false);
    
    // Deletion State
    const [planToDelete, setPlanToDelete] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const auditPrograms = useMemo(
        () => Object.values(siteCache).flatMap((entry) => entry.programs),
        [siteCache],
    );
    const auditPlans = useMemo(
        () => Object.values(siteCache).flatMap((entry) => entry.plans),
        [siteCache],
    );
    const activeSitePrograms = useMemo(
        () => siteCache[activeSiteId]?.programs ?? [],
        [siteCache, activeSiteId],
    );
    const activeSiteCached = Boolean(activeSiteId && siteCache[activeSiteId]);

    const loadSiteData = useCallback(async (siteId: string, opts?: { background?: boolean; force?: boolean }) => {
        const id = String(siteId || "").trim();
        if (!id) return;
        if (!opts?.force && siteCacheRef.current[id]) return;
        if (inflightSiteRef.current[id]) {
            await inflightSiteRef.current[id];
            if (!opts?.force && siteCacheRef.current[id]) return;
        }

        const task = (async () => {
            const [programsRes, plansRes] = await Promise.all([
                apiFetch(`/audit-programs?scope=org&full=true&siteId=${encodeURIComponent(id)}`),
                apiFetch(`/audit-plans?scope=org&siteId=${encodeURIComponent(id)}`),
            ]);
            const programs = programsRes.ok ? asListPayload(await programsRes.json()) : [];
            const plans = plansRes.ok ? asListPayload(await plansRes.json()) : [];
            const entry = { programs, plans };
            auditPlanPageSiteCache[id] = entry;
            setSiteCache((prev) => {
                if (!opts?.force && prev[id]) return prev;
                return { ...prev, [id]: { programs, plans } };
            });
        })();

        inflightSiteRef.current[id] = task;
        auditPlanPageInflight[id] = task;
        try {
            await task;
        } catch (error) {
            console.error(`Failed to load audit plans for site ${id}:`, error);
            if (!opts?.background) {
                toast.error("Failed to load audit plans for this site");
            }
        } finally {
            delete inflightSiteRef.current[id];
            delete auditPlanPageInflight[id];
        }
    }, []);

    // 1) Load sites — warm from company store when possible; fetch in parallel with first site data.
    useEffect(() => {
        let cancelled = false;
        const loadSites = async () => {
            try {
                // Kick off programs/plans as soon as we know a site id (store or previous session).
                const earlySiteId =
                    activeSiteId ||
                    (warmSites.length > 0 ? String(warmSites[0].id) : "");
                if (earlySiteId && !siteCacheRef.current[earlySiteId]) {
                    void loadSiteData(earlySiteId, { background: true });
                }

                const sitesRes = await apiFetch("/sites?minimal=1");
                let validSites = sitesRes.ok ? asListPayload(await sitesRes.json()) : [];

                let companiesData: any[] = storeCompanies;
                if (validSites.length === 0) {
                    if (hasFetchedCompanies && storeCompanies.length > 0) {
                        validSites = sitesFromCompanies(storeCompanies);
                    } else {
                        const companiesRes = await apiFetch("/companies");
                        companiesData = companiesRes.ok ? asListPayload(await companiesRes.json()) : [];
                        if (Array.isArray(companiesData) && companiesData.length > 0) {
                            validSites = sitesFromCompanies(companiesData);
                        }
                    }
                } else if (storeCompanies.length === 0 && !hasFetchedCompanies) {
                    // Do not block sites UI on companies — load in background.
                    void apiFetch("/companies").then(async (companiesRes) => {
                        if (!companiesRes.ok || cancelled) return;
                        const data = asListPayload(await companiesRes.json());
                        if (!cancelled && Array.isArray(data) && data.length > 0) {
                            setCompanies(data);
                        }
                    });
                }

                if (cancelled) return;
                setSites(validSites);
                setCompanies(
                    Array.isArray(companiesData) && companiesData.length > 0
                        ? companiesData
                        : storeCompanies,
                );
                if (validSites.length > 0) {
                    setActiveSiteId((prev) => prev || String(validSites[0].id));
                }
            } catch (error) {
                console.error("Failed to fetch sites:", error);
                if (!cancelled) toast.error("Failed to load sites");
            } finally {
                if (!cancelled) setSitesLoading(false);
            }
        };
        void loadSites();
        return () => {
            cancelled = true;
        };
        // Intentionally once on mount — store may hydrate later via sync effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Prefer company store when it arrives after mount (avoids blank company branding).
    useEffect(() => {
        if (storeCompanies.length > 0) {
            setCompanies((prev) => (prev.length > 0 ? prev : storeCompanies));
            setSites((prev) => {
                if (prev.length > 0) return prev;
                return sitesFromCompanies(storeCompanies);
            });
        }
    }, [storeCompanies]);

    // 2) Lazy-load the active site's programs + plans; force-refresh once on mount
    // so newly saved plans appear as VIEW / EDIT PLAN after returning from create.
    const didForceRefreshOnMountRef = useRef(false);
    useEffect(() => {
        if (!activeSiteId) return;
        let cancelled = false;
        const force = !didForceRefreshOnMountRef.current;
        didForceRefreshOnMountRef.current = true;
        const hadCache = Boolean(siteCacheRef.current[activeSiteId]);
        if (!hadCache) setContentLoading(true);
        void loadSiteData(activeSiteId, {
            force,
            background: hadCache && force,
        }).finally(() => {
            if (!cancelled) setContentLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [activeSiteId, loadSiteData]);

    // 3) Background prefetch the next site (never blocks UI).
    useEffect(() => {
        if (!activeSiteId || sites.length < 2) return;
        if (!siteCache[activeSiteId]) return;
        const idx = sites.findIndex((s) => String(s.id) === activeSiteId);
        const next = sites[idx + 1] ?? sites[0];
        const nextId = next ? String(next.id) : "";
        if (!nextId || nextId === activeSiteId || siteCache[nextId]) return;
        const t = window.setTimeout(() => {
            void loadSiteData(nextId, { background: true });
        }, 400);
        return () => window.clearTimeout(t);
    }, [activeSiteId, sites, siteCache, loadSiteData]);

    const handleFinishOnboarding = async () => {
        setIsFinishing(true);
        try {
            const userJson = localStorage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                const response = await apiFetch(`/users/${user.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ onboardingCompleted: true })
                });

                if (response.ok) {
                    const updatedUser = { ...user, onboardingCompleted: true };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    localStorage.setItem('iaudit_onboarding_tour_completed', 'true');
                    toast.success("Onboarding completed! Welcome to your dashboard.");
                    
                    // Clean up URL params
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete("onboarding");
                    setSearchParams(newParams);
                    
                    setShowOnboardingGuide(false);
                    navigate("/");
                } else {
                    toast.error("Failed to update onboarding status");
                }
            }
        } catch (error) {
            console.error("Onboarding completion error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsFinishing(false);
        }
    };

    const calculatePeriods = (frequency: string, duration: number, startDate?: string | Date) => {
        const count = frequency === "Monthly" ? duration * 12 :
            frequency === "Quarterly" ? duration * 4 :
                frequency === "Bi-annually" ? duration * 2 :
                    duration;

        const result = [];
        const currentDate = startDate ? new Date(startDate) : new Date();
        currentDate.setDate(1); // Start from the beginning of the month

        for (let i = 0; i < count; i++) {
            const monthLabel = currentDate.toLocaleString('default', { month: 'short' }).toUpperCase();
            const yearLabel = currentDate.getFullYear().toString();
            result.push(`${monthLabel} ${yearLabel}`);

            if (frequency === "Monthly") currentDate.setMonth(currentDate.getMonth() + 1);
            else if (frequency === "Quarterly") currentDate.setMonth(currentDate.getMonth() + 3);
            else if (frequency === "Bi-annually") currentDate.setMonth(currentDate.getMonth() + 6);
            else currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
        return result;
    };

    const getAuditExecutions = (program: any) => {
        const loadData = program.scheduleData || {};
        const programPeriods = calculatePeriods(program.frequency, program.duration, loadData.startDate || program.createdAt);
        const executions: any[] = [];
        const isoStandard = program.isoStandard || "";
        const moduleMeta = getModuleProgramMeta(program);
        const moduleProgram = moduleMeta.isModule;
        const is9001 = !moduleProgram && isoStandard.includes("9001");
        const is14001 = !moduleProgram && isoStandard.includes("14001");
        const is45001 = !moduleProgram && isoStandard.includes("45001");
        const customRows = (loadData.customRows || []) as { id: string; text: string }[];

        programPeriods.forEach((periodLabel, colIndex) => {
            const selectedClauses: Clause[] = [];

            if (moduleProgram) {
                moduleMeta.modules.forEach((mod, rowIndex) => {
                    if (loadData?.[`${rowIndex}-${colIndex}`]) {
                        selectedClauses.push({
                            id: mod.id,
                            name: mod.sectionTitle,
                            standard: moduleMeta.standardLabel,
                        });
                    }
                });
            } else {
                CLAUSE_MATRIX.forEach((matrixRow, rowIndex) => {
                    if (loadData?.[`${rowIndex}-${colIndex}`]) {
                        const stds = [
                            { key: "iso9001", label: "9001", active: is9001 },
                            { key: "iso14001", label: "14001", active: is14001 },
                            { key: "iso45001", label: "45001", active: is45001 },
                        ];

                        stds.forEach((std) => {
                            if (std.active) {
                                const clauseName = (matrixRow as any)[std.key];
                                if (clauseName && clauseName !== "Corresponding Clause does not exist") {
                                    selectedClauses.push({
                                        id: `${matrixRow.id}-${std.label}`,
                                        name: clauseName,
                                        isHeading: matrixRow.isHeading,
                                        standard: std.label,
                                    });
                                }
                            }
                        });
                    }
                });
            }

            const customSelected = customRows.filter(
                (row) => loadData?.[`custom_${row.id}-${colIndex}`],
            );
            customSelected.forEach((row) => {
                selectedClauses.push({
                    id: `custom_${row.id}`,
                    name: row.text?.trim() || "Custom Requirement",
                    standard: moduleProgram ? moduleMeta.standardLabel : "Custom",
                });
            });

            // Only show a card when something is scheduled for this month
            if (selectedClauses.length === 0) return;

            const executionId = `${program.name} - ${periodLabel}`;
            executions.push({
                id: executionId,
                programId: program.id,
                title: executionId,
                period: periodLabel,
                clauseCount: selectedClauses.length,
                clauses: selectedClauses,
                site: sites.find((s) => s.id === program.siteId),
            });
        });

        return executions;
    };

    const getExecutionPeriodIndex = (program: any, executionTitle: string) => {
        const loadData = program.scheduleData || {};
        const programPeriods = calculatePeriods(
            program.frequency,
            program.duration,
            loadData.startDate || program.createdAt,
        );
        const periodLabel = executionTitle.includes(" - ")
            ? executionTitle.split(" - ").slice(1).join(" - ")
            : executionTitle;
        return programPeriods.findIndex((period) => period === periodLabel);
    };

    const getSelectedCustomRequirements = (program: any, executionTitle: string): string[] => {
        const colIndex = getExecutionPeriodIndex(program, executionTitle);
        if (colIndex < 0) return [];
        const customRows = (program.scheduleData?.customRows || []) as {
            id: string;
            text: string;
        }[];
        return customRows
            .filter((row) => program.scheduleData?.[`custom_${row.id}-${colIndex}`])
            .map((row) => row.text?.trim() || "Custom Requirement")
            .filter(Boolean);
    };

    const hasPlan = (programId: number, executionId: string) => {
        return (auditPlans || []).some(p => p.auditProgramId === programId && p.executionId === executionId);
    };

    const getPendingCreatePlanTarget = () => {
        const siteIds = sites.length > 0 ? [activeSiteId, ...sites.map((s) => s.id.toString()).filter((id) => id !== activeSiteId)] : [];
        for (const siteId of siteIds) {
            const sitePrograms = (auditPrograms || []).filter(
                (p) => p.siteId?.toString() === siteId,
            );
            for (const siteProgram of sitePrograms) {
                const executions = getAuditExecutions(siteProgram) || [];
                for (const exec of executions) {
                    if (!hasPlan(siteProgram.id, exec.id)) {
                        const site = sites.find(
                            (s) => s.id?.toString() === siteProgram.siteId?.toString(),
                        );
                        return {
                            execution: {
                                ...exec,
                                siteName: site?.name || "N/A",
                                site,
                            },
                            program: siteProgram,
                            site,
                            plan: null,
                        };
                    }
                }
            }
        }
        return null;
    };

    /** When every period already has a plan, open the first existing plan for view/edit. */
    const getExistingPlanTourTarget = () => {
        const siteIds = sites.length > 0 ? [activeSiteId, ...sites.map((s) => s.id.toString()).filter((id) => id !== activeSiteId)] : [];
        for (const siteId of siteIds) {
            const sitePrograms = (auditPrograms || []).filter(
                (p) => p.siteId?.toString() === siteId,
            );
            for (const siteProgram of sitePrograms) {
                const executions = getAuditExecutions(siteProgram) || [];
                for (const exec of executions) {
                    const plan = (auditPlans || []).find(
                        (p) =>
                            p.auditProgramId === siteProgram.id &&
                            p.executionId === exec.id,
                    );
                    if (plan) {
                        const site = sites.find(
                            (s) => s.id?.toString() === siteProgram.siteId?.toString(),
                        );
                        return {
                            execution: {
                                ...exec,
                                siteName: site?.name || "N/A",
                                site,
                            },
                            program: siteProgram,
                            site,
                            plan,
                        };
                    }
                }
            }
        }
        return null;
    };

    /** Step 3 copy/highlight: prefer Create on the active site; otherwise View/Edit. */
    const hasPendingCreatePlanOnActiveSite = (activeSitePrograms || []).some((siteProgram) =>
        (getAuditExecutions(siteProgram) || []).some(
            (exec) => !hasPlan(siteProgram.id, exec.id),
        ),
    );
    const step3IsViewEdit =
        auditPlanTourActive &&
        auditPlanTourStep === AUDIT_PLAN_TOUR_STEP.CREATE_PLAN &&
        !hasPendingCreatePlanOnActiveSite;

    const handleAuditPlanTourNext = async () => {
        if (auditPlanTourStep === AUDIT_PLAN_TOUR_STEP.CREATE_PLAN) {
            // Prefer cached data — avoid waiting on every site before navigating.
            // If this site only has View/Edit, open that plan instead of jumping to another site.
            let target = hasPendingCreatePlanOnActiveSite
                ? getPendingCreatePlanTarget()
                : getExistingPlanTourTarget() || getPendingCreatePlanTarget();
            if (!target && activeSiteId) {
                await loadSiteData(String(activeSiteId), { background: true });
                target = hasPendingCreatePlanOnActiveSite
                    ? getPendingCreatePlanTarget()
                    : getExistingPlanTourTarget() || getPendingCreatePlanTarget();
            }
            if (!target) {
                toast.error(
                    "No audit program periods found. Create an audit program with scheduled periods first.",
                );
                return;
            }
            saveAuditPlanTourContext({
                execution: target.execution,
                program: target.program,
                site: target.site,
                plan: target.plan,
            });
            navigate(
                `/audit-program/create-plan?auditPlanTour=true&auditPlanStep=${AUDIT_PLAN_TOUR_STEP.AUDIT_NAME}`,
                { state: target },
            );
            return;
        }
        if (auditPlanTourStep >= AUDIT_PLAN_TOUR_TOTAL_STEPS) {
            exitAuditPlanTour();
            navigate("/getting-started?nextAuditWorkflowStep=audits");
            toast.success("Audit plan tour complete!");
            return;
        }
        setAuditPlanTourStep(auditPlanTourStep + 1);
    };

    const handleAuditPlanTourBack = () => {
        if (auditPlanTourStep <= AUDIT_PLAN_TOUR_STEP.NAV) {
            exitAuditPlanTour();
            navigate("/getting-started");
            return;
        }
        setAuditPlanTourStep(auditPlanTourStep - 1);
    };

    const handleDeletePlan = async (planId: number) => {
        try {
            const res = await apiFetch(`/audit-plans/${planId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setSiteCache((prev) => {
                    const next: Record<string, SitePlansCache> = {};
                    for (const [siteId, entry] of Object.entries(prev)) {
                        next[siteId] = {
                            programs: entry.programs,
                            plans: entry.plans.filter((p) => p.id !== planId),
                        };
                    }
                    return next;
                });
                toast.success("Audit plan deleted successfully");
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete audit plan");
        }
    };

    const handleDownloadPDF = async (planStub: any, executionTitle: string, programStub?: any) => {
        setDownloading(true);
        try {
            const res = await apiFetch(`/audit-plans/${planStub.id}`);
            if (!res.ok) throw new Error("Failed to fetch full plan details");
            const plan = await res.json();

            const doc = new jsPDF();
            const fileName = `Audit_Plan_${executionTitle.replace(/[^a-z0-9]/gi, '_')}`;
            const MARGIN = 20;
            const CONTENT_WIDTH = 210 - (2 * MARGIN);
            const FOOTER_RESERVE = IAUDIT_FOOTER_RESERVE_MM;
            const program = programStub || plan.auditProgram;
            const company = resolveProgramCompany(program, sites);
            const departmentsText = formatDepartmentNames(
                resolveDepartmentsFromProgram(program, companies),
            );

            const companyLogoAsset = company.logo ? await loadImageAsset(company.logo, 140) : null;
            const iauditLogoAsset = await loadImageAsset(IAUDIT_FOOTER_LOGO_SRC, 100);

            if (companyLogoAsset) {
                const maxLogoW = 32;
                const maxLogoH = 22;
                let logoW = maxLogoW;
                let logoH = logoW * companyLogoAsset.ratio;
                if (logoH > maxLogoH) {
                    logoH = maxLogoH;
                    logoW = logoH / companyLogoAsset.ratio;
                }
                doc.addImage(
                    companyLogoAsset.dataUrl,
                    companyLogoAsset.format,
                    MARGIN,
                    10,
                    logoW,
                    logoH,
                );
            }

            // --- Header banner ---
            doc.setFillColor(33, 56, 71);
            doc.rect(0, 40, 210, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('AUDIT PLAN REPORT', MARGIN, 50);
            doc.setFont('helvetica', 'normal');

            // --- Meta Info ---
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            let y = 65;
            const addRow = (label: string, value: string) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label + ':', MARGIN, y);
                doc.setFont('helvetica', 'normal');
                const splitVal = doc.splitTextToSize(value || 'N/A', CONTENT_WIDTH - 55);
                doc.text(splitVal, MARGIN + 55, y);
                y += (splitVal.length * 6);
            };

            const addTwoLineField = (label: string, value: string) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label + ':', MARGIN, y);
                y += 6;
                doc.setFont('helvetica', 'normal');
                const lines = doc.splitTextToSize(value || 'N/A', CONTENT_WIDTH);
                doc.text(lines, MARGIN, y);
                y += (lines.length * 5) + 4;
            };

            const standardsRaw = programStub?.isoStandard || plan.isoStandard || "";
            const standardsText = standardsRaw ? standardsRaw.split(", ").join("  |  ") : "N/A";
            const planDate = plan.date ? new Date(plan.date).toLocaleDateString() : "TBD";

            addRow("Date", planDate);
            addRow("Audit Name", plan.auditName || plan.auditType);
            addRow("ISO Standards", standardsText);
            addRow("Location", plan.location);
            addRow("Departments", departmentsText);
            addRow(
                "Lead Auditor",
                plan.leadAuditor
                    ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}`
                    : "-",
            );
            addRow("Criteria", plan.criteria);

            y += 4;
            addTwoLineField('Scope', plan.scope);
            addTwoLineField('Objective', plan.objective);

            y += 4;

            // --- Itinerary ---
            const itinerary = plan.itinerary ? (typeof plan.itinerary === 'string' ? JSON.parse(plan.itinerary) : plan.itinerary) : [];
            if (Array.isArray(itinerary) && itinerary.length > 0) {
                if (y > 250) { doc.addPage(); y = MARGIN; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(33, 56, 71);
                doc.text('Audit Itinerary', MARGIN, y); y += 6;
                autoTable(doc, {
                    startY: y,
                    head: [['Time', 'Activity', 'Auditee / Dept']],
                    body: itinerary.map((item: any) => [`${item.startTime || ''} - ${item.endTime || ''}`, item.activity || '', item.notes || item.auditee || ' ']),
                    headStyles: { fillColor: [33, 56, 71], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_RESERVE },
                    theme: 'grid'
                });
                y = (doc as any).lastAutoTable.finalY + 10;
            }

            // --- Scheduled Clauses ---
            const execClauses = getAuditExecutions(programStub || plan.auditProgram).find(e => e.id === executionTitle)?.clauses || [];
            if (execClauses.length > 0) {
                if (y > 250) { doc.addPage(); y = MARGIN; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(33, 56, 71);
                doc.text('Scheduled Clauses', MARGIN, y); y += 6;
                execClauses.forEach((clause: any) => {
                    if (y > 280 - FOOTER_RESERVE) { doc.addPage(); y = MARGIN; }
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
                    const clauseText = clause.standard ? `[${clause.standard}] ${clause.name}` : clause.name;
                    const splitClause = doc.splitTextToSize(`• ${clauseText}`, CONTENT_WIDTH);
                    doc.text(splitClause, MARGIN, y);
                    y += splitClause.length * 5 + 2;
                });
            }

            const customRequirements = getSelectedCustomRequirements(program, executionTitle);
            if (customRequirements.length > 0) {
                if (y > 250) { doc.addPage(); y = MARGIN; }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(33, 56, 71);
                doc.text('Custom Requirements', MARGIN, y); y += 6;
                customRequirements.forEach((requirement) => {
                    if (y > 280 - FOOTER_RESERVE) { doc.addPage(); y = MARGIN; }
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
                    const splitRequirement = doc.splitTextToSize(`• ${requirement}`, CONTENT_WIDTH);
                    doc.text(splitRequirement, MARGIN, y);
                    y += splitRequirement.length * 5 + 2;
                });
            }

            applyBuiltWithIauditPdfFooter(doc, iauditLogoAsset, MARGIN, IAUDIT_AUDIT_PLAN_FOOTER_LOGO_SIZE_MM);
            doc.save(`${fileName}.pdf`);
            toast.success("PDF Downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadDocx = async (planStub: any, executionTitle: string, programStub?: any) => {
        setDownloading(true);
        try {
            const res = await apiFetch(`/audit-plans/${planStub.id}`);
            if (!res.ok) throw new Error("Failed to fetch full plan details");
            const plan = await res.json();

            const fileName = `Audit_Plan_${executionTitle.replace(/[^a-z0-9]/gi, '_')}`;
            const program = programStub || plan.auditProgram;
            const standardsRaw = program?.isoStandard || plan.isoStandard || "";
            const standardsText = standardsRaw
                ? standardsRaw.split(", ").join("  |  ")
                : "N/A";
            const planDate = plan.date ? new Date(plan.date).toLocaleDateString() : "TBD";
            const company = resolveProgramCompany(program, sites);
            const departmentsText = formatDepartmentNames(
                resolveDepartmentsFromProgram(program, companies),
            );

            const companyLogoAsset = company.logo ? await loadImageAsset(company.logo, 140) : null;
            const iauditLogoAsset = await loadImageAsset(IAUDIT_FOOTER_LOGO_SRC, 100);
            const companyLogoBuffer = await imageAssetToBuffer(companyLogoAsset);
            const iauditLogoBuffer = await imageAssetToBuffer(iauditLogoAsset);
            const iauditLogoRatio = iauditLogoAsset?.ratio ?? 1;

            const primaryColor = '213847';
            const children: any[] = [];
            const MARGIN_TWIPS = 1440; // 1 inch

            if (companyLogoBuffer) {
                children.push(new Paragraph({
                    children: [new ImageRun({ data: companyLogoBuffer, transformation: { width: 110, height: 50 } })],
                    spacing: { after: 200 },
                }));
            }

            const heading = (text: string) => new Paragraph({
                children: [new TextRun({ text, bold: true, size: 28, color: primaryColor })],
                spacing: { before: 400, after: 200 }
            });

            const kv = (label: string, value: string) => new Paragraph({
                children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value || 'N/A')],
                spacing: { after: 120 }
            });

            const kvTwoLine = (label: string, value: string) => [
                new Paragraph({
                    children: [new TextRun({ text: `${label}:`, bold: true })],
                    spacing: { before: 200 }
                }),
                new Paragraph({
                    children: [new TextRun(value || 'N/A')],
                    spacing: { after: 200 }
                })
            ];

            children.push(
                new Paragraph({
                    children: [new TextRun({ text: 'AUDIT PLAN REPORT', bold: true, size: 40, color: primaryColor })],
                    spacing: { after: 400 }
                }),
                kv('Date', planDate),
                kv('Audit Name', plan.auditName || plan.auditType),
                kv('ISO Standards', standardsText),
                kv('Location', plan.location),
                kv('Departments', departmentsText),
                kv('Lead Auditor', plan.leadAuditor ? `${plan.leadAuditor.firstName} ${plan.leadAuditor.lastName}` : '-'),
                kv('Criteria', plan.criteria),
                ...kvTwoLine('Scope', plan.scope),
                ...kvTwoLine('Objective', plan.objective),
            );

            // Itinerary
            const itinerary = plan.itinerary ? (typeof plan.itinerary === 'string' ? JSON.parse(plan.itinerary) : plan.itinerary) : [];
            if (Array.isArray(itinerary) && itinerary.length > 0) {
                children.push(heading('Audit Itinerary'));
                children.push(new DocxTable({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new DocxTableRow({
                            children: ['Time', 'Activity', 'Auditee / Dept'].map(h => new DocxTableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'ffffff' })] })],
                                shading: { fill: primaryColor }
                            }))
                        }),
                        ...itinerary.map((item: any) => new DocxTableRow({
                            children: [`${item.startTime || ''} - ${item.endTime || ''}`, item.activity || '', item.notes || item.auditee || ''].map(v => new DocxTableCell({
                                children: [new Paragraph(v)]
                            }))
                        }))
                    ],
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                    }
                }));
            }

            const execClauses = getAuditExecutions(program).find((e) => e.id === executionTitle)?.clauses || [];
            if (execClauses.length > 0) {
                children.push(heading('Scheduled Clauses'));
                execClauses.forEach((clause: { standard?: string; name: string }) => {
                    const clauseText = clause.standard
                        ? `[${clause.standard}] ${clause.name}`
                        : clause.name;
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `• ${clauseText}` })],
                            spacing: { after: 80 },
                        }),
                    );
                });
            }

            const customRequirements = getSelectedCustomRequirements(program, executionTitle);
            if (customRequirements.length > 0) {
                children.push(heading('Custom Requirements'));
                customRequirements.forEach((requirement) => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `• ${requirement}` })],
                            spacing: { after: 80 },
                        }),
                    );
                });
            }

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            margin: {
                                top: MARGIN_TWIPS,
                                right: MARGIN_TWIPS,
                                bottom: MARGIN_TWIPS,
                                left: MARGIN_TWIPS,
                            },
                        },
                    },
                    footers: {
                        default: buildIauditDocxFooter(
                            iauditLogoBuffer,
                            iauditLogoRatio,
                            IAUDIT_AUDIT_PLAN_FOOTER_LOGO_SIZE_PX,
                        ),
                    },
                    children
                }]
            });
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${fileName}.docx`);
            toast.success("Word Document Downloaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate Word document");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-white relative">
            {auditPlanTourActive && (
                <div className="fixed inset-0 bg-slate-900/10 z-[40] pointer-events-none" />
            )}
            <div className="w-full max-w-[1800px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Onboarding Guide Step 6 */}
                {showOnboardingGuide && (
                    <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Sparkles className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">6</div>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">Final Step</Badge>
                            </div>
                            <h2 className="text-3xl font-bold mb-4 tracking-tight">Generate Your Multi-Year Audit Program</h2>
                            <p className="text-slate-400 text-lg mb-8 max-w-2xl leading-relaxed">
                                You've set up your company, sites, and users. Now, view your automated multi-year audit schedule. 
                                Click "Finish Onboarding" to unlock your dashboard and start your trial.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Button 
                                    onClick={handleFinishOnboarding}
                                    disabled={isFinishing}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 h-12 text-lg font-bold shadow-lg shadow-emerald-900/20 group"
                                >
                                    {isFinishing ? "Processing..." : "Finish Onboarding"}
                                    {!isFinishing && <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setShowOnboardingGuide(false)}
                                    className="text-slate-400 hover:text-white hover:bg-white/5"
                                >
                                    Dismiss Guide
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                            Audit Plans
                        </h2>
                        <p className="text-sm text-[#64748B] font-medium">
                            View and manage your audit plans and executions.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-[#F1F5F9] p-1 rounded-2xl border border-slate-100 shadow-sm">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "w-12 h-12 rounded-xl transition-all duration-300",
                                    viewMode === "list" ? "bg-[#34967C] text-white shadow-md hover:bg-[#34967C]/90" : "text-[#1E293B] hover:bg-slate-200/50"
                                )}
                            >
                                <List className="w-6 h-6" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewMode("card")}
                                className={cn(
                                    "w-12 h-12 rounded-xl transition-all duration-300",
                                    viewMode === "card" ? "bg-[#34967C] text-white shadow-md hover:bg-[#34967C]/90" : "text-[#1E293B] hover:bg-slate-200/50"
                                )}
                            >
                                <LayoutGrid className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div
                    id="tour-step-audit-plans-list"
                    className={cn(
                        "relative z-10 space-y-4 rounded-xl",
                        tourPlanHighlight(AUDIT_PLAN_TOUR_STEP.PROGRAMS_LIST),
                    )}
                >
                {sitesLoading ? (
                    <div className="w-full border-b border-slate-200 pb-2 flex gap-8">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-6 w-28 rounded-md" />
                        ))}
                    </div>
                ) : sites.length > 0 ? (
                    <Tabs value={activeSiteId} onValueChange={setActiveSiteId} className="w-full">
                        <TabsList className="bg-transparent h-auto p-0 flex gap-8 border-b border-slate-200 w-full justify-start rounded-none">

                            {sites.map(site => (
                                <TabsTrigger
                                    key={site.id}
                                    value={site.id.toString()}
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#34967C] data-[state=active]:bg-transparent data-[state=active]:text-[#34967C] px-0 pb-2 text-base font-semibold text-slate-500 hover:text-slate-700 transition-all shadow-none"
                                >
                                    {site.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                ) : null}

                <div className="relative z-10">
                {sitesLoading || (sites.length > 0 && (contentLoading || !activeSiteCached)) ? (
                    <div className="space-y-8">
                        <AuditPlansContentSkeleton viewMode={viewMode} />
                    </div>
                ) : sites.length > 0 ? (
                    <div className="space-y-8">
                        {(() => {
                            const allExecutions = (activeSitePrograms || [])
                                .flatMap(p => {
                                    const site = (sites || []).find(s => s.id === p.siteId || String(s.id) === String(p.siteId));
                                    const executions = getAuditExecutions(p) || [];
                                    return executions.map(exec => ({
                                        ...exec,
                                        siteName: site?.name || "N/A",
                                        site: site // passing full site object for state navigation
                                    }));
                                });

                            if (!allExecutions || allExecutions.length === 0) {
                                return (
                                    <div className="h-[300px] flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 gap-4 transition-all hover:bg-white/60 focus:bg-white/60">
                                        <ClipboardCheck className="w-12 h-12 opacity-20" />
                                        <div className="text-center space-y-1">
                                            <p className="text-lg font-bold text-slate-600">No Audit Plans</p>
                                            <p className="text-sm text-slate-400 font-medium">No active audit executions mapped across your sites.</p>
                                        </div>
                                    </div>
                                );
                            }

                            const firstPendingIdx = allExecutions.findIndex((exec) => {
                                const siteProgram = (activeSitePrograms || []).find(
                                    (p) => p.id === exec.programId,
                                );
                                return (
                                    siteProgram && !hasPlan(siteProgram.id, exec.id)
                                );
                            });
                            const firstExistingPlanIdx = allExecutions.findIndex((exec) => {
                                const siteProgram = (activeSitePrograms || []).find(
                                    (p) => p.id === exec.programId,
                                );
                                return (
                                    !!siteProgram &&
                                    hasPlan(siteProgram.id, exec.id)
                                );
                            });
                            const step3TargetIdx =
                                firstPendingIdx >= 0
                                    ? firstPendingIdx
                                    : firstExistingPlanIdx;

                            return (
                                <div
                                    className={cn(
                                        !auditPlanTourActive &&
                                            "animate-in fade-in slide-in-from-bottom-4 duration-700",
                                        viewMode === "card"
                                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                            : "flex flex-col gap-3",
                                    )}
                                >
                                    {(allExecutions || []).map((exec, idx) => {
                                        const siteProgram = (activeSitePrograms || []).find(p => p.id === exec.programId);
                                        const executionDepartments = resolveDepartmentsFromProgram(siteProgram, companies);
                                        const plan = (auditPlans || []).find(p => p.auditProgramId === exec.programId && p.executionId === exec.id);
                                        const planExists = !!plan;
                                        const isCreatePlanTourTarget =
                                            auditPlanTourActive &&
                                            auditPlanTourStep === AUDIT_PLAN_TOUR_STEP.CREATE_PLAN &&
                                            idx === step3TargetIdx &&
                                            step3TargetIdx >= 0;
                                        const blockCreatePlanDuringListStep =
                                            auditPlanTourActive &&
                                            auditPlanTourStep === AUDIT_PLAN_TOUR_STEP.PROGRAMS_LIST;

                                        return viewMode === "card" ? (
                                            <Card key={idx} className="group relative border border-white/50 bg-white shadow-sm hover:shadow-md transition-all duration-500 rounded-2xl p-6 flex flex-col gap-6 border-slate-200/50">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "p-2 rounded-lg transition-all duration-300",
                                                                planExists ? "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-50 group-hover:text-white" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
                                                            )}>
                                                                <ClipboardCheck className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                                                                    Audit #{idx + 1}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <Globe className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">{exec.siteName}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <h3 className="text-lg font-black text-[#0F172A] leading-tight group-hover:text-emerald-600 transition-colors duration-300 uppercase line-clamp-2 mt-2">
                                                            {exec.title.split(' - ')[0]}
                                                            <span className="text-slate-400 font-medium normal-case block text-sm mt-1">
                                                                {planExists ? format(new Date(plan.date), 'MMM dd, yyyy') : exec.title.split(' - ')[1]}
                                                            </span>
                                                        </h3>
                                                        {executionDepartments.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {executionDepartments.map((dept) => (
                                                                    <Badge
                                                                        key={dept.id}
                                                                        variant="outline"
                                                                        className="text-[9px] font-medium bg-white border-slate-200 text-slate-600"
                                                                    >
                                                                        {dept.name}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] font-bold px-2 py-1 border-slate-100 text-slate-500 bg-slate-50 rounded-lg whitespace-nowrap">
                                                            {exec.clauseCount} SECTIONS
                                                        </Badge>
                                                        {planExists && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    {!isAuditeeReadOnly && (
                                                                        <DropdownMenuItem onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}>
                                                                            <Edit className="mr-2 h-4 w-4" /> Edit Plan
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}>
                                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDownloadPDF(plan, exec.title, siteProgram)}>
                                                                        <FileText className="mr-2 h-4 w-4" /> Download PDF
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDownloadDocx(plan, exec.title, siteProgram)}>
                                                                        <FileText className="mr-2 h-4 w-4" /> Download DOCX
                                                                    </DropdownMenuItem>
                                                                    {!isAuditeeReadOnly && (
                                                                        <DropdownMenuItem onClick={() => handleDeletePlan(plan.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Plan
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col gap-2">
                                                        {(() => {
                                                            const groupArray = groupClausesByBaseId(exec.clauses);
                                                            return (
                                                                <>
                                                                    {groupArray.slice(0, 3).map((group, gIdx) => (
                                                                        <ClauseGroupPreview key={gIdx} group={group} compact />
                                                                    ))}
                                                                    {groupArray.length > 3 && (
                                                                        <span className="text-[10px] font-bold text-slate-400 px-2 truncate mt-1">+{groupArray.length - 3} more</span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {(planExists || !isAuditeeReadOnly) && (
                                                <Button
                                                    id={
                                                        isCreatePlanTourTarget
                                                            ? "tour-step-create-plan-btn"
                                                            : undefined
                                                    }
                                                    size="lg"
                                                    disabled={blockCreatePlanDuringListStep}
                                                    className={cn(
                                                        "w-full font-bold rounded-2xl h-12 shadow-md transition-all duration-300 group/btn text-sm relative overflow-hidden",
                                                        planExists ? "bg-white text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200" : "bg-slate-900 hover:bg-emerald-600 text-white",
                                                        isCreatePlanTourTarget && tourPlanHighlight(AUDIT_PLAN_TOUR_STEP.CREATE_PLAN),
                                                        blockCreatePlanDuringListStep && "opacity-60 cursor-not-allowed",
                                                    )}
                                                    onClick={() => {
                                                        if (blockCreatePlanDuringListStep) return;
                                                        const createPath = auditPlanTourActive
                                                            ? `/audit-program/create-plan?auditPlanTour=true&auditPlanStep=${AUDIT_PLAN_TOUR_STEP.AUDIT_NAME}`
                                                            : "/audit-program/create-plan";
                                                        const navState = {
                                                            execution: exec,
                                                            program: siteProgram,
                                                            site: exec.site,
                                                            plan,
                                                        };
                                                        if (auditPlanTourActive) {
                                                            saveAuditPlanTourContext(navState);
                                                        }
                                                        // Navigate only — do not also setAuditPlanTourStep (race caused double-click).
                                                        navigate(createPath, { state: navState });
                                                    }}
                                                >
                                                    <div className="relative z-10 flex items-center justify-center gap-2">
                                                        {planExists ? <LayoutDashboard className="w-4 h-4" /> : <Calendar className="w-4 h-4 transition-transform duration-500 group-hover/btn:rotate-12" />}
                                                        {planExists
                                                            ? (isAuditeeReadOnly ? "View Plan" : "VIEW / EDIT PLAN")
                                                            : "CREATE PLAN"}
                                                        {!planExists && <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />}
                                                    </div>
                                                </Button>
                                                )}
                                            </Card>
                                        ) : (
                                            <div key={idx} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 gap-4">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={cn("text-lg font-bold tracking-tight", planExists ? "text-indigo-600" : "text-emerald-600")}>
                                                            {planExists
                                                                ? `${exec.title.split(' - ')[0]} - ${format(new Date(plan.date), 'MMM dd, yyyy')}`
                                                                : exec.title
                                                            }
                                                        </h3>
                                                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-100 text-emerald-600 bg-emerald-50 rounded-lg">
                                                            {exec.siteName}
                                                        </Badge>
                                                    </div>
                                                    {executionDepartments.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {executionDepartments.map((dept) => (
                                                                <Badge
                                                                    key={dept.id}
                                                                    variant="outline"
                                                                    className="text-[10px] font-medium bg-slate-50 border-slate-200 text-slate-600"
                                                                >
                                                                    {dept.name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-2 min-w-0">
                                                        {groupClausesByBaseId(exec.clauses).map((group, gIdx) => (
                                                            <ClauseGroupPreview key={gIdx} group={group} />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 self-start sm:self-center mt-2 sm:mt-0">
                                                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 shadow-sm whitespace-nowrap">
                                                        {exec.clauseCount} Sections
                                                    </div>
                                                    {(planExists || !isAuditeeReadOnly) && (
                                                    <Button
                                                        id={
                                                            isCreatePlanTourTarget
                                                                ? "tour-step-create-plan-btn"
                                                                : undefined
                                                        }
                                                        disabled={blockCreatePlanDuringListStep}
                                                        className={cn(
                                                            "font-bold rounded-xl h-10 px-6 shadow-md transition-all duration-300 hover:scale-105 active:scale-95 group/btn relative overflow-hidden",
                                                            planExists ? "bg-white text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-50" : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100",
                                                            isCreatePlanTourTarget && tourPlanHighlight(AUDIT_PLAN_TOUR_STEP.CREATE_PLAN),
                                                            blockCreatePlanDuringListStep && "opacity-60 cursor-not-allowed hover:scale-100",
                                                        )}
                                                        onClick={() => {
                                                            if (blockCreatePlanDuringListStep) return;
                                                            const createPath = auditPlanTourActive
                                                                ? `/audit-program/create-plan?auditPlanTour=true&auditPlanStep=${AUDIT_PLAN_TOUR_STEP.AUDIT_NAME}`
                                                                : "/audit-program/create-plan";
                                                            const navState = {
                                                                execution: exec,
                                                                program: siteProgram,
                                                                site: exec.site,
                                                                plan,
                                                            };
                                                            if (auditPlanTourActive) {
                                                                saveAuditPlanTourContext(navState);
                                                            }
                                                            navigate(createPath, { state: navState });
                                                        }}
                                                    >
                                                        <div className="relative z-10 flex items-center justify-center gap-2">
                                                            {planExists ? <LayoutDashboard className="w-4 h-4" /> : <Calendar className="w-4 h-4 transition-transform duration-500 group-hover/btn:rotate-12" />}
                                                            {planExists
                                                                ? (isAuditeeReadOnly ? "View Plan" : "View / Edit")
                                                                : "Create Plan"}
                                                            {!planExists && <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />}
                                                        </div>
                                                    </Button>
                                                    )}
                                                    {planExists && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-300">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                {!isAuditeeReadOnly && (
                                                                    <DropdownMenuItem onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}>
                                                                        <Edit className="mr-2 h-4 w-4" /> Edit Plan
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem onClick={() => navigate("/audit-program/create-plan", { state: { execution: exec, program: siteProgram, site: exec.site, plan } })}>
                                                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDownloadPDF(plan, exec.title, siteProgram)}>
                                                                    <FileText className="mr-2 h-4 w-4" /> Download PDF
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleDownloadDocx(plan, exec.title, siteProgram)}>
                                                                    <FileText className="mr-2 h-4 w-4" /> Download DOCX
                                                                </DropdownMenuItem>
                                                                {!isAuditeeReadOnly && (
                                                                <DropdownMenuItem 
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                    onClick={() => {
                                                                        setPlanToDelete(plan);
                                                                        setIsDeleteDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Plan
                                                                </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-24 bg-white/50 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-1000">
                        <Globe className="w-16 h-16 text-slate-200" />
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-800">Operational Sites Missing</h3>
                            <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">
                                To visualize your global audit program, please first define at least one operational site.
                            </p>
                        </div>
                    </div>
                )}
                </div>
                </div>
            </div>
            {auditPlanTourActive &&
                auditPlanTourStep <= AUDIT_PLAN_TOUR_STEP.CREATE_PLAN &&
                auditPlanTourStepConfig && (
                    <TourStepPopover
                        key={`${auditPlanTourStep}-${step3IsViewEdit ? "view-edit" : "create"}`}
                        targetId={auditPlanTourStepConfig.targetId}
                        step={auditPlanTourStep}
                        totalSteps={AUDIT_PLAN_TOUR_TOTAL_STEPS}
                        title={
                            step3IsViewEdit
                                ? "view/edit a plan"
                                : auditPlanTourStepConfig.title
                        }
                        description={
                            step3IsViewEdit
                                ? "Click view/edit Plan on a program card (or Next) to open the plan form for that audit period."
                                : auditPlanTourStepConfig.description
                        }
                        position={auditPlanTourStepConfig.position}
                        onNext={handleAuditPlanTourNext}
                        onBack={handleAuditPlanTourBack}
                        onClose={() => {
                            exitAuditPlanTour();
                            navigate("/getting-started");
                        }}
                    />
                )}

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
        </div>
    );
};

export default AuditProgramPage;
