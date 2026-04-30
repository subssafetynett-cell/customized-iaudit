import React, { useState, useEffect } from "react";
import { Check, CheckCircle2, Loader2, Calendar, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import BillingModal from "@/components/BillingModal";

interface PricingPlan {
  name: string;
  price: {
    usd: {
      "1year": string;
      "3years": string;
      "6years": string;
    };
    gbp: {
      "1year": string;
      "3years": string;
      "6years": string;
    };
  };
  features: string[];
  cta: string;
  highlight?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: "Free",
    price: {
      usd: { "1year": "1", "3years": "1", "6years": "1" },
      gbp: { "1year": "1", "3years": "1", "6years": "1" },
    },
    features: [
      "Gap Analysis",
      "Self Assessment",
      "Findings Dashboard",
      "Data Analytics Summary",
      "Report Download",
    ],
    cta: "Start for Free",
  },
  {
    name: "Unos",
    price: {
      usd: { "1year": "15.60", "3years": "11.60", "6years": "7.60" },
      gbp: { "1year": "12.50", "3years": "9.30", "6years": "6.10" },
    },
    features: [
      "NC Register",
      "Unlimited audits (1 ISO)",
      "Excel, PDF & Word Reports",
      "Role based accesses",
      "Schedule, track & manage audits",
      "Audit mate AI",
      "Audit Evidence Capture",
    ],
    cta: "Get Started",
  },
  {
    name: "Dos",
    price: {
      usd: { "1year": "25.90", "3years": "22.90", "6years": "18.90" },
      gbp: { "1year": "20.70", "3years": "18.30", "6years": "15.10" },
    },
    features: [
      "All features of Starter",
      "Multi-site audits (2 ISO)",
      "NC Dashboards",
      "Priority Email Support",
      "Multi-site Dashboards",
    ],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Tres",
    price: {
      usd: { "1year": "30.10", "3years": "25.10", "6years": "21.10" },
      gbp: { "1year": "24.10", "3years": "20.10", "6years": "16.90" },
    },
    features: [
      "AI features of Advanced",
      "Up to 10 sites (3 ISO)",
      "Audit Performance Analytics",
      "Custom Checklists",
      "Dedicated Account Manager",
    ],
    cta: "Get Started",
  },
];

type Duration = "1year" | "3years" | "6years";
type Currency = "usd" | "gbp";

interface SubscriptionDetails {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
}

