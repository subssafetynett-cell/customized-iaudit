/** Steps in the Audits onboarding tour (Getting Started → Go to step). */
export const AUDIT_EXECUTE_TOUR_TOTAL_STEPS = 6;

export type AuditExecuteTourStepConfig = {
    step: number;
    targetId: string;
    title: string;
    description: string;
    position?: "top" | "bottom" | "left" | "right" | "center";
};

export const AUDIT_EXECUTE_TOUR_STEPS: AuditExecuteTourStepConfig[] = [
    {
        step: 1,
        targetId: "tour-step-audit-nav",
        title: "Audits",
        description:
            "Open Audits from the sidebar. Saved audit plans from your programs appear here, ready to run on site.",
        position: "right",
    },
    {
        step: 2,
        targetId: "tour-step-audit-plans-list",
        title: "Your audit plans",
        description:
            "Created plans are listed on this page. Each row shows the plan name, site, date, lead auditor, status, and progress.",
        position: "top",
    },
    {
        step: 3,
        targetId: "tour-step-start-audit-eye",
        title: "Start the audit",
        description:
            "Click the perform audit button to open the audit execution screen and work through the checklist for this plan.",
        position: "left",
    },
    {
        step: 4,
        targetId: "tour-step-audit-execute-overview",
        title: "Run the audit",
        description:
            "Review plan details, then complete checklist items, record findings, and attach evidence as you audit.",
        position: "bottom",
    },
    {
        step: 5,
        targetId: "tour-step-save-audit-progress",
        title: "Save audit progress",
        description:
            "Click Save Audit Progress to store your answers and findings. You can return later to continue where you left off.",
        position: "top",
    },
    {
        step: 6,
        targetId: "viewport",
        title: "Audit step complete",
        description:
            "You have learned how to run an audit in iAudit. Next, review findings and use audit templates as needed.",
        position: "center",
    },
];

export function getAuditExecuteTourStepConfig(
    step: number,
): AuditExecuteTourStepConfig | undefined {
    return AUDIT_EXECUTE_TOUR_STEPS.find((s) => s.step === step);
}
