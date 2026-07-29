import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { apiFetch } from "@/lib/api";
import { sitesFromCompanies } from "@/lib/orgSites";
import { useAuditeeReadOnly } from "@/lib/auditeeAccess";
import { isAuditeeRole, usersEligibleAsAuditors } from "@/lib/userRoles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Check, ChevronDown, Plus, Save, Edit, Trash2, Eye, ArrowLeft, MoreHorizontal, Search, Star, FileText, Download } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType, TextRun, HeadingLevel, AlignmentType, BorderStyle, ImageRun, Header } from 'docx';
import { saveAs } from 'file-saver';
import logoImg from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { guardTrialCreate, parseTrialLimitApiError } from "@/lib/trialLimits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { TourStepPopover } from "@/components/TourStepPopover";
import {
    AUDIT_TOUR_TOTAL_STEPS,
    getAuditTourStepConfig,
} from "@/lib/auditOnboardingTour";
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
import ReusablePagination from "@/components/ReusablePagination";
import { buildPageQuery, parsePaginatedResponse } from "@/lib/pagination";
import {
    CLAUSE_MATRIX,
    ClauseMatrixRow,
    isClauseMatrixHeading,
    isMainClauseHeading,
} from "@/data/clauseMapping";
import {
    departmentsFromCompanies,
    formatDepartmentNames,
    getDepartmentIdsFromScheduleData,
    resolveDepartmentsByIds,
} from "@/lib/auditProgramDepartments";
import {
    applyBuiltWithIauditPdfFooter,
    buildIauditDocxFooter,
    IAUDIT_FOOTER_LOGO_SRC,
    IAUDIT_FOOTER_RESERVE_MM,
    imageAssetToBuffer,
} from "@/utils/pdfBranding";
import { EOSH_EXCEL_MODULE_META } from "@/data/eoshExcelModuleTemplates";
import { QFS_KORE_EXCEL_MODULE_META } from "@/data/qfsKoreExcelModuleTemplates";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ISO_STANDARDS = [
    "ISO 9001:2015 - Quality Management System",
    "ISO 14001:2015 - Environmental Management System",
    "ISO 45001:2018 - Occupational Health and Safety",
    "ISO 22000:2018 - Food Safety Management System",
];

const EOSH_MODULE_PREFIX = "EOSH Module: ";
const QFS_MODULE_PREFIX = "QFS KORE Module: ";

type AuditModuleOption = { id: string; label: string; value: string };

const EOSH_AUDIT_MODULES: AuditModuleOption[] = EOSH_EXCEL_MODULE_META.map((m) => ({
    id: m.id,
    label: m.sectionTitle,
    value: `${EOSH_MODULE_PREFIX}${m.sectionTitle}`,
}));

const QFS_AUDIT_MODULES: AuditModuleOption[] = QFS_KORE_EXCEL_MODULE_META.map((m) => ({
    id: m.id,
    label: m.sectionTitle,
    value: `${QFS_MODULE_PREFIX}${m.sectionTitle}`,
}));

type CriteriaType = "iso" | "module";
type ModuleFamily = "eosh" | "qfs-kore";

function isEoshModuleValue(value: string): boolean {
    return value.startsWith(EOSH_MODULE_PREFIX);
}

function isQfsModuleValue(value: string): boolean {
    return value.startsWith(QFS_MODULE_PREFIX);
}

function isAuditModuleValue(value: string): boolean {
    return isEoshModuleValue(value) || isQfsModuleValue(value);
}

function modulesForFamily(family: ModuleFamily | null): AuditModuleOption[] {
    if (family === "qfs-kore") return QFS_AUDIT_MODULES;
    return EOSH_AUDIT_MODULES;
}

function detectCriteriaType(
    isoStandard: string | null | undefined,
    scheduleData: Record<string, unknown> | null | undefined,
): CriteriaType {
    if (scheduleData?.criteriaType === "module" || scheduleData?.criteriaType === "iso") {
        return scheduleData.criteriaType as CriteriaType;
    }
    const parts = (isoStandard || "").split(", ").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0 && parts.every(isAuditModuleValue)) return "module";
    return "iso";
}

function detectModuleFamily(
    scheduleData: Record<string, unknown> | null | undefined,
    isoStandard: string | null | undefined,
): ModuleFamily | null {
    if (scheduleData?.moduleFamily === "eosh" || scheduleData?.moduleFamily === "qfs-kore") {
        return scheduleData.moduleFamily as ModuleFamily;
    }
    const parts = (isoStandard || "").split(", ").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0 && parts.every(isQfsModuleValue)) return "qfs-kore";
    if (parts.length > 0 && parts.every(isEoshModuleValue)) return "eosh";
    return null;
}

function standardDisplayLabel(std: string): string {
    if (isEoshModuleValue(std)) return std.replace(EOSH_MODULE_PREFIX, "");
    if (isQfsModuleValue(std)) return std.replace(QFS_MODULE_PREFIX, "");
    if (std.includes("22000")) return "ISO 22000:2018";
    if (std.includes("9001")) return "ISO 9001:2015";
    if (std.includes("14001")) return "ISO 14001:2015";
    if (std.includes("45001")) return "ISO 45001:2018";
    return "Clause";
}

function standardBadgeLabel(std: string): string {
    if (isEoshModuleValue(std)) return std.replace(EOSH_MODULE_PREFIX, "");
    if (isQfsModuleValue(std)) return std.replace(QFS_MODULE_PREFIX, "");
    if (std.includes("22000")) return "22000";
    if (std.includes("9001")) return "9001";
    if (std.includes("14001")) return "14001";
    if (std.includes("45001")) return "45001";
    return "";
}

function clauseTextForStandard(clause: ClauseMatrixRow, std: string): string {
    if (std.includes("22000")) return clause.iso9001;
    if (std.includes("9001")) return clause.iso9001;
    if (std.includes("14001")) return clause.iso14001;
    if (std.includes("45001")) return clause.iso45001;
    return clause.iso9001 || clause.iso14001 || clause.iso45001;
}

const FREQUENCIES = ["Monthly", "Quarterly", "Bi-annually", "Annually"];

type PdfImageAsset = { dataUrl: string; format: "PNG" | "JPEG"; ratio: number };

async function loadImageAsset(src: string, maxDim = 120): Promise<PdfImageAsset | null> {
    if (!src?.trim()) return null;
    try {
        return await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d")!;
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                const usePng = src.startsWith("data:image/png") || /\.png(\?|$)/i.test(src);
                resolve({
                    dataUrl: canvas.toDataURL(usePng ? "image/png" : "image/jpeg", 0.85),
                    format: usePng ? "PNG" : "JPEG",
                    ratio: height / width,
                });
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    } catch {
        return null;
    }
}

function formatProgramPersonName(
    person?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null,
): string {
    if (!person) return "N/A";
    const name = `${person.firstName || ""} ${person.lastName || ""}`.trim();
    return name || person.email?.trim() || "N/A";
}

function resolveProgramPeopleLabels(program: any): {
    leadAuditor: string;
    auditors: string;
} {
    const leadAuditor = formatProgramPersonName(program?.leadAuditor);
    const auditorNames = Array.isArray(program?.auditors)
        ? program.auditors
              .map((a: any) => formatProgramPersonName(a))
              .filter((n: string) => n && n !== "N/A")
        : [];
    // Prefer unique names so lead+team listing doesn't repeat the same person.
    const uniqueAuditors = Array.from(new Set(auditorNames));
    return {
        leadAuditor,
        auditors: uniqueAuditors.length > 0 ? uniqueAuditors.join(", ") : "N/A",
    };
}

type ScheduleExportCell =
    | string
    | {
          content: string;
          colSpan?: number;
          styles?: Record<string, unknown>;
      };

/** Build PDF/Word schedule table — modules as rows for module programs, clauses for ISO. */
function buildProgramScheduleExport(
    program: any,
    programPeriods: { label: string }[],
): {
    isModuleProgram: boolean;
    tableHead: string[][];
    tableBody: ScheduleExportCell[][];
} {
    const scheduleData = (program?.scheduleData || {}) as Record<string, unknown>;
    const standards: string[] = program?.isoStandard
        ? String(program.isoStandard)
              .split(", ")
              .map((s: string) => s.trim())
              .filter(Boolean)
        : [];
    const criteriaType = detectCriteriaType(program?.isoStandard, scheduleData);
    const moduleFamily = detectModuleFamily(scheduleData, program?.isoStandard);

    if (criteriaType === "module") {
        const modules = modulesForFamily(moduleFamily || "eosh");
        const tableHead = [["Audit Module", ...programPeriods.map((p) => p.label)]];
        const tableBody: ScheduleExportCell[][] = [];

        modules.forEach((mod, rowIndex) => {
            const hasPeriod = programPeriods.some(
                (_, colIndex) => Boolean(scheduleData[`${rowIndex}-${colIndex}`]),
            );
            const isListed = standards.includes(mod.value);
            if (!isListed && !hasPeriod) return;

            const row: ScheduleExportCell[] = [
                {
                    content: mod.label,
                    styles: { halign: "left", fontStyle: "bold", fontSize: 7 },
                },
            ];
            programPeriods.forEach((_, colIndex) => {
                row.push(scheduleData[`${rowIndex}-${colIndex}`] ? "X" : "");
            });
            tableBody.push(row);
        });

        const customRows = (Array.isArray(scheduleData.customRows)
            ? scheduleData.customRows
            : []) as { id: string; text?: string }[];
        customRows.forEach((cRow) => {
            const row: ScheduleExportCell[] = [
                {
                    content: cRow.text || "Custom Requirement",
                    styles: {
                        fontStyle: "italic",
                        textColor: [100, 116, 139],
                        halign: "left",
                    },
                },
            ];
            programPeriods.forEach((_, colIndex) => {
                row.push(scheduleData[`custom_${cRow.id}-${colIndex}`] ? "X" : "");
            });
            tableBody.push(row);
        });

        if (tableBody.length === 0) {
            tableBody.push([
                { content: "No modules scheduled", styles: { halign: "left" } },
                ...programPeriods.map(() => ""),
            ]);
        }

        return { isModuleProgram: true, tableHead, tableBody };
    }

    const stdLabels = (standards.length > 0 ? standards : ["Clause"]).map(standardDisplayLabel);
    const tableHead = [[...stdLabels, ...programPeriods.map((p) => p.label)]];
    const tableBody: ScheduleExportCell[][] = [];
    const stds = standards.length > 0 ? standards : ["anything"];

    CLAUSE_MATRIX.forEach((clause, rowIndex) => {
        const isHeading = isClauseMatrixHeading(clause);
        const isMainHeading = isMainClauseHeading(clause);
        if (standards.length === 1 && !isMainClauseHeading(clause)) {
            const text = clauseTextForStandard(clause, standards[0]);
            if (text === "Corresponding Clause does not exist") return;
        }

        const row: ScheduleExportCell[] = [];
        stds.forEach((std: string, index: number) => {
            const cellText = clauseTextForStandard(clause, std);
            if (isHeading) {
                if (index === 0) {
                    row.push({
                        content: cellText,
                        colSpan: stds.length,
                        styles: {
                            fillColor: isMainHeading ? [33, 56, 71] : [240, 240, 240],
                            textColor: isMainHeading ? [255, 255, 255] : [33, 56, 71],
                            fontStyle: "bold",
                            halign: "left",
                        },
                    });
                }
            } else {
                row.push({ content: cellText, styles: { halign: "left" } });
            }
        });

        programPeriods.forEach((_, colIndex) => {
            const isSelected = Boolean(scheduleData[`${rowIndex}-${colIndex}`]);
            if (isHeading) {
                row.push({
                    content: isSelected ? "X" : "",
                    styles: {
                        fillColor: isMainHeading ? [33, 56, 71] : [240, 240, 240],
                        textColor: isMainHeading ? [255, 255, 255] : [33, 56, 71],
                        fontStyle: "bold",
                        halign: "center",
                    },
                });
            } else {
                row.push(isSelected ? "X" : "");
            }
        });
        tableBody.push(row);
    });

    const customRows = (Array.isArray(scheduleData.customRows)
        ? scheduleData.customRows
        : []) as { id: string; text?: string }[];
    const numStandardCols = standards.length || 1;
    customRows.forEach((cRow) => {
        const row: ScheduleExportCell[] = [
            {
                content: cRow.text || "Custom Requirement",
                colSpan: numStandardCols,
                styles: {
                    fontStyle: "italic",
                    textColor: [100, 116, 139],
                    halign: "left",
                },
            },
        ];
        programPeriods.forEach((_, colIndex) => {
            row.push(scheduleData[`custom_${cRow.id}-${colIndex}`] ? "X" : "");
        });
        tableBody.push(row);
    });

    return { isModuleProgram: false, tableHead, tableBody };
}

