/** Steps in the Company Setup onboarding tour. */
export const COMPANY_TOUR_TOTAL_STEPS = 9;

export const COMPANY_TOUR_STEP = {
  NAV: 1,
  CREATE_BTN: 2,
  MODAL: 3,
  AUTOFILL: 4,
  SUBMIT: 5,
  LIST: 6,
  EDIT: 7,
  DELETE: 8,
  COMPLETE: 9,
} as const;

export const COMPANY_TOUR_CONTEXT_KEY = "iaudit_company_tour_context";

export type CompanyTourStepConfig = {
  step: number;
  targetId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
};

export type CompanyTourContext = {
  // We can store any state needed across steps, e.g. the mock company ID
  demoCompanyId?: string;
};

export function saveCompanyTourContext(ctx: CompanyTourContext) {
  try {
    sessionStorage.setItem(COMPANY_TOUR_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    // ignore quota / private mode
  }
}

export function loadCompanyTourContext(): CompanyTourContext | null {
  try {
    const raw = sessionStorage.getItem(COMPANY_TOUR_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CompanyTourContext;
  } catch {
    return null;
  }
}

export function clearCompanyTourContext() {
  try {
    sessionStorage.removeItem(COMPANY_TOUR_CONTEXT_KEY);
  } catch {
    // ignore
  }
}

export const COMPANY_TOUR_STEPS: CompanyTourStepConfig[] = [
  {
    step: COMPANY_TOUR_STEP.NAV,
    targetId: "tour-step-companies",
    title: "Welcome!",
    description:
      "Let's start by setting up your first company. Click here to open the Company module.",
    position: "right",
  },
  {
    step: COMPANY_TOUR_STEP.CREATE_BTN,
    targetId: "tour-step-create-company-btn",
    title: "Create Your Company",
    description:
      "Click this button to create your first company.",
    position: "top",
  },
  {
    step: COMPANY_TOUR_STEP.MODAL,
    targetId: "tour-step-company-form",
    title: "Company Details",
    description:
      "Fill in all the required company information. We'll automatically demonstrate the process for you. Click Next to watch.",
    position: "right",
  },
  {
    step: COMPANY_TOUR_STEP.AUTOFILL,
    targetId: "tour-step-company-form",
    title: "Filling out details...",
    description:
      "We are simulating the data entry for a new company. Watch as the form populates automatically.",
    position: "right",
  },
  {
    step: COMPANY_TOUR_STEP.SUBMIT,
    targetId: "tour-step-company-submit",
    title: "Create Company",
    description:
      "Click here to create your company.",
    position: "top",
  },
  {
    step: COMPANY_TOUR_STEP.LIST,
    targetId: "tour-step-company-list-item",
    title: "Your New Company",
    description:
      "Your created company now appears in the list! Notice the details we filled in.",
    position: "bottom",
  },
  {
    step: COMPANY_TOUR_STEP.EDIT,
    targetId: "tour-step-edit-company",
    title: "Edit Company",
    description:
      "Use this button whenever you need to update your company information.",
    position: "bottom",
  },
  {
    step: COMPANY_TOUR_STEP.DELETE,
    targetId: "tour-step-delete-company",
    title: "Manage Company",
    description:
      "From here you can edit or remove companies when necessary. Click Next to finish.",
    position: "bottom",
  },
  {
    step: COMPANY_TOUR_STEP.COMPLETE,
    targetId: "viewport", // Centered modal
    title: "🎉 Company Setup Complete!",
    description:
      "Great job! You've successfully learned how to create and manage your company. Next we'll guide you through creating your first Audit Program.",
    position: "center",
  },
];

export function getCompanyTourStepConfig(
  step: number,
): CompanyTourStepConfig | undefined {
  return COMPANY_TOUR_STEPS.find((s) => s.step === step);
}
