import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AlertTriangle, RefreshCw, SearchX, Search, Upload, Eye, Download, FileText } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    extractFindings,
    findingActionByDisplay,
    isNcFindingType,
    mergeFindingWithOverrides,
    TYPE_CONFIG,
    type Finding,
    type FindingStatus,
    type FindingType,
} from "@/lib/auditFindings";
import { FindingStatusBadge } from "@/components/FindingDetailView";
import ReusablePagination from "@/components/ReusablePagination";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, HeadingLevel, AlignmentType, ImageRun, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { TourStepPopover } from "@/components/TourStepPopover";
import {
    AUDIT_FINDINGS_TOUR_TOTAL_STEPS,
    getAuditFindingsTourStepConfig,
} from "@/lib/auditFindingsOnboardingTour";
import { cn } from "@/lib/utils";
import {
    dataUrlToUint8Array,
    embedPreparedImagesInJsPdf,
    findingMediaToReportSources,
    prepareReportEvidenceImages,
} from "@/lib/reportEvidenceImages";
import { isAuditeeRole } from "@/lib/userRoles";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function canViewAllOrgFindings(role?: string) {
    const normalized = String(role ?? "").trim().toLowerCase();
    return ["superadmin", "admin", "auditor", "lead_auditor"].includes(normalized);
}

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

function isFindingAssignedToMe(finding: Finding, email: string) {
    return Boolean(email && findingAssigneeEmail(finding) === email);
}

