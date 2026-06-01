/** Steps in the Audit Templates onboarding tour (Getting Started → Go to step). */
export const AUDIT_TEMPLATES_TOUR_TOTAL_STEPS = 16;

/** Last step shown on the templates list page before opening a template. */
export const AUDIT_TEMPLATES_LIST_MAX_STEP = 5;

export type AuditTemplatesTourStepConfig = {
    step: number;
    targetId: string;
    title: string;
    description: string;
    position?: "top" | "bottom" | "left" | "right" | "center";
};

export const AUDIT_TEMPLATES_TOUR_STEPS: AuditTemplatesTourStepConfig[] = [
    {
        step: 1,
        targetId: "tour-step-audit-templates-nav",
        title: "Audit Templates",
        description:
            "Open Audit Templates from the sidebar. Reusable checklists help you standardize audits across your organization.",
        position: "right",
    },
    {
        step: 2,
        targetId: "tour-step-audit-templates-header",
        title: "Choose a template",
        description:
            "Select a template to start a new audit. Each template defines the checklist structure, standards, and question set for your audit plans.",
        position: "bottom",
    },
    {
        step: 3,
        targetId: "tour-step-audit-templates-filters",
        title: "Search and filter",
        description:
            "Search by name or description, or filter by ISO standard to find the right template for your next audit.",
        position: "bottom",
    },
    {
        step: 4,
        targetId: "tour-step-audit-templates-grid",
        title: "Available templates",
        description:
            "All templates are listed here. Each card shows the standard, type, and number of questions or sections included.",
        position: "top",
    },
    {
        step: 5,
        targetId: "tour-step-audit-templates-view",
        title: "View the template",
        description:
            "Click View to open the template and walk through the audit checklist, record findings, and attach evidence.",
        position: "top",
    },
    {
        step: 6,
        targetId: "tour-step-template-execute-header",
        title: "Template overview",
        description:
            "This is the audit checklist for the template you selected. Review the title, standard, and scope before filling in responses.",
        position: "bottom",
    },
    {
        step: 7,
        targetId: "tour-step-template-previous-findings",
        title: "Previous audit findings",
        description:
            "Record closure of findings from the previous audit. Summarize what was addressed before starting this audit.",
        position: "bottom",
    },
    {
        step: 8,
        targetId: "tour-step-template-details-changes",
        title: "Details of changes",
        description:
            "Track changes to scope, boundary, documentation, and other EMS elements. Mark action required and add notes for each row.",
        position: "top",
    },
    {
        step: 9,
        targetId: "tour-step-template-participants",
        title: "Audit participants",
        description:
            "List who took part in the audit—names, roles, opening/closing meetings, and processes interviewed.",
        position: "top",
    },
    {
        step: 10,
        targetId: "tour-step-template-audit-findings",
        title: "Audit findings summary",
        description:
            "Capture positive aspects, opportunities for improvement, and non-conformances identified during the audit.",
        position: "top",
    },
    {
        step: 11,
        targetId: "tour-step-template-checklist",
        title: "Audit checklist",
        description:
            "Work through each clause and audit question. Answer every item to build a complete record of your audit.",
        position: "top",
    },
    {
        step: 12,
        targetId: "tour-step-template-finding-buttons",
        title: "Record findings",
        description:
            "Mark each item as Compliant (C), Opportunity for Improvement (OFI), Minor N/C, or Major N/C based on your audit results.",
        position: "left",
    },
    {
        step: 13,
        targetId: "tour-step-template-audit-evidence",
        title: "Audit evidence",
        description:
            "Enter audit evidence describing documented information and records you reviewed for this clause.",
        position: "left",
    },
    {
        step: 14,
        targetId: "tour-step-template-upload-evidence",
        title: "Upload evidence",
        description:
            "Attach images, documents, or PDFs as supporting evidence for the clause group you just completed.",
        position: "top",
    },
    {
        step: 15,
        targetId: "tour-step-template-submit-audit",
        title: "Submit audit",
        description:
            "When you have finished the checklist, click Submit Audit to save your responses and findings.",
        position: "top",
    },
    {
        step: 16,
        targetId: "viewport",
        title: "Audit workflow complete",
        description:
            "You have completed the full audit workflow tour in iAudit—from programs and plans through audits, findings, and templates.",
        position: "center",
    },
];

export function getAuditTemplatesTourStepConfig(
    step: number,
): AuditTemplatesTourStepConfig | undefined {
    return AUDIT_TEMPLATES_TOUR_STEPS.find((s) => s.step === step);
}

/** Preferred template for the guided tour (full clause checklist with all sections). */
export const AUDIT_TEMPLATES_TOUR_TEMPLATE_ID = "iso-14001-clause-audit";

/** Fallback if the preferred template is unavailable. */
export const AUDIT_TEMPLATES_TOUR_TEMPLATE_FALLBACK_ID = "iso-14001-checklist";
