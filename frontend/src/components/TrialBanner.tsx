import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTrialUiState } from '@/lib/trialUtils';
import { useTrialCountdown } from '@/hooks/useTrialCountdown';

interface TrialBannerProps {
  subscriptionStatus?: string | null;
  trialEndDate?: string | Date | null;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ subscriptionStatus, trialEndDate }) => {
  const navigate = useNavigate();
  useTrialCountdown();

  const { remainingDays, isActive, isUrgent, isExpired } = getTrialUiState({
    subscriptionStatus,
    trialEndDate,
  });

  if (!isActive && !isExpired) {
    return null;
  }

  const dayLabel = remainingDays === 1 ? 'day' : 'days';

  return (
    <div
      className={cn(
        'mb-6 p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all animate-in fade-in slide-in-from-top-4 duration-500',
        isExpired
          ? 'bg-red-50 border-red-300 text-red-900'
          : isUrgent
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            isExpired || isUrgent
              ? 'bg-red-100 text-red-600'
              : 'bg-emerald-100 text-emerald-600'
          )}
        >
          {isExpired || isUrgent ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Rocket className="w-5 h-5" />
          )}
        </div>
        <div>
          <p className="font-bold text-sm md:text-base">
            {isExpired
              ? 'Your free trial has ended — account suspended.'
              : isUrgent
                ? `Trial ending soon — only ${remainingDays} ${dayLabel} left!`
                : `You are on a free trial — ${remainingDays} ${dayLabel} remaining.`}
          </p>
          <p className="text-xs md:text-sm opacity-90">
            {isExpired
              ? 'Upgrade now to restore access. You can only view the dashboard until you subscribe.'
              : isUrgent
                ? 'Your trial is almost over. Upgrade now to avoid losing access to your data.'
                : 'Enjoy full Premium access. Upgrade anytime to keep your plan after the trial ends.'}
          </p>
        </div>
      </div>

      <Button
        onClick={() => navigate('/subscription')}
        className={cn(
          'shrink-0 font-bold gap-2 rounded-lg text-white',
          isExpired || isUrgent
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-emerald-600 hover:bg-emerald-700'
        )}
      >
        Upgrade now
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default TrialBanner;