function isFindingRaisedByMe(
    finding: Finding,
    email: string,
    viewerId: number | null,
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

type OwnershipTab = "assigned" | "raised";

// ─── Component ────────────────────────────────────────────────────────────────

type FilterType = "All" | FindingType;
type StatusFilter = "All" | FindingStatus;

const FILTERS: FilterType[] = ["All", "OFI", "Minor", "Major"];

const STATUS_FILTERS: StatusFilter[] = [
    "All",
    "Opened",
    "New Response",
    "Accepted",
    "Closed",
];

const FILTER_STYLE: Record<FilterType, string> = {
    All: "bg-slate-800 text-white hover:bg-slate-700",
    OFI: "bg-amber-500 text-white hover:bg-amber-600",
    Minor: "bg-orange-600 text-white hover:bg-orange-700",
    Major: "bg-red-600 text-white hover:bg-red-700",
};

const FILTER_INACTIVE = "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";

function findingMatchesStatusFilter(finding: Finding, statusFilter: StatusFilter): boolean {
    if (statusFilter === "All") return true;
    if (statusFilter === "New Response") {
        return finding.status === "New Response" || finding.status === "Responded";
    }
    return finding.status === statusFilter;
}

export default function AuditFindings() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const auditFindingsTourActive = searchParams.get("auditFindingsTour") === "true";
    const auditFindingsTourStep = Math.min(
        AUDIT_FINDINGS_TOUR_TOTAL_STEPS,
        Math.max(1, parseInt(searchParams.get("auditFindingsStep") || "1", 10)),
    );
    const auditFindingsTourStepConfig =
        getAuditFindingsTourStepConfig(auditFindingsTourStep);

    const setAuditFindingsTourStep = (step: number) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("auditFindingsTour", "true");
                next.set("auditFindingsStep", String(step));
                return next;
            },
            { replace: true },
        );
    };

    const exitAuditFindingsTour = () => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("auditFindingsTour");
                next.delete("auditFindingsStep");
                return next;
            },
            { replace: true },
        );
    };

    const tourFindingsHighlight = (step: number) =>
        auditFindingsTourActive && auditFindingsTourStep === step
            ? "relative z-[60] ring-[4px] ring-emerald-500/80 ring-offset-2 rounded-xl"
            : "";

    const handleAuditFindingsTourNext = () => {
        if (auditFindingsTourStep >= AUDIT_FINDINGS_TOUR_TOTAL_STEPS) {
            exitAuditFindingsTour();
            navigate("/getting-started");
            toast.success("Findings tour complete!");
            return;
        }
        setAuditFindingsTourStep(auditFindingsTourStep + 1);
    };

    const handleAuditFindingsTourBack = () => {
        if (auditFindingsTourStep <= 1) {
            exitAuditFindingsTour();
            navigate("/getting-started");
            return;
        }
        setAuditFindingsTourStep(auditFindingsTourStep - 1);
    };

    const [findings, setFindings] = useState<Finding[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerEmail, setViewerEmail] = useState("");
    const [viewerId, setViewerId] = useState<number | null>(null);
    const [viewerSeesAll, setViewerSeesAll] = useState(true);
    const [isAuditeeViewer, setIsAuditeeViewer] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>("All");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
    const [ownershipTab, setOwnershipTab] = useState<OwnershipTab>(() =>
        searchParams.get("tab") === "raised" ? "raised" : "assigned",
    );
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchFindings = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                setLoading(false);
                return;
            }
            const user = JSON.parse(userStr);
            const userEmail = String(user.email || "").toLowerCase().trim();
            const parsedViewerId = Number(user.id ?? user._id);
            const isAuditee = isAuditeeRole(user.role);
            setViewerEmail(userEmail);
            setViewerId(Number.isInteger(parsedViewerId) && parsedViewerId > 0 ? parsedViewerId : null);
            setViewerSeesAll(canViewAllOrgFindings(user.role));
            setIsAuditeeViewer(isAuditee);
            console.log("Fetching findings for user:", user.email, "UID:", user.id || user._id);

            const isSuperAdmin = user.role === 'superadmin';
            const seesAll = canViewAllOrgFindings(user.role);

            const planById = new Map<number, any>();

            const addPlans = (rows: any[]) => {
                if (!Array.isArray(rows)) return;
                rows.forEach((plan) => {
                    if (plan?.id != null) planById.set(Number(plan.id), plan);
                });
            };

            if (isSuperAdmin) {
                const res = await apiFetch(`/audit-plans?scope=all&includeData=true`);
                if (!res.ok) throw new Error("API call failed");
                addPlans(await res.json());
            } else if (isAuditee) {
                const [plansRes, assignedRes] = await Promise.all([
                    apiFetch(`/audit-plans?includeData=true`),
                    apiFetch(`/assigned-audit-findings`),
                ]);
                if (plansRes.ok) addPlans(await plansRes.json());
                if (assignedRes.ok) addPlans(await assignedRes.json());
            } else {
                const requests: Promise<Response>[] = [
                    apiFetch(`/assigned-audit-findings`),
                ];
                if (seesAll) {
                    requests.push(apiFetch(`/audit-plans?scope=org&includeData=true`));
                }

                const responses = await Promise.all(requests);
                for (const res of responses) {
                    if (res.ok) {
                        addPlans(await res.json());
                    }
                }
            }

            const plans = Array.from(planById.values());
            console.log("Retrieved plans count:", plans.length);
            if (plans.length > 0) {
                console.log("SAMPLE PLAN 0 auditData:", plans[0].auditName, plans[0].auditData);
            }

            const all: Finding[] = [];

            if (Array.isArray(plans)) {
                plans.forEach((plan) => {
                    const baseFindings = extractFindings(plan);
                    if (baseFindings.length > 0) {
                        console.log(`Extracted ${baseFindings.length} findings from Plan #${plan.id} (${plan.auditName})`);
                    }
                    const overrides = plan.findingsData
                        ? typeof plan.findingsData === "string"
                            ? JSON.parse(plan.findingsData)
                            : plan.findingsData
                        : {};

                    const merged = baseFindings.map((f) =>
                        mergeFindingWithOverrides(f, overrides),
                    );

                    all.push(...merged);
                });
                const visible =
                    seesAll || isSuperAdmin
                        ? all
                        : all.filter(
                              (f) =>
                                  isFindingAssignedToMe(f, userEmail) ||
                                  isFindingRaisedByMe(
                                      f,
                                      userEmail,
                                      Number.isInteger(parsedViewerId) && parsedViewerId > 0
                                          ? parsedViewerId
                                          : null,
                                  ),
                          );
                setFindings(visible);
            }
        } catch (error) {
            console.error("Fetch findings error:", error);
            setFindings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFindings();
    }, []);

    const ownershipFindings = useMemo(() => findings.filter((f) =>
        ownershipTab === "assigned"
            ? isFindingAssignedToMe(f, viewerEmail)
            : isFindingRaisedByMe(f, viewerEmail, viewerId),
    ), [findings, ownershipTab, viewerEmail, viewerId]);

    const assignedCount = useMemo(() => findings.filter((f) =>
        isFindingAssignedToMe(f, viewerEmail),
    ).length, [findings, viewerEmail]);
    const raisedCount = useMemo(() => findings.filter((f) =>
        isFindingRaisedByMe(f, viewerEmail, viewerId),
    ).length, [findings, viewerEmail, viewerId]);

    const searchedFindings = useMemo(() => ownershipFindings.filter((f) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const haystack = [
            f.auditName,
            f.details,
            f.description,
            f.clauseRef,
            f.evidence,
            f.findingDetails,
            f.correction,
            f.rootCause,
            f.correctiveAction,
            f.actionBy,
            f.assignTo,
            f.assignToEmail,
            f.assignToName,
            f.raisedBy,
            f.raisedByName,
            f.raisedByEmail,
            f.moduleName,
            f.status,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return haystack.includes(query);
    }), [ownershipFindings, searchQuery]);

    const filteredByType = useMemo(() => activeFilter === "All"
        ? searchedFindings
        : searchedFindings.filter((f) => f.type === activeFilter),
    [searchedFindings, activeFilter]);

    const filtered = useMemo(() => filteredByType.filter((f) =>
        findingMatchesStatusFilter(f, statusFilter),
    ), [filteredByType, statusFilter]);

    const countOf = (type: FindingType) =>
        searchedFindings.filter((f) => f.type === type).length;

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const paginatedFindings = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeFilter, statusFilter, ownershipTab, itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const exportToPDF = async () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setTextColor(33, 56, 71);
        doc.text("Audit Findings Report", 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

        const tableData = filtered.map((f, i) => [
            i + 1,
            f.auditName,
            f.clauseRef,
            f.type,
            f.details,
            f.status,
            findingActionByDisplay(f)
        ]);

        autoTable(doc, {
            startY: 35,
            head: [["#", "Audit Name", "Clause", "Type", "Finding Details", "Status", "Action By"]],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [33, 56, 71] },
        });

        const attachmentSources = filtered.flatMap((finding) =>
            findingMediaToReportSources(
                finding.media,
                `${finding.clauseRef} — ${finding.auditName}`,
            ),
        );
        const attachmentVisuals = await prepareReportEvidenceImages(attachmentSources);

        if (attachmentVisuals.length > 0) {
            const startY = ((doc as any).lastAutoTable?.finalY ?? 35) + 16;
            embedPreparedImagesInJsPdf(doc, attachmentVisuals, startY, {
                sectionTitle: "FINDING ATTACHMENTS",
                introText:
                    "Photos and PDF pages from finding evidence (compressed for download).",
            });
        }

        doc.save("Audit_Findings.pdf");
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filtered.map(f => ({
            "Audit Name": f.auditName,
            "Clause": f.clauseRef,
            "Type": f.type,
            "Finding Details": f.details,
            "Status": f.status,
            "Action By": findingActionByDisplay(f),
            "Raised By": f.raisedByName || f.raisedBy || "",
            "Target Date": f.closeDate,
            "Assigned To": f.assignTo
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Findings");
        XLSX.writeFile(workbook, "Audit_Findings.xlsx");
    };

    const exportToWord = async () => {
        const tableRows = filtered.map(f => new DocxTableRow({
            children: [
                new DocxTableCell({ children: [new Paragraph(f.auditName)] }),
                new DocxTableCell({ children: [new Paragraph(f.clauseRef)] }),
                new DocxTableCell({ children: [new Paragraph(f.type)] }),
                new DocxTableCell({ children: [new Paragraph(f.details)] }),
                new DocxTableCell({ children: [new Paragraph(f.status)] }),
                new DocxTableCell({ children: [new Paragraph(findingActionByDisplay(f) || "—")] }),
            ]
        }));

        const mainContent: any[] = [
            new Paragraph({
                text: "Audit Findings Report",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: "" }),
            new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new DocxTableRow({
                        children: ["Audit Name", "Clause", "Type", "Details", "Status", "Action By"].map(h =>
                            new DocxTableCell({
                                children: [new Paragraph({
                                    children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })]
                                })],
                                shading: { fill: "213847" }
                            })
                        )
                    }),
                    ...tableRows
                ]
            }),
            new Paragraph({ text: "" })
        ];

        for (const f of filtered) {
            const sources = findingMediaToReportSources(
                f.media,
                `${f.clauseRef} — ${f.auditName}`,
            );
            if (sources.length === 0) continue;

            mainContent.push(new Paragraph({
                text: `Attachments for ${f.clauseRef}:`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400 }
            }));

            const visuals = await prepareReportEvidenceImages(sources);
            for (const img of visuals) {
                try {
                    const buffer = dataUrlToUint8Array(img.dataUrl);
                    mainContent.push(new Paragraph({
                        children: [
                            new TextRun({ text: `${img.context} — ${img.name}`, bold: true }),
                        ],
                        spacing: { after: 120 },
                    }));
                    mainContent.push(new Paragraph({
                        children: [
                            new ImageRun({
                                data: buffer,
                                transformation: {
                                    width: Math.min(520, img.widthPx),
                                    height: Math.round(
                                        (Math.min(520, img.widthPx) * img.heightPx) / img.widthPx,
                                    ),
                                },
                            }),
                        ],
                        spacing: { after: 240 },
                    }));
                } catch (e) {
                    console.error("Failed to add attachment to Word export", img.name, e);
                }
            }
        }

        const doc = new Document({
            sections: [{ children: mainContent }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, "Audit_Findings.docx");
    };

    return (
        <div className="flex-1 p-8 pt-6 bg-white min-h-screen relative">
            {auditFindingsTourActive && (
                <div className="fixed inset-0 bg-slate-900/10 z-[40] pointer-events-none" />
            )}
            <div className="max-w-6xl mx-auto space-y-6 pb-16">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                            Audit Findings
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {ownershipTab === "assigned"
                                ? "Findings assigned to you for action."
                                : "Findings you raised during audits."}
                        </p>
                    </div>
                    {filtered.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2 rounded-xl border-slate-200">
                                    <Download className="w-4 h-4" />
                                    Download
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => void exportToPDF()} className="gap-2 cursor-pointer">
                                    <FileText className="w-4 h-4 text-red-500" /> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
                                    <FileText className="w-4 h-4 text-emerald-500" /> Download Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void exportToWord()} className="gap-2 cursor-pointer">
                                    <FileText className="w-4 h-4 text-blue-500" /> Download Word
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <div
                    id="tour-step-findings-summary"
                    className={cn(
                        "grid grid-cols-3 gap-4",
                        tourFindingsHighlight(2),
                    )}
                >
                    {(["OFI", "Minor", "Major"] as const).map((type) => {
                        const label = type === "OFI" ? "OFI" : type === "Minor" ? "Minor N/C" : "Major N/C";
                        const accent = type === "OFI" ? "amber" : type === "Minor" ? "orange" : "red";
                        return (
                            <button
                                key={type}
                                onClick={() => setActiveFilter(type)}
                                className={`rounded-xl border p-5 text-left transition-all shadow-sm cursor-pointer
                    ${activeFilter === type ? `border-${accent}-400 ring-2 ring-${accent}-200 bg-${accent}-50` : "border-slate-200 bg-white hover:bg-slate-50"}`}
                            >
                                <span className={`text-xs font-bold uppercase tracking-widest text-${accent}-600`}>{label}</span>
                                <div className={`text-4xl font-extrabold mt-1 text-${accent}-600`}>{countOf(type)}</div>
                                <div className="text-xs text-slate-500 mt-1">findings</div>
                            </button>
                        );
                    })}
                </div>

                <div
                    id="tour-step-findings-filters"
                    className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                        tourFindingsHighlight(3),
                    )}
                >
                    <div className="flex gap-2 flex-wrap">
                        {FILTERS.map((f) => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm ${activeFilter === f ? FILTER_STYLE[f] : FILTER_INACTIVE}`}
                            >
                                {f === "All" ? `All (${searchedFindings.length})` :
                                    f === "Minor" ? `Minor N/C (${countOf(f)})` :
                                        f === "Major" ? `Major N/C (${countOf(f)})` :
                                            `OFI (${countOf(f)})`}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <Select
                            value={statusFilter}
                            onValueChange={(value) =>
                                setStatusFilter(value as StatusFilter)
                            }
                        >
                            <SelectTrigger
                                className="h-10 w-full sm:w-[180px] rounded-xl border-slate-200 bg-white shadow-sm"
                                aria-label="Filter by status"
                            >
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_FILTERS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status === "All" ? "All statuses" : status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="relative w-full sm:w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search findings, audits, clauses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-white border-slate-200 h-10 rounded-xl focus-visible:ring-amber-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Tabs
                        value={ownershipTab}
                        onValueChange={(value) =>
                            setOwnershipTab(value === "raised" ? "raised" : "assigned")
                        }
                        className="w-full"
                    >
                        <TabsList className="h-11 w-full sm:w-auto grid grid-cols-2 sm:inline-flex bg-slate-100 p-1 rounded-full">
                            <TabsTrigger
                                value="assigned"
                                className="rounded-full px-5 data-[state=active]:bg-white data-[state=active]:text-[#213847] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[#1e855e]"
                            >
                                Assign to me
                                <span className="ml-1.5 text-xs font-bold text-slate-500">
                                    ({assignedCount})
                                </span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="raised"
                                className="rounded-full px-5 data-[state=active]:bg-white data-[state=active]:text-[#213847] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[#1e855e]"
                            >
                                Raised by me
                                <span className="ml-1.5 text-xs font-bold text-slate-500">
                                    ({raisedCount})
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                {loading ? (
                    <div
                        id="tour-step-findings-list"
                        className={cn(
                            "flex items-center justify-center py-24 text-slate-400 text-sm gap-2 min-h-[200px]",
                            tourFindingsHighlight(4),
                        )}
                    >
                        <RefreshCw className="w-5 h-5 animate-spin" /> Loading findings…
                    </div>
                ) : filtered.length === 0 ? (
                    <div
                        id="tour-step-findings-list"
                        className={cn(
                            "flex flex-col items-center justify-center py-24 text-slate-400 gap-3 min-h-[200px] rounded-xl border border-slate-200 bg-slate-50/50",
                            tourFindingsHighlight(4),
                        )}
                    >
                        <SearchX className="w-12 h-12 opacity-40" />
                        <p className="text-base font-semibold">No findings found</p>
                        <p className="text-sm text-slate-400 max-w-md text-center">
                            {ownershipTab === "assigned"
                                ? viewerEmail
                                    ? "When someone assigns a finding to your email, it will appear here."
                                    : "Findings assigned to your account will appear here."
                                : "Findings you raise (Raised by) during an audit will appear here."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div
                            id="tour-step-findings-list"
                            className={cn(
                                "rounded-xl border border-slate-200 overflow-hidden shadow-sm",
                                tourFindingsHighlight(4),
                            )}
                        >
                            <Table>
                                <TableHeader className="bg-[#213847]">
                                    <TableRow className="hover:bg-slate-800 divide-x divide-slate-600">
                                        <TableHead className="text-white font-bold w-12 text-center">#</TableHead>
                                        <TableHead className="text-white font-bold w-[22%]">Audit Name</TableHead>
                                        <TableHead className="text-white font-bold w-[14%]">Clause / Item</TableHead>
                                        <TableHead className="text-white font-bold w-[10%]">Type</TableHead>
                                        <TableHead className="text-white font-bold w-[12%]">Status</TableHead>
                                        <TableHead className="text-white font-bold w-[14%]">Action By</TableHead>
                                        <TableHead className="text-white font-bold w-16 text-center">View</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedFindings.map((finding, idx) => {
                                        const cfg = TYPE_CONFIG[finding.type];
                                        const isNc = isNcFindingType(finding.type);
                                        const assignedToMe = isFindingAssignedToMe(
                                            finding,
                                            viewerEmail,
                                        );
                                        return (
                                            <TableRow
                                                key={`${finding.auditId}-${finding.id}-${idx}`}
                                                className="bg-white hover:bg-slate-50 transition-colors divide-x divide-slate-100 align-top"
                                            >
                                                <TableCell className="text-center text-slate-500 font-medium text-sm py-3">
                                                    {(currentPage - 1) * itemsPerPage + idx + 1}
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-800 text-sm py-3">
                                                    {finding.auditName}
                                                </TableCell>
                                                <TableCell className="text-slate-800 text-sm font-medium py-3">
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        <div className="min-w-0">
                                                            {finding.moduleName ? (
                                                                <>
                                                                    <p
                                                                        className="font-semibold text-slate-900 truncate"
                                                                        title={finding.moduleName}
                                                                    >
                                                                        {finding.moduleName}
                                                                    </p>
                                                                    {(() => {
                                                                        const prefix = `${finding.moduleName} · `;
                                                                        const itemPart =
                                                                            finding.clauseRef.startsWith(
                                                                                prefix,
                                                                            )
                                                                                ? finding.clauseRef.slice(
                                                                                      prefix.length,
                                                                                  )
                                                                                : "";
                                                                        return itemPart ? (
                                                                            <p
                                                                                className="text-xs text-slate-500 truncate mt-0.5"
                                                                                title={itemPart}
                                                                            >
                                                                                {itemPart}
                                                                            </p>
                                                                        ) : null;
                                                                    })()}
                                                                </>
                                                            ) : (
                                                                <span className="truncate block">
                                                                    {finding.clauseRef}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {finding.media && finding.media.length > 0 && (
                                                            <span
                                                                title={`${finding.media.length} attachments`}
                                                                className="shrink-0 mt-0.5"
                                                            >
                                                                <Upload className="w-3 h-3 text-amber-500" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <span
                                                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <FindingStatusBadge status={finding.status} />
                                                </TableCell>
                                                <TableCell className="text-slate-600 text-sm font-medium py-3">
                                                    {(() => {
                                                        const raw =
                                                            finding.raisedByName?.trim() ||
                                                            finding.raisedBy?.trim() ||
                                                            findingActionByDisplay(finding);
                                                        const name = raw
                                                            .replace(/\s*\([^)]*@[^)]*\)\s*$/, "")
                                                            .trim();
                                                        return name ? (
                                                            <p className="truncate" title={name}>
                                                                {name}
                                                            </p>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-center py-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title={
                                                            isNc && assignedToMe
                                                                ? "View finding details"
                                                                : isAuditeeViewer
                                                                  ? "View audit (read-only)"
                                                                  : viewerSeesAll
                                                                    ? "Open in audit"
                                                                    : "Complete finding"
                                                        }
                                                        onClick={() =>
                                                            navigate(
                                                                {
                                                                    pathname: `/audit-findings/${finding.auditId}/${encodeURIComponent(finding.id)}`,
                                                                    search:
                                                                        isNc && assignedToMe
                                                                            ? "?respond=1"
                                                                            : "",
                                                                },
                                                                {
                                                                    state: {
                                                                        returnTab: ownershipTab,
                                                                    },
                                                                },
                                                            )
                                                        }
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-[#213847]"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2 px-1">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="font-medium">Rows per page</span>
                                <Select
                                    value={String(itemsPerPage)}
                                    onValueChange={(value) =>
                                        setItemsPerPage(Number(value) || 10)
                                    }
                                >
                                    <SelectTrigger className="h-9 w-[88px] rounded-xl border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <ReusablePagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filtered.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                className="mt-0 pt-0 border-t-0 w-full sm:w-auto"
                            />
                        </div>

                    </>
                )}
                </div>
            </div>

            {auditFindingsTourActive && auditFindingsTourStepConfig && (
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
                />
            )}

        </div>
    );
}
