import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    ClipboardList,
    FileWarning,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReusablePagination from "@/components/ReusablePagination";
import {
    formatNotificationTimeAgo,
    listNotificationsPaged,
    markAllNotificationsRead,
    markNotificationRead,
    type AppNotification,
} from "@/lib/notificationApi";
import { cn } from "@/lib/utils";

function notificationIcon(type: string) {
    const t = String(type || "").toUpperCase();
    if (t === "NC_CLOSED" || t === "FINDING_REVIEW_ACCEPTED") return CheckCircle2;
    if (t === "NC_CHANGES_REQUESTED" || t === "FINDING_REVIEW_REJECTED") {
        return AlertTriangle;
    }
    if (t === "NC_RESPONSE_SUBMITTED" || t === "FINDING_RESPONSE_SUBMITTED") {
        return ClipboardList;
    }
    if (t === "NC_ASSIGNED" || t === "FINDING_ASSIGNED") return FileWarning;
    return Bell;
}

function notificationIconClass(type: string) {
    const t = String(type || "").toUpperCase();
    if (t === "NC_CLOSED" || t === "FINDING_REVIEW_ACCEPTED") {
        return "bg-emerald-50 text-emerald-700";
    }
    if (t === "NC_CHANGES_REQUESTED" || t === "FINDING_REVIEW_REJECTED") {
        return "bg-orange-50 text-orange-700";
    }
    if (t === "NC_RESPONSE_SUBMITTED" || t === "FINDING_RESPONSE_SUBMITTED") {
        return "bg-amber-50 text-amber-700";
    }
    if (t === "NC_ASSIGNED" || t === "FINDING_ASSIGNED") return "bg-sky-50 text-sky-700";
    return "bg-slate-100 text-slate-600";
}

const ITEMS_PER_PAGE = 20;

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const [items, setItems] = useState<AppNotification[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / ITEMS_PER_PAGE);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await listNotificationsPaged({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
            });
            setItems(result.items);
            setTotalItems(result.total);
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Failed to load notifications");
            setItems([]);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage]);

    useEffect(() => {
        void load();
    }, [load]);

    const unreadCount = items.filter((n) => !n.isRead).length;

    const handleMarkRead = async (item: AppNotification) => {
        if (item.isRead) return;
        try {
            await markNotificationRead(item.id);
            setItems((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to mark as read");
        }
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);
        try {
            await markAllNotificationsRead();
            setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
            toast.success("All notifications marked as read");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to mark all as read");
        } finally {
            setMarkingAll(false);
        }
    };

    const openNotification = async (item: AppNotification) => {
        await handleMarkRead(item);
        if (item.linkPath) {
            navigate(item.linkPath);
        } else if (item.nonconformanceId) {
            navigate(`/nonconformances/${item.nonconformanceId}`);
        } else if (
            String(item.type || "").toUpperCase() === "FINDING_RESPONSE_SUBMITTED" ||
            String(item.type || "").toUpperCase() === "NC_RESPONSE_SUBMITTED"
        ) {
            navigate("/audit-findings?tab=raised");
        } else {
            navigate("/audit-findings");
        }
    };

    return (
        <div className="h-full bg-slate-50/60 overflow-auto">
            <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#213847]">
                            Notifications
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Nonconformance updates for your account
                            {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={markingAll || unreadCount === 0}
                        onClick={() => void handleMarkAll()}
                        className="border-slate-200"
                    >
                        {markingAll ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                Updating…
                            </>
                        ) : (
                            "Mark All Read"
                        )}
                    </Button>
                </div>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#213847]">All notifications</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-16 text-slate-500 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading notifications…
                            </div>
                        ) : items.length === 0 ? (
                            <p className="py-16 text-center text-sm text-muted-foreground">
                                No notifications yet.
                            </p>
                        ) : (
                            <ul>
                                {items.map((item) => {
                                    const Icon = notificationIcon(item.type);
                                    return (
                                        <li
                                            key={item.id}
                                            className={cn(
                                                "flex gap-3 px-4 py-4 border-b border-slate-100 last:border-b-0",
                                                !item.isRead && "bg-sky-50/50",
                                            )}
                                        >
                                            <button
                                                type="button"
                                                className="flex flex-1 gap-3 text-left min-w-0"
                                                onClick={() => void openNotification(item)}
                                            >
                                                <div
                                                    className={cn(
                                                        "mt-0.5 h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                                                        notificationIconClass(item.type),
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p
                                                            className={cn(
                                                                "text-sm text-slate-800",
                                                                !item.isRead && "font-semibold",
                                                            )}
                                                        >
                                                            {item.title}
                                                        </p>
                                                        <span className="text-[11px] text-slate-400 shrink-0">
                                                            {formatNotificationTimeAgo(
                                                                item.createdAt,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-0.5">
                                                        {item.message}
                                                    </p>
                                                </div>
                                            </button>
                                            {!item.isRead ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="shrink-0 h-8 self-center border-slate-200"
                                                    onClick={() => void handleMarkRead(item)}
                                                >
                                                    Mark Read
                                                </Button>
                                            ) : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {!loading && (
                    <ReusablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                        className="mt-0 pt-4 border-t-0"
                    />
                )}
            </div>
        </div>
    );
}
