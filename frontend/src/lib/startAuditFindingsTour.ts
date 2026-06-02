import type { NavigateFunction } from "react-router-dom";

/** Start the Findings onboarding tour (Getting Started → Go to step). */
export function startAuditFindingsTour(navigate: NavigateFunction): void {
    navigate("/audit-findings?auditFindingsTour=true&auditFindingsStep=1");
}
