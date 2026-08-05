import {
    extractFindings,
    getMergedPlanFindings,
    type Finding,
} from "@/lib/auditFindings";
import { parseAuditPlanTemplateIds } from "@/data/auditTemplates";
import {
    getPlanOverallChecklistProgress,
    lifecycleFromModulePercents,
} from "@/lib/auditPlanModules";

export type AuditPlanLike = {
    id?: number;
    auditName?: string;
    templateId?: string;
    auditData?: unknown;
    findingsData?: unknown;
    auditCompleted?: boolean;
    progress?: number;
    /** Backend lifecycle: PLANNED | IN_PROGRESS | COMPLETED */
    status?: string;
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

/**
 * Read per-module percents from saved auditData when present
 * (written on save for multi-module plans).
 */
function readStoredModulePercents(
    plan: AuditPlanLike,
): number[] | null {
    const ids = parseAuditPlanTemplateIds(plan.templateId);
    if (ids.length <= 1) return null;
    const data = parseAuditData(plan);
    const raw = data?.moduleProgressByTemplateId;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const map = raw as Record<string, unknown>;
    const percents = ids.map((id) => {
        const n = Number(map[id]);
        return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
    });
    // Only trust when at least one module key was actually stored.
    const hasAnyKey = ids.some((id) => Object.prototype.hasOwnProperty.call(map, id));
    return hasAnyKey ? percents : null;
}

/** Assessment progress stored on the plan (0–100). */
export function getAuditAssessmentProgress(plan: AuditPlanLike): number {
    const ids = parseAuditPlanTemplateIds(plan.templateId);
    // Multi-module: prefer live / stored module aggregate so one finished
    // checklist cannot mark the whole plan 100%.
    if (ids.length > 1) {
        if (plan.auditData != null) {
            return getPlanOverallChecklistProgress(plan).percent;
        }
        const stored = readStoredModulePercents(plan);
        if (stored) {
            const sum = stored.reduce((a, b) => a + b, 0);
            return Math.min(100, Math.max(0, Math.round(sum / stored.length)));
        }
    }
    // List APIs expose progress at the top level without shipping auditData.
    if (typeof plan?.progress === "number" && Number.isFinite(plan.progress)) {
        return Math.min(100, Math.max(0, Math.round(plan.progress)));
    }
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
    // List payloads send progress/auditCompleted without auditData/findingsData.
    // Do not recompute completion from empty findings (would false-complete open NCs).
    if (plan.auditData == null && plan.findingsData == null) {
        return false;
    }
    return computeAuditCompletionStatus(plan).auditCompleted;
}

/**
 * Lifecycle “Completed”: every applicable checklist/clause item has been assessed
 * (status COMPLETED or progress ≥ 100). Distinct from findings-closed `auditCompleted`.
 * Use this for dashboard Completed Audits / Upcoming filters and trend counts.
 */
export function isAuditLifecycleCompleted(plan: AuditPlanLike): boolean {
    return getAuditPlanStatusLabel(plan as AuditPlanLike & { id: number }) === "Completed";
}

export function getAuditPlanStatusLabel(
    plan: AuditPlanLike & { id: number },
): "Completed" | "In Progress" | "Planned" {
    const ids = parseAuditPlanTemplateIds(plan.templateId);

    // Multi-module: status depends on EVERY selected checklist, not one module.
    if (ids.length > 1) {
        const stored = readStoredModulePercents(plan);
        if (stored) {
            return lifecycleFromModulePercents(stored);
        }
        if (plan.auditData != null) {
            const { byModuleId } = getPlanOverallChecklistProgress(plan);
            return lifecycleFromModulePercents(ids.map((id) => byModuleId[id] ?? 0));
        }
    }

    // Prefer live progress so badges match assessment state even if status is stale.
    const progress = getAuditAssessmentProgress(plan);
    if (progress >= 100) return "Completed";

    const raw = String(plan.status ?? "").trim().toUpperCase();
    if (raw === "COMPLETED") return "Completed";
    if (progress > 0 || raw === "IN_PROGRESS" || raw === "IN PROGRESS") {
        return "In Progress";
    }
    if (raw === "PLANNED") return "Planned";
    return "Planned";
}
