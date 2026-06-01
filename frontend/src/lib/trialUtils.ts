export const TRIAL_WELCOME_MODAL_KEY = "trial_welcome_modal_seen";
export const OPEN_TRIAL_MODAL_EVENT = "open-trial-modal";
export const TRIAL_WELCOME_DISMISSED_EVENT = "trial-welcome-dismissed";
/** Last N days of trial show red warning styling across UI */
export const TRIAL_URGENT_DAYS = 7;

export type TrialUserLike = {
  id?: number;
  role?: string;
  subscriptionStatus?: string | null;
  trialStartDate?: string | Date | null;
  trialEndDate?: string | Date | null;
};

export type TrialUiState = {
  remainingDays: number;
  isActive: boolean;
  isUrgent: boolean;
  isExpired: boolean;
};

export function getTrialWelcomeKey(userId: number | string): string {
  return `${TRIAL_WELCOME_MODAL_KEY}_${userId}`;
}

export function isTrialWelcomeDismissed(): boolean {
  return !!localStorage.getItem(TRIAL_WELCOME_MODAL_KEY);
}

export function isTrialWelcomeDismissedForUser(
  userId?: number | string | null
): boolean {
  if (userId == null) return isTrialWelcomeDismissed();
  if (localStorage.getItem(getTrialWelcomeKey(userId))) return true;
  return !!localStorage.getItem(TRIAL_WELCOME_MODAL_KEY);
}

export function clearTrialWelcomeForUser(userId: number | string): void {
  localStorage.removeItem(getTrialWelcomeKey(userId));
  localStorage.removeItem(TRIAL_WELCOME_MODAL_KEY);
}

export function markTrialWelcomeDismissed(): void {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const user = JSON.parse(raw) as { id?: number };
      if (user?.id != null) {
        localStorage.setItem(getTrialWelcomeKey(user.id), "true");
      }
    }
  } catch {
    /* ignore */
  }
  localStorage.removeItem(TRIAL_WELCOME_MODAL_KEY);
  window.dispatchEvent(new Event(TRIAL_WELCOME_DISMISSED_EVENT));
}

export function dispatchOpenTrialModal(): void {
  window.dispatchEvent(new Event(OPEN_TRIAL_MODAL_EVENT));
}

/** Calendar days left until trial end date (14-day trial shows 14 on day one). */
export function getTrialRemainingDays(trialEndDate?: string | Date | null): number {
  if (!trialEndDate) return 0;
  const end = new Date(trialEndDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function isTrialExpired(user: TrialUserLike | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "superadmin") return false;
  if (user.subscriptionStatus === "active") return false;
  if (user.subscriptionStatus === "expired") return true;
  if (user.trialEndDate && getTrialRemainingDays(user.trialEndDate) <= 0) return true;
  return false;
}

export function isOnActiveTrial(user: TrialUserLike | null | undefined): boolean {
  if (!user?.trialEndDate) return false;
  if (user.role === "superadmin") return false;
  if (user.subscriptionStatus === "active") return false;
  if (isTrialExpired(user)) return false;
  return user.subscriptionStatus === "trial" && getTrialRemainingDays(user.trialEndDate) > 0;
}

export function isTrialUrgent(user: TrialUserLike | null | undefined): boolean {
  if (!isOnActiveTrial(user)) return false;
  return getTrialRemainingDays(user!.trialEndDate) <= TRIAL_URGENT_DAYS;
}

export function getTrialUiState(user: TrialUserLike | null | undefined): TrialUiState {
  const remainingDays = getTrialRemainingDays(user?.trialEndDate);
  const isExpired = isTrialExpired(user);
  const isActive = isOnActiveTrial(user);
  const isUrgent = isActive && remainingDays <= TRIAL_URGENT_DAYS;
  return { remainingDays, isActive, isUrgent, isExpired };
}

export function shouldAwaitTrialWelcome(
  user: TrialUserLike | null | undefined
): boolean {
  if (!user?.id) return false;
  if (user.role === "superadmin") return false;
  if (user.subscriptionStatus === "active") return false;
  if (isTrialExpired(user)) return false;
  if (isTrialWelcomeDismissedForUser(user.id)) return false;
  if (user.trialEndDate && !isOnActiveTrial(user)) return false;
  return true;
}

export const TRIAL_EXPIRED_ALLOWED_PATHS = ["/", "/getting-started", "/feedback", "/subscription"] as const;

export function isPathAllowedForExpiredTrial(pathname: string): boolean {
  return (TRIAL_EXPIRED_ALLOWED_PATHS as readonly string[]).includes(pathname);
}

export function formatTrialDate(value?: string | Date | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function dispatchUserUpdated(): void {
  window.dispatchEvent(new Event("user-updated"));
}
