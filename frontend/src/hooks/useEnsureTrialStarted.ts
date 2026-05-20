import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { isSuperAdminRole } from "@/lib/superAdminAuth";

type TrialUser = {
  id?: number;
  role?: string;
  subscriptionStatus?: string | null;
  trialEndDate?: string | null;
};

/**
 * Ensures the logged-in user has a 14-day trial (backup if login response lacked dates).
 */
export function useEnsureTrialStarted(
  user: TrialUser | null,
  onUpdated: (updated: Record<string, unknown>) => void
) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || startedRef.current) return;
    if (isSuperAdminRole(user.role) || user.subscriptionStatus === "active") return;
    if (user.trialEndDate) return;

    startedRef.current = true;
    (async () => {
      try {
        const res = await apiFetch(`/users/${user.id}/start-trial`, { method: "POST" });
        if (res.ok) {
          const updated = await res.json();
          onUpdated(updated);
        }
      } catch {
        startedRef.current = false;
      }
    })();
  }, [user?.id, user?.role, user?.subscriptionStatus, user?.trialEndDate, onUpdated]);
}
