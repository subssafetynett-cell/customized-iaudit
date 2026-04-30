import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  CheckCircle2, 
  ArrowRight, 
  Shield, 
  CreditCard, 
  Loader2, 
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config";

interface SessionDetails {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  amount: string;
  currency: string;
  isMonthly: boolean;
  subscriptionId: string | null;
}

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<SessionDetails | null>(null);

  useEffect(() => {
    sessionStorage.removeItem('hasClosedExpiredModal');
    
    if (sessionId) {
      fetch(`${API_BASE_URL}/api/stripe/session/${sessionId}`)
        .then(res => res.json())
        .then(data => {
          setDetails(data);
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            
            // SECURITY: Verify this session belongs to the logged-in user
            if (data.userId && parsedUser.id.toString() !== data.userId.toString()) {
              console.error("Session mismatch: This payment session belongs to a different user.");
              return;
            }

            // Update local state with new plan
            localStorage.setItem("user", JSON.stringify({
              ...parsedUser,
              subscriptionStatus: 'active',
              subscriptionPlan: data.plan
            }));

            // Redirect to clean route after 2 seconds to show success message
            setTimeout(() => {
              navigate('/subscription-details');
            }, 2000);
          }
        })
        .catch(err => {
          console.error("Session fetch error:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  const handleNext = () => {
    navigate('/subscription-details');
  };

  const currentModal = useMemo(() => {
    if (loading) return (
      <div className="py-20 flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e855e]" />
        <p className="text-slate-500 font-medium">Finalising your subscription...</p>
      </div>
    );

    if (!details) return (
      <div className="py-8 text-center bg-amber-50 rounded-2xl border border-amber-100 m-8">
        <p className="text-amber-700 text-sm px-4">
          Verification in progress. Your plan will be active shortly.
        </p>
        <Button onClick={() => navigate('/subscription')} className="mt-4 bg-slate-900 text-white px-8">
          Go to Subscription Page
        </Button>
      </div>
    );

    return (
      <div className="animate-in fade-in zoom-in duration-500">
        <div className="bg-[#f0fdf4] py-12 flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-[#1e855e]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payment Successful!</h1>
          <p className="text-[#1e855e] text-sm font-bold uppercase tracking-wider">High Fidelity Activated ✅</p>
        </div>
        <div className="p-8 space-y-6 flex flex-col items-center text-center">
          <p className="text-slate-500 text-sm leading-relaxed">
            Thank you for subscribing to <span className="font-bold text-slate-900">{details.plan}</span>. 
            Your premium dashboard is now fully unlocked.
          </p>
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
              <Shield className="w-3.5 h-3.5 text-slate-400 mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Plan</p>
              <p className="text-sm font-black text-slate-900">{details.plan}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
              <CreditCard className="w-3.5 h-3.5 text-slate-400 mb-2" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Paid</p>
              <p className="text-sm font-black text-slate-900">{details.currency === 'GBP' ? '£' : '$'}{details.amount}</p>
            </div>
          </div>
          
          {details.isMonthly && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 text-left w-full items-start mt-2">
              <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-blue-900 mb-1 leading-tight">Auto-renewal Active</p>
                <p className="text-xs text-blue-800/80 font-medium leading-relaxed pr-2">
                  Your subscription will renew automatically each month using your saved card.
                </p>
              </div>
            </div>
          )}

          <Button onClick={handleNext} className="w-full bg-[#1e855e] hover:bg-[#16654b] text-white py-7 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#1e855e]/20 group transition-all mt-4">
            Manage Subscription
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    );
  }, [loading, details, navigate]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-700">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden relative">
        {currentModal}
      </div>
    </div>
  );
}
