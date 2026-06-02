import type { NavigateFunction } from "react-router-dom";

const ONBOARDING_COMPLETED_KEY = "iaudit_onboarding_tour_completed";

export type FoundationSetupStep = {
    id: string;
    title: string;
    description: string;
    path: string;
};

/** Part 1: company setup through self assessment and gap analysis (6 steps). */
export const FOUNDATION_SETUP_STEPS: FoundationSetupStep[] = [
    {
        id: "company",
        title: "Create your company",
        description: "Add your organization profile, contact details, and ISO standards.",
        path: "/?restartOnboarding=true&step=1",
    },
    {
        id: "sites",
        title: "Add sites",
        description: "Create sites and locations where audits and assessments will run.",
        path: "/companies?onboarding=true&step=3",
    },
    {
        id: "departments",
        title: "Add departments",
        description: "Organize teams and departments within each site.",
        path: "/companies?onboarding=true&step=6",
    },
    {
        id: "users",
        title: "Invite your team",
        description: "Add users and assign roles such as auditor or auditee.",
        path: "/users?onboarding=true&step=10",
    },
    {
        id: "self-assessment",
        title: "Explore self assessment",
        description:
            "Run a self assessment to evaluate readiness—especially helpful if you are new to ISO standards.",
        path: "/self-assessment?onboarding=true&step=14",
    },
    {
        id: "gap-analysis",
        title: "Explore gap analysis",
        description: "Run a gap analysis to evaluate compliance against ISO requirements.",
        path: "/gap-analysis?onboarding=true&step=16",
    },
];

function resetOnboardingFlags() {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    const userJson = localStorage.getItem("user");
    if (!userJson) return;
    try {
        const user = JSON.parse(userJson);
        localStorage.setItem(
            "user",
            JSON.stringify({ ...user, onboardingCompleted: false }),
        );
    } catch {
        // ignore
    }
}

export type AuditWorkflowStep = {
    id: string;
    title: string;
    description: string;
    path: string;
};

/** Part 2: auditing workflow overview (Getting Started step 2). */
export const AUDIT_WORKFLOW_STEPS: AuditWorkflowStep[] = [
    {
        id: "audit-program",
        title: "Audit Program",
        description:
            "To start audits, you first need to create an audit program.",
        path: "/audits",
    },
    {
        id: "audit-plan",
        title: "Audit Plan",
        description:
            "Created audit programs appear on the Audit Plan page. Create a plan, select a template, and schedule your audit itinerary.",
        path: "/audit-program",
    },
    {
        id: "audits",
        title: "Audits",
        description:
            "Saved audit plans are listed on the Audits page. Open a plan to run the audit and save your progress as you go.",
        path: "/audit",
    },
    {
        id: "findings",
        title: "Findings",
        description:
            "Non-conformities and observations from your audits are tracked on the Findings page.",
        path: "/audit-findings",
    },
    {
        id: "audit-templates",
        title: "Audit Templates",
        description:
            "Create reusable checklist templates to standardize audits and attach them when building audit plans.",
        path: "/audit-templates",
    },
];

/** Open the guided tour at a specific foundation step. */
export function beginFoundationStep(navigate: NavigateFunction, path: string) {
    resetOnboardingFlags();
    window.dispatchEvent(
        new CustomEvent("restart-onboarding", {
            detail: { step: path.includes("step=") ? parseInt(path.split("step=")[1] || "1", 10) : 1 },
        }),
    );
    navigate(path);
}
