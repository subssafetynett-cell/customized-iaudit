import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  subscriptionStatus?: string | null;
  trialEndDate?: string | Date | null;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ subscriptionStatus, trialEndDate }) => {
  const navigate = useNavigate();

  const showBanner = (subscriptionStatus === 'trial' || subscriptionStatus === 'expired') && !!trialEndDate;

  if (!showBanner) {
    return null;
  }

  const remainingDays = Math.ceil(
    (new Date(trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const isExpired = remainingDays <= 0;
  const isWarning = !isExpired && remainingDays <= 3;

  return (
    <div 
      className={cn(
        "mb-6 p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all animate-in fade-in slide-in-from-top-4 duration-500",
        isExpired 
          ? "bg-red-100 border-red-300 text-red-900"
          : isWarning 
            ? "bg-orange-100 border-orange-300 text-orange-800" 
            : "bg-green-100 border-green-300 text-green-800"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          isExpired 
            ? "bg-red-200 text-red-600"
            : isWarning 
              ? "bg-orange-200 text-orange-600" 
              : "bg-green-200 text-green-600"
        )}>
          {isExpired || isWarning ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-bold text-sm md:text-base">
            {isExpired 
              ? "Your free trial has expired." 
              : `Your free trial ends in ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}.`
            }
          </p>
          <p className="text-xs md:text-sm opacity-90">
            {isExpired
              ? "Upgrade to a professional plan to continue using all premium features."
              : "Upgrade to a professional plan to continue using all premium features without interruption."
            }
          </p>
        </div>
      </div>
      
      <Button 
        onClick={() => navigate('/subscription')}
        variant="ghost"
        className={cn(
          "shrink-0 font-bold gap-2 rounded-lg transition-all text-white",
          isExpired
            ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-200"
            : isWarning 
              ? "bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-200" 
              : "bg-green-600 hover:bg-green-700 shadow-md shadow-green-200"
        )}
      >
        Upgrade Now
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default TrialBanner;
