import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNav } from "@/components/TopNav";
import TrialExpiredModal from "@/components/TrialExpiredModal";
import TrialModal from "@/components/TrialModal";
import { useLocation, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useStoredUser } from "@/hooks/useStoredUser";
import { useEnsureTrialStarted } from "@/hooks/useEnsureTrialStarted";
import { useTrialCountdown } from "@/hooks/useTrialCountdown";
import {
  OPEN_TRIAL_MODAL_EVENT,
  isOnActiveTrial,
  isTrialExpired,
  markTrialWelcomeDismissed,
  shouldAwaitTrialWelcome,
} from "@/lib/trialUtils";
import { isSuperAdminRole } from "@/lib/superAdminAuth";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useStoredUser();
  const [showTrialWelcome, setShowTrialWelcome] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const autoTrialModalUserIdRef = useRef<number | null>(null);

  useTrialCountdown();

  const onTrialUpdated = useCallback(
    (updated: Record<string, unknown>) => {
      setUser(updated);
    },
    [setUser]
  );

  useEnsureTrialStarted(user, onTrialUpdated);

  const expired =
    isTrialExpired(user) && user?.subscriptionStatus !== "active";

  const shouldShowExpiredModal =
    expired && location.pathname !== "/subscription";

  useEffect(() => {
    if (shouldShowExpiredModal) {
      setShowExpiredModal(true);
    } else {
      setShowExpiredModal(false);
    }
  }, [shouldShowExpiredModal]);

  useEffect(() => {
    const userId = user?.id as number | undefined;
    if (!userId || !shouldAwaitTrialWelcome(user)) {
      return;
    }
    if (autoTrialModalUserIdRef.current === userId) return;

    autoTrialModalUserIdRef.current = userId;
    setShowTrialWelcome(true);
  }, [user, user?.id, user?.trialEndDate, user?.subscriptionStatus, user?.role]);

  useEffect(() => {
    const openTrialModal = () => {
      if (!user || isSuperAdminRole(user.role as string)) return;
      if (!isOnActiveTrial(user)) return;
      setShowTrialWelcome(true);
    };

    window.addEventListener(OPEN_TRIAL_MODAL_EVENT, openTrialModal);
    return () => window.removeEventListener(OPEN_TRIAL_MODAL_EVENT, openTrialModal);
  }, [user]);

  const handleTrialClose = () => {
    markTrialWelcomeDismissed();
    setShowTrialWelcome(false);
  };

  const handleTrialUpgrade = () => {
    markTrialWelcomeDismissed();
    setShowTrialWelcome(false);
    navigate("/subscription");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
      {!expired && (
        <TrialModal
          isOpen={showTrialWelcome}
          trialStartDate={user?.trialStartDate as string}
          trialEndDate={user?.trialEndDate as string}
          onClose={handleTrialClose}
          onUpgrade={handleTrialUpgrade}
        />
      )}
      <TrialExpiredModal
        isOpen={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
      />
    </SidebarProvider>
  );
}
