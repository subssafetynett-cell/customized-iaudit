import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config";

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
            localStorage.removeItem("user");
            window.location.href = '/login';
            return;
        }

        if (!userId) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${userId}/status`);
            if (!res.ok) return; // Server error: don't force logout (could be temporary)

            const data = await res.json();

            // If user was deleted OR deactivated, log them out
            if (!data.exists || !data.isActive) {
                localStorage.removeItem("user");
                window.location.href = '/login';
            } else {
                // Update localStorage with latest status (trial expiration, etc.)
                const storedUserData = JSON.parse(storedUser);
                const updatedUser = { 
                    ...storedUserData, 
                    ...data,
                    // Preserve properties that might not be in data but are in storedUser
                    onboardingCompleted: data.onboardingCompleted ?? storedUserData.onboardingCompleted
                };
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }
        } catch {
            // Network error: do not force logout to avoid disruping offline usage
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
