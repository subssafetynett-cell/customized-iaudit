import type { NavigateFunction } from "react-router-dom";

const ONBOARDING_COMPLETED_KEY = "iaudit_onboarding_tour_completed";

/** Tour starts at Companies sidebar tip — never force the create-company modal. */
export const TOUR_START_STEP_WITH_COMPANY = 2;

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
 * Always skips the old forced create-company modal (step 1).
 */
export function startAppTour(navigate: NavigateFunction): void {
    resetOnboardingFlags();

    const step = TOUR_START_STEP_WITH_COMPANY;

    window.dispatchEvent(
        new CustomEvent("restart-onboarding", { detail: { step } }),
    );
    navigate(`/?restartOnboarding=true&step=${step}`);
}
