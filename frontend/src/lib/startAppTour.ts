import type { NavigateFunction } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { getCompaniesSnapshot } from "@/hooks/useCompanyStore";

const ONBOARDING_COMPLETED_KEY = "iaudit_onboarding_tour_completed";

/** First tour step when the user already has a company (skip welcome / create company modal). */
export const TOUR_START_STEP_WITH_COMPANY = 2;

async function userHasCompany(): Promise<boolean> {
    if (getCompaniesSnapshot().length > 0) {
        return true;
    }
    try {
        const response = await apiFetch(`/companies?_t=${Date.now()}`);
        if (!response.ok) return false;
        const data = await response.json();
        return Array.isArray(data) && data.length > 0;
    } catch {
        return false;
    }
}

async function resolveTourStartStep(): Promise<number> {
    const hasCompany = await userHasCompany();
    return hasCompany ? TOUR_START_STEP_WITH_COMPANY : 1;
}

function resetOnboardingFlags(): void {
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
        // ignore malformed user cache
    }
}

/**
 * Restart the product onboarding tour from the header Tour button.
 * Skips step 1 when a company already exists (starts at Open Company popover, step 2).
 */
export function startAppTour(navigate: NavigateFunction): void {
    void (async () => {
        resetOnboardingFlags();

        const step = await resolveTourStartStep();

        window.dispatchEvent(
            new CustomEvent("restart-onboarding", { detail: { step } }),
        );
        navigate(`/?restartOnboarding=true&step=${step}`);
    })();
}
