import { toast } from "sonner";

export const TRIAL_LIMITS = {
    gapAnalysis: 3,
    selfAssessment: 3,
    auditProgram: 1,
} as const;

export type TrialLimitedResource = keyof typeof TRIAL_LIMITS;

const RESOURCE_LABELS: Record<TrialLimitedResource, string> = {
    gapAnalysis: "gap analyses",
    selfAssessment: "self assessments",
    auditProgram: "audit programs",
};

export function isUnsubscribedUser(
    user: { role?: string; subscriptionStatus?: string | null } | null | undefined,
): boolean {
    if (!user?.role) return false;
    if (user.role === "superadmin") return false;
    return user.subscriptionStatus !== "active";
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

export function trialLimitUpgradeMessage(resource: TrialLimitedResource): string {
    const limit = TRIAL_LIMITS[resource];
    const label = RESOURCE_LABELS[resource];
    return `You have reached the free trial limit of ${limit} ${label}. Please upgrade your plan to create more.`;
}

export function wouldExceedTrialLimit(
    resource: TrialLimitedResource,
    currentCount: number,
    adding = 1,
): boolean {
    if (!isUnsubscribedUser(getStoredUserForTrial())) return false;
    return currentCount + adding > TRIAL_LIMITS[resource];
}

/** Returns true if the action is allowed; otherwise shows upgrade toast and returns false. */
export function guardTrialCreate(resource: TrialLimitedResource, currentCount: number): boolean {
    if (!wouldExceedTrialLimit(resource, currentCount, 1)) return true;
    toast.error(trialLimitUpgradeMessage(resource));
    return false;
}

export async function parseTrialLimitApiError(res: Response): Promise<boolean> {
    if (res.status !== 403) return false;
    try {
        const data = await res.json();
        if (data?.error === "TrialLimitExceeded") {
            const resource = data.resource as TrialLimitedResource | undefined;
            toast.error(
                typeof data.message === "string"
                    ? data.message
                    : resource
                      ? trialLimitUpgradeMessage(resource)
                      : "Please upgrade your plan to continue.",
            );
            return true;
        }
    } catch {
        /* ignore */
    }
    return false;
}
