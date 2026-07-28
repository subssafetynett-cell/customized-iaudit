import { apiFetch } from "@/lib/api";
import { buildPageQuery, parsePaginatedResponse, type PaginatedResult } from "@/lib/pagination";

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

/** Bell / lightweight polls — no page param keeps legacy array response. */
export async function listNotifications(opts?: {
    limit?: number;
}): Promise<AppNotification[]> {
    const limit = opts?.limit;
    const qs =
        limit != null && Number.isFinite(limit)
            ? `?limit=${Math.max(1, Math.floor(limit))}`
            : "";
    const res = await apiFetch(`/notifications${qs}`, { skipSessionLogout: true });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to load notifications",
        );
    }
    if (Array.isArray(data)) return data;
    return parsePaginatedResponse<AppNotification>(data).items;
}

export async function listNotificationsPaged(opts: {
    page: number;
    limit?: number;
}): Promise<PaginatedResult<AppNotification>> {
    const qs = buildPageQuery({
        page: opts.page,
        limit: opts.limit ?? 20,
    });
    const res = await apiFetch(`/notifications${qs}`, { skipSessionLogout: true });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
        throw new Error(
            (typeof data.error === "string" && data.error) ||
                "Failed to load notifications",
        );
    }
    return parsePaginatedResponse<AppNotification>(data, opts.page, opts.limit ?? 20);
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
    return `${days}d ago`;
}
