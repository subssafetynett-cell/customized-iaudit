import {
    extractFindings,
    getMergedPlanFindings,
    type Finding,
} from "@/lib/auditFindings";

export type AuditPlanLike = {
    id?: number;
    auditName?: string;
    templateId?: string;
    auditData?: unknown;
    findingsData?: unknown;
    auditCompleted?: boolean;
    progress?: number;
};

export type AuditCompletionStatus = {
    /** Percentage of audit items that have a finding type recorded (0–100). */
    progress: number;
    /** True when every item is assessed and all non-conformity findings are closed. */
    auditCompleted: boolean;
    /** True when every assessed item is conformity (C) — no OFI/Minor/Major. */
    allConformity: boolean;
    /** Non-conformity findings that are not yet closed. */
    openFindings: Finding[];
};

export function parseAuditData(
    plan: AuditPlanLike | null | undefined,
): Record<string, unknown> | null {
    if (!plan?.auditData) return null;
    try {
        return typeof plan.auditData === "string"
            ? JSON.parse(plan.auditData)
            : (plan.auditData as Record<string, unknown>);
    } catch {
        return null;
    }
}

/** Assessment progress stored on the plan (0–100). */
export function getAuditAssessmentProgress(plan: AuditPlanLike): number {
    const data = parseAuditData(plan);
    const progress = Number(data?.progress ?? 0);
    return Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0;
}

/**
 * An audit is complete when:
 * 1. Every applicable clause/item has been assessed (progress = 100%), and
 * 2. Either all items are conformity (C), or every OFI/Minor/Major finding is Closed.
 */
export function computeAuditCompletionStatus(
    plan: AuditPlanLike & { id: number },
): AuditCompletionStatus {
    const data = parseAuditData(plan);
    const progress = getAuditAssessmentProgress(plan);

    if (!data || progress < 100) {
        return {
            progress,
            auditCompleted: false,
            allConformity: false,
            openFindings: [],
        };
    }

    const findings = getMergedPlanFindings(plan);
    const openFindings = findings.filter((f) => f.status !== "Closed");
    const allConformity = findings.length === 0;
    const auditCompleted = openFindings.length === 0;

    return {
        progress,
        auditCompleted,
        allConformity,
        openFindings,
    };
}

export function isAuditPlanCompleted(plan: AuditPlanLike & { id: number }): boolean {
    if (plan.auditCompleted === true) {
        return true;
    }
    return computeAuditCompletionStatus(plan).auditCompleted;
}

export function getAuditPlanStatusLabel(
    plan: AuditPlanLike & { id: number },
): "Completed" | "In Progress" | "Planned" {
    if (isAuditPlanCompleted(plan)) return "Completed";
    if (getAuditAssessmentProgress(plan) > 0 || parseAuditData(plan)) return "In Progress";
    return "Planned";
}
