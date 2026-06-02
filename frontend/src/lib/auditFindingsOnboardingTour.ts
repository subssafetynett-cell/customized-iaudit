/** Steps in the Findings onboarding tour (Getting Started → Go to step). */
export const AUDIT_FINDINGS_TOUR_TOTAL_STEPS = 5;

export type AuditFindingsTourStepConfig = {
    step: number;
    targetId: string;
    title: string;
    description: string;
    position?: "top" | "bottom" | "left" | "right" | "center";
};

export const AUDIT_FINDINGS_TOUR_STEPS: AuditFindingsTourStepConfig[] = [
    {
        step: 1,
        targetId: "tour-step-findings-nav",
        title: "Findings",
        description:
            "Open Findings from the sidebar. Every OFI, minor non-conformance, and major non-conformance recorded during audits is collected here.",
        position: "right",
    },
    {
        step: 2,
        targetId: "tour-step-findings-summary",
        title: "Finding types at a glance",
        description:
            "Summary cards show how many OFI, Minor N/C, and Major N/C findings you have. Click a card to filter the list by that type.",
        position: "bottom",
    },
    {
        step: 3,
        targetId: "tour-step-findings-filters",
        title: "Filter and search",
        description:
            "Use the tabs to view all findings or only one type. Search by audit name, clause, or description to find a specific item quickly.",
        position: "bottom",
    },
    {
        step: 4,
        targetId: "tour-step-findings-list",
        title: "All findings listed",
        description:
            "All findings from your audits appear in this table. Open a row to review details, edit corrective actions, or export reports.",
        position: "top",
    },
    {
        step: 5,
        targetId: "viewport",
        title: "Findings step complete",
        description:
            "You know how to review audit findings in iAudit. Next, explore audit templates to standardize future audits.",
        position: "center",
    },
];

export function getAuditFindingsTourStepConfig(
    step: number,
): AuditFindingsTourStepConfig | undefined {
    return AUDIT_FINDINGS_TOUR_STEPS.find((s) => s.step === step);
}