function resolveProgramCompany(program: any, sitesList: any[]) {
    const nested = program?.site?.company;
    if (nested?.name) {
        return { name: nested.name, logo: nested.logo || null };
    }
    const siteId = program?.siteId ?? program?.site?.id;
    const site = sitesList.find((s: any) => String(s.id) === String(siteId));
    if (site?.company?.name) {
        return { name: site.company.name, logo: site.company.logo || null };
    }
    return { name: "N/A", logo: null };
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() + i));

function splitScheduleData(loadData: Record<string, unknown> | null | undefined) {
    const data = loadData ?? {};
    const {
        customRows,
        startDate,
        departmentIds,
        departmentNames,
        criteriaType,
        moduleFamily,
        selectedModuleIds,
        ...rest
    } = data;
    return {
        customRows: (Array.isArray(customRows) ? customRows : []) as { id: string; text: string }[],
        startDate: typeof startDate === "string" ? startDate : undefined,
        departmentIds: Array.isArray(departmentIds)
            ? departmentIds.map((id) => String(id))
            : [],
        criteriaType:
            criteriaType === "module" || criteriaType === "iso"
                ? (criteriaType as CriteriaType)
                : undefined,
        moduleFamily:
            moduleFamily === "eosh" || moduleFamily === "qfs-kore"
                ? (moduleFamily as ModuleFamily)
                : undefined,
        selectedModuleIds: Array.isArray(selectedModuleIds)
            ? selectedModuleIds.map((id) => String(id))
            : [],
        selectedCells: rest as Record<string, boolean>,
    };
}

