/** Returns true when the user has saved at least one audit program. */
export function isAuditProgramComplete(programs: unknown[]): boolean {
    return Array.isArray(programs) && programs.length > 0;
}

/** Saved audit plan with template and core fields filled in. */
export function isAuditPlanComplete(plans: any[]): boolean {
    return plans.some(
        (p) => !!(p?.templateId && p?.auditName && (p?.date || p?.location)),
    );
}

/** User has started or progressed an audit execution. */
export function isAuditsStepComplete(plans: any[]): boolean {
    return plans.some((p) => {
        if (typeof p?.progress === "number" && p.progress > 0) return true;
        if (!p?.auditData) return false;
        try {
            const data =
                typeof p.auditData === "string" ? JSON.parse(p.auditData) : p.auditData;
            return !!data && typeof data === "object" && Object.keys(data).length > 0;
        } catch {
            return false;
        }
    });
}

/** At least one non-conformance / finding recorded on a plan. */
export function isFindingsStepComplete(plans: any[]): boolean {
    return plans.some((p) => planHasRecordedFindings(p));
}

function planHasRecordedFindings(plan: any): boolean {
    if (plan?.findingsData) {
        try {
            const fd =
                typeof plan.findingsData === "string"
                    ? JSON.parse(plan.findingsData)
                    : plan.findingsData;
            if (fd && typeof fd === "object" && Object.keys(fd).length > 0) return true;
        } catch {
            // ignore parse errors
        }
    }
    if (!plan?.auditData) return false;
    try {
        const raw =
            typeof plan.auditData === "string"
                ? plan.auditData
                : JSON.stringify(plan.auditData);
        return /"OFI"|"Minor"|"Major"|non-conformance|nonconformance/i.test(raw);
    } catch {
        return false;
    }
}

/** User attached a checklist template when building an audit plan. */
export function isAuditTemplatesStepComplete(plans: any[]): boolean {
    return plans.some((p) => !!p?.templateId);
}

export type AuditWorkflowCompletion = Record<
    | "audit-program"
    | "audit-plan"
    | "audits"
    | "findings"
    | "audit-templates",
    boolean
>;

export function computeAuditWorkflowCompletion(
    programs: unknown[],
    plans: any[],
): AuditWorkflowCompletion {
    return {
        "audit-program": isAuditProgramComplete(programs),
        "audit-plan": isAuditPlanComplete(plans),
        audits: isAuditsStepComplete(plans),
        findings: isFindingsStepComplete(plans),
        "audit-templates": isAuditTemplatesStepComplete(plans),
    };
}
