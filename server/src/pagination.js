/**
 * Shared list pagination helpers for Express list routes.
 * When `page` is present in the query, callers should return a paginated envelope.
 * When absent, keep legacy array responses for dashboards / older clients.
 */

/**
 * @param {import('express').Request['query']} query
 * @param {{ defaultLimit?: number, maxLimit?: number }} [opts]
 */
export function parsePaginationQuery(query, opts = {}) {
    const defaultLimit = opts.defaultLimit ?? 8;
    const maxLimit = opts.maxLimit ?? 100;
    const rawPage = query?.page;
    const hasPage =
        rawPage !== undefined &&
        rawPage !== null &&
        String(rawPage).trim() !== '';

    let limit = Number.parseInt(String(query?.limit ?? defaultLimit), 10);
    if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
    limit = Math.min(maxLimit, Math.max(1, limit));

    let page = Number.parseInt(String(rawPage ?? '1'), 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    const skip = (page - 1) * limit;
    return { page, limit, skip, paginate: hasPage };
}

/**
 * @template T
 * @param {T[]} items
 * @param {{ page: number, limit: number, total: number }} meta
 */
export function paginatedResponse(items, meta) {
    const total = Math.max(0, Number(meta.total) || 0);
    const limit = Math.max(1, Number(meta.limit) || 8);
    const page = Math.max(1, Number(meta.page) || 1);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
        items,
        page,
        limit,
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
        total,
    });
}
