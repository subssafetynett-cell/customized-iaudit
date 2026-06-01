import type { NavigateFunction } from "react-router-dom";

/** Start the Audit Plan onboarding tour (Getting Started → Go to step). */
export function startAuditPlanTour(navigate: NavigateFunction): void {
    navigate("/audit-program?auditPlanTour=true&auditPlanStep=1");
}
