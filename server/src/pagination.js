/**
 * Shared list pagination helpers for Express list routes.
 * When `page` is present in the query, callers should return a paginated envelope.
 * When absent, keep legacy array responses for dashboards / older clients —
 * but always enforce a hard take cap so unbounded findMany cannot cause 504s.
 *
 * Envelope shape (primary):
 *   { data, page, pageSize, total, totalPages }
 * Also includes `items` / `limit` aliases for older clients.
 */

/** Hard ceiling for legacy (no ?page=) list responses — prevents multi‑MB payloads / DB scans. */
export const LEGACY_LIST_HARD_CAP = 100;

/**
 * @param {import('express').Request['query']} query
 * @param {{ defaultLimit?: number, maxLimit?: number, legacyHardCap?: number }} [opts]
 */
export function parsePaginationQuery(query, opts = {}) {
    const defaultLimit = opts.defaultLimit ?? 8;
    const maxLimit = opts.maxLimit ?? 100;
    const legacyHardCap = opts.legacyHardCap ?? LEGACY_LIST_HARD_CAP;
    const rawPage = query?.page;
    const hasPage =
        rawPage !== undefined &&
        rawPage !== null &&
        String(rawPage).trim() !== '';

    const rawSize = query?.pageSize ?? query?.limit ?? defaultLimit;
    let limit = Number.parseInt(String(rawSize), 10);
    if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
    limit = Math.min(maxLimit, Math.max(1, limit));

    let page = Number.parseInt(String(rawPage ?? '1'), 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    const skip = (page - 1) * limit;
    // Legacy mode still gets a bounded take so list routes never scan/return unbounded rows.
    const take = hasPage ? limit : Math.min(legacyHardCap, Math.max(limit, legacyHardCap));
    return { page, limit, pageSize: limit, skip, paginate: hasPage, take, legacyHardCap };
}

/**
 * @template T
 * @param {T[]} items
 * @param {{ page: number, limit?: number, pageSize?: number, total: number }} meta
 */
export function paginatedResponse(items, meta) {
    const total = Math.max(0, Number(meta.total) || 0);
    const pageSize = Math.max(
        1,
        Number(meta.pageSize ?? meta.limit) || 8,
    );
    const page = Math.max(1, Number(meta.page) || 1);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const data = Array.isArray(items) ? items : [];
    return {
        data,
        items: data,
        page,
        pageSize,
        limit: pageSize,
        total,
        totalPages,
    };
}

/**
 * Slice an in-memory array (JSON stores) using the same envelope.
 * @template T
 * @param {T[]} allItems
 * @param {{ page: number, limit: number, skip: number }} pagination
 */
export function paginateArray(allItems, pagination) {
    const total = Array.isArray(allItems) ? allItems.length : 0;
    const items = Array.isArray(allItems)
        ? allItems.slice(pagination.skip, pagination.skip + pagination.limit)
        : [];
    return paginatedResponse(items, {
        page: pagination.page,
        limit: pagination.limit,
        pageSize: pagination.limit,
        total,
    });
}
