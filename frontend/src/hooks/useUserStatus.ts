import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    apiFetch,
    clearClientSession,
    clearSessionAndRedirectToLogin,
} from "@/lib/api";
import { dispatchUserUpdated } from "@/lib/trialUtils";

const CHECK_INTERVAL_MS = 15000; // Check every 15 seconds

/**
 * Hook that periodically verifies the currently logged-in user's status.
 * If the user is deleted or deactivated, they are logged out automatically.
 */
export function useUserStatus() {
    const navigate = useNavigate();

    const checkUserStatus = useCallback(async () => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return; // Not logged in, nothing to check

        let userId: number | null = null;
        try {
            userId = JSON.parse(storedUser)?.id;
        } catch {
            // Corrupt data — log them out
            clearClientSession();
            window.location.href = "/login";
            return;
        }

        if (!userId) return;

        try {
            const res = await apiFetch(`/users/${userId}/status`, { skipSessionLogout: true });
            // Never treat auth failures here as logout — cookie races / proxy blips / optional
            // polls must not kick a logged-in user back to /auth while navigating.
            if (res.status === 401 || res.status === 403) {
                return;
            }
            if (!res.ok) return; // Server error: don't force logout (could be temporary)

            const data = await res.json();

            // If user was deleted OR deactivated, log them out
            if (!data.exists || !data.isActive) {
                clearSessionAndRedirectToLogin();
            } else {
                // Update localStorage with latest status (trial expiration, etc.)
                const storedUserData = JSON.parse(storedUser);
                const serverRole =
                    typeof data.role === "string" && data.role.trim()
                        ? data.role.trim()
                        : null;
                const updatedUser = {
                    ...storedUserData,
                    ...data,
                    // Never let status payload wipe identity fields
                    id: storedUserData.id,
                    email: storedUserData.email ?? data.email,
                    // Prefer authoritative server role so sidebar permissions stay correct
                    role: serverRole ?? storedUserData.role,
                    onboardingCompleted:
                        data.onboardingCompleted ?? storedUserData.onboardingCompleted,
                };
                // Drop status-only flags that are not part of the user profile
                delete (updatedUser as { exists?: boolean }).exists;

                const watchKeys = [
                    "role",
                    "isActive",
                    "email",
                    "firstName",
                    "lastName",
                    "trialStartDate",
                    "trialEndDate",
                    "subscriptionStatus",
                    "subscriptionPlan",
                    "planStartDate",
                    "planExpiryDate",
                    "nextBillingDate",
                    "stripePriceId",
                    "renewalType",
                    "autopayConsent",
                    "onboardingCompleted",
                ] as const;
                const changed = watchKeys.some((key) => {
                    const prev = storedUserData[key];
                    const next = (updatedUser as Record<string, unknown>)[key];
                    return String(prev ?? "") !== String(next ?? "");
                });

                // Only notify listeners when profile/billing fields actually changed —
                // otherwise every 15s poll re-renders pages that depend on useStoredUser().
                if (changed) {
                    localStorage.setItem("user", JSON.stringify(updatedUser));
                    dispatchUserUpdated();
                }
            }
        } catch {
            // Network error: do not force logout to avoid disrupting offline usage
        }
    }, [navigate]);

    useEffect(() => {
        // Run immediately on mount
        checkUserStatus();

        // Then poll every interval
        const timer = setInterval(checkUserStatus, CHECK_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [checkUserStatus]);
}
