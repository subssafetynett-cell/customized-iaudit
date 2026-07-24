import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasClientAuthSession } from "@/lib/api";
import {
    formatNotificationTimeAgo,
    listNotifications,
    markNotificationRead,
    type AppNotification,
} from "@/lib/notificationApi";
import { cn } from "@/lib/utils";

function notificationIcon(type: string) {
    const t = String(type || "").toUpperCase();
    if (t === "NC_CLOSED") return CheckCircle2;
    if (t === "NC_CHANGES_REQUESTED") return AlertTriangle;
    if (t === "NC_RESPONSE_SUBMITTED") return ClipboardList;
    if (t === "NC_ASSIGNED") return FileWarning;
    return Bell;
}

function notificationIconClass(type: string) {
    const t = String(type || "").toUpperCase();
    if (t === "NC_CLOSED") return "bg-emerald-50 text-emerald-700";
    if (t === "NC_CHANGES_REQUESTED") return "bg-orange-50 text-orange-700";
    if (t === "NC_RESPONSE_SUBMITTED") return "bg-amber-50 text-amber-700";
    if (t === "NC_ASSIGNED") return "bg-sky-50 text-sky-700";
    return "bg-slate-100 text-slate-600";
}

type Props = {
    className?: string;
};

export function NotificationBell({ className }: Props) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<AppNotification[]>([]);

    const load = useCallback(async () => {
        if (!hasClientAuthSession()) {
            setItems([]);
            return;
        }
        try {
            setLoading(true);
            const data = await listNotifications();
            setItems(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => {
            void load();
        }, 45000);
        return () => window.clearInterval(timer);
    }, [load]);

    useEffect(() => {
        if (open) void load();
    }, [open, load]);

    const unreadCount = useMemo(
        () => items.filter((n) => !n.isRead).length,
        [items],
    );
    const preview = items.slice(0, 8);

    const handleClick = async (item: AppNotification) => {
        setOpen(false);
        try {
            if (!item.isRead) {
                await markNotificationRead(item.id);
                setItems((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
                );
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update notification");
        }
        if (item.nonconformanceId) {
            navigate(`/nonconformances/${item.nonconformanceId}`);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "relative h-11 w-11 rounded-xl text-slate-600 hover:text-primary hover:bg-primary/5",
                        className,
                    )}
                    aria-label="Notifications"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 ? (
                        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[360px] p-0 overflow-hidden rounded-xl border-slate-200 shadow-lg"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <p className="text-sm font-semibold text-[#213847]">Notifications</p>
                    {unreadCount > 0 ? (
                        <span className="text-xs font-medium text-slate-500">
                            {unreadCount} unread
                        </span>
                    ) : null}
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                    {loading && preview.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading…
                        </div>
                    ) : preview.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            No notifications yet
                        </p>
                    ) : (
                        <ul>
                            {preview.map((item) => {
                                const Icon = notificationIcon(item.type);
                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => void handleClick(item)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0",
                                                !item.isRead && "bg-sky-50/60",
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                                                    notificationIconClass(item.type),
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p
                                                        className={cn(
                                                            "text-sm text-slate-800 truncate",
                                                            !item.isRead && "font-semibold",
                                                        )}
                                                    >
                                                        {item.title}
                                                    </p>
                                                    {!item.isRead ? (
                                                        <span className="mt-1.5 h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                                                    ) : null}
                                                </div>
                                                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                                    {item.message}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    {formatNotificationTimeAgo(item.createdAt)}
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="border-t border-slate-100 p-2 bg-white">
                    <Button
                        variant="ghost"
                        className="w-full h-9 text-sm font-medium text-[#213847] hover:bg-slate-50"
                        onClick={() => {
                            setOpen(false);
                            navigate("/notifications");
                        }}
                    >
                        View All Notifications
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
