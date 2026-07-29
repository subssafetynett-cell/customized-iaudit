/** Shared client helpers for server-paginated list APIs. */

export type PaginatedResult<T> = {
    data: T[];
    /** @deprecated Prefer `data`; kept for older call sites. */
    items: T[];
    page: number;
    pageSize: number;
    /** @deprecated Prefer `pageSize`; kept for older call sites. */
    limit: number;
    total: number;
    totalPages: number;
};

export function buildPageQuery(params: {
    page: number;
    pageSize?: number;
    limit?: number;
    search?: string;
    [key: string]: string | number | boolean | undefined | null;
}): string {
    const sp = new URLSearchParams();
    const pageSize = Math.max(1, Number(params.pageSize ?? params.limit) || 8);
    sp.set("page", String(Math.max(1, params.page || 1)));
    sp.set("pageSize", String(pageSize));
    // Also send `limit` so older servers still accept the size.
    sp.set("limit", String(pageSize));
    for (const [key, value] of Object.entries(params)) {
        if (key === "page" || key === "limit" || key === "pageSize") continue;
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
    fallbackPageSize = 8,
): PaginatedResult<T> {
    if (Array.isArray(data)) {
        const total = data.length;
        const pageSize = fallbackPageSize;
        return {
            data: data as T[],
            items: data as T[],
            page: fallbackPage,
            pageSize,
            limit: pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        };
    }
    if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        const rows = Array.isArray(obj.data)
            ? (obj.data as T[])
            : Array.isArray(obj.items)
              ? (obj.items as T[])
              : [];
        const total = Number(obj.total);
        const page = Number(obj.page);
        const size = Number(obj.pageSize ?? obj.limit);
        const safePageSize =
            Number.isFinite(size) && size > 0 ? size : fallbackPageSize;
        const safeTotal = Number.isFinite(total) && total >= 0 ? total : rows.length;
        const safePage = Number.isFinite(page) && page > 0 ? page : fallbackPage;
        const totalPages =
            obj.totalPages != null && Number.isFinite(Number(obj.totalPages))
                ? Number(obj.totalPages)
                : safeTotal === 0
                  ? 0
                  : Math.ceil(safeTotal / safePageSize);
        return {
            data: rows,
            items: rows,
            page: safePage,
            pageSize: safePageSize,
            limit: safePageSize,
            total: safeTotal,
            totalPages,
        };
    }
    return {
        data: [],
        items: [],
        page: fallbackPage,
        pageSize: fallbackPageSize,
        limit: fallbackPageSize,
        total: 0,
        totalPages: 0,
    };
}
