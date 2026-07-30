import { useCallback, useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertTriangle,
    CheckCircle2,
    CircleDot,
    Clock3,
    LayoutList,
    RefreshCw,
    ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Label,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    TYPE_CONFIG,
    type Finding,
    type FindingStatus,
    type FindingType,
} from "@/lib/auditFindings";
import {
    FINDINGS_INBOX_GC_MS,
    FINDINGS_INBOX_STALE_MS,
    fetchFindingsInboxPlans,
    fetchRecentFindingsPlans,
    findingsDashboardQueryKey,
    findingsFromInboxPlans,
    findingsRecentQueryKey,
    mergeFindingsById,
} from "@/lib/auditFindingsInbox";
import { useStoredUser } from "@/hooks/useStoredUser";
import { cn } from "@/lib/utils";

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

function normalizeStatusBucket(status: FindingStatus | string): FindingStatus {
    if (status === "Responded") return "New Response";
    if (
        status === "Opened" ||
        status === "Closed" ||
        status === "Accepted" ||
        status === "New Response"
    ) {
        return status;
    }
    return "Opened";
}

type StatusCardKey = "all" | "Opened" | "New Response" | "Accepted" | "Closed";

const STATUS_CARDS: {
    key: StatusCardKey;
    label: string;
    hint: string;
    icon: typeof LayoutList;
    text: string;
    iconWrap: string;
    active: string;
}[] = [
    {
        key: "all",
        label: "Total",
        hint: "All findings",
        icon: LayoutList,
        text: "text-slate-700",
        iconWrap: "bg-slate-100 text-slate-600",
        active: "border-slate-400 ring-2 ring-slate-200 bg-slate-50",
    },
    {
        key: "Opened",
        label: "Opened",
        hint: "Awaiting action",
        icon: CircleDot,
        text: "text-sky-700",
        iconWrap: "bg-sky-100 text-sky-700",
        active: "border-sky-400 ring-2 ring-sky-200 bg-sky-50",
    },
    {
        key: "New Response",
        label: "New Response",
        hint: "Pending review",
        icon: Clock3,
        text: "text-amber-800",
        iconWrap: "bg-amber-100 text-amber-800",
        active: "border-amber-400 ring-2 ring-amber-200 bg-amber-50",
    },
    {
        key: "Accepted",
        label: "Accepted",
        hint: "Response accepted",
        icon: CheckCircle2,
        text: "text-blue-700",
        iconWrap: "bg-blue-100 text-blue-700",
        active: "border-blue-400 ring-2 ring-blue-200 bg-blue-50",
    },
    {
        key: "Closed",
        label: "Closed",
        hint: "Closed findings",
        icon: CheckCircle2,
        text: "text-emerald-700",
        iconWrap: "bg-emerald-100 text-emerald-700",
        active: "border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50",
    },
];

const TYPE_COLORS: Record<FindingType, string> = {
    OFI: "#F59E0B",
    NC: "#DC2626",
    Minor: "#EA580C",
    Major: "#DC2626",
};

const STATUS_COLORS: Record<string, string> = {
    Opened: "#0EA5E9",
    "New Response": "#D97706",
    Accepted: "#2563EB",
    Closed: "#059669",
};

const RECENT_LIMIT = 5;

