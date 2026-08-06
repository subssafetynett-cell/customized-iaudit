/** Steps in the Audits onboarding tour (Getting Started → Go to step). */
export const AUDIT_EXECUTE_TOUR_TOTAL_STEPS = 22;

export const AUDIT_EXECUTE_TOUR_STEP = {
  NAV: 1,
  LIST: 2,
  START: 3,
  OVERVIEW: 4,
  AUDIT_DETAILS: 5,
  FINDINGS_REPORT: 6,
  PREVIOUS_FINDINGS: 7,
  DETAILS_OF_CHANGES: 8,
  NATIONAL_FINDINGS: 9,
  OFI: 10,
  NCR: 11,
  AUDITEE_FIELDS: 12,
  CHECKLIST: 13,
  REPORT_SUMMARY: 14,
  AUDIT_SUMMARY: 15,
  SUMMARY_NC: 16,
  GENERAL_COMMENT: 17,
  KEY_PERSONNEL: 18,
  ACKNOWLEDGEMENT: 19,
  PROGRESS: 20,
  SAVE: 21,
  COMPLETE_LIST: 22,
} as const;

export type AuditExecuteTourStepConfig = {
  step: number;
  targetId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

export const AUDIT_EXECUTE_TOUR_STEPS: AuditExecuteTourStepConfig[] = [
  {
    step: AUDIT_EXECUTE_TOUR_STEP.NAV,
    targetId: "tour-step-audit-nav",
    title: "Audits",
    description:
      "Open Audits from the sidebar. Saved audit plans from your programs appear here, ready to run on site.",
    position: "right",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.LIST,
    targetId: "tour-step-audit-plans-list",
    title: "Your active audit List",
    description:
      "Plans are listed by status — Planned, In Progress, and Completed. Use those tabs to filter the list. Each row shows the plan name, site, date, lead auditor, and status. Use Perform Audit to start working, or download the report. Click Next to go to the Perform Audit step.",
    position: "top",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.START,
    targetId: "tour-step-start-audit-eye",
    title: "Start the audit",
    description:
      "Click the perform audit button to open the audit execution screen and work through the checklist for this plan.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.OVERVIEW,
    targetId: "tour-step-audit-execute-overview",
    title: "Run the audit",
    description:
      "This is Plan Overview — plan name, site, date, and lead auditor. Next we walk through each section of the audit form.",
    position: "bottom",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.AUDIT_DETAILS,
    targetId: "tour-step-audit-details",
    title: "Audit Details",
    description:
      "Review objective, scope, and audit criteria for this plan before recording findings.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.FINDINGS_REPORT,
    targetId: "tour-step-audit-findings-report",
    title: "Audit Findings Report",
    description:
      "Complete the Audit Findings Report header fields before working through the checklist.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.PREVIOUS_FINDINGS,
    targetId: "tour-step-previous-findings",
    title: "Previous Audit Findings",
    description:
      "Record closure of findings from the previous audit in this section.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.DETAILS_OF_CHANGES,
    targetId: "tour-step-details-of-changes",
    title: "Details of Changes",
    description:
      "Note any organisational or process changes since the last audit.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.NATIONAL_FINDINGS,
    targetId: "tour-step-national-findings-log",
    title: "National Findings Log",
    description:
      "National Findings Log starts here with Positive Aspects. OFI and NCR are covered in the next steps.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.OFI,
    targetId: "tour-step-opportunities",
    title: "Opportunities for Improvement (OFI)",
    description:
      "Capture opportunities for improvement here — clause, area/process, and opportunity details.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.NCR,
    targetId: "tour-step-nonconformances",
    title: "Non-conformances (NCR)",
    description:
      "Log non-conformances with clause, area/process, statement, due date, and action by.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.AUDITEE_FIELDS,
    targetId: "tour-step-auditee-fields",
    title: "Auditee details",
    description:
      "Fill Auditee name, Audit done by, and Auditee dept (or equivalent fields) before scoring the checklist.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.CHECKLIST,
    targetId: "tour-step-checklist-questions",
    title: "Checklist questions",
    description:
      "Work through each checklist question — record findings, evidence, and scores as you audit.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.REPORT_SUMMARY,
    targetId: "tour-step-report-summary",
    title: "Report Summary & Sign-off",
    description:
      "After the checklist, complete Report Summary & Sign-off — sections 4 and 5 of the findings report.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.AUDIT_SUMMARY,
    targetId: "tour-step-audit-summary",
    title: "Audit Summary",
    description: "Section 4 — Audit Summary introduces the closing narrative of the report.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.SUMMARY_NC,
    targetId: "tour-step-summary-nc",
    title: "Summary of Non-conformities",
    description:
      "Section 4.1 lists nonconformities pulled from your NCR table above.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.GENERAL_COMMENT,
    targetId: "tour-step-general-comment",
    title: "General comment",
    description: "Section 4.2 — add general comments about the audit.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.KEY_PERSONNEL,
    targetId: "tour-step-key-personnel",
    title: "Key personnel interviewed",
    description: "Section 4.3 — list key personnel interviewed during the audit.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.ACKNOWLEDGEMENT,
    targetId: "tour-step-acknowledgement",
    title: "Acknowledgement of Findings",
    description:
      "Section 5 — capture auditee and auditor signatures and dates to acknowledge findings.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.PROGRESS,
    targetId: "tour-step-audit-progress",
    title: "Progress",
    description:
      "Track completion at the top — total items, completed, and pending update as you work.",
    position: "left",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.SAVE,
    targetId: "tour-step-save-audit-progress",
    title: "Save audit progress",
    description:
      "Click Save Audit Progress to store your answers and findings. The tour continues after a successful save.",
    position: "top",
  },
  {
    step: AUDIT_EXECUTE_TOUR_STEP.COMPLETE_LIST,
    targetId: "tour-step-audit-plans-list",
    title: "Audit step ends here",
    description:
      "Your audits appear again on the Audit Active List. Click Next to return to Start Onboarding — Findings will be highlighted so you can open that step.",
    position: "bottom",
  },
];

export function getAuditExecuteTourStepConfig(
  step: number,
): AuditExecuteTourStepConfig | undefined {
  return AUDIT_EXECUTE_TOUR_STEPS.find((s) => s.step === step);
}
