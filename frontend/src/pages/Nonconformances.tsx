import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Eye,
    RefreshCw,
    Search,
    AlertTriangle,
    LayoutList,
    CircleDot,
    Clock3,
    RotateCcw,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import ReusablePagination from "@/components/ReusablePagination";
import { cn } from "@/lib/utils";
import {
    formatNcDate,
    formatNcStatusLabel,
    formatNcUserLabel,
    listNonconformances,
    NC_SEVERITY_OPTIONS,
    NC_STATUS_OPTIONS,
    type NonconformanceStatus,
    type NonconformanceSummary,
} from "@/lib/nonconformanceApi";

const SEVERITY_BADGE: Record<string, string> = {
    Minor: "bg-orange-100 text-orange-800 ring-orange-200",
    Major: "bg-red-100 text-red-800 ring-red-200",
};

const STATUS_BADGE: Record<string, string> = {
    ASSIGNED: "bg-sky-50 text-sky-700 ring-sky-200",
    RESPONSE_SUBMITTED: "bg-amber-50 text-amber-800 ring-amber-200",
    CHANGES_REQUESTED: "bg-orange-50 text-orange-800 ring-orange-200",
    CLOSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

type StatusSummaryKey = "all" | NonconformanceStatus;

const STATUS_SUMMARY: {
    key: StatusSummaryKey;
    label: string;
    hint: string;
    icon: typeof LayoutList;
    active: string;
    text: string;
    iconWrap: string;
}[] = [
    {
        key: "all",
        label: "Total",
        hint: "All nonconformances",
        icon: LayoutList,
        active: "border-slate-400 ring-2 ring-slate-200 bg-slate-50",
        text: "text-slate-700",
        iconWrap: "bg-slate-100 text-slate-600",
    },
    {
        key: "ASSIGNED",
        label: "Opened",
        hint: "Assigned, awaiting response",
        icon: CircleDot,
        active: "border-sky-400 ring-2 ring-sky-200 bg-sky-50",
        text: "text-sky-700",
        iconWrap: "bg-sky-100 text-sky-700",
    },
    {
        key: "RESPONSE_SUBMITTED",
        label: "Pending Review",
        hint: "Response submitted",
        icon: Clock3,
        active: "border-amber-400 ring-2 ring-amber-200 bg-amber-50",
        text: "text-amber-800",
        iconWrap: "bg-amber-100 text-amber-800",
    },
    {
        key: "CHANGES_REQUESTED",
        label: "Changes Requested",
        hint: "Needs revision",
        icon: RotateCcw,
        active: "border-orange-400 ring-2 ring-orange-200 bg-orange-50",
        text: "text-orange-800",
        iconWrap: "bg-orange-100 text-orange-800",
    },
    {
        key: "CLOSED",
        label: "Closed",
        hint: "Approved and closed",
        icon: CheckCircle2,
        active: "border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50",
        text: "text-emerald-700",
        iconWrap: "bg-emerald-100 text-emerald-700",
    },
];

export default function Nonconformances() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<NonconformanceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listNonconformances();
            setRows(data);
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Failed to load nonconformances");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchRows();
    }, [fetchRows]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, severityFilter]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return rows.filter((row) => {
            if (statusFilter !== "all" && String(row.status) !== statusFilter) return false;
            if (severityFilter !== "all" && String(row.severity) !== severityFilter) return false;
            if (!q) return true;
            const haystack = [
                row.ncNumber,
                row.findingTitle,
                row.findingDescription,
                row.severity,
                row.status,
                formatNcUserLabel(row.assignee),
                row.auditPlan?.auditName,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [rows, searchQuery, statusFilter, severityFilter]);

    const statusCounts = useMemo(() => {
        const counts: Record<StatusSummaryKey, number> = {
            all: rows.length,
            ASSIGNED: 0,
            RESPONSE_SUBMITTED: 0,
            CHANGES_REQUESTED: 0,
            CLOSED: 0,
        };
        for (const row of rows) {
            const status = String(row.status ?? "").trim().toUpperCase() as NonconformanceStatus;
            if (status in counts && status !== "all") {
                counts[status] += 1;
            }
        }
        return counts;
    }, [rows]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const page = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="h-full bg-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            Nonconformances
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Track raised nonconformances from Minor and Major findings
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void fetchRows()}
                        disabled={loading}
                        className="gap-1.5 rounded-xl h-11 px-5 border-slate-200"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
                    {STATUS_SUMMARY.map((item) => {
                        const Icon = item.icon;
                        const isActive = statusFilter === item.key;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setStatusFilter(item.key)}
                                className={cn(
                                    "rounded-xl border p-4 text-left transition-all shadow-sm",
                                    isActive
                                        ? item.active
                                        : "border-slate-200 bg-white hover:bg-slate-50",
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className={cn("text-[11px] font-bold uppercase tracking-widest", item.text)}>
                                        {item.label}
                                    </span>
                                    <span className={cn("rounded-lg p-1.5 shrink-0", item.iconWrap)}>
                                        <Icon className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                                <div className={cn("text-3xl font-extrabold mt-2 tabular-nums", item.text)}>
                                    {loading ? "—" : statusCounts[item.key]}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 leading-snug">{item.hint}</div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by NC number, finding, assignee..."
                            className="pl-11 h-12 rounded-2xl border-slate-200 bg-white shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[200px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Statuses</SelectItem>
                                {NC_STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {formatNcStatusLabel(status)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={severityFilter} onValueChange={setSeverityFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm">
                                <SelectValue placeholder="All Severities" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">All Severities</SelectItem>
                                {NC_SEVERITY_OPTIONS.map((severity) => (
                                    <SelectItem key={severity} value={severity}>
                                        {severity}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-[#213847] hover:bg-[#213847] border-none">
                                    <TableHead className="text-white pl-6">NC Number</TableHead>
                                    <TableHead className="text-white">Finding</TableHead>
                                    <TableHead className="text-white">Severity</TableHead>
                                    <TableHead className="text-white">Assigned To</TableHead>
                                    <TableHead className="text-white">Status</TableHead>
                                    <TableHead className="text-white">Due Date</TableHead>
                                    <TableHead className="text-white">Created Date</TableHead>
                                    <TableHead className="text-right text-white pr-6">View</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            Loading nonconformances...
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center py-10">
                                                <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                                <p className="text-sm text-muted-foreground">
                                                    No nonconformances found
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginated.map((row) => (
                                        <TableRow key={row.id} className="hover:bg-muted/50">
                                            <TableCell className="pl-6 font-semibold text-[#213847]">
                                                {row.ncNumber}
                                            </TableCell>
                                            <TableCell className="max-w-[240px]">
                                                <span className="line-clamp-2 text-sm text-slate-700">
                                                    {row.findingTitle || "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={`ring-1 border-none ${
                                                        SEVERITY_BADGE[String(row.severity)] ||
                                                        "bg-slate-100 text-slate-700"
                                                    }`}
                                                >
                                                    {row.severity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-700">
                                                {formatNcUserLabel(row.assignee)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={`ring-1 border-none ${
                                                        STATUS_BADGE[String(row.status)] ||
                                                        "bg-slate-100 text-slate-700"
                                                    }`}
                                                >
                                                    {formatNcStatusLabel(row.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {formatNcDate(row.dueDate)}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {formatNcDate(row.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-[#213847]"
                                                    title="View nonconformance"
                                                    onClick={() => navigate(`/nonconformances/${row.id}`)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <ReusablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={filtered.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}
