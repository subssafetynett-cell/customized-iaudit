import type { NavigateFunction } from "react-router-dom";

/** Start the Audit Templates onboarding tour (Getting Started → Go to step). */
export function startAuditTemplatesTour(navigate: NavigateFunction): void {
    navigate("/audit-templates?auditTemplatesTour=true&auditTemplatesStep=1");
}