export default function Subscription() {
  const [duration, setDuration] = useState<Duration>("1year");
  const [currency, setCurrency] = useState<Currency>("usd");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  // Canceled state from URL params
  const isCanceled = searchParams.get("canceled") === "true";
  const sessionId = searchParams.get("session_id");

  // Session verification state
  const [isVerifying, setIsVerifying] = useState(false);

  // User's active plan from localStorage
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const activePlan = user?.subscriptionPlan?.toUpperCase() || null;
  const isActive = user?.subscriptionStatus === "active";

  // Success handling removed: Success is now handled by the /subscription/success route

  useEffect(() => {
    if (isCanceled) {
      toast({
        title: "Payment Canceled",
        description: "You can try again anytime.",
        variant: "destructive",
      });
    }
  }, [isCanceled]);

  const getPrice = (plan: PricingPlan) => {
    return plan.price[currency][duration];
  };

  const isPlanActive = (planName: string) => {
    return isActive && activePlan === planName.toUpperCase();
  };

  const handleGetStarted = (plan: PricingPlan) => {
    if (plan.name === "Free") {
      toast({
        title: "Free Plan",
        description: "You are already on the Free/Trial plan.",
      });
      return;
    }

    if (isActive) {
      toast({
        title: "Active Subscription",
        description: "You already have an active subscription. Manage it from Account Settings.",
        variant: "destructive",
      });
      return;
    }

    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      toast({
        title: "Authentication Required",
        description: "Please login to subscribe to a plan.",
        variant: "destructive",
      });
      return;
    }

    // Open modal instead of directly calling Stripe
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  // Called from BillingModal when user clicks "Continue to Payment"
  const handleModalContinue = async (billingType: string, priceId: string) => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || !selectedPlan) return;

    const user = JSON.parse(storedUser);
    setIsProcessing(selectedPlan.name);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/payments/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id || user._id,
            planId: selectedPlan.name,
            billingType,
            currency: currency.toUpperCase(),
            duration,
            priceId,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start checkout");
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: "Checkout Error",
        description: error.message || "Could not connect to payment gateway",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
      setModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-7xl mx-auto flex flex-col items-center">

        {/* Plan Summary for Active Users */}
        {isActive && (
          <div className="w-full max-w-4xl mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-[#1e855e]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Your Subscription</h2>
                  <p className="text-slate-500 text-sm">
                    Want to know more about your subscription? Here are your current plan details.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8 pl-8 md:border-l border-slate-100 h-full">
                <div className="text-center md:text-left">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Plan</div>
                  <div className="text-lg font-black text-slate-900 leading-none">{activePlan}</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
                  <div className="text-lg font-black text-green-600 leading-none uppercase">{user?.subscriptionStatus || 'Active'}</div>
                </div>
                <div className="flex flex-col gap-2">
                   <Button 
                     onClick={() => navigate("/subscription-details")}
                     className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold px-6"
                   >
                     View Subscription Details
                   </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner removed, handled by /subscription/success */}

        {/* Currency Toggle */}
        <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm mb-8">
          <button
            onClick={() => setCurrency("usd")}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
              currency === "usd"
                ? "bg-[#1e855e] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            $ USD
          </button>
          <button
            onClick={() => setCurrency("gbp")}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
              currency === "gbp"
                ? "bg-[#1e855e] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            £ GBP
          </button>
        </div>

        {/* Contract Billing Label */}
        <div className="mb-6">
          <span className="bg-[#f0fdf4] text-[#1e855e] px-6 py-2 rounded-full border border-[#1e855e]/20 text-sm font-bold">
            Contract Billing
          </span>
        </div>

        {/* Duration Toggle */}
        <div className="flex gap-4 mb-16 items-center">
          <button
            onClick={() => setDuration("1year")}
            className={cn(
              "px-8 py-2 rounded-full text-sm font-bold transition-all duration-200 border",
              duration === "1year"
                ? "bg-[#1e855e] text-white border-[#1e855e] shadow-lg scale-105"
                : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
            )}
          >
            1 Year
          </button>
          <button
            onClick={() => setDuration("3years")}
            className={cn(
              "px-8 py-2 rounded-full text-sm font-bold transition-all duration-200 border",
              duration === "3years"
                ? "bg-[#1e855e] text-white border-[#1e855e] shadow-lg scale-105"
                : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
            )}
          >
            3 Years
          </button>
          <button
            onClick={() => setDuration("6years")}
            className={cn(
              "px-8 py-2 rounded-full text-sm font-bold transition-all duration-200 border relative",
              duration === "6years"
                ? "bg-[#1e855e] text-white border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-105"
                : "bg-white text-[#eab308] border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
            )}
          >
            6 Years
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "bg-white rounded-[2rem] p-8 flex flex-col border transition-all duration-300 hover:shadow-xl relative",
                plan.highlight
                  ? "border-[#1e855e] border-2 scale-105 shadow-lg z-10"
                  : "border-slate-100 shadow-sm",
                isPlanActive(plan.name) && "ring-2 ring-green-400 ring-offset-2"
              )}
            >
              {/* Active Badge */}
              {isPlanActive(plan.name) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                  ✅ Active Plan
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-6">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    {currency === "usd" ? "$" : "£"}
                    {getPrice(plan)}
                  </span>
                  <span className="text-slate-400 text-sm">/mo per user</span>
                </div>
              </div>

              <Button
                onClick={() => handleGetStarted(plan)}
                disabled={isProcessing !== null || isPlanActive(plan.name)}
                className={cn(
                  "w-full py-6 rounded-xl font-bold mb-10 transition-all duration-200",
                  isPlanActive(plan.name)
                    ? "bg-green-50 border border-green-300 text-green-700 cursor-default"
                    : plan.highlight
                    ? "bg-[#1e855e] hover:bg-[#16654b] text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50"
                )}
              >
                {isProcessing === plan.name ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isPlanActive(plan.name) ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : null}
                {isPlanActive(plan.name)
                  ? "Active Plan"
                  : plan.cta}
              </Button>

              <ul className="space-y-4 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0 bg-[#f0fdf4] rounded-full p-0.5">
                      <Check className="h-3.5 w-3.5 text-[#1e855e] stroke-[3]" />
                    </div>
                    <span className="text-sm text-slate-600 leading-tight">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Type Modal */}
      <BillingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        planName={selectedPlan?.name || ""}
        duration={duration}
        currency={currency}
        onContinue={handleModalContinue}
        isProcessing={isProcessing !== null}
      />
    </div>
  );
}
