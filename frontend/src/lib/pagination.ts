/** Shared client helpers for server-paginated list APIs. */

export type PaginatedResult<T> = {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export function buildPageQuery(params: {
    page: number;
    limit: number;
    search?: string;
    [key: string]: string | number | boolean | undefined | null;
}): string {
    const sp = new URLSearchParams();
    sp.set("page", String(Math.max(1, params.page || 1)));
    sp.set("limit", String(Math.max(1, params.limit || 8)));
    for (const [key, value] of Object.entries(params)) {
        if (key === "page" || key === "limit") continue;
        if (value === undefined || value === null || value === "") continue;
        sp.set(key, String(value));
    }
    const q = sp.toString();
    return q ? `?${q}` : "";
}

/**
 * Normalize list responses that may be either a legacy array or a paginated envelope.
 */
export function parsePaginatedResponse<T>(
    data: unknown,
    fallbackPage = 1,
    fallbackLimit = 8,
): PaginatedResult<T> {
    if (Array.isArray(data)) {
        return {
            items: data as T[],
            page: fallbackPage,
            limit: fallbackLimit,
            total: data.length,
            totalPages: data.length === 0 ? 0 : Math.ceil(data.length / fallbackLimit),
        };
    }
    if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        const items = Array.isArray(obj.items)
            ? (obj.items as T[])
            : Array.isArray(obj.data)
              ? (obj.data as T[])
              : [];
        const total = Number(obj.total);
        const page = Number(obj.page);
        const limit = Number(obj.limit);
        const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : fallbackLimit;
        const safeTotal = Number.isFinite(total) && total >= 0 ? total : items.length;
        const safePage = Number.isFinite(page) && page > 0 ? page : fallbackPage;
        const totalPages =
            obj.totalPages != null && Number.isFinite(Number(obj.totalPages))
                ? Number(obj.totalPages)
                : safeTotal === 0
                  ? 0
                  : Math.ceil(safeTotal / safeLimit);
        return {
            items,
            page: safePage,
            limit: safeLimit,
            total: safeTotal,
            totalPages,
        };
    }
    return {
        items: [],
        page: fallbackPage,
        limit: fallbackLimit,
        total: 0,
        totalPages: 0,
    };
}
