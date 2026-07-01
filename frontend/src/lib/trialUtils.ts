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

export function isTrialExpired(_user: TrialUserLike | null | undefined): boolean {
  return false;
}

export function isOnActiveTrial(_user: TrialUserLike | null | undefined): boolean {
  return false;
}

export function isTrialUrgent(_user: TrialUserLike | null | undefined): boolean {
  return false;
}

export function getTrialUiState(_user: TrialUserLike | null | undefined): TrialUiState {
  return { remainingDays: 0, isActive: false, isUrgent: false, isExpired: false };
}

export function shouldAwaitTrialWelcome(
  _user: TrialUserLike | null | undefined
): boolean {
  return false;
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
