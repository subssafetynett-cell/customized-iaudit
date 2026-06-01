/** Steps in the "Start auditing" tour (Audit Program workflow). */
export const AUDIT_TOUR_TOTAL_STEPS = 8;

export type AuditTourStepConfig = {
  step: number;
  targetId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

export const AUDIT_TOUR_STEPS: AuditTourStepConfig[] = [
  {
    step: 1,
    targetId: "tour-step-audit-program-nav",
    title: "Start auditing — Audit Program",
    description:
      "Open Audit Program from the sidebar. This is where you plan and schedule ISO audits across multiple periods.",
    position: "right",
  },
  {
    step: 2,
    targetId: "tour-step-create-program",
    title: "Create Audit Program",
    description:
      "On the Audit Program page, click Create Audit Program to start building your first program.",
    position: "bottom",
  },
  {
    step: 3,
    targetId: "tour-step-audit-program-form",
    title: "Fill in program details",
    description:
      "Enter the audit name, select ISO standard(s), set frequency and duration, choose a site, and assign auditors.",
    position: "top",
  },
  {
    step: 4,
    targetId: "tour-step-generate-schedule",
    title: "Generate schedule",
    description:
      "When the form is complete, click Generate Schedule. A timeline and clause grid are created from your ISO standard and frequency.",
    position: "top",
  },
  {
    step: 5,
    targetId: "tour-step-program-timeline",
    title: "Program timeline",
    description:
      "Review the generated timeline—it shows your audit periods across the selected years (for example, bi-annual Jan/Jul slots).",
    position: "bottom",
  },
  {
    step: 6,
    targetId: "tour-step-schedule-matrix",
    title: "Select audit months",
    description:
      "Click the checkboxes in the grid to choose which clauses to audit in each period (month). Green checkmarks mark your selections.",
    position: "top",
  },
  {
    step: 7,
    targetId: "tour-step-save-program",
    title: "Create the program",
    description:
      "After selecting at least one clause in the schedule, click Create Program to save your configured audit program.",
    position: "left",
  },
  {
    step: 8,
    targetId: "viewport",
    title: "First auditing step complete",
    description:
      "You have finished the first step of auditing—creating an audit program. Next you can continue with Audit Plan and running audits.",
    position: "center",
  },
];

export function getAuditTourStepConfig(step: number): AuditTourStepConfig | undefined {
  return AUDIT_TOUR_STEPS.find((s) => s.step === step);
}