const AuditPrograms = () => {
    const navigate = useNavigate();
    const isAuditeeReadOnly = useAuditeeReadOnly();
    const [searchParams, setSearchParams] = useSearchParams();
    const auditTourActive = searchParams.get("auditTour") === "true";
    const auditTourStep = Math.min(
        AUDIT_TOUR_TOTAL_STEPS,
        Math.max(1, parseInt(searchParams.get("auditStep") || "1", 10)),
    );
    const auditTourStepConfig = getAuditTourStepConfig(auditTourStep);

    const setAuditTourStep = (step: number) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("auditTour", "true");
                next.set("auditStep", String(step));
                return next;
            },
            { replace: true },
        );
    };

    const exitAuditTour = () => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("auditTour");
                next.delete("auditStep");
                return next;
            },
            { replace: true },
        );
    };

    const tourHighlight = (step: number) =>
        auditTourActive && auditTourStep === step
            ? "relative z-[60] ring-[4px] ring-emerald-500/80 ring-offset-2 rounded-xl"
            : "";

    const [view, setView] = useState<"list" | "create" | "edit" | "view">("list");
    const [showOnboardingGuide, setShowOnboardingGuide] = useState(searchParams.get("onboarding") === "true");
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const [auditPrograms, setAuditPrograms] = useState<any[]>([]);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [scrollToScheduleOnShow, setScrollToScheduleOnShow] = useState(false);
    const scheduleMatrixRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [sites, setSites] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [auditors, setAuditors] = useState<any[]>([]);

    // Search and Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [standardFilter, setStandardFilter] = useState("all");
    const [siteFilter, setSiteFilter] = useState("all");

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!auditTourActive) return;
        if (auditTourStep <= 2) {
            if (view !== "list") setView("list");
            return;
        }
        if (view !== "create" && view !== "edit") {
            setView("create");
        }
        if (auditTourStep >= 5) {
            setShowSchedule(true);
        }
    }, [auditTourActive, auditTourStep]);

    const isMobile = windowWidth < 768;

    // Form state
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [auditName, setAuditName] = useState("");
    const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
    const [criteriaType, setCriteriaType] = useState<CriteriaType>("iso");
    const [moduleFamily, setModuleFamily] = useState<ModuleFamily | null>(null);
    const activeAuditModules = modulesForFamily(moduleFamily);
    const [frequency, setFrequency] = useState("Bi-annually");
    const [duration, setDuration] = useState(3);
    const [selectedSite, setSelectedSite] = useState("");
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
    const [selectedAuditors, setSelectedAuditors] = useState<string[]>([]);
    const [leadAuditorId, setLeadAuditorId] = useState<string | null>(null);
    const [selectedCells, setSelectedCells] = useState<Record<string, boolean>>({});
    const [customRows, setCustomRows] = useState<{ id: string, text: string }[]>([]);
    const [programStartDate, setProgramStartDate] = useState<Date>(new Date());

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 8;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / itemsPerPage);

    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => window.clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, standardFilter, siteFilter]);

    const fetchPrograms = async () => {
        try {
            const qs = buildPageQuery({
                page: currentPage,
                limit: itemsPerPage,
                scope: "org",
                search: debouncedSearch || undefined,
                standard: standardFilter !== "all" ? standardFilter : undefined,
                siteId: siteFilter !== "all" ? siteFilter : undefined,
            });
            const res = await apiFetch(`/audit-programs${qs}`);
            if (res.ok) {
                const data = await res.json();
                const parsed = parsePaginatedResponse<any>(data, currentPage, itemsPerPage);
                setAuditPrograms(parsed.items);
                setTotalItems(parsed.total);
            } else {
                toast.error("Failed to refresh audit programs");
                setAuditPrograms([]);
                setTotalItems(0);
            }
        } catch (error) {
            console.error("Failed to fetch programs:", error);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const loadFormBootstrap = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const [sitesRes, companiesRes, usersRes] = await Promise.all([
                    apiFetch("/sites"),
                    apiFetch("/companies"),
                    apiFetch("/users"),
                ]);
                if (cancelled) return;

                const sitesData = sitesRes.ok ? await sitesRes.json() : [];
                const companiesData = companiesRes.ok ? await companiesRes.json() : [];
                let usersData = usersRes.ok ? await usersRes.json() : [];
                if (usersData && !Array.isArray(usersData) && Array.isArray(usersData.items)) {
                    usersData = usersData.items;
                }

                if (user && user.id) {
                    if (Array.isArray(usersData)) {
                        if (!usersData.some((u: any) => String(u.id) === String(user.id))) {
                            usersData.unshift(user);
                        }
                    } else {
                        usersData = [user];
                    }
                }

                let sitesList = Array.isArray(sitesData) ? sitesData : [];
                const companiesList = Array.isArray(companiesData)
                    ? companiesData
                    : Array.isArray(companiesData?.items)
                      ? companiesData.items
                      : [];
                if (sitesList.length === 0 && companiesList.length > 0) {
                    sitesList = sitesFromCompanies(companiesList);
                }
                setSites(sitesList);
                setCompanies(companiesList);
                setAuditors(usersEligibleAsAuditors(Array.isArray(usersData) ? usersData : []));

                if (!sitesRes.ok || !usersRes.ok) {
                    toast.error("Some form data failed to load from server");
                }
            } catch (error) {
                console.error("Failed to fetch form bootstrap data:", error);
            }
        };

        loadFormBootstrap();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setListLoading(true);
                await fetchPrograms();
            } catch (error) {
                console.error("Failed to fetch audit programs:", error);
                if (!cancelled) toast.error("Failed to load audit programs");
            } finally {
                if (!cancelled) setListLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch, standardFilter, siteFilter]);

    const filteredAuditPrograms = Array.isArray(auditPrograms) ? auditPrograms : [];
    const paginatedPrograms = filteredAuditPrograms;
    const calculatePeriods = (frequencyVal = frequency, durationVal = duration, startDate = programStartDate) => {
        const count = frequencyVal === "Monthly" ? durationVal * 12 :
            frequencyVal === "Quarterly" ? durationVal * 4 :
                frequencyVal === "Bi-annually" ? durationVal * 2 :
                    durationVal; // Annually

        const result = [];
        const currentDate = startDate ? new Date(startDate) : new Date();
        currentDate.setDate(1); // Ensure we start at the beginning of the current month

        for (let i = 0; i < count; i++) {
            const monthLabel = currentDate.toLocaleString('default', { month: 'short' }).toUpperCase();
            const yearLabel = currentDate.getFullYear().toString();
            result.push({
                label: `${monthLabel} ${yearLabel}`
            });

            if (frequencyVal === "Monthly") currentDate.setMonth(currentDate.getMonth() + 1);
            else if (frequencyVal === "Quarterly") currentDate.setMonth(currentDate.getMonth() + 3);
            else if (frequencyVal === "Bi-annually") currentDate.setMonth(currentDate.getMonth() + 6);
            else currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
        return result;
    };

    const periods = calculatePeriods();
    const allDepartments = departmentsFromCompanies(companies);
    const siteDepartments = selectedSite
        ? allDepartments.filter((dept) => String(dept.siteId) === String(selectedSite))
        : [];
    const allDepartmentsSelected =
        siteDepartments.length > 0 &&
        siteDepartments.every((dept) => selectedDepartmentIds.includes(dept.id));
    const someDepartmentsSelected = siteDepartments.some((dept) =>
        selectedDepartmentIds.includes(dept.id),
    );
    const selectedDepartments = resolveDepartmentsByIds(selectedDepartmentIds, companies).filter(
        (dept) => !selectedSite || String(dept.siteId) === String(selectedSite),
    );

    const isPeriodActive = (colIndex: number) => {
        return Object.keys(selectedCells).some(key => {
            const parts = key.split("-");
            return parts[1] === colIndex.toString() && selectedCells[key];
        });
    };

    const scrollToScheduleMatrix = () => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                scheduleMatrixRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                    inline: "nearest",
                });
            }, 150);
        });
    };

    useEffect(() => {
        if (!showSchedule || !scrollToScheduleOnShow) return;
        setScrollToScheduleOnShow(false);
        scrollToScheduleMatrix();
    }, [showSchedule, scrollToScheduleOnShow]);

    const handleGenerateSchedule = () => {
        if (!auditName || !selectedSite) {
            toast.error("Please fill in Audit Name and Site");
            return;
        }
        if (criteriaType === "iso" && selectedStandards.length === 0) {
            toast.error("Please fill in Audit Name, ISO Standard(s) and Site");
            return;
        }
        if (criteriaType === "module") {
            if (moduleFamily !== "eosh" && moduleFamily !== "qfs-kore") {
                toast.error("Please select EOSH Audit Checklist or QFS KORE Audit Checklist");
                return;
            }
        }
        if (showSchedule) {
            scrollToScheduleMatrix();
        } else {
            setScrollToScheduleOnShow(true);
            setShowSchedule(true);
        }
        toast.success(
            criteriaType === "module" && moduleFamily === "eosh"
                ? "Select EOSH modules below to build the schedule"
                : criteriaType === "module" && moduleFamily === "qfs-kore"
                  ? "Select QFS KORE modules below to build the schedule"
                  : "Schedule updated!",
        );
    };

    const toggleCell = (row: number | string, col: number) => {
        if (view === "view") return;
        const key = `${row}-${col}`;
        setSelectedCells(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const openNewAuditProgram = () => {
        if (!guardTrialCreate("auditProgram", auditPrograms.length)) return;
        resetForm();
        setView("create");
    };

    const handleSaveProgram = async () => {
        if (view !== "edit" && !guardTrialCreate("auditProgram", auditPrograms.length)) {
            return;
        }
        if (!auditName || !selectedSite) {
            toast.error("Please fill in Audit Name and Site");
            return;
        }

        // Keep module selection in sync with checked schedule cells
        let standardsToSave = selectedStandards;
        if (criteriaType === "module") {
            const fromCells = activeAuditModules
                .filter((mod, rowIndex) =>
                    periods.some((_, colIndex) => Boolean(selectedCells[`${rowIndex}-${colIndex}`])),
                )
                .map((mod) => mod.value);
            standardsToSave = fromCells.length > 0 ? fromCells : selectedStandards;
            if (fromCells.length > 0) {
                setSelectedStandards(fromCells);
            }
        }

        if (standardsToSave.length === 0) {
            toast.error(
                criteriaType === "module"
                    ? moduleFamily === "qfs-kore"
                        ? "Please select at least one QFS KORE module in the schedule section"
                        : "Please select at least one EOSH module in the schedule section"
                    : "Please select at least one ISO Standard",
            );
            return;
        }

        const siteDeptIds = siteDepartments.map((dept) => dept.id);
        const departmentIdsToSave = selectedDepartmentIds.filter((id) => siteDeptIds.includes(id));
        const departmentNamesToSave = selectedDepartments
            .filter((dept) => departmentIdsToSave.includes(dept.id))
            .map((dept) => dept.name);

        const durationToSave = Number.parseInt(String(duration), 10);
        if (!Number.isInteger(durationToSave) || durationToSave < 1) {
            toast.error("Please enter a valid duration (years)");
            return;
        }

        setLoading(true);
        const path = view === "edit" ? `/audit-programs/${currentId}` : `/audit-programs`;
        const method = view === "edit" ? "PUT" : "POST";

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const response = await apiFetch(path, {
                method,
                body: JSON.stringify({
                    name: auditName,
                    isoStandard: standardsToSave.join(', '),
                    frequency,
                    duration: durationToSave,
                    siteId: selectedSite,
                    auditorIds: selectedAuditors,
                    leadAuditorId: leadAuditorId || null,
                    scheduleData: {
                        ...selectedCells,
                        customRows,
                        startDate: programStartDate.toISOString(),
                        departmentIds: departmentIdsToSave,
                        departmentNames: departmentNamesToSave,
                        criteriaType,
                        moduleFamily: criteriaType === "module" ? moduleFamily : null,
                        selectedModuleIds:
                            criteriaType === "module"
                                ? activeAuditModules
                                      .filter((mod) => standardsToSave.includes(mod.value))
                                      .map((mod) => mod.id)
                                : [],
                    },
                    userId: user.id
                })
            });

            if (response.ok) {
                toast.success(view === "edit" ? "Audit Program updated!" : "Audit Program created!");
                await fetchPrograms();
                if (auditTourActive && auditTourStep === 7) {
                    setAuditTourStep(8);
                    return;
                }
                setView("list");
                resetForm();
            } else if (!(await parseTrialLimitApiError(response))) {
                let message = "Failed to save Audit Program";
                try {
                    const errBody = await response.json();
                    if (errBody?.error && typeof errBody.error === "string") {
                        message = errBody.error;
                    }
                } catch {
                    /* ignore */
                }
                toast.error(message);
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error(
                error instanceof Error ? error.message : "An error occurred while saving",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProgram = async () => {
        if (!deleteId) return;
        try {
            const res = await apiFetch(`/audit-programs/${deleteId}`, { 
                method: "DELETE"
            });
            if (res.ok) {
                toast.success("Program deleted");
                await fetchPrograms();
            }
        } catch (error) {
            toast.error("Failed to delete program");
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const applyProgramAuditorsFromLoaded = (fullProgram: {
        leadAuditorId?: number | null;
        auditors?: { id: number; role?: string }[];
    }) => {
        const programAuditorIds = (fullProgram.auditors ?? [])
            .filter((a) => !isAuditeeRole(a.role))
            .map((a) => a.id.toString());
        const leadId = fullProgram.leadAuditorId?.toString() ?? null;
        const resolvedLeadId =
            leadId && programAuditorIds.includes(leadId) ? leadId : programAuditorIds[0] ?? null;

        setSelectedAuditors(programAuditorIds);
        setLeadAuditorId(resolvedLeadId);

        if (leadId && resolvedLeadId !== leadId) {
            const originalLeadIsAuditee = (fullProgram.auditors ?? []).some(
                (a) => a.id.toString() === leadId && isAuditeeRole(a.role),
            );
            toast.warning(
                originalLeadIsAuditee
                    ? "The originally assigned lead auditor is an auditee and cannot be selected. A suitable auditor has been chosen instead."
                    : "The originally assigned lead auditor is no longer available. A suitable auditor has been chosen instead.",
                { id: "lead-auditor-fallback-warning" },
            );
        }
    };

    const handleEditProgram = async (program: any) => {
        const loadingToast = toast.loading("Fetching program details...");
        try {
            const res = await apiFetch(`/audit-programs/${program.id}`);
            if (!res.ok) throw new Error("Failed to fetch details");
            const fullProgram = await res.json();

            setCurrentId(fullProgram.id);
            setAuditName(fullProgram.name);
            setSelectedStandards(fullProgram.isoStandard ? fullProgram.isoStandard.split(', ') : []);
            setFrequency(fullProgram.frequency);
            setDuration(fullProgram.duration);
            setSelectedSite(fullProgram.siteId.toString());
            applyProgramAuditorsFromLoaded(fullProgram);
            const {
                customRows: loadedCustomRows,
                startDate: loadedStartDate,
                departmentIds: loadedDepartmentIds,
                criteriaType: loadedCriteriaType,
                moduleFamily: loadedModuleFamily,
                selectedCells: loadedCells,
            } = splitScheduleData(fullProgram.scheduleData);
            const nextCriteria =
                loadedCriteriaType ||
                detectCriteriaType(fullProgram.isoStandard, fullProgram.scheduleData);
            setCriteriaType(nextCriteria);
            setModuleFamily(
                loadedModuleFamily ||
                    detectModuleFamily(fullProgram.scheduleData, fullProgram.isoStandard) ||
                    (nextCriteria === "module" ? "eosh" : null),
            );
            setSelectedCells(loadedCells);
            setCustomRows(loadedCustomRows);
            setSelectedDepartmentIds(loadedDepartmentIds);
            setProgramStartDate(loadedStartDate ? new Date(loadedStartDate) : (fullProgram.createdAt ? new Date(fullProgram.createdAt) : new Date()));
            setShowSchedule(true);
            setView("edit");
            toast.dismiss(loadingToast);
        } catch (error) {
            console.error("Error fetching program details:", error);
            toast.error("Failed to load program details");
            toast.dismiss(loadingToast);
        }
    };

    const handleViewProgram = async (program: any) => {
        const loadingToast = toast.loading("Loading program details...");
        try {
            const res = await apiFetch(`/audit-programs/${program.id}`);
            if (!res.ok) throw new Error("Failed to fetch details");
            const fullProgram = await res.json();

            setCurrentId(fullProgram.id);
            setAuditName(fullProgram.name);
            setSelectedStandards(fullProgram.isoStandard ? fullProgram.isoStandard.split(', ') : []);
            setFrequency(fullProgram.frequency);
            setDuration(fullProgram.duration);
            setSelectedSite(fullProgram.siteId.toString());
            applyProgramAuditorsFromLoaded(fullProgram);
            const {
                customRows: loadedCustomRows,
                startDate: loadedStartDate,
                departmentIds: loadedDepartmentIds,
                criteriaType: loadedCriteriaType,
                moduleFamily: loadedModuleFamily,
                selectedCells: loadedCells,
            } = splitScheduleData(fullProgram.scheduleData);
            const nextCriteria =
                loadedCriteriaType ||
                detectCriteriaType(fullProgram.isoStandard, fullProgram.scheduleData);
            setCriteriaType(nextCriteria);
            setModuleFamily(
                loadedModuleFamily ||
                    detectModuleFamily(fullProgram.scheduleData, fullProgram.isoStandard) ||
                    (nextCriteria === "module" ? "eosh" : null),
            );
            setSelectedCells(loadedCells);
            setCustomRows(loadedCustomRows);
            setSelectedDepartmentIds(loadedDepartmentIds);
            setProgramStartDate(loadedStartDate ? new Date(loadedStartDate) : (fullProgram.createdAt ? new Date(fullProgram.createdAt) : new Date()));
            setShowSchedule(true);
            setView("view");
            toast.dismiss(loadingToast);
        } catch (error) {
            console.error("Error fetching program details:", error);
            toast.error("Failed to load program details");
            toast.dismiss(loadingToast);
        }
    };

    const resetForm = () => {
        setCurrentId(null);
        setAuditName("");
        setSelectedStandards([]);
        setCriteriaType("iso");
        setModuleFamily(null);
        setFrequency("Bi-annually");
        setDuration(3);
        setSelectedSite("");
        setSelectedDepartmentIds([]);
        setSelectedAuditors([]);
        setLeadAuditorId(null);
        setSelectedCells({});
        setCustomRows([]);
        setProgramStartDate(new Date());
        setShowSchedule(false);
    };

    const handleAuditTourNext = () => {
        if (auditTourStep === 2) {
            if (!guardTrialCreate("auditProgram", auditPrograms.length)) return;
            resetForm();
            setView("create");
            setAuditTourStep(3);
            return;
        }
        if (auditTourStep === 4) {
            if (!auditName || !selectedSite) {
                toast.error("Please fill in Audit Name and Site");
                return;
            }
            if (criteriaType === "iso" && selectedStandards.length === 0) {
                toast.error("Please fill in Audit Name, ISO Standard(s) and Site");
                return;
            }
            if (criteriaType === "module" && moduleFamily !== "eosh" && moduleFamily !== "qfs-kore") {
                toast.error("Please select EOSH Audit Checklist or QFS KORE Audit Checklist");
                return;
            }
            setScrollToScheduleOnShow(true);
            setShowSchedule(true);
            toast.success(
                criteriaType === "module" && moduleFamily === "qfs-kore"
                    ? "Select QFS KORE modules below to build the schedule"
                    : criteriaType === "module"
                      ? "Select EOSH modules below to build the schedule"
                      : "Schedule generated!",
            );
            setAuditTourStep(5);
            return;
        }
        if (auditTourStep >= AUDIT_TOUR_TOTAL_STEPS) {
            exitAuditTour();
            setView("list");
            toast.success("You completed the first auditing step!");
            navigate("/getting-started");
            return;
        }
        setAuditTourStep(auditTourStep + 1);
    };

    const handleAuditTourBack = () => {
        if (auditTourStep <= 1) {
            exitAuditTour();
            navigate("/getting-started");
            return;
        }
        if (auditTourStep === 3) {
            setView("list");
            setAuditTourStep(2);
            return;
        }
        if (auditTourStep === 5) {
            setShowSchedule(false);
        }
        setAuditTourStep(auditTourStep - 1);
    };

    const getSelectedClausesList = () => {
        const result: { clause: ClauseMatrixRow; periods: string[] }[] = [];

        if (criteriaType === "module") {
            activeAuditModules.forEach((mod, rowIndex) => {
                if (!selectedStandards.includes(mod.value)) return;
                const activePeriods: string[] = [];
                periods.forEach((period, colIndex) => {
                    if (selectedCells[`${rowIndex}-${colIndex}`]) {
                        activePeriods.push(period.label);
                    }
                });
                if (activePeriods.length > 0) {
                    result.push({
                        clause: {
                            id: mod.value,
                            iso9001: mod.label,
                            iso14001: mod.label,
                            iso45001: mod.label,
                            isHeading: false,
                        },
                        periods: activePeriods,
                    });
                }
            });
        } else {
            CLAUSE_MATRIX.forEach((clause, rowIndex) => {
                const activePeriods: string[] = [];
                periods.forEach((period, colIndex) => {
                    if (selectedCells[`${rowIndex}-${colIndex}`]) {
                        activePeriods.push(period.label);
                    }
                });
                if (activePeriods.length > 0) {
                    result.push({ clause, periods: activePeriods });
                }
            });
        }

        // Find selected periods for custom rows
        customRows.forEach((cRow) => {
            const activePeriods: string[] = [];
            periods.forEach((period, colIndex) => {
                if (selectedCells[`custom_${cRow.id}-${colIndex}`]) {
                    activePeriods.push(period.label);
                }
            });
            if (activePeriods.length > 0) {
                result.push({
                    clause: {
                        id: `custom_${cRow.id}`,
                        iso9001: cRow.text,
                        iso14001: cRow.text,
                        iso45001: cRow.text,
                        isHeading: false
                    },
                    periods: activePeriods
                });
            }
        });

        return result;
    };

    const selectedClausesList = getSelectedClausesList();

    const handleDownloadPDF = async (program: any) => {
        const toastId = toast.loading("Preparing PDF…");
        try {
        // Fetch full program details (schedule + site/company for header)
        let fullProgram = program;
        try {
            const res = await apiFetch(`/audit-programs/${program.id}`);
            if (res.ok) fullProgram = await res.json();
        } catch (e) {
            console.error("Failed to fetch full program details for PDF", e);
        }
        const doc = new jsPDF({ orientation: 'landscape' });
        const loadData = fullProgram.scheduleData || {};
        const programPeriods = calculatePeriods(fullProgram.frequency, fullProgram.duration, loadData.startDate || fullProgram.createdAt);
        program = fullProgram;

        const company = resolveProgramCompany(program, sites);
        const pageWidth = doc.internal.pageSize.getWidth();
        const leftX = 14;
        let headerBottomY = 10;

        const companyLogoAsset = company.logo ? await loadImageAsset(company.logo, 140) : null;
        const iauditFooterAsset = await loadImageAsset(IAUDIT_FOOTER_LOGO_SRC, 100);

        if (companyLogoAsset) {
            const maxLogoW = 36;
            const maxLogoH = 24;
            let logoW = maxLogoW;
            let logoH = logoW * companyLogoAsset.ratio;
            if (logoH > maxLogoH) {
                logoH = maxLogoH;
                logoW = logoH / companyLogoAsset.ratio;
            }
            doc.addImage(
                companyLogoAsset.dataUrl,
                companyLogoAsset.format,
                leftX,
                10,
                logoW,
                logoH,
            );
            headerBottomY = 10 + logoH + 4;
        }

        let metaY = Math.max(headerBottomY + 4, 36);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text("Audit Program Schedule", leftX, metaY);
        metaY += 10;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const addMetaLine = (label: string, value: string) => {
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, leftX, metaY);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(value || "N/A", pageWidth - leftX - 42);
            doc.text(lines, leftX + 32, metaY);
            metaY += Math.max(6, lines.length * 5);
        };

        const people = resolveProgramPeopleLabels(program);
        const standardsLabel = program.isoStandard
            ? String(program.isoStandard)
                  .split(", ")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
                  .map(standardDisplayLabel)
                  .join(", ")
            : "N/A";
        addMetaLine("Program Name", program.name);
        addMetaLine(
            detectCriteriaType(program.isoStandard, program.scheduleData) === "module"
                ? "Modules"
                : "Standard",
            standardsLabel,
        );
        addMetaLine("Frequency", program.frequency || "N/A");
        addMetaLine("Site", program.site?.name || "N/A");
        const programDepartments = resolveDepartmentsByIds(
            getDepartmentIdsFromScheduleData(program.scheduleData),
            companies,
        );
        addMetaLine("Departments", formatDepartmentNames(programDepartments));
        addMetaLine("Lead Auditor", people.leadAuditor);
        addMetaLine("Auditors", people.auditors);

        // Company block: name first, then logo below
        metaY += 3;
        const valueX = leftX + 32;
        const companyBlockTop = metaY;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Company:", leftX, companyBlockTop + 4);

        let contentY = companyBlockTop;
        const safeCompanyName = company.name || "N/A";

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        const nameLines = doc.splitTextToSize(safeCompanyName, pageWidth - valueX - 14);
        doc.text(nameLines, valueX, contentY);
        contentY += nameLines.length * 5.5 + 2;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        metaY = Math.max(companyBlockTop + 8, contentY) + 5;

        const tableStartY = metaY + 2;

        const { tableHead, tableBody } = buildProgramScheduleExport(program, programPeriods);

        // Generate Table
        autoTable(doc, {
            startY: tableStartY,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [16, 185, 129], // Emerald-500
                textColor: [0, 0, 0], // Black text
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { halign: "left", cellWidth: "auto" },
            },
            styles: { fontSize: 6, cellPadding: 0.8, halign: 'center', valign: 'middle' },
            margin: { left: leftX, right: 14, bottom: IAUDIT_FOOTER_RESERVE_MM },
        });

        applyBuiltWithIauditPdfFooter(doc, iauditFooterAsset, leftX);

        const safeName = (program.name || "Audit_Program").replace(/\s+/g, "_");
        doc.save(`${safeName}_Schedule.pdf`);
        toast.success("PDF downloaded successfully", { id: toastId });
        } catch (error) {
            console.error("Audit program PDF download error:", error);
            toast.error(
                error instanceof Error ? error.message : "Failed to generate PDF",
                { id: toastId },
            );
        }
    };

    const handleDownloadWord = async (program: any) => {
        const toastId = toast.loading("Preparing Word document…");
        try {
        let fullProgram = program;
        try {
            const res = await apiFetch(`/audit-programs/${program.id}`);
            if (res.ok) fullProgram = await res.json();
        } catch (e) {
            console.error("Failed to fetch full program details for Word", e);
        }
        program = fullProgram;
        const loadData = program.scheduleData || {};
        const programPeriods = calculatePeriods(program.frequency, program.duration, loadData.startDate || program.createdAt);
        const company = resolveProgramCompany(program, sites);

        const dataUrlToBuffer = async (src: string): Promise<ArrayBuffer | null> => {
            const asset = await loadImageAsset(src, 140);
            if (!asset) return null;
            const res = await fetch(asset.dataUrl);
            return res.arrayBuffer();
        };

        let companyLogoBuffer: ArrayBuffer | null = null;
        if (company.logo) {
            try {
                companyLogoBuffer = await dataUrlToBuffer(company.logo);
            } catch (error) {
                console.error("Failed to fetch company logo for Word doc:", error);
            }
        }

        let iauditLogoBuffer: ArrayBuffer | null = null;
        let iauditLogoRatio = 1;
        try {
            const iauditAsset = await loadImageAsset(IAUDIT_FOOTER_LOGO_SRC, 100);
            iauditLogoRatio = iauditAsset?.ratio ?? 1;
            iauditLogoBuffer = await imageAssetToBuffer(iauditAsset);
        } catch (error) {
            console.error("Failed to fetch iAudit logo for Word doc:", error);
        }

        const { tableHead, tableBody } = buildProgramScheduleExport(program, programPeriods);
        const headLabels = tableHead[0] || [];

        const cellText = (cell: ScheduleExportCell): string =>
            typeof cell === "string" ? cell : String(cell.content ?? "");

        const cellStyles = (cell: ScheduleExportCell): Record<string, unknown> =>
            typeof cell === "string" ? {} : ((cell.styles || {}) as Record<string, unknown>);

        const headerCells = headLabels.map((label: string, idx: number) =>
            new DocxTableCell({
                children: [
                    new Paragraph({
                        text: label,
                        style: "strong",
                        alignment: idx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                    }),
                ],
                width: { size: idx === 0 ? 3500 : 1000, type: WidthType.DXA },
                shading: { fill: "10B981" },
            }),
        );

        const bodyRows = tableBody.map((row) => {
            const cells = row.map((cell, idx) => {
                const styles = cellStyles(cell);
                const fill =
                    Array.isArray(styles.fillColor) && styles.fillColor.length >= 3
                        ? (styles.fillColor as number[])
                              .slice(0, 3)
                              .map((n) => Number(n).toString(16).padStart(2, "0"))
                              .join("")
                              .toUpperCase()
                        : undefined;
                const textColor =
                    Array.isArray(styles.textColor) && styles.textColor.length >= 3
                        ? (styles.textColor as number[])
                              .slice(0, 3)
                              .map((n) => Number(n).toString(16).padStart(2, "0"))
                              .join("")
                              .toUpperCase()
                        : undefined;
                const colSpan =
                    typeof cell === "object" && cell.colSpan ? Number(cell.colSpan) : undefined;
                return new DocxTableCell({
                    children: [
                        new Paragraph({
                            alignment:
                                idx === 0 || styles.halign === "left"
                                    ? AlignmentType.LEFT
                                    : AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: cellText(cell),
                                    bold: styles.fontStyle === "bold",
                                    italics: styles.fontStyle === "italic",
                                    color: textColor,
                                }),
                            ],
                        }),
                    ],
                    columnSpan: colSpan,
                    shading: fill ? { fill } : undefined,
                });
            });
            return new DocxTableRow({ children: cells });
        });

        const table = new DocxTable({
            rows: [
                new DocxTableRow({ children: headerCells, tableHeader: true }),
                ...bodyRows
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
            }
        });

        const getChildren = () => {
            const children: any[] = [];

            if (companyLogoBuffer) {
                children.push(
                    new Paragraph({
                        children: [
                            new ImageRun({ data: companyLogoBuffer, transformation: { width: 110, height: 50 } }),
                        ],
                        spacing: { after: 200 },
                    }),
                );
            }

            const people = resolveProgramPeopleLabels(program);
            const isModuleProgram =
                detectCriteriaType(program.isoStandard, program.scheduleData) === "module";
            const standardsLabel = program.isoStandard
                ? String(program.isoStandard)
                      .split(", ")
                      .map((s: string) => s.trim())
                      .filter(Boolean)
                      .map(standardDisplayLabel)
                      .join(", ")
                : "N/A";
            children.push(
                new Paragraph({
                    text: "Audit Program Schedule",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 200 },
                }),
                new Paragraph({ text: `Program Name: ${program.name}` }),
                new Paragraph({
                    text: `${isModuleProgram ? "Modules" : "Standard"}: ${standardsLabel}`,
                }),
                new Paragraph({ text: `Frequency: ${program.frequency}` }),
                new Paragraph({ text: `Site: ${program.site?.name || "N/A"}` }),
                new Paragraph({
                    text: `Departments: ${formatDepartmentNames(
                        resolveDepartmentsByIds(
                            getDepartmentIdsFromScheduleData(program.scheduleData),
                            companies,
                        ),
                    )}`,
                }),
                new Paragraph({ text: `Lead Auditor: ${people.leadAuditor}` }),
                new Paragraph({
                    text: `Auditors: ${people.auditors}`,
                    spacing: { after: 160 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: "Company:", bold: true })],
                    spacing: { after: 80 },
                }),
            );

            children.push(
                new Paragraph({
                    children: [new TextRun({ text: company.name, bold: true, size: 28 })],
                    indent: { left: 720 },
                    spacing: { after: 240 },
                }),
            );

            children.push(table);
            return children;
        };

        const doc = new Document({
            sections: [{
                properties: {},
                footers: {
                    default: buildIauditDocxFooter(iauditLogoBuffer, iauditLogoRatio),
                },
                children: getChildren(),
            }],
        });

        const blob = await Packer.toBlob(doc);
        const safeName = (program.name || "Audit_Program").replace(/\s+/g, "_");
        saveAs(blob, `${safeName}_Schedule.docx`);
        toast.success("Word document downloaded successfully", { id: toastId });
        } catch (error) {
            console.error("Audit program Word download error:", error);
            toast.error(
                error instanceof Error ? error.message : "Failed to generate Word document",
                { id: toastId },
            );
        }
    };



    return (
        <div className="flex-1 space-y-8 p-8 pt-6 min-h-screen bg-white relative">
            {/* Background Overlay for Onboarding */}
            {(showOnboardingGuide && view === "list") || auditTourActive ? (
                <div className="fixed inset-0 bg-slate-900/10 z-[40] transition-all duration-500 pointer-events-none" />
            ) : null}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Audit Program</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Plan and schedule your ISO audits across multiple periods.
                    </p>
                </div>
                {view === "list" && !isAuditeeReadOnly && (
                    <div className="relative">
                        <div className={cn("relative", (showOnboardingGuide || auditTourActive) && auditTourStep === 2 ? "z-[60]" : "")}>
                            {(showOnboardingGuide || (auditTourActive && auditTourStep === 2)) && (
                                <div className="absolute inset-0 -m-1 rounded-2xl ring-[8px] ring-emerald-500/50 animate-pulse z-[-1]" />
                            )}
                            <Button
                                onClick={() => {
                                    if (!guardTrialCreate("auditProgram", auditPrograms.length)) return;
                                    resetForm();
                                    setView("create");
                                    setShowOnboardingGuide(false);
                                    if (auditTourActive && auditTourStep === 2) {
                                        setAuditTourStep(3);
                                    }
                                }}
                                className={cn(
                                    "bg-[#213847] hover:bg-[#213847]/90 text-white gap-2 rounded-xl h-11 px-5 shadow-sm font-semibold transition-all duration-300",
                                    (showOnboardingGuide || (auditTourActive && auditTourStep === 2)) && "relative z-[60] scale-105 shadow-2xl",
                                    tourHighlight(2),
                                )}
                                id="tour-step-create-program"
                            >
                                <Plus className="w-4 h-4" /> Create Audit Program
                            </Button>
                        </div>

                        {/* Onboarding Guide Tooltip */}
                        {showOnboardingGuide && (
                            <TourStepPopover
                                targetId="tour-step-create-program"
                                step={6}
                                totalSteps={6}
                                title="Audit Program"
                                description="To conduct audits in line with ISO requirements, you need to create an Audit Program."
                                onNext={async () => {
                                    setShowOnboardingGuide(false);
                                    
                                    // Set completion flag for tour in localStorage
                                    localStorage.setItem('iaudit_onboarding_tour_completed', 'true');
                                    
                                    // Update user's onboarding status in backend and local storage
                                    const userJson = localStorage.getItem('user');
                                    if (userJson) {
                                        const user = JSON.parse(userJson);
                                        try {
                                            const response = await apiFetch(`/users/${user.id}`, {
                                                method: 'PUT',
                                                body: JSON.stringify({ onboardingCompleted: true })
                                            });
                                            
                                            if (response.ok) {
                                                const updatedUser = { ...user, onboardingCompleted: true };
                                                localStorage.setItem('user', JSON.stringify(updatedUser));
                                            }
                                        } catch (error) {
                                            console.error("Failed to update onboarding status:", error);
                                        }
                                    }

                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.delete("onboarding");
                                    setSearchParams(newParams);
                                    
                                    // Redirect to dashboard
                                    navigate("/");
                                }}
                                onBack={() => {
                                    setShowOnboardingGuide(false);
                                    navigate("/gap-analysis?onboarding=true");
                                }}
                                onClose={() => setShowOnboardingGuide(false)}
                            />
                        )}
                    </div>
                )}
            </div>

            {view === "list" ? (
                <>
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search audit programs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white border-slate-200 h-11 rounded-xl focus-visible:ring-[#213847]"
                            />
                        </div>
                        <Select value={standardFilter} onValueChange={setStandardFilter}>
                            <SelectTrigger className="w-full sm:w-[240px] bg-white border-slate-200 h-11 rounded-xl">
                                <SelectValue placeholder="All Standards" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Standards</SelectItem>
                                {ISO_STANDARDS.map(std => (
                                    <SelectItem key={std} value={std}>{std.split(' - ')[0]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={siteFilter} onValueChange={setSiteFilter}>
                            <SelectTrigger className="w-full sm:w-[200px] bg-white border-slate-200 h-11 rounded-xl">
                                <SelectValue placeholder="All Sites" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sites</SelectItem>
                                {sites.map(site => (
                                    <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Card className="border border-muted shadow-sm overflow-hidden bg-white rounded-xl">
                        <CardContent className="p-0 bg-white overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-[#213847]">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="w-[80px] font-bold text-xs uppercase tracking-wider text-white pl-6 text-center">Sl No.</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-wider text-white">Program Name</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-wider text-white">ISO Standard</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-wider text-white">Site</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-wider text-white text-center">Periods</TableHead>
                                        <TableHead className="w-[100px] font-bold text-xs uppercase tracking-wider text-white text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {listLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <div className="w-10 h-10 border-2 border-slate-300 border-t-[#213847] rounded-full animate-spin" />
                                                    <p className="text-sm font-medium text-slate-600">Loading audit programs…</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredAuditPrograms.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-3">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-400 mb-2">
                                                        <FileText className="w-8 h-8" />
                                                    </div>
                                                    <p className="text-lg font-bold text-slate-900">No audit programs yet</p>
                                                    <p className="text-sm text-slate-500 max-w-sm mx-auto">Create your first audit program to begin scheduling audits.</p>
                                                    <Button
                                                        onClick={openNewAuditProgram}
                                                        className="bg-[#213847] hover:bg-[#213847]/90 text-white font-bold rounded-xl h-11 px-6 shadow-sm mt-4 gap-2"
                                                    >
                                                        <Plus className="w-4 h-4" /> Create Program
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedPrograms.map((program, idx) => (
                                            <TableRow key={program.id} className="hover:bg-muted/20 border-muted/30 transition-colors group">
                                                <TableCell className="text-center text-sm font-medium text-muted-foreground/60 pl-6">{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
                                                <TableCell className="font-bold text-foreground group-hover:text-blue-600 transition-colors uppercase">{program.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(program.isoStandard || "").split(", ").map((std: string, sIdx: number) => (
                                                            <Badge key={sIdx} variant="outline" className="text-[10px] font-medium py-0 h-4 bg-blue-50 border-blue-200 text-blue-700 lowercase">
                                                                {isAuditModuleValue(std) ? standardDisplayLabel(std) : std.split(" - ")[0]}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-foreground font-medium">{program.site?.name || "N/A"}</TableCell>
                                                <TableCell className="text-center font-bold text-emerald-600">
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                        {program.isConfigured ? "Configured" : "Not Set"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => handleViewProgram(program)}
                                                                className="cursor-pointer"
                                                            >
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            {!isAuditeeReadOnly && (
                                                                <DropdownMenuItem
                                                                    onClick={() => handleEditProgram(program)}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit Program
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={() => handleDownloadPDF(program)}
                                                                className="cursor-pointer"
                                                            >
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                Download PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDownloadWord(program)}
                                                                className="cursor-pointer"
                                                            >
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                Download Word
                                                            </DropdownMenuItem>
                                                            {!isAuditeeReadOnly && (
                                                                <DropdownMenuItem
                                                                    onClick={() => { setDeleteId(program.id); setIsDeleteDialogOpen(true); }}
                                                                    className="text-red-600 cursor-pointer focus:text-red-600"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <ReusablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        className="mt-4"
                    />
                </>
            ) : (
                <>
                    <div className="flex items-center gap-4 mb-2">
                        <Button variant="ghost" size="sm" className="gap-2 text-slate-500" onClick={() => setView("list")}>
                            <ArrowLeft className="w-4 h-4" /> Back to List
                        </Button>
                    </div>
                    <Card
                        id="tour-step-audit-program-form"
                        className={cn(
                            "border-none shadow-sm animate-in fade-in slide-in-from-top-4 duration-300",
                            tourHighlight(3),
                        )}
                    >
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">
                                {view === "edit" ? "Edit Audit Program" : view === "view" ? "View Audit Program" : "Create Audit Program"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="audit-name">Audit Name</Label>
                                <Input
                                    id="audit-name"
                                    placeholder="E.g. Annual Quality Audit"
                                    className="bg-white border-slate-200"
                                    value={auditName}
                                    onChange={(e) => setAuditName(e.target.value)}
                                    disabled={view === "view"}
                                />
                            </div>

                            <div className="space-y-3 lg:col-span-1">
                                <Label>Audit criteria</Label>
                                <RadioGroup
                                    value={criteriaType}
                                    onValueChange={(val) => {
                                        if (view === "view") return;
                                        const next = val as CriteriaType;
                                        if (next === criteriaType) return;
                                        setCriteriaType(next);
                                        setModuleFamily(null);
                                        setSelectedStandards([]);
                                        setSelectedCells({});
                                        setCustomRows([]);
                                        setShowSchedule(false);
                                    }}
                                    disabled={view === "view"}
                                    className="flex flex-col gap-2 sm:flex-row sm:gap-4"
                                >
                                    <label
                                        htmlFor="criteria-iso"
                                        className={cn(
                                            "flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors",
                                            criteriaType === "iso"
                                                ? "border-emerald-300 bg-emerald-50/60"
                                                : "border-slate-200 bg-white",
                                            view === "view" && "cursor-default opacity-80",
                                        )}
                                    >
                                        <RadioGroupItem value="iso" id="criteria-iso" />
                                        <span className="text-sm font-medium text-slate-800">ISO Standards</span>
                                    </label>
                                    <label
                                        htmlFor="criteria-module"
                                        className={cn(
                                            "flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors",
                                            criteriaType === "module"
                                                ? "border-emerald-300 bg-emerald-50/60"
                                                : "border-slate-200 bg-white",
                                            view === "view" && "cursor-default opacity-80",
                                        )}
                                    >
                                        <RadioGroupItem value="module" id="criteria-module" />
                                        <span className="text-sm font-medium text-slate-800">Audit Modules</span>
                                    </label>
                                </RadioGroup>

                                {criteriaType === "iso" ? (
                                    <div className="flex flex-col gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 max-h-64 overflow-y-auto">
                                        {ISO_STANDARDS.map((std) => (
                                            <div key={std} className="flex items-start space-x-3">
                                                <Checkbox
                                                    id={`std-${std}`}
                                                    checked={selectedStandards.includes(std)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedStandards((prev) => [...prev, std]);
                                                        } else {
                                                            setSelectedStandards((prev) =>
                                                                prev.filter((s) => s !== std),
                                                            );
                                                        }
                                                    }}
                                                    disabled={view === "view"}
                                                    className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label
                                                        htmlFor={`std-${std}`}
                                                        className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                                                    >
                                                        {std.split(" - ")[0]}
                                                    </label>
                                                    <p className="text-xs text-slate-500">{std.split(" - ")[1]}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 gap-2">
                                            <button
                                                type="button"
                                                disabled={view === "view"}
                                                onClick={() => {
                                                    if (view === "view") return;
                                                    if (moduleFamily !== "eosh") {
                                                        setModuleFamily("eosh");
                                                        setSelectedStandards([]);
                                                        setSelectedCells({});
                                                        setCustomRows([]);
                                                        setShowSchedule(false);
                                                    }
                                                }}
                                                className={cn(
                                                    "text-left rounded-xl border px-4 py-3 transition-colors",
                                                    moduleFamily === "eosh"
                                                        ? "border-emerald-400 bg-emerald-50/70 shadow-sm"
                                                        : "border-slate-200 bg-white hover:border-slate-300",
                                                    view === "view" && "cursor-default",
                                                )}
                                            >
                                                <p className="text-sm font-semibold text-slate-900">EOSH Audit Checklist</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Modules appear after Generate Schedule
                                                </p>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={view === "view"}
                                                onClick={() => {
                                                    if (view === "view") return;
                                                    if (moduleFamily !== "qfs-kore") {
                                                        setModuleFamily("qfs-kore");
                                                        setSelectedStandards([]);
                                                        setSelectedCells({});
                                                        setCustomRows([]);
                                                        setShowSchedule(false);
                                                    }
                                                }}
                                                className={cn(
                                                    "text-left rounded-xl border px-4 py-3 transition-colors",
                                                    moduleFamily === "qfs-kore"
                                                        ? "border-emerald-400 bg-emerald-50/70 shadow-sm"
                                                        : "border-slate-200 bg-white hover:border-slate-300",
                                                    view === "view" && "cursor-default",
                                                )}
                                            >
                                                <p className="text-sm font-semibold text-slate-900">QFS KORE Audit Checklist</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    QFS KORE audit modules
                                                </p>
                                            </button>
                                        </div>
                                        {moduleFamily === "eosh" && (
                                            <p className="text-xs text-slate-500">
                                                Click <span className="font-semibold text-slate-700">Generate Schedule</span> to choose from all {EOSH_AUDIT_MODULES.length} EOSH modules.
                                            </p>
                                        )}
                                        {moduleFamily === "qfs-kore" && (
                                            <p className="text-xs text-slate-500">
                                                Click <span className="font-semibold text-slate-700">Generate Schedule</span> to choose from all {QFS_AUDIT_MODULES.length} QFS KORE modules.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Frequency</Label>
                                <Select onValueChange={setFrequency} value={frequency} disabled={view === "view"}>
                                    <SelectTrigger className="bg-white border-slate-200">
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FREQUENCIES.map((freq) => (
                                            <SelectItem key={freq} value={freq}>
                                                {freq}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Month</Label>
                                    <Select 
                                        onValueChange={(val) => {
                                            const newDate = new Date(programStartDate);
                                            newDate.setMonth(MONTHS.indexOf(val));
                                            setProgramStartDate(newDate);
                                        }} 
                                        value={MONTHS[programStartDate.getMonth()]} 
                                        disabled={view === "view"}
                                    >
                                        <SelectTrigger className="bg-white border-slate-200">
                                            <SelectValue placeholder="Select month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MONTHS.map((m) => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Start Year</Label>
                                    <Select 
                                        onValueChange={(val) => {
                                            const newDate = new Date(programStartDate);
                                            newDate.setFullYear(parseInt(val));
                                            setProgramStartDate(newDate);
                                        }} 
                                        value={programStartDate.getFullYear().toString()} 
                                        disabled={view === "view"}
                                    >
                                        <SelectTrigger className="bg-white border-slate-200">
                                            <SelectValue placeholder="Select year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {YEARS.map((y) => (
                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration (Years)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    className="bg-white border-slate-200"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    disabled={view === "view"}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Site</Label>
                                <Select
                                    onValueChange={(val) => {
                                        setSelectedSite(val);
                                        setSelectedDepartmentIds((prev) =>
                                            prev.filter((id) =>
                                                allDepartments.some(
                                                    (dept) =>
                                                        dept.id === id && String(dept.siteId) === String(val),
                                                ),
                                            ),
                                        );
                                    }}
                                    value={selectedSite}
                                    disabled={view === "view"}
                                >
                                    <SelectTrigger className="bg-white border-slate-200">
                                        <SelectValue placeholder="Select site" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sites.length === 0 ? (
                                            <SelectItem value="__none" disabled>
                                                No sites — add a site under Companies first
                                            </SelectItem>
                                        ) : (
                                            sites.map((site) => (
                                                <SelectItem key={site.id} value={site.id.toString()}>
                                                    {site.name} ({site.company?.name ?? "Company"})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <div className="flex items-center justify-between gap-3">
                                    <Label>Departments</Label>
                                    {siteDepartments.length > 0 && view !== "view" && (
                                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <Checkbox
                                                checked={allDepartmentsSelected}
                                                onCheckedChange={(checked) => {
                                                    if (checked === true) {
                                                        setSelectedDepartmentIds(siteDepartments.map((dept) => dept.id));
                                                    } else {
                                                        setSelectedDepartmentIds([]);
                                                    }
                                                }}
                                                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                            />
                                            <span>Select all</span>
                                        </label>
                                    )}
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white p-3 max-h-48 overflow-y-auto space-y-2">
                                    {!selectedSite ? (
                                        <p className="text-sm text-slate-500">
                                            Select a site to choose departments
                                        </p>
                                    ) : siteDepartments.length === 0 ? (
                                        <p className="text-sm text-slate-500">
                                            No departments for this site — add departments under Companies first
                                        </p>
                                    ) : (
                                        siteDepartments.map((dept) => {
                                            const isChecked = selectedDepartmentIds.includes(dept.id);
                                            return (
                                                <label
                                                    key={dept.id}
                                                    className={cn(
                                                        "flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-slate-50",
                                                        view === "view" && "cursor-default opacity-80",
                                                        isChecked && "bg-emerald-50/60",
                                                    )}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        disabled={view === "view"}
                                                        onCheckedChange={(checked) => {
                                                            if (view === "view") return;
                                                            const nextChecked = checked === true;
                                                            setSelectedDepartmentIds((prev) =>
                                                                nextChecked
                                                                    ? prev.includes(dept.id)
                                                                        ? prev
                                                                        : [...prev, dept.id]
                                                                    : prev.filter((id) => id !== dept.id),
                                                            );
                                                        }}
                                                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">
                                                            {dept.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate">
                                                            {dept.companyName} · {dept.siteName}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                                {selectedDepartments.length > 0 && (
                                    <p className="text-xs text-slate-500">
                                        {selectedDepartments.length} department
                                        {selectedDepartments.length === 1 ? "" : "s"} selected
                                        {someDepartmentsSelected && !allDepartmentsSelected && siteDepartments.length > 0
                                            ? " (partial selection)"
                                            : ""}
                                    </p>
                                )}
                                {selectedDepartments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {selectedDepartments.map((dept) => (
                                            <Badge
                                                key={dept.id}
                                                variant="outline"
                                                className="text-xs font-medium bg-emerald-50 border-emerald-200 text-emerald-800"
                                            >
                                                {dept.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Auditors</Label>
                                <div className="rounded-lg border border-slate-200 bg-white p-3 max-h-48 overflow-y-auto space-y-2">
                                    {auditors.length === 0 ? (
                                        <p className="text-sm text-slate-500">No users available</p>
                                    ) : (
                                        auditors.map((user) => {
                                            const userId = user.id.toString();
                                            const isChecked = selectedAuditors.includes(userId);
                                            const isLead = leadAuditorId === userId;
                                            return (
                                                <label
                                                    key={user.id}
                                                    className={cn(
                                                        "flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-slate-50",
                                                        view === "view" && "cursor-default opacity-80",
                                                        isChecked && "bg-emerald-50/60",
                                                    )}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        disabled={view === "view"}
                                                        onCheckedChange={(checked) => {
                                                            if (view === "view") return;
                                                            const nextChecked = checked === true;
                                                            if (nextChecked) {
                                                                setSelectedAuditors((prev) => {
                                                                    const next = prev.includes(userId) ? prev : [...prev, userId];
                                                                    if (next.length === 1) setLeadAuditorId(userId);
                                                                    return next;
                                                                });
                                                            } else {
                                                                setSelectedAuditors((prev) => {
                                                                    const next = prev.filter((id) => id !== userId);
                                                                    if (leadAuditorId === userId) {
                                                                        setLeadAuditorId(next[0] ?? null);
                                                                    }
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-slate-800 flex-1">
                                                        {user.firstName} {user.lastName}
                                                    </span>
                                                    {isChecked && isLead && (
                                                        <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800">
                                                            Lead
                                                        </Badge>
                                                    )}
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                                {selectedAuditors.length > 0 && view !== "view" && (
                                    <p className="text-xs text-slate-500">
                                        {selectedAuditors.length} auditor{selectedAuditors.length === 1 ? "" : "s"} selected
                                    </p>
                                )}
                                 {selectedAuditors.length > 1 && (
                                    <div className="mt-4 p-3 sm:p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 fill-amber-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800">Designate Lead Auditor</h4>
                                                <p className="text-[10px] sm:text-[11px] text-slate-500">Pick the main auditor in charge</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 mt-3">
                                            {selectedAuditors.map(id => {
                                                const auditor = auditors.find(a => a.id.toString() === id);
                                                const isLead = leadAuditorId === id;
                                                return auditor ? (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => view !== "view" && setLeadAuditorId(id)}
                                                        disabled={view === "view"}
                                                        className={cn(
                                                            "flex items-center justify-between p-2.5 rounded-lg border transition-all text-left group/btn",
                                                            isLead
                                                                ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400 shadow-sm"
                                                                : "bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                                                            <div className={cn(
                                                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                                                                isLead ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 group-hover/btn:bg-amber-100 group-hover/btn:text-amber-700"
                                                            )}>
                                                                {auditor.firstName[0]}{auditor.lastName[0]}
                                                            </div>
                                                            <span className={cn(
                                                                "text-sm font-semibold truncate transition-colors",
                                                                isLead ? "text-amber-950" : "text-slate-700 group-hover/btn:text-amber-900"
                                                            )}>
                                                                {auditor.firstName} {auditor.lastName}
                                                            </span>
                                                        </div>
                                                        {isLead ? (
                                                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                                                <Check className="w-3 h-3 text-white" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border border-slate-200 group-hover/btn:border-amber-300 shrink-0" />
                                                        )}
                                                    </button>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        {view !== "view" && (
                            <div className="px-6 pb-6">
                                <Button
                                    id="tour-step-generate-schedule"
                                    className={cn(
                                        "w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 h-auto rounded-lg font-semibold transition-all shadow-sm",
                                        tourHighlight(4),
                                    )}
                                    onClick={() => {
                                        handleGenerateSchedule();
                                        if (
                                            auditTourActive &&
                                            auditTourStep === 4 &&
                                            auditName &&
                                            selectedSite &&
                                            (criteriaType === "iso"
                                                ? selectedStandards.length > 0
                                                : moduleFamily === "eosh" || moduleFamily === "qfs-kore")
                                        ) {
                                            setAuditTourStep(5);
                                        }
                                    }}
                                >
                                    Generate Schedule
                                </Button>
                            </div>
                        )}
                    </Card>

                    {showSchedule && (
                        <div
                            ref={scheduleMatrixRef}
                            className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 scroll-mt-6"
                        >
                            {selectedDepartments.length > 0 && (
                                <Card className="border border-emerald-100 bg-emerald-50/30 shadow-sm">
                                    <CardContent className="p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-2">
                                            Departments in this program
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDepartments.map((dept) => (
                                                <Badge
                                                    key={dept.id}
                                                    className="bg-white border-emerald-200 text-slate-800 font-medium"
                                                >
                                                    {dept.name}
                                                    <span className="text-slate-400 font-normal ml-1">· {dept.siteName}</span>
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card
                                id="tour-step-program-timeline"
                                className={cn(
                                    "border-none shadow-sm overflow-hidden bg-white",
                                    tourHighlight(5),
                                )}
                            >
                                <CardHeader className="flex flex-row items-center gap-3 sm:gap-4 pb-2 p-4 sm:p-6">
                                    <div className="p-2 sm:p-2.5 bg-emerald-50 rounded-xl">
                                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Program Timeline</CardTitle>
                                        <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 flex items-center gap-1 sm:gap-2 mt-0.5">
                                            <span>{duration} Years</span> • <span>{frequency} Frequency</span> • <span>{periods.length} Periods</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-8 pb-10 relative overflow-x-auto scrollbar-thin pb-12">
                                    <div className="min-w-fit px-6">
                                        <div className="relative pt-4 pb-4">
                                            <div className="absolute top-[32px] left-0 right-0 h-[3px] bg-slate-100 z-0 rounded-full" />
                                            <div className="flex justify-between items-center relative z-10 gap-8">
                                                {periods.map((period, idx) => {
                                                    const dotActive = isPeriodActive(idx);
                                                    return (
                                                        <div key={idx} className="flex flex-col items-center gap-3 sm:gap-4 shrink-0">
                                                            <div className={cn(
                                                                "w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] rounded-full border-[2px] sm:border-[3px] border-white shadow-md ring-[4px] sm:ring-[6px] transition-all duration-300",
                                                                dotActive ? "bg-emerald-500 ring-emerald-50" : "bg-slate-300 ring-slate-50"
                                                            )} />
                                                            <div className="flex flex-col items-center">
                                                                <span className={cn(
                                                                    "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap",
                                                                    dotActive ? "text-emerald-600" : "text-slate-400"
                                                                )}>{period.label}</span>
                                                                <div className={cn(
                                                                    "mt-2 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm transition-all",
                                                                    dotActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                                                )}>
                                                                    {Object.keys(selectedCells).filter(k => k.endsWith(`-${idx}`) && selectedCells[k]).length}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <Badge variant="outline" className="px-4 py-1.5 rounded-full border-emerald-200 text-emerald-700 bg-white font-bold text-[10px] tracking-wide shadow-sm hover:bg-white transition-none uppercase w-fit">
                                        {criteriaType === "module" && moduleFamily === "eosh"
                                            ? `EOSH modules · ${selectedStandards.length}/${activeAuditModules.length} selected`
                                            : criteriaType === "module" && moduleFamily === "qfs-kore"
                                              ? `QFS KORE modules · ${selectedStandards.length}/${activeAuditModules.length} selected`
                                              : selectedStandards.length > 0
                                                ? selectedStandards.map(standardDisplayLabel).join(", ")
                                                : "ISO 9001:2015 - Quality Management System"}
                                    </Badge>
                                    {criteriaType === "module" && (moduleFamily === "eosh" || moduleFamily === "qfs-kore") && view !== "view" && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                            onClick={() => {
                                                const allSelected = activeAuditModules.every((m) =>
                                                    selectedStandards.includes(m.value),
                                                );
                                                if (allSelected) {
                                                    setSelectedStandards([]);
                                                    setSelectedCells((prev) => {
                                                        const next: Record<string, boolean> = {};
                                                        Object.keys(prev).forEach((key) => {
                                                            if (key.startsWith("custom_")) next[key] = prev[key];
                                                        });
                                                        return next;
                                                    });
                                                } else {
                                                    setSelectedStandards(activeAuditModules.map((m) => m.value));
                                                    setSelectedCells((prev) => {
                                                        const next = { ...prev };
                                                        activeAuditModules.forEach((_, rowIndex) => {
                                                            // Mark the first period/month for every module
                                                            next[`${rowIndex}-0`] = true;
                                                        });
                                                        return next;
                                                    });
                                                }
                                            }}
                                        >
                                            {activeAuditModules.every((m) => selectedStandards.includes(m.value))
                                                ? "Clear all modules"
                                                : "Select all modules"}
                                        </Button>
                                    )}
                                </div>

                                <div
                                    id="tour-step-schedule-matrix"
                                    className={cn(
                                        "overflow-x-auto scrollbar-thin border rounded-xl bg-white shadow-sm p-1 scroll-mt-6",
                                        tourHighlight(6),
                                    )}
                                >
                                    <table className="w-full text-left border-collapse min-w-max">
                                        <thead>
                                            <tr>
                                                {criteriaType === "module" ? (
                                                    <th
                                                        className={cn(
                                                            "bg-slate-100 h-10 px-3 sm:px-4 text-[10px] sm:text-[11px] font-black tracking-widest text-[#213847] border-b border-r border-slate-200 uppercase align-middle",
                                                            !isMobile && "sticky left-0 z-20",
                                                        )}
                                                        style={{ width: isMobile ? "180px" : "340px", minWidth: isMobile ? "180px" : "340px" }}
                                                    >
                                                        Audit Module
                                                    </th>
                                                ) : (
                                                    selectedStandards.map((std, colIdx) => {
                                                        const baseWidth = selectedStandards.length === 1 ? 350 : 180;
                                                        const colWidth = isMobile ? `${Math.min(baseWidth, 140)}px` : `${baseWidth}px`;
                                                        const leftOffset = colIdx * parseInt(colWidth);
                                                        const label = standardDisplayLabel(std);
                                                        return (
                                                            <th
                                                                key={std}
                                                                className={cn(
                                                                    "bg-slate-100 h-10 px-3 sm:px-4 text-[10px] sm:text-[11px] font-black tracking-widest text-[#213847] border-b border-r border-slate-200 uppercase align-middle",
                                                                    !isMobile && "sticky z-20",
                                                                )}
                                                                style={{ left: !isMobile ? `${leftOffset}px` : undefined, width: colWidth, minWidth: colWidth, maxWidth: colWidth }}
                                                            >
                                                                {label}
                                                            </th>
                                                        );
                                                    })
                                                )}

                                                {periods.map((p, i) => (
                                                    <th key={i} className="bg-white h-10 px-2 text-center text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100 align-middle min-w-[60px]">
                                                        {p.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {criteriaType === "module"
                                                ? activeAuditModules.map((mod, rowIndex) => {
                                                      const included = selectedStandards.includes(mod.value);
                                                      return (
                                                      <tr
                                                          key={mod.id}
                                                          className={cn(
                                                              "group transition-colors",
                                                              included ? "hover:bg-slate-50" : "hover:bg-slate-50/80",
                                                          )}
                                                      >
                                                          <td
                                                              className={cn(
                                                                  "text-[11px] py-2.5 px-4 border-r border-b border-slate-200 align-middle font-semibold text-slate-800 bg-white group-hover:bg-slate-50 leading-snug",
                                                                  !isMobile && "sticky left-0 z-10",
                                                              )}
                                                              style={{ width: isMobile ? "180px" : "340px", minWidth: isMobile ? "180px" : "340px" }}
                                                          >
                                                              {mod.label}
                                                          </td>
                                                          {periods.map((_, colIndex) => {
                                                              const cellKey = `${rowIndex}-${colIndex}`;
                                                              const isChecked = Boolean(selectedCells[cellKey]);
                                                              return (
                                                                  <td key={`mod-check-${rowIndex}-${colIndex}`} className="p-1 border-b border-slate-100 align-middle bg-white">
                                                                      <button
                                                                          type="button"
                                                                          onClick={() => {
                                                                              if (view === "view") return;
                                                                              const nextChecked = !isChecked;
                                                                              setSelectedCells((prev) => {
                                                                                  const next = { ...prev };
                                                                                  if (nextChecked) next[cellKey] = true;
                                                                                  else delete next[cellKey];

                                                                                  const stillHasMonth = periods.some(
                                                                                      (__, i) => Boolean(next[`${rowIndex}-${i}`]),
                                                                                  );
                                                                                  setSelectedStandards((stdPrev) => {
                                                                                      if (stillHasMonth) {
                                                                                          return stdPrev.includes(mod.value)
                                                                                              ? stdPrev
                                                                                              : [...stdPrev, mod.value];
                                                                                      }
                                                                                      return stdPrev.filter((s) => s !== mod.value);
                                                                                  });
                                                                                  return next;
                                                                              });
                                                                          }}
                                                                          disabled={view === "view"}
                                                                          className={cn(
                                                                              "w-full h-8 rounded-md border flex items-center justify-center transition-all duration-200",
                                                                              isChecked
                                                                                  ? "bg-emerald-100/80 border-emerald-400 border-2 text-emerald-600 shadow-sm shadow-emerald-500/10 hover:bg-emerald-200/80 cursor-pointer"
                                                                                  : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer hover:shadow-inner",
                                                                          )}
                                                                      >
                                                                          {isChecked && (
                                                                              <div className="animate-in zoom-in-75 duration-200">
                                                                                  <Check className="w-4 h-4 stroke-[4px]" />
                                                                              </div>
                                                                          )}
                                                                      </button>
                                                                  </td>
                                                              );
                                                          })}
                                                      </tr>
                                                      );
                                                  })
                                                : selectedStandards.length === 0
                                                ? (
                                                    <tr>
                                                        <td colSpan={Math.max(periods.length + 1, 2)} className="py-10 text-center text-sm text-slate-500">
                                                            Select ISO standard(s) above, then generate the schedule.
                                                        </td>
                                                    </tr>
                                                )
                                                : CLAUSE_MATRIX.map((clause, rowIndex) => {
                                                if (selectedStandards.length === 1 && !isMainClauseHeading(clause)) {
                                                    const text = clauseTextForStandard(clause, selectedStandards[0]);
                                                    if (text === "Corresponding Clause does not exist") {
                                                        return null;
                                                    }
                                                }

                                                return (
                                                    <tr key={clause.id} className="group hover:bg-slate-50 transition-colors">
                                                        {selectedStandards.map((std, colIdx) => {
                                                            const baseWidth = selectedStandards.length === 1 ? 350 : 180;
                                                            const colWidth = isMobile ? `${Math.min(baseWidth, 140)}px` : `${baseWidth}px`;
                                                            const leftOffset = colIdx * parseInt(colWidth);

                                                            const cellText = clauseTextForStandard(clause, std);
                                                            const isMissing = cellText === "Corresponding Clause does not exist";

                                                            return (
                                                                <td key={`${clause.id}-${std}`}
                                                                    className={cn(
                                                                        "text-[11px] py-3 px-4 border-r border-b border-slate-200 transition-colors align-middle",
                                                                        !isMobile && "sticky z-10",
                                                                        isMainClauseHeading(clause) ? "bg-[#213847] text-white font-black uppercase tracking-wide border-[#213847]" : "font-semibold text-slate-600 bg-white group-hover:bg-slate-50",
                                                                        !isMainClauseHeading(clause) && colIdx === 0 && "pl-6",
                                                                        isMissing && !isMainClauseHeading(clause) && "italic text-slate-400 bg-slate-50 group-hover:bg-slate-100"
                                                                    )}
                                                                    style={{ left: !isMobile ? `${leftOffset}px` : undefined, width: colWidth, minWidth: colWidth, maxWidth: colWidth }}
                                                                >
                                                                    {cellText}
                                                                </td>
                                                            );
                                                        })}

                                                        {periods.map((_, colIndex) => {
                                                            const isChecked = selectedCells[`${rowIndex}-${colIndex}`];
                                                            return (
                                                                <td key={`check-${colIndex}`}
                                                                    className={cn(
                                                                        "p-1 border-b border-slate-100 align-middle",
                                                                        isMainClauseHeading(clause) ? "bg-[#213847] border-[#213847]" : "bg-white"
                                                                    )}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleCell(rowIndex, colIndex)}
                                                                        disabled={view === "view"}
                                                                        className={cn(
                                                                            "w-full h-8 rounded-md border flex items-center justify-center transition-all duration-200",
                                                                            isChecked
                                                                                ? "bg-emerald-100/80 border-emerald-400 border-2 text-emerald-600 shadow-sm shadow-emerald-500/10 hover:bg-emerald-200/80 cursor-pointer"
                                                                                : isMainClauseHeading(clause)
                                                                                    ? "bg-white/5 border-white border-2 hover:border-emerald-400 hover:bg-emerald-50/20 cursor-pointer"
                                                                                    : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer hover:shadow-inner"
                                                                        )}
                                                                    >
                                                                        {isChecked && (
                                                                            <div className="animate-in zoom-in-75 duration-200">
                                                                                <Check className={cn("w-4 h-4 stroke-[4px]", isMainClauseHeading(clause) && "text-emerald-500")} />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                            {customRows.map((cRow) => (
                                                <tr key={cRow.id} className="group transition-colors bg-slate-50/30 hover:bg-slate-50">
                                                    <td
                                                        colSpan={criteriaType === "module" ? 1 : Math.max(selectedStandards.length, 1)}
                                                        className="text-[11px] py-1 border-b border-r border-slate-200 align-middle pl-6 pr-2 bg-white group-hover:bg-slate-50"
                                                    >
                                                        <div className="flex items-center gap-2 sticky left-0 w-max max-w-full z-10">
                                                            <Input
                                                                value={cRow.text}
                                                                onChange={(e) => setCustomRows(prev => prev.map(r => r.id === cRow.id ? { ...r, text: e.target.value } : r))}
                                                                className="h-8 text-[11px] bg-white border-slate-200 placeholder:text-slate-400 w-[500px] font-semibold italic text-slate-600"
                                                                placeholder="Enter custom requirement..."
                                                                disabled={view === "view"}
                                                            />
                                                            {view !== "view" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setCustomRows(prev => prev.filter(r => r.id !== cRow.id));
                                                                        setSelectedCells(prev => {
                                                                            const next = { ...prev };
                                                                            Object.keys(next).forEach((key) => {
                                                                                if (key.startsWith(`custom_${cRow.id}-`)) {
                                                                                    delete next[key];
                                                                                }
                                                                            });
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50 flex-shrink-0"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {periods.map((_, colIndex) => {
                                                        const isChecked = selectedCells[`custom_${cRow.id}-${colIndex}`];
                                                        return (
                                                            <td
                                                                key={`custom-check-${cRow.id}-${colIndex}`}
                                                                className="p-1 border-b border-slate-100 align-middle bg-white group-hover:bg-slate-50"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleCell(`custom_${cRow.id}`, colIndex)}
                                                                    disabled={view === "view"}
                                                                    className={cn(
                                                                        "w-full h-8 rounded-md border flex items-center justify-center transition-all duration-200",
                                                                        isChecked
                                                                            ? "bg-emerald-100/80 border-emerald-400 border-2 text-emerald-600 shadow-sm shadow-emerald-500/10 hover:bg-emerald-200/80 cursor-pointer"
                                                                            : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer hover:shadow-inner",
                                                                    )}
                                                                >
                                                                    {isChecked && (
                                                                        <div className="animate-in zoom-in-75 duration-200">
                                                                            <Check className="w-4 h-4 stroke-[4px]" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {view !== "view" && (
                                    <div className="pt-2 flex justify-start">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-dashed border-slate-300 text-slate-600 hover:text-[#213847] hover:border-[#213847] hover:bg-slate-50 transition-colors w-full sm:w-auto font-medium"
                                            onClick={() => setCustomRows(prev => [...prev, { id: Date.now().toString(), text: "" }])}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Custom Requirement
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {selectedClausesList.length > 0 && (
                                <div className="space-y-4 pt-10 border-t border-slate-200">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        Selected Audit Schedule
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {selectedClausesList.map((item, idx) => (
                                            <Card key={idx} className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                                                <div className="h-1 bg-emerald-500 w-0 group-hover:w-full transition-all duration-500" />
                                                <CardContent className="p-4">
                                                    <div className="text-[12px] font-bold text-slate-800 leading-tight mb-3">
                                                        {criteriaType === "module" ? (
                                                            <span className="text-slate-700 font-semibold">
                                                                {item.clause.iso9001}
                                                            </span>
                                                        ) : (
                                                            selectedStandards.map(std => {
                                                                const cellText = clauseTextForStandard(item.clause, std);
                                                                if (cellText === "Corresponding Clause does not exist") return null;

                                                                const label = standardBadgeLabel(std);

                                                                return (
                                                                    <div key={std} className="mb-1 pb-1 border-b border-slate-50 last:border-0">
                                                                        <span className="text-[9px] uppercase font-black text-emerald-600 mr-2 bg-emerald-50 px-1 rounded">{label}</span>
                                                                        <span className="text-slate-700 font-semibold">{cellText}</span>
                                                                    </div>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.periods.map(p => (
                                                            <Badge key={p} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 text-[9px] font-bold tracking-wider">
                                                                {p}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {view !== "view" && (
                                <div className="pt-10 flex justify-end">
                                    <Button
                                        id="tour-step-save-program"
                                        className={cn(
                                            "bg-slate-900 hover:bg-slate-800 text-white px-10 py-6 h-auto rounded-xl font-bold text-lg gap-3 shadow-lg hover:shadow-xl transition-all active:scale-95",
                                            tourHighlight(7),
                                        )}
                                        onClick={handleSaveProgram}
                                        disabled={loading || selectedClausesList.length === 0}
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-6 h-6" />
                                                {view === "edit" ? "Update Program" : "Create Program"}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {auditTourActive && auditTourStepConfig && (
                <TourStepPopover
                    key={auditTourStep}
                    targetId={auditTourStepConfig.targetId}
                    step={auditTourStep}
                    totalSteps={AUDIT_TOUR_TOTAL_STEPS}
                    title={auditTourStepConfig.title}
                    description={auditTourStepConfig.description}
                    position={auditTourStepConfig.position}
                    onNext={handleAuditTourNext}
                    onBack={handleAuditTourBack}
                    hideNext={auditTourStep === 7}
                    onClose={() => {
                        exitAuditTour();
                        navigate("/getting-started");
                    }}
                />
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the audit program
                            and remove all associated schedule data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setDeleteId(null); }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProgram} className="bg-red-600 hover:bg-red-700 text-white">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AuditPrograms;
