/** Steps in the Audit Plan onboarding tour (Getting Started → Go to step). */
export const AUDIT_PLAN_TOUR_TOTAL_STEPS = 8;

export type AuditPlanTourStepConfig = {
    step: number;
    targetId: string;
    title: string;
    description: string;
    position?: "top" | "bottom" | "left" | "right" | "center";
};

export const AUDIT_PLAN_TOUR_STEPS: AuditPlanTourStepConfig[] = [
    {
        step: 1,
        targetId: "tour-step-audit-plan-nav",
        title: "Audit Plan",
        description:
            "Open Audit Plan from the sidebar. Programs you created appear here, ready to turn into audit plans.",
        position: "right",
    },
    {
        step: 2,
        targetId: "tour-step-audit-plans-list",
        title: "Your audit programs",
        description:
            "Created audit programs are listed on this page—each card is a scheduled audit period from your program.",
        position: "top",
    },
    {
        step: 3,
        targetId: "tour-step-create-plan-btn",
        title: "Create a plan",
        description:
            "Click Create Plan on a program card to open the plan form for that audit period.",
        position: "top",
    },
    {
        step: 4,
        targetId: "tour-step-audit-plan-form",
        title: "Fill in the fields",
        description:
            "Enter the audit name, date, criteria, and location. Scope and objectives can be refined below.",
        position: "top",
    },
    {
        step: 5,
        targetId: "tour-step-audit-plan-template",
        title: "Select a template",
        description:
            "Choose an audit template that matches your ISO standard—the checklist drives your on-site audit.",
        position: "top",
    },
    {
        step: 6,
        targetId: "tour-step-add-activity-btn",
        title: "Plan the daily itinerary",
        description:
            "Click Add Activity to add time slots, then fill in each row. Drag rows to reorder your daily schedule.",
        position: "top",
    },
    {
        step: 7,
        targetId: "tour-step-save-audit-plan",
        title: "Save the audit plan",
        description:
            "When everything looks good, click Save Audit Plan to store your plan and continue to running audits.",
        position: "left",
    },
    {
        step: 8,
        targetId: "viewport",
        title: "Audit plan step complete",
        description:
            "You have finished creating an audit plan. Next, run audits from the Audits page and track findings.",
        position: "center",
    },
];

export function getAuditPlanTourStepConfig(
    step: number,
): AuditPlanTourStepConfig | undefined {
    return AUDIT_PLAN_TOUR_STEPS.find((s) => s.step === step);
}
