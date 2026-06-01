import type { NavigateFunction } from "react-router-dom";

/** Start the Audits onboarding tour (Getting Started → Go to step). */
export function startAuditExecuteTour(navigate: NavigateFunction): void {
    navigate("/audit?auditExecuteTour=true&auditExecuteStep=1");
}
