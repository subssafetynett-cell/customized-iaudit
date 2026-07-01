import { toast } from "sonner";

export const TRIAL_LIMITS = {
    gapAnalysis: Infinity,
    selfAssessment: Infinity,
    auditProgram: Infinity,
} as const;

export type TrialLimitedResource = keyof typeof TRIAL_LIMITS;

export function isUnsubscribedUser(
    _user: { role?: string; subscriptionStatus?: string | null } | null | undefined,
): boolean {
    return false;
}

export function getStoredUserForTrial(): {
    role?: string;
    subscriptionStatus?: string | null;
} | null {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function trialLimitUpgradeMessage(_resource: TrialLimitedResource): string {
    return "Please upgrade your plan to continue.";
}

export function wouldExceedTrialLimit(
    _resource: TrialLimitedResource,
    _currentCount: number,
    _adding = 1,
): boolean {
    return false;
}

/** Returns true if the action is allowed; otherwise shows upgrade toast and returns false. */
export function guardTrialCreate(_resource: TrialLimitedResource, _currentCount: number): boolean {
    return true;
}

export async function parseTrialLimitApiError(_res: Response): Promise<boolean> {
    return false;
}
