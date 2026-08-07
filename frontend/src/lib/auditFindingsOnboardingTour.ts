/** Steps in the Findings onboarding tour (Getting Started → Go to step). */
export const AUDIT_FINDINGS_TOUR_TOTAL_STEPS = 11;

export const AUDIT_FINDINGS_TOUR_STEP = {
  NAV: 1,
  SUMMARY: 2,
  FILTERS: 3,
  LIST: 4,
  VIEW: 5,
  DETAILS: 6,
  RESPOND: 7,
  CAPA_FORM: 8,
  SAVE_DRAFT: 9,
  SEND: 10,
  COMPLETE: 11,
} as const;

export type FindingsTourPath = "assigned" | "raised";

const FINDINGS_TOUR_PATH_KEY = "auditFindingsTourPath";

export type AuditFindingsTourStepConfig = {
  step: number;
  targetId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

export const AUDIT_FINDINGS_TOUR_STEPS: AuditFindingsTourStepConfig[] = [
  {
    step: AUDIT_FINDINGS_TOUR_STEP.NAV,
    targetId: "tour-step-findings-nav",
    title: "Findings",
    description:
      "Open Findings from the sidebar. Every OFI, minor non-conformance, and major non-conformance recorded during audits is collected here.",
    position: "right",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.SUMMARY,
    targetId: "tour-step-findings-summary",
    title: "Finding types at a glance",
    description:
      "Summary cards show how many OFI and NC findings you have. Click a card to filter the list by that type.",
    position: "bottom",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.FILTERS,
    targetId: "tour-step-findings-filters",
    title: "Filter and search",
    description:
      "Use the tabs to view all findings or only one type. Search by audit name, clause, or description to find a specific item quickly.",
    position: "bottom",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.LIST,
    targetId: "tour-step-findings-list",
    title: "All findings listed",
    description:
      "Switch between Assign to me and Raised by me above the table. Assign to me shows findings waiting on your action; Raised by me shows findings you opened. The table lists matching findings — use View to open one.",
    position: "top",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.VIEW,
    targetId: "tour-step-findings-view",
    title: "Open a finding",
    description:
      "Click View on a finding row to open its details. The tour continues on the finding details page.",
    position: "left",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.DETAILS,
    targetId: "tour-step-finding-details",
    title: "Finding details",
    description:
      "Review overview fields, evidence, and notes for the selected finding. Use Next to continue.",
    position: "left",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.RESPOND,
    targetId: "tour-step-respond-findings",
    title: "Respond findings",
    description:
      "When a finding is assigned to you, click Respond findings to open the CAPA / RCA response form.",
    position: "left",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.CAPA_FORM,
    targetId: "tour-step-capa-form",
    title: "Respond to finding — CAPA / RCA form",
    description:
      "Fill in the CAPA / RCA form details (sections A–E, evidence, and verification). Use Next when you are ready to see how to save or send.",
    position: "left",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.SAVE_DRAFT,
    targetId: "tour-step-capa-save-draft",
    title: "Save as Draft",
    description:
      "Save as Draft stores your CAPA / RCA progress without sending it to the reporter yet.",
    position: "top",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.SEND,
    targetId: "tour-step-capa-send",
    title: "Send to Reporter",
    description:
      "Send to Reporter submits your completed response back to the person who raised the finding.",
    position: "top",
  },
  {
    step: AUDIT_FINDINGS_TOUR_STEP.COMPLETE,
    targetId: "tour-step-nonconformances-nav",
    title: "Open Findings Dashboard",
    description:
      "Findings Dashboard summarises open, responded, accepted, and closed findings with charts and status cards so you can track follow-up across your organisation. Click Next to open it.",
    position: "right",
  },
];

export function getAuditFindingsTourStepConfig(
  step: number,
): AuditFindingsTourStepConfig | undefined {
  return AUDIT_FINDINGS_TOUR_STEPS.find((s) => s.step === step);
}

export function saveFindingsTourPath(path: FindingsTourPath): void {
  try {
    sessionStorage.setItem(FINDINGS_TOUR_PATH_KEY, path);
  } catch {
    /* ignore */
  }
}

export function loadFindingsTourPath(): FindingsTourPath | null {
  try {
    const v = sessionStorage.getItem(FINDINGS_TOUR_PATH_KEY);
    if (v === "assigned" || v === "raised") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearFindingsTourPath(): void {
  try {
    sessionStorage.removeItem(FINDINGS_TOUR_PATH_KEY);
  } catch {
    /* ignore */
  }
}

/** Raised-by-me path skips respond/CAPA steps (7–10). */
export function getNextFindingsTourStep(
  current: number,
  path: FindingsTourPath | null,
): number {
  if (current >= AUDIT_FINDINGS_TOUR_STEP.COMPLETE) {
    return AUDIT_FINDINGS_TOUR_STEP.COMPLETE;
  }
  if (
    current === AUDIT_FINDINGS_TOUR_STEP.DETAILS &&
    path === "raised"
  ) {
    return AUDIT_FINDINGS_TOUR_STEP.COMPLETE;
  }
  return current + 1;
}

export function getPrevFindingsTourStep(
  current: number,
  path: FindingsTourPath | null,
): number {
  if (current <= AUDIT_FINDINGS_TOUR_STEP.NAV) {
    return AUDIT_FINDINGS_TOUR_STEP.NAV;
  }
  if (
    current === AUDIT_FINDINGS_TOUR_STEP.COMPLETE &&
    path === "raised"
  ) {
    return AUDIT_FINDINGS_TOUR_STEP.DETAILS;
  }
  return current - 1;
}
