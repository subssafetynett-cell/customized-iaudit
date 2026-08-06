/** Steps in the Audit Plan onboarding tour (Getting Started → Go to step). */
export const AUDIT_PLAN_TOUR_TOTAL_STEPS = 16;

export const AUDIT_PLAN_TOUR_STEP = {
  NAV: 1,
  PROGRAMS_LIST: 2,
  CREATE_PLAN: 3,
  AUDIT_NAME: 4,
  TEMPLATE: 5,
  DATE: 6,
  CRITERIA: 7,
  LOCATION: 8,
  AUDIT_TEAM: 9,
  SCHEDULE: 10,
  SCOPE: 11,
  OBJECTIVES: 12,
  ITINERARY: 13,
  ADD_ACTIVITY: 14,
  SAVE: 15,
  COMPLETE: 16,
} as const;

export const AUDIT_PLAN_TOUR_CONTEXT_KEY = "iaudit_audit_plan_tour_context";

export type AuditPlanTourStepConfig = {
  step: number;
  targetId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

export type AuditPlanTourContext = {
  execution: any;
  program: any;
  site: any;
  plan: any;
};

export function saveAuditPlanTourContext(ctx: AuditPlanTourContext) {
  try {
    sessionStorage.setItem(AUDIT_PLAN_TOUR_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    // ignore quota / private mode
  }
}

export function loadAuditPlanTourContext(): AuditPlanTourContext | null {
  try {
    const raw = sessionStorage.getItem(AUDIT_PLAN_TOUR_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuditPlanTourContext;
  } catch {
    return null;
  }
}

export function clearAuditPlanTourContext() {
  try {
    sessionStorage.removeItem(AUDIT_PLAN_TOUR_CONTEXT_KEY);
  } catch {
    // ignore
  }
}

export const AUDIT_PLAN_TOUR_STEPS: AuditPlanTourStepConfig[] = [
  {
    step: AUDIT_PLAN_TOUR_STEP.NAV,
    targetId: "tour-step-audit-plan-nav",
    title: "Audit Plan",
    description:
      "Open Audit Plan from the sidebar. Programs you created appear here, ready to turn into audit plans.",
    position: "right",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.PROGRAMS_LIST,
    targetId: "tour-step-audit-plans-list",
    title: "Your audit programs",
    description:
      "Use the site tabs above the list to choose which site’s plans to view. Created audit programs for that site are listed below—each card is a scheduled audit period. Review the list, then click Next to continue.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.CREATE_PLAN,
    targetId: "tour-step-create-plan-btn",
    title: "Create a plan",
    description:
      "Click Create Plan on a program card (or Next) to open the plan form for that audit period.",
    position: "top",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.AUDIT_NAME,
    targetId: "tour-step-audit-plan-name",
    title: "Audit name",
    description:
      "Enter a clear name for this audit plan (for example, Q1 Internal Audit). This name appears on the Audits page.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.TEMPLATE,
    targetId: "tour-step-audit-plan-template",
    title: "Audit template / modules",
    description:
      "Review the assigned modules from your program, or choose an audit template. This checklist drives the on-site audit.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.DATE,
    targetId: "tour-step-audit-plan-date",
    title: "Audit date",
    description: "Pick the date when this audit will be performed.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.CRITERIA,
    targetId: "tour-step-audit-plan-criteria",
    title: "Audit criteria",
    description:
      "Confirm the audit criteria (for example, ISO 9001:2015 or your module family).",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.LOCATION,
    targetId: "tour-step-audit-plan-location",
    title: "Location",
    description: "Enter the location or address where the audit will take place.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.AUDIT_TEAM,
    targetId: "tour-step-audit-plan-team",
    title: "Audit team",
    description:
      "Assign a lead auditor and other auditors who will run this audit.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.SCHEDULE,
    targetId: "tour-step-audit-plan-schedule",
    title: "Selected audit schedule",
    description:
      "Review the clauses or modules selected for this period from your audit program.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.SCOPE,
    targetId: "tour-step-audit-plan-scope",
    title: "Audit scope",
    description: "Describe what is included in the scope of this audit.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.OBJECTIVES,
    targetId: "tour-step-audit-plan-objective",
    title: "Audit objective",
    description: "State the objective of this audit—what you aim to verify or achieve.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.ITINERARY,
    targetId: "tour-step-audit-plan-itinerary",
    title: "Daily itinerary",
    description:
      "Review the suggested daily schedule. You can edit times, activities, and notes.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.ADD_ACTIVITY,
    targetId: "tour-step-add-activity-btn",
    title: "Add activity (optional)",
    description:
      "Optionally click Add Activity to insert another time slot. You can skip this and continue with Next.",
    position: "left",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.SAVE,
    targetId: "tour-step-save-audit-plan",
    title: "Save the audit plan",
    description:
      "Click Save Audit Plan to store your plan. The Next button will remind you — only the Save button saves and continues the tour.",
    position: "bottom",
  },
  {
    step: AUDIT_PLAN_TOUR_STEP.COMPLETE,
    targetId: "tour-step-created-audit-plan",
    title: "Audit plan ends here",
    description:
      "Your created audit plan is highlighted in the Audits list. This ends the Audit Plan step. Next is Audits — open Start Onboarding and click Go to step on Audits to continue.",
    position: "bottom",
  },
];

export function getAuditPlanTourStepConfig(
  step: number,
): AuditPlanTourStepConfig | undefined {
  return AUDIT_PLAN_TOUR_STEPS.find((s) => s.step === step);
}
