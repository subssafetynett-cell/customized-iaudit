import { apiFetch } from "@/lib/api";

export type AuditPlanExecutePayload = Record<string, unknown> & {
    id: number;
    auditName?: string;
    templateId?: string;
    auditData?: unknown;
    findingsData?: unknown;
    location?: string;
    site?: { name?: string };
    auditProgram?: unknown;
};

export const auditPlanQueryKey = (id: string | number) =>
    ["audit-plan", String(id)] as const;

export const AUDIT_PLAN_STALE_MS = 60_000;
export const AUDIT_PLAN_GC_MS = 30 * 60_000;

export async function fetchAuditPlanForExecute(
    id: string | number,
): Promise<AuditPlanExecutePayload> {
    const res = await apiFetch(`/audit-plans/${id}`);
    if (!res.ok) {
        throw new Error(res.status === 404 ? "Plan not found" : "Failed to load plan");
    }
    const data = await res.json();
    if (!data?.id) throw new Error("Plan not found");
    return data as AuditPlanExecutePayload;
}
