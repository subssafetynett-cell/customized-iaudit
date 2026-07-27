import { apiFetch } from "@/lib/api";

export type NotificationType =
    | "NC_ASSIGNED"
    | "NC_RESPONSE_SUBMITTED"
    | "NC_CHANGES_REQUESTED"
    | "NC_CLOSED"
    | "FINDING_ASSIGNED"
    | "FINDING_RESPONSE_SUBMITTED";

export type AppNotification = {
    id: number;
    recipientUserId: number;
    nonconformanceId: number | null;
    linkPath?: string | null;
    type: NotificationType | string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    nonconformance?: {
        id: number;
        ncNumber?: string | null;
        status?: string | null;
    } | null;
};

export async function listNotifications(): Promise<AppNotification[]> {
    const res = await apiFetch("/notifications", { skipSessionLogout: true });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to load notifications",
        );
    }
    return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(
    id: number | string,
): Promise<AppNotification> {
    const res = await apiFetch(`/notifications/${id}/read`, {
        method: "PATCH",
        skipSessionLogout: true,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to mark notification as read",
        );
    }
    return data as AppNotification;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
    const res = await apiFetch("/notifications/read-all", {
        method: "PATCH",
        skipSessionLogout: true,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to mark all notifications as read",
        );
    }
    return data as { updated: number };
}

export function formatNotificationTimeAgo(value: string | null | undefined): string {
    if (!value) return "";
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return "";
    const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(value).toLocaleDateString();
}
