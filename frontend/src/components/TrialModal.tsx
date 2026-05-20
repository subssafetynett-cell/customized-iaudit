import React from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatTrialDate,
  getTrialRemainingDays,
  TRIAL_URGENT_DAYS,
} from "@/lib/trialUtils";
import { useTrialCountdown } from "@/hooks/useTrialCountdown";
import botLogo from "@/assets/bot-logo.svg";

interface TrialModalProps {
  isOpen: boolean;
  trialStartDate?: string | Date | null;
  trialEndDate?: string | Date | null;
  onClose: () => void;
  onUpgrade: () => void;
}

const TrialModal: React.FC<TrialModalProps> = ({
  isOpen,
  trialStartDate,
  trialEndDate,
  onClose,
  onUpgrade,
}) => {
  useTrialCountdown();
  const remaining = getTrialRemainingDays(trialEndDate);
  const dayWord = remaining === 1 ? "day" : "days";
  const isUrgent = remaining > 0 && remaining <= TRIAL_URGENT_DAYS;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="z-[100]" />
        <DialogContent
          hideOverlay
          className="z-[100] w-[92vw] max-w-[44rem] sm:max-w-[44rem] p-0 overflow-hidden border-none shadow-2xl rounded-2xl gap-0"
        >
          <div className="flex flex-col md:flex-row md:min-h-[420px]">
            <div
              className={cn(
                "relative w-full md:w-[38%] shrink-0 min-h-[200px] md:min-h-[420px] overflow-hidden",
                isUrgent
                  ? "bg-gradient-to-br from-red-700 via-red-600 to-red-900"
                  : "bg-gradient-to-br from-[#00875b] via-[#1a7a52] to-[#213847]"
              )}
            >
              <div className="pointer-events-none absolute -top-14 -right-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div
                className={cn(
                  "pointer-events-none absolute bottom-10 -left-10 h-36 w-36 rounded-full blur-2xl",
                  isUrgent ? "bg-red-300/20" : "bg-emerald-300/20"
                )}
              />

              <img
                src="/iAudit Global-01.png"
                alt="iAudit Global"
                className="absolute top-5 left-5 h-9 w-auto brightness-0 invert opacity-95 z-10"
              />

              <div className="relative flex flex-col items-center justify-center h-full px-6 py-10 md:py-8">
                {isUrgent && (
                  <div className="mb-3 flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Trial ending soon
                  </div>
                )}
                <div className="relative mb-4">
                  <div className="absolute inset-0 scale-110 rounded-full bg-white/15 blur-xl" />
                  <div className="relative rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 shadow-2xl">
                    <img
                      src={botLogo}
                      alt="iAudit assistant"
                      className="h-24 w-24 md:h-28 md:w-28 object-contain drop-shadow-lg"
                    />
                  </div>
                  <div
                    className={cn(
                      "absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full shadow-lg",
                      isUrgent ? "bg-white text-red-600" : "bg-amber-400 text-amber-950"
                    )}
                  >
                    {isUrgent ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "absolute -bottom-1 -left-2 flex h-8 w-8 items-center justify-center rounded-full shadow-lg",
                      isUrgent ? "bg-white/90 text-red-700" : "bg-white/90 text-emerald-700"
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>

                <p className="text-center text-white font-bold text-base md:text-lg tracking-tight">
                  {isUrgent ? `${remaining} ${dayWord} left` : "14-day Premium trial"}
                </p>
                <p className="mt-2 text-center text-white/85 text-sm leading-relaxed max-w-[220px]">
                  {isUrgent
                    ? "Upgrade now to keep your account and data safe."
                    : "Full access to every feature while your trial counts down from today."}
                </p>
              </div>
            </div>

            <div className="flex-1 min-w-0 px-7 py-7 md:px-9 md:py-8 flex flex-col justify-center bg-white">
              <h2
                className={cn(
                  "text-2xl font-bold mb-5 pr-10 leading-snug",
                  isUrgent ? "text-red-900" : "text-slate-900"
                )}
              >
                {isUrgent
                  ? "Your trial is ending soon!"
                  : "Your Premium trial has started!"}
              </h2>

              <div
                className={cn(
                  "mb-5 rounded-xl border px-5 py-4",
                  isUrgent
                    ? "bg-red-50 border-red-200"
                    : "bg-emerald-50 border-emerald-100"
                )}
              >
                <div className="relative flex items-center justify-between gap-3">
                  <div
                    className={cn(
                      "absolute left-14 right-14 top-1/2 h-0.5 -translate-y-1/2",
                      isUrgent ? "bg-red-200" : "bg-emerald-200"
                    )}
                  />
                  <div className="relative z-10 text-center min-w-[80px]">
                    <p className="text-xs font-semibold text-slate-800">
                      {formatTrialDate(trialStartDate)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Trial start</p>
                  </div>
                  <div className="relative z-10 flex flex-col items-center shrink-0 px-2">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white",
                        isUrgent
                          ? "bg-red-600 shadow-red-200/70"
                          : "bg-emerald-600 shadow-emerald-200/70"
                      )}
                    >
                      <Rocket className="h-5 w-5" />
                    </div>
                    <p
                      className={cn(
                        "mt-2 text-sm font-bold",
                        isUrgent ? "text-red-700" : "text-emerald-700"
                      )}
                    >
                      {remaining} {dayWord}
                    </p>
                    <p className="text-xs text-slate-500">Remaining</p>
                  </div>
                  <div className="relative z-10 text-center min-w-[80px]">
                    <p className="text-xs font-semibold text-slate-800">
                      {formatTrialDate(trialEndDate)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Trial end</p>
                  </div>
                </div>
              </div>

              <p className="text-[15px] text-slate-700 leading-relaxed mb-3">
                You are on a{" "}
                <span className="font-semibold text-slate-900">14-day free Premium trial</span>.
                You have{" "}
                <span
                  className={cn(
                    "font-semibold",
                    isUrgent ? "text-red-700" : "text-emerald-700"
                  )}
                >
                  {remaining} {dayWord}
                </span>{" "}
                remaining.
              </p>

              <div
                className={cn(
                  "mb-4 rounded-lg border px-4 py-3",
                  isUrgent
                    ? "border-red-300 bg-red-50"
                    : "border-amber-200 bg-amber-50"
                )}
              >
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    isUrgent ? "text-red-950" : "text-amber-950"
                  )}
                >
                  <span className="font-semibold">Important:</span> If your trial ends, your
                  account will be suspended and your data may be permanently lost. Upgrade
                  anytime to keep your access and data safe.
                </p>
              </div>

              <p className="text-sm text-slate-500 mb-6">
                View plans on the{" "}
                <button
                  type="button"
                  onClick={onUpgrade}
                  className={cn(
                    "font-medium hover:underline",
                    isUrgent ? "text-red-600" : "text-emerald-600"
                  )}
                >
                  subscription page
                </button>
                .
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 px-5 text-sm font-medium",
                    isUrgent
                      ? "border-red-200 text-red-800 hover:bg-red-50"
                      : "border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                  )}
                  onClick={onClose}
                >
                  Continue with trial
                </Button>
                <Button
                  className={cn(
                    "h-11 px-6 text-sm font-medium shadow-md",
                    isUrgent
                      ? "bg-red-600 hover:bg-red-700 shadow-red-200/60"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/60"
                  )}
                  onClick={onUpgrade}
                >
                  Upgrade now
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default TrialModal;
