/** Steps in the "Start auditing" tour (Audit Program workflow). */
export const AUDIT_TOUR_TOTAL_STEPS = 16;

export const AUDIT_TOUR_STEP = {
  NAV: 1,
  CREATE: 2,
  AUDIT_NAME: 3,
  CRITERIA_TYPE: 4,
  FREQUENCY: 5,
  START_MONTH: 6,
  START_YEAR: 7,
  DURATION: 8,
  SITE: 9,
  DEPARTMENTS: 10,
  AUDITORS: 11,
  GENERATE_SCHEDULE: 12,
  TIMELINE: 13,
  SCHEDULE_MATRIX: 14,
  SAVE_PROGRAM: 15,
  COMPLETE: 16,
} as const;

export type AuditTourStepConfig = {
  step: number;
  targetId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

export const AUDIT_TOUR_STEPS: AuditTourStepConfig[] = [
  {
    step: AUDIT_TOUR_STEP.NAV,
    targetId: "tour-step-audit-program-nav",
    title: "Start auditing — Audit Program",
    description:
      "Open Audit Program from the sidebar. This is where you plan and schedule ISO audits across multiple periods.",
    position: "right",
  },
  {
    step: AUDIT_TOUR_STEP.CREATE,
    targetId: "tour-step-create-program",
    title: "Create Audit Program",
    description:
      "On the Audit Program page, click Create Audit Program to start building your first program.",
    position: "bottom",
  },
  {
    step: AUDIT_TOUR_STEP.AUDIT_NAME,
    targetId: "audit-name",
    title: "Audit name",
    description:
      "Enter a clear name for this program (for example, Annual Quality Audit). This name appears throughout your auditing workflow.",
    position: "left",
  },
  {
    step: AUDIT_TOUR_STEP.CRITERIA_TYPE,
    targetId: "tour-step-audit-criteria-type",
    title: "Audit criteria type",
    description:
      "Choose how audit criteria are defined. If you select ISO Standards, pick one or more standards below. If you select Audit Modules, choose EOSH Audit Checklist or QFS KORE Audit Checklist.",
    position: "right",
  },
  {
    step: AUDIT_TOUR_STEP.FREQUENCY,
    targetId: "tour-step-audit-frequency-trigger",
    title: "Frequency",
    description:
      "Select how often audits run within each year. This determines how many audit periods are generated.",
    position: "left",
  },
  {
    step: AUDIT_TOUR_STEP.START_MONTH,
    targetId: "tour-step-audit-start-month-trigger",
    title: "Start month",
    description:
      "Pick the month your first audit period begins. Together with the start year, this anchors your program timeline.",
    position: "left",
  },
  {
    step: AUDIT_TOUR_STEP.START_YEAR,
    targetId: "tour-step-audit-start-year-trigger",
    title: "Start year",
    description:
      "Select the calendar year when the program starts. Schedule periods are generated forward from this date.",
    position: "left",
  },
  {
    step: AUDIT_TOUR_STEP.DURATION,
    targetId: "tour-step-audit-duration-trigger",
    title: "Duration (years)",
    description:
      "Select how many years this audit program should cover. The timeline and clause grid span this duration.",
    position: "left",
  },
  {
    step: AUDIT_TOUR_STEP.SITE,
    targetId: "tour-step-audit-site-trigger",
    title: "Site",
    description:
      "Select the site where this audit program applies. Departments are shown next based on this site selection.",
    position: "left",
  },
  {
    step: AUDIT_TOUR_STEP.DEPARTMENTS,
    targetId: "tour-step-audit-departments",
    title: "Departments",
    description:
      "Select the departments within your chosen site that this program covers. Use Select all to include every department, or pick individual teams.",
    position: "top",
  },
  {
    step: AUDIT_TOUR_STEP.AUDITORS,
    targetId: "tour-step-audit-auditors",
    title: "Auditors",
    description:
      "Assign auditors who will run this program. When you select more than one auditor, designate a lead auditor in the section below.",
    position: "top",
  },
  {
    step: AUDIT_TOUR_STEP.GENERATE_SCHEDULE,
    targetId: "tour-step-generate-schedule",
    title: "Generate schedule",
    description:
      "When the form is complete, click Generate Schedule. A timeline and clause grid are created from your criteria, frequency, and duration.",
    position: "top",
  },
  {
    step: AUDIT_TOUR_STEP.TIMELINE,
    targetId: "tour-step-program-timeline",
    title: "Program timeline",
    description:
      "Review the generated timeline—it shows your audit periods across the selected years (for example, bi-annual Jan/Jul slots).",
    position: "bottom",
  },
  {
    step: AUDIT_TOUR_STEP.SCHEDULE_MATRIX,
    targetId: "tour-step-schedule-matrix",
    title: "Select audit months",
    description:
      "Click the checkboxes in the grid to choose which clauses to audit in each period (month). Green checkmarks mark your selections. Drag this popover aside if it covers any checkboxes.",
    position: "left",
  },
  {
    step: AUDIT_TOUR_STEP.SAVE_PROGRAM,
    targetId: "tour-step-save-program",
    title: "Create the program",
    description:
      "After selecting at least one clause in the schedule, click Create Program to save your configured audit program.",
    position: "left",
  },
  {
    step: AUDIT_TOUR_STEP.COMPLETE,
    targetId: "tour-step-created-program",
    title: "Audit program ends here",
    description:
      "Your created audit program is highlighted in the list below. This ends the Audit Program step. Next is Audit Plan — open Start Onboarding and click Go to step on Audit Plan to continue.",
    position: "bottom",
  },
];

export function getAuditTourStepConfig(step: number): AuditTourStepConfig | undefined {
  return AUDIT_TOUR_STEPS.find((s) => s.step === step);
}
