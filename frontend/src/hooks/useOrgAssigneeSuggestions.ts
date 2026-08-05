import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildPageQuery, parsePaginatedResponse } from "@/lib/pagination";

export type OrgAssigneeSuggestion = {
    id: number;
    name: string;
    email: string;
    role?: string;
};

type ApiUser = {
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
};

/** Shared across all Assign To fields on the page. */
let sharedCache: OrgAssigneeSuggestion[] | null = null;
let sharedInflight: Promise<OrgAssigneeSuggestion[]> | null = null;

function toSuggestion(u: ApiUser): OrgAssigneeSuggestion | null {
    const id = Number(u.id);
    const email = String(u.email || "").trim().toLowerCase();
    if (!Number.isInteger(id) || id < 1 || !email.includes("@")) return null;
    const name = [u.firstName, u.lastName]
        .map((p) => String(p || "").trim())
        .filter(Boolean)
        .join(" ")
        .trim();
    return {
        id,
        name: name || email,
        email,
        role: u.role ? String(u.role) : undefined,
    };
}

function mapUsers(rows: ApiUser[]): OrgAssigneeSuggestion[] {
    const out: OrgAssigneeSuggestion[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
        const s = toSuggestion(row);
        if (!s || seen.has(s.email)) continue;
        seen.add(s.email);
        out.push(s);
    }
    return out;
}

async function fetchOrgUsers(search: string): Promise<OrgAssigneeSuggestion[]> {
    const qs = buildPageQuery({
        page: 1,
        limit: 40,
        search: search.trim() || undefined,
        status: "active",
    });
    const res = await apiFetch(`/users${qs}`);
    if (!res.ok) return sharedCache || [];
    const json = await res.json();
    const parsed = parsePaginatedResponse<ApiUser>(json, 1, 40);
    return mapUsers(parsed.items);
}

async function loadBaseCache(): Promise<OrgAssigneeSuggestion[]> {
    if (sharedCache) return sharedCache;
    if (sharedInflight) return sharedInflight;
    sharedInflight = fetchOrgUsers("")
        .then((rows) => {
            sharedCache = rows;
            return rows;
        })
        .finally(() => {
            sharedInflight = null;
        });
    return sharedInflight;
}

function filterLocal(rows: OrgAssigneeSuggestion[], query: string): OrgAssigneeSuggestion[] {
    const lower = query.trim().toLowerCase();
    if (!lower) return rows.slice(0, 20);
    return rows
        .filter(
            (u) =>
                u.name.toLowerCase().includes(lower) ||
                u.email.toLowerCase().includes(lower),
        )
        .slice(0, 20);
}

/**
 * Loads org users (same scope as the Users page) for Assign To autocomplete.
 * Prefetches active users once (shared); searches the API as the query changes.
 */
export function useOrgAssigneeSuggestions() {
    const [suggestions, setSuggestions] = useState<OrgAssigneeSuggestion[]>(
        () => sharedCache || [],
    );
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestIdRef = useRef(0);

    const ensureLoaded = useCallback(() => {
        if (sharedCache) {
            setSuggestions(sharedCache.slice(0, 20));
            return;
        }
        setLoading(true);
        void loadBaseCache()
            .then((rows) => setSuggestions(rows.slice(0, 20)))
            .finally(() => setLoading(false));
    }, []);

    const search = useCallback((query: string) => {
        const q = query.trim();
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (sharedCache) {
            setSuggestions(filterLocal(sharedCache, q));
        }

        debounceRef.current = setTimeout(() => {
            const reqId = ++requestIdRef.current;
            setLoading(true);
            void fetchOrgUsers(q)
                .then((rows) => {
                    if (!q) sharedCache = rows;
                    if (reqId === requestIdRef.current) {
                        setSuggestions(rows.slice(0, 20));
                    }
                })
                .catch(() => {
                    if (reqId === requestIdRef.current && sharedCache) {
                        setSuggestions(filterLocal(sharedCache, q));
                    }
                })
                .finally(() => {
                    if (reqId === requestIdRef.current) setLoading(false);
                });
        }, 250);
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return {
        suggestions,
        loading,
        ensureLoaded,
        search,
    };
}
