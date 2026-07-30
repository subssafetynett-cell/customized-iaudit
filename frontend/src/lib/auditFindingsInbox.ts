import { apiFetch } from "@/lib/api";
import {
    extractFindings,
    mergeFindingWithOverrides,
    type Finding,
} from "@/lib/auditFindings";

export type FindingsOwnership = "assigned" | "raised" | "visible";

export type FindingsInboxPlan = {
    id: number;
    auditName?: string;
    auditData?: unknown;
    templateId?: string;
    findingsData?: unknown;
    updatedAt?: string;
};

/** Fetch ownership-scoped plans for findings inbox / dashboard (slim payloads). */
export async function fetchFindingsInboxPlans(
    ownership: FindingsOwnership,
): Promise<FindingsInboxPlan[]> {
    const res = await apiFetch(
        `/audit-findings?ownership=${encodeURIComponent(ownership)}`,
    );
    if (!res.ok) {
        throw new Error(
            ownership === "assigned"
                ? "Failed to load assigned findings"
                : ownership === "raised"
                  ? "Failed to load raised findings"
                  : "Failed to load findings dashboard",
        );
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/** Recent-plans endpoint for dashboard Recent Findings widget. */
export async function fetchRecentFindingsPlans(
    limit = 5,
): Promise<FindingsInboxPlan[]> {
    const res = await apiFetch(
        `/audit-findings/recent?limit=${encodeURIComponent(String(limit))}`,
    );
    if (!res.ok) {
        throw new Error("Failed to load recent findings");
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/** Extract + merge findings from inbox plans (client-side, same business rules). */
export function findingsFromInboxPlans(plans: FindingsInboxPlan[]): Finding[] {
    const all: Finding[] = [];
    for (const plan of plans) {
        if (!plan?.id) continue;
        const base = extractFindings(plan);
        let overrides: Record<string, Partial<Finding>> = {};
        if (plan.findingsData != null) {
            try {
                overrides =
                    typeof plan.findingsData === "string"
                        ? JSON.parse(plan.findingsData)
                        : (plan.findingsData as Record<string, Partial<Finding>>);
            } catch {
                overrides = {};
            }
        }
        for (const f of base) {
            all.push(mergeFindingWithOverrides(f, overrides));
        }
    }
    return all;
}

export function mergeFindingsById(lists: Finding[][]): Finding[] {
    const map = new Map<string, Finding>();
    for (const list of lists) {
        for (const f of list) {
            const key = `${f.auditId}:${f.id}`;
            if (!map.has(key)) map.set(key, f);
        }
    }
    return Array.from(map.values());
}

export const findingsInboxQueryKey = (ownership: FindingsOwnership) =>
    ["audit-findings-inbox", ownership] as const;

export const findingsDashboardQueryKey = ["findings-dashboard", "visible"] as const;
export const findingsRecentQueryKey = (limit: number) =>
    ["findings-dashboard", "recent", limit] as const;

export const FINDINGS_INBOX_STALE_MS = 5 * 60 * 1000;
export const FINDINGS_INBOX_GC_MS = 30 * 60 * 1000;
