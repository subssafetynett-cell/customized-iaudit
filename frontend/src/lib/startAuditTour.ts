import type { NavigateFunction } from "react-router-dom";

/** Start the "Start auditing" tour on Audit Program (from Getting Started → Take tour). */
export function startAuditTour(navigate: NavigateFunction): void {
  navigate("/audits?auditTour=true&auditStep=1");
}