function SkeletonBlock({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded bg-slate-100", className)} />;
}

const StatusCardsGrid = memo(function StatusCardsGrid({
    statusCounts,
    statusFilter,
    onFilter,
    loading,
}: {
    statusCounts: Record<StatusCardKey, number>;
    statusFilter: StatusCardKey;
    onFilter: (key: StatusCardKey) => void;
    loading: boolean;
}) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {STATUS_CARDS.map((item) => {
                const Icon = item.icon;
                const isActive = statusFilter === item.key;
                return (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onFilter(item.key)}
                        className={cn(
                            "rounded-xl border p-4 text-left transition-all shadow-sm",
                            isActive
                                ? item.active
                                : "border-slate-200 bg-white hover:bg-slate-50",
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span
                                className={cn(
                                    "text-[11px] font-bold uppercase tracking-widest",
                                    item.text,
                                )}
                            >
                                {item.label}
                            </span>
                            <span
                                className={cn(
                                    "rounded-lg p-1.5 shrink-0",
                                    item.iconWrap,
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                            </span>
                        </div>
                        <div
                            className={cn(
                                "text-3xl font-extrabold mt-2 tabular-nums",
                                item.text,
                            )}
                        >
                            {loading ? (
                                <SkeletonBlock className="h-8 w-16 mt-1" />
                            ) : (
                                statusCounts[item.key]
                            )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 leading-snug">
                            {item.hint}
                        </div>
                    </button>
                );
            })}
        </div>
    );
});

const TypeCardsGrid = memo(function TypeCardsGrid({
    typeCounts,
    total,
    loading,
}: {
    typeCounts: Record<FindingType, number>;
    total: number;
    loading: boolean;
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["OFI", "NC", "Minor", "Major"] as FindingType[]).map((type) => {
                const cfg = TYPE_CONFIG[type];
                return (
                    <div
                        key={type}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <span
                                className={cn(
                                    "inline-flex px-2.5 py-1 rounded-full text-xs font-bold ring-1",
                                    cfg.bg,
                                    cfg.text,
                                    cfg.ring,
                                )}
                            >
                                {cfg.label}
                            </span>
                            <ShieldAlert
                                className="h-4 w-4"
                                style={{ color: TYPE_COLORS[type] }}
                            />
                        </div>
                        <p className="text-3xl font-extrabold mt-3 tabular-nums text-[#213847]">
                            {loading ? (
                                <SkeletonBlock className="h-8 w-16" />
                            ) : (
                                typeCounts[type]
                            )}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {loading
                                ? "Loading…"
                                : total > 0
                                  ? `${Math.round((typeCounts[type] / total) * 100)}% of findings`
                                  : "No findings yet"}
                        </p>
                    </div>
                );
            })}
        </div>
    );
});

const RecentFindingsList = memo(function RecentFindingsList({
    items,
    loading,
    statusFilter,
    onViewAll,
    onOpen,
}: {
    items: Finding[];
    loading: boolean;
    statusFilter: StatusCardKey;
    onViewAll: () => void;
    onOpen: (f: Finding) => void;
}) {
    return (
        <Card className="border-none shadow-sm rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-bold text-[#111827]">
                        Recent findings
                    </h2>
                    <p className="text-xs text-[#9CA3AF]">
                        {statusFilter === "all"
                            ? "Latest findings in your view"
                            : `Showing ${statusFilter} findings`}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-semibold text-emerald-700"
                    onClick={onViewAll}
                >
                    View all
                </Button>
            </div>
            {loading ? (
                <ul className="divide-y divide-slate-100 space-y-0">
                    {Array.from({ length: RECENT_LIMIT }).map((_, i) => (
                        <li key={i} className="py-3 flex items-start gap-3">
                            <SkeletonBlock className="h-5 w-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <SkeletonBlock className="h-4 w-3/4" />
                                <SkeletonBlock className="h-3 w-1/2" />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : items.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                    No recent findings
                </p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {items.map((f) => {
                        const cfg = TYPE_CONFIG[f.type];
                        return (
                            <li key={`${f.auditId}-${f.id}`}>
                                <button
                                    type="button"
                                    className="w-full text-left py-3 flex items-start gap-3 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                                    onClick={() => onOpen(f)}
                                >
                                    <span
                                        className={cn(
                                            "mt-0.5 shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1",
                                            cfg.bg,
                                            cfg.text,
                                            cfg.ring,
                                        )}
                                    >
                                        {cfg.label}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                            {f.clauseRef || f.description || f.id}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {f.auditName}
                                            {f.moduleName ? ` · ${f.moduleName}` : ""}
                                            {" · "}
                                            {normalizeStatusBucket(f.status)}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
});

export default function Nonconformances() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useStoredUser();
    const [statusFilter, setStatusFilter] = useState<StatusCardKey>("all");

    const role = typeof user?.role === "string" ? user.role : undefined;
    const isSuperAdmin = String(role ?? "").toLowerCase() === "superadmin";
    const seesAll = canViewAllOrgFindings(role) || isSuperAdmin;
    const userEmail = String(user?.email ?? "")
        .toLowerCase()
        .trim();
    const parsedViewerId = user?.id != null ? Number(user.id) : NaN;
    const viewerId =
        Number.isInteger(parsedViewerId) && parsedViewerId > 0
            ? parsedViewerId
            : null;

    const summaryQuery = useQuery({
        queryKey: [...findingsDashboardQueryKey, seesAll ? "all" : "mine", userEmail],
        enabled: Boolean(user),
        staleTime: FINDINGS_INBOX_STALE_MS,
        gcTime: FINDINGS_INBOX_GC_MS,
        refetchOnWindowFocus: false,
        queryFn: async () => {
            if (seesAll) {
                const plans = await fetchFindingsInboxPlans("visible");
                return findingsFromInboxPlans(plans);
            }
            const [assignedPlans, raisedPlans] = await Promise.all([
                fetchFindingsInboxPlans("assigned"),
                fetchFindingsInboxPlans("raised"),
            ]);
            const assigned = findingsFromInboxPlans(assignedPlans).filter((f) =>
                isFindingAssignedToMe(f, userEmail),
            );
            const raised = findingsFromInboxPlans(raisedPlans).filter((f) =>
                isFindingRaisedByMe(f, userEmail, viewerId),
            );
            return mergeFindingsById([assigned, raised]);
        },
    });

    const recentQuery = useQuery({
        queryKey: findingsRecentQueryKey(RECENT_LIMIT),
        enabled: Boolean(user),
        staleTime: FINDINGS_INBOX_STALE_MS,
        gcTime: FINDINGS_INBOX_GC_MS,
        refetchOnWindowFocus: false,
        queryFn: async () => {
            const plans = await fetchRecentFindingsPlans(RECENT_LIMIT);
            let list = findingsFromInboxPlans(plans);
            if (!seesAll) {
                list = list.filter(
                    (f) =>
                        isFindingAssignedToMe(f, userEmail) ||
                        isFindingRaisedByMe(f, userEmail, viewerId),
                );
            }
            return list.slice(0, RECENT_LIMIT);
        },
    });

    const findings = summaryQuery.data ?? [];
    const summaryLoading =
        summaryQuery.isLoading || (summaryQuery.isFetching && !summaryQuery.data);
    const recentLoading =
        recentQuery.isLoading || (recentQuery.isFetching && !recentQuery.data);
    const chartsLoading = summaryLoading;

    const statusCounts = useMemo(() => {
        const counts: Record<StatusCardKey, number> = {
            all: findings.length,
            Opened: 0,
            "New Response": 0,
            Accepted: 0,
            Closed: 0,
        };
        for (const f of findings) {
            const bucket = normalizeStatusBucket(f.status);
            if (bucket in counts && bucket !== "all") {
                counts[bucket as Exclude<StatusCardKey, "all">] += 1;
            }
        }
        return counts;
    }, [findings]);

    const typeCounts = useMemo(() => {
        const counts: Record<FindingType, number> = { OFI: 0, NC: 0, Minor: 0, Major: 0 };
        for (const f of findings) {
            if (f.type in counts) counts[f.type] += 1;
        }
        return counts;
    }, [findings]);

    const total = findings.length;

    const typeDistribution = useMemo(() => {
        return (["OFI", "NC", "Minor", "Major"] as FindingType[]).map((type) => ({
            name: TYPE_CONFIG[type].label,
            value: typeCounts[type],
            color: TYPE_COLORS[type],
            percentage:
                total > 0 ? `${Math.round((typeCounts[type] / total) * 100)}%` : "0%",
        }));
    }, [typeCounts, total]);

    const typePieData = typeDistribution.filter((d) => d.value > 0);

    const statusDistribution = useMemo(() => {
        const keys: Exclude<StatusCardKey, "all">[] = [
            "Opened",
            "New Response",
            "Accepted",
            "Closed",
        ];
        return keys.map((key) => ({
            name: key,
            value: statusCounts[key],
            color: STATUS_COLORS[key],
            percentage:
                total > 0 ? `${Math.round((statusCounts[key] / total) * 100)}%` : "0%",
        }));
    }, [statusCounts, total]);

    const statusPieData = statusDistribution.filter((d) => d.value > 0);

    const topAudits = useMemo(() => {
        const byAudit = new Map<string, number>();
        for (const f of findings) {
            const name = f.auditName?.trim() || `Audit #${f.auditId}`;
            byAudit.set(name, (byAudit.get(name) || 0) + 1);
        }
        return Array.from(byAudit.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [findings]);

    const filteredRecent = useMemo(() => {
        const source = recentQuery.data ?? [];
        const list =
            statusFilter === "all"
                ? source
                : source.filter(
                      (f) => normalizeStatusBucket(f.status) === statusFilter,
                  );
        // Prefer filtered summary list when status filter active so counts stay consistent
        if (statusFilter !== "all" && findings.length > 0) {
            return findings
                .filter((f) => normalizeStatusBucket(f.status) === statusFilter)
                .slice(0, RECENT_LIMIT);
        }
        return list.slice(0, RECENT_LIMIT);
    }, [recentQuery.data, statusFilter, findings]);

    const goToFindings = useCallback(() => {
        navigate("/audit-findings");
    }, [navigate]);

    const openFinding = useCallback(
        (f: Finding) => {
            navigate(
                `/audit-findings/${f.auditId}/${encodeURIComponent(f.id)}`,
            );
        },
        [navigate],
    );

    const handleFilter = useCallback((key: StatusCardKey) => {
        setStatusFilter(key);
    }, []);

    const refresh = useCallback(async () => {
        try {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: findingsDashboardQueryKey }),
                queryClient.invalidateQueries({
                    queryKey: ["findings-dashboard", "recent"],
                }),
            ]);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to refresh findings",
            );
        }
    }, [queryClient]);

    const refreshing = summaryQuery.isFetching || recentQuery.isFetching;

    return (
        <div className="h-full bg-slate-50/60 overflow-auto">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#213847]">
                            Findings Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Overview of OFI, Minor, and Major findings across your audits
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={goToFindings}
                            className="gap-1.5 rounded-xl h-11 px-5 border-slate-200"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            View findings list
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void refresh()}
                            disabled={refreshing}
                            className="gap-1.5 rounded-xl h-11 px-5 border-slate-200"
                        >
                            <RefreshCw
                                className={cn("h-4 w-4", refreshing && "animate-spin")}
                            />
                            Refresh
                        </Button>
                    </div>
                </div>

                <StatusCardsGrid
                    statusCounts={statusCounts}
                    statusFilter={statusFilter}
                    onFilter={handleFilter}
                    loading={summaryLoading}
                />

                <TypeCardsGrid
                    typeCounts={typeCounts}
                    total={total}
                    loading={summaryLoading}
                />

                {!summaryLoading && total === 0 ? (
                    <Card className="border-slate-200 shadow-sm rounded-xl bg-white p-12">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                <AlertTriangle className="w-7 h-7" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">
                                No findings yet
                            </p>
                            <p className="text-xs text-slate-500 max-w-md">
                                Record OFI, Minor, or Major findings during audit execution to
                                see them on this dashboard.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                className="mt-2"
                                onClick={() => navigate("/audit")}
                            >
                                Go to audits
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <Card className="lg:col-span-5 border-none shadow-sm rounded-xl bg-white p-6">
                                <div className="mb-4">
                                    <h2 className="text-lg font-bold text-[#111827]">
                                        By type
                                    </h2>
                                    <p className="text-xs text-[#9CA3AF]">
                                        OFI, Minor, and Major distribution
                                    </p>
                                </div>
                                <div className="h-[220px] w-full">
                                    {chartsLoading ? (
                                        <div className="h-full flex items-center justify-center">
                                            <SkeletonBlock className="h-40 w-40 rounded-full" />
                                        </div>
                                    ) : typePieData.length === 0 ? (
                                        <p className="text-sm text-slate-500 h-full flex items-center justify-center">
                                            No chart data
                                        </p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={typePieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={58}
                                                    outerRadius={82}
                                                    paddingAngle={typePieData.length > 1 ? 4 : 0}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {typePieData.map((entry, index) => (
                                                        <Cell
                                                            key={`type-${index}`}
                                                            fill={entry.color}
                                                        />
                                                    ))}
                                                    <Label
                                                        content={({ viewBox }) => {
                                                            const { cx, cy } = viewBox as {
                                                                cx?: number;
                                                                cy?: number;
                                                            };
                                                            if (cx == null || cy == null) return null;
                                                            return (
                                                                <text
                                                                    x={cx}
                                                                    y={cy}
                                                                    textAnchor="middle"
                                                                    dominantBaseline="central"
                                                                >
                                                                    <tspan
                                                                        x={cx}
                                                                        dy="-0.5em"
                                                                        className="fill-slate-400 text-[10px] font-semibold"
                                                                    >
                                                                        Total
                                                                    </tspan>
                                                                    <tspan
                                                                        x={cx}
                                                                        dy="1.4em"
                                                                        className="fill-[#111827] text-2xl font-black"
                                                                    >
                                                                        {total}
                                                                    </tspan>
                                                                </text>
                                                            );
                                                        }}
                                                    />
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                <div className="w-full space-y-3 mt-2">
                                    {chartsLoading
                                        ? Array.from({ length: 4 }).map((_, i) => (
                                              <SkeletonBlock key={i} className="h-4 w-full" />
                                          ))
                                        : typeDistribution.map((item) => (
                                              <div
                                                  key={item.name}
                                                  className="flex items-center justify-between"
                                              >
                                                  <div className="flex items-center gap-2.5">
                                                      <div
                                                          className="w-2.5 h-2.5 rounded-full"
                                                          style={{ backgroundColor: item.color }}
                                                      />
                                                      <span className="text-xs font-bold text-[#6B7280]">
                                                          {item.name}
                                                      </span>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                      <span className="text-xs font-black text-[#111827]">
                                                          {item.value}
                                                      </span>
                                                      <span className="text-[10px] font-bold text-[#9CA3AF] w-10 text-right">
                                                          {item.percentage}
                                                      </span>
                                                  </div>
                                              </div>
                                          ))}
                                </div>
                            </Card>

                            <Card className="lg:col-span-7 border-none shadow-sm rounded-xl bg-white p-6">
                                <div className="mb-4">
                                    <h2 className="text-lg font-bold text-[#111827]">
                                        By status
                                    </h2>
                                    <p className="text-xs text-[#9CA3AF]">
                                        Opened, response, accepted, and closed
                                    </p>
                                </div>
                                <div className="h-[220px] w-full">
                                    {chartsLoading ? (
                                        <div className="h-full flex items-center justify-center">
                                            <SkeletonBlock className="h-40 w-40 rounded-full" />
                                        </div>
                                    ) : statusPieData.length === 0 ? (
                                        <p className="text-sm text-slate-500 h-full flex items-center justify-center">
                                            No chart data
                                        </p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={statusPieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={58}
                                                    outerRadius={82}
                                                    paddingAngle={statusPieData.length > 1 ? 4 : 0}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {statusPieData.map((entry, index) => (
                                                        <Cell
                                                            key={`status-${index}`}
                                                            fill={entry.color}
                                                        />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    {chartsLoading
                                        ? Array.from({ length: 4 }).map((_, i) => (
                                              <SkeletonBlock key={i} className="h-10 w-full" />
                                          ))
                                        : statusDistribution.map((item) => (
                                              <div
                                                  key={item.name}
                                                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                                              >
                                                  <div className="flex items-center gap-2">
                                                      <div
                                                          className="w-2.5 h-2.5 rounded-full"
                                                          style={{ backgroundColor: item.color }}
                                                      />
                                                      <span className="text-xs font-bold text-slate-600">
                                                          {item.name}
                                                      </span>
                                                  </div>
                                                  <span className="text-xs font-black text-[#111827]">
                                                      {item.value}
                                                  </span>
                                              </div>
                                          ))}
                                </div>
                            </Card>
                        </div>

                        <Card className="border-none shadow-sm rounded-xl bg-white p-6">
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-[#111827]">
                                    Findings by audit
                                </h2>
                                <p className="text-xs text-[#9CA3AF]">
                                    Top audits with the most findings
                                </p>
                            </div>
                            {chartsLoading ? (
                                <SkeletonBlock className="h-[280px] w-full" />
                            ) : topAudits.length === 0 ? (
                                <p className="text-sm text-slate-500">No audit data</p>
                            ) : (
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={topAudits}
                                            layout="vertical"
                                            margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                horizontal={false}
                                            />
                                            <XAxis type="number" allowDecimals={false} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={140}
                                                tick={{ fontSize: 11 }}
                                            />
                                            <RechartsTooltip />
                                            <Bar
                                                dataKey="value"
                                                fill="#213847"
                                                radius={[0, 6, 6, 0]}
                                                name="Findings"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Card>

                        <RecentFindingsList
                            items={filteredRecent}
                            loading={
                                statusFilter === "all" ? recentLoading : summaryLoading
                            }
                            statusFilter={statusFilter}
                            onViewAll={goToFindings}
                            onOpen={openFinding}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
