import { Rocket, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStoredUser } from "@/hooks/useStoredUser";
import { useTrialCountdown } from "@/hooks/useTrialCountdown";
import {
  dispatchOpenTrialModal,
  getTrialUiState,
} from "@/lib/trialUtils";
import { isSuperAdminRole } from "@/lib/superAdminAuth";
import { cn } from "@/lib/utils";

export function TrialSidebarBadge() {
  const navigate = useNavigate();
  const { user } = useStoredUser();
  useTrialCountdown();

  if (!user || isSuperAdminRole(user.role as string)) return null;

  const { remainingDays, isActive, isUrgent, isExpired } = getTrialUiState(user);

  if (!isActive && !isExpired) return null;

  const dayLabel = remainingDays === 1 ? "day" : "days";
  const isWarningStyle = isUrgent || isExpired;

  const handleClick = () => {
    if (isExpired) {
      navigate("/subscription");
    } else {
      dispatchOpenTrialModal();
    }
  };

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white shadow-md transition-colors",
          isWarningStyle
            ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            : "bg-gradient-to-r from-emerald-600 to-[#1e855e] hover:from-emerald-700 hover:to-[#176b4a]"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
          {isWarningStyle ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">
            {isExpired
              ? "Trial ended"
              : `${remainingDays} ${dayLabel} left`}
          </p>
          <p className="text-[11px] text-white/85 leading-tight">
            {isExpired ? "Upgrade to restore access" : "Premium trial"}
          </p>
        </div>
      </button>
    </div>
  );
}
