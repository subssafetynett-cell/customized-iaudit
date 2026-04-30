import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  Shield, 
  Download, 
  ArrowUpCircle, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  ExternalLink,
  Receipt,
  Zap,
  AlertTriangle,
  X,
  Info,
  ChevronRight,
  ArrowRight,
  Ban
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";

interface Invoice {
  id: string;
  date: string;
  amount: string;
  currency: string;
  status: string;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
  receipt_url?: string;
  number: string;
}

interface UserStatus {
  subscriptionStatus: string;
  subscriptionPlan: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  planStartDate: string | null;
  planExpiryDate: string | null;
  nextBillingDate: string | null;
  stripePriceId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  renewalType?: string;
  duration?: string;
  stripeSubscriptionId?: string | null;
}

export default function SubscriptionDetails() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDescription, setCancelDescription] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState("");
  const [upgradeDescription, setUpgradeDescription] = useState("");
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?.id || user?._id;

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [statusRes, invoicesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/users/${userId}/status`),
          fetch(`${API_BASE_URL}/api/subscription/invoices/${userId}`)
        ]);

        const statusData = await statusRes.json();
        const invoicesData = await invoicesRes.json();

        setStatus(statusData);
        if (invoicesData && Array.isArray(invoicesData)) {
          console.log("Billing Data Received:", invoicesData);
          setInvoices(invoicesData);
        } else {
          setInvoices([]);
        }
      } catch (error) {
        console.error("Failed to fetch subscription data:", error);
        toast({
          title: "Error",
          description: "Failed to load subscription details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, navigate, toast]);

  const handleSubmitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason) {
      toast({
        title: "Error",
        description: "Please select a reason for cancellation.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscription/cancel-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          reason: cancelReason,
          description: cancelDescription
        })
      });

      if (response.ok) {
        setCancelRequested(true);
        toast({
          title: "Request Sent",
          description: "Your cancellation request has been sent to our support team."
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send request");
      }
    } catch (error: any) {
      console.error("Cancellation Request Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send request. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleSubmitUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradePlan) {
      toast({
        title: "Error",
        description: "Please select a target plan for upgrade.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingUpgrade(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscription/upgrade-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          targetPlan: upgradePlan,
          description: upgradeDescription
        })
      });

      if (response.ok) {
        setUpgradeRequested(true);
        toast({
          title: "Request Sent",
          description: "Your upgrade request has been sent to our support team."
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send request");
      }
    } catch (error: any) {
      console.error("Upgrade Request Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send request. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const handleUpdatePayment = async () => {
    setIsPortalLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to open billing portal");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsPortalLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e855e]" />
      </div>
    );
  }

  const isMonthly = status?.stripePriceId?.includes('monthly') || status?.nextBillingDate != null;

  // Strict fallback logic: If a recurring subscription ID exists, it's AUTOPAY. Yearly acts as MANUAL.
  const actualRenewalType = status?.stripeSubscriptionId ? 'AUTOPAY' : (status?.renewalType || 'MANUAL');

  // Calculate days remaining for banner (STRICT LOGIC)
  const today = new Date();
  let targetDate = null;
  const nextBillingDate = status?.nextBillingDate;
  const planExpiryDate = status?.planExpiryDate;

  // Monthly users → use nextBillingDate
  if (nextBillingDate) {
    targetDate = new Date(nextBillingDate);
  }
  // Yearly users → use planExpiryDate
  else if (planExpiryDate) {
    targetDate = new Date(planExpiryDate);
  }

  let daysRemaining: number | null = null;
  if (targetDate) {
    const diffTime = targetDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  console.log("Days Remaining:", daysRemaining);
  console.log("Billing Debug:", {
    nextBillingDate,
    planExpiryDate,
    daysRemaining
  });

  const showBanner = daysRemaining !== null && daysRemaining <= 15;
  const isUrgent = daysRemaining !== null && daysRemaining <= 7;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 relative">
      {/* Top Banner */}
      {showBanner && (
        <div className={cn(
          "w-full py-2.5 px-4 flex items-center justify-center gap-3 text-sm font-bold z-50 sticky top-0 border-b transition-all animate-in slide-in-from-top duration-500",
          isExpired ? "bg-red-600 text-white border-red-700" : 
          (isUrgent ? "bg-amber-400 text-slate-900 border-amber-500" : "bg-blue-600 text-white border-blue-700")
        )}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {isExpired ? "Your plan has expired!" : `Your plan expires in ${daysRemaining === 0 ? 'today' : daysRemaining + ' days'}`}
            </span>
          </div>
          {actualRenewalType === 'MANUAL' && (
             <Button 
              size="sm" 
              variant="secondary"
              onClick={() => navigate('/subscription')}
              className={cn(
                "h-7 px-3 text-[10px] uppercase font-black rounded-lg shadow-sm",
                isExpired ? "bg-white text-red-600 hover:bg-slate-50" : "bg-slate-900 text-white hover:bg-slate-800"
              )}
             >
               Renew Now
             </Button>
          )}
        </div>
      )}

      {/* Subscription Reminder Modal */}
      {showModal && daysRemaining !== null && daysRemaining <= 15 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
           <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden relative animate-in zoom-in slide-in-from-bottom-8 duration-700">
              {/* Close Button */}
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

              {/* Modal Content */}
              <div className="flex flex-col">
                <div className={cn(
                  "pt-12 pb-8 flex flex-col items-center text-center",
                  (isExpired || (actualRenewalType === 'MANUAL' && isMonthly)) ? "bg-red-50" : 
                  (daysRemaining <= 7 ? "bg-amber-50" : "bg-blue-50")
                )}>
                   <div className={cn(
                     "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl rotate-3",
                     (isExpired || (actualRenewalType === 'MANUAL' && isMonthly)) ? "bg-red-500 text-white" : 
                     (daysRemaining <= 7 ? "bg-amber-500 text-white" : "bg-blue-600 text-white")
                   )}>
                     {isExpired ? <Ban className="w-10 h-10" /> : 
                      (actualRenewalType === 'MANUAL' ? <Zap className="w-10 h-10" /> : <Info className="w-10 h-10" />)}
                   </div>
                   <h2 className="text-2xl font-black text-slate-900 px-8">
                     {isExpired ? "Account Expired" : 
                      (actualRenewalType === 'MANUAL' ? (isMonthly ? "Payment Required" : "Plan Expiry Reminder") : "Upcoming Renewal")}
                   </h2>
                   <p className={cn(
                     "mt-2 text-xs font-black uppercase tracking-widest",
                     (isExpired || (actualRenewalType === 'MANUAL' && isMonthly)) ? "text-red-600" : 
                     (daysRemaining <= 7 ? "text-amber-600" : "text-blue-600")
                   )}>
                     {status?.subscriptionPlan?.toUpperCase() || 'PREMIUM'} Plan
                   </p>
                </div>

                <div className="p-8 space-y-6">
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl">
                     <div className="text-slate-500 text-sm font-medium leading-relaxed mb-4">
                       {actualRenewalType === 'AUTOPAY' ? (
                         <>Your plan will renew on <span className="font-bold text-slate-900">{nextBillingDate ? formatDate(nextBillingDate) : formatDate(planExpiryDate)}</span>. Amount will be automatically debited.</>
                       ) : (
                         <>Your subscription {isExpired ? 'expired on' : 'will expire on'} <span className="font-bold text-slate-900">{nextBillingDate ? formatDate(nextBillingDate) : formatDate(planExpiryDate)}</span>.</>
                       )}
                     </div>
                     
                     <div className={cn(
                       "flex items-center gap-3 p-3 rounded-2xl border font-bold text-xs",
                       isExpired ? "bg-red-100/50 border-red-200 text-red-700" : 
                       (daysRemaining <= 7 ? "bg-amber-100/50 border-amber-200 text-amber-700" : "bg-blue-100/50 border-blue-200 text-blue-700")
                     )}>
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>
                          {isExpired ? "Your account may be suspended if payment is not completed." : `You have ${daysRemaining === 0 ? 'last day' : daysRemaining + ' days'} remaining.`}
                        </span>
                     </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    {actualRenewalType === 'MANUAL' ? (
                      <Button 
                        onClick={() => navigate('/subscription')}
                        className={cn(
                          "w-full py-8 rounded-3xl font-black text-lg shadow-xl group transition-all",
                          isExpired ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20" : "bg-[#1e855e] hover:bg-[#16654b] text-white shadow-[#1e855e]/20"
                        )}
                      >
                        Renew Now
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setShowModal(false)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-8 rounded-3xl font-black text-lg shadow-xl shadow-blue-600/20 group transition-all"
                      >
                        Got It
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/subscription')}
                      className="w-full text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-50 py-4"
                    >
                      {actualRenewalType === 'AUTOPAY' ? 'Upgrade Plan' : (isExpired ? 'Close' : 'Maybe Later')}
                    </Button>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/subscription")}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Subscription Details</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className={cn(
               "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
               status?.subscriptionStatus === 'active' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
             )}>
               {status?.subscriptionStatus}
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* Main Plan Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-[#1e855e]" />
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">Current Plan</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">
                    {status?.subscriptionPlan?.toUpperCase() || "FREE TRIAL"}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {isMonthly ? "Monthly Billing" : "Yearly/Contract"}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {status?.duration ? `${status.duration.replace('years', ' Years').replace('year', ' Year')} Plan` : "Flexible Subscription"}
                  </p>
                  
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase mt-2 shadow-sm border",
                    actualRenewalType === 'AUTOPAY' ? "bg-[#f0fdf4] text-[#1e855e] border-[#1e855e]/10" : "bg-amber-50 text-amber-700 border-amber-200/30"
                  )}>
                    {actualRenewalType === 'AUTOPAY' ? (
                      <><CreditCard className="w-3 h-3" /> Auto-Debit</>
                    ) : (
                      <><FileText className="w-3 h-3" /> Manual Pay</>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-8 border-t border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Started On</span>
                  </div>
                  <p className="text-[15px] font-bold text-slate-800">
                    {formatDate(status?.planStartDate || status?.trialStartDate || null)}
                  </p>
                </div>
                
                {status?.nextBillingDate && (
                  <div>
                    <div className="flex items-center gap-2 text-[#1e855e] mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Next Billing</span>
                    </div>
                    <p className="text-[15px] font-bold text-slate-900">
                      {formatDate(status.nextBillingDate)}
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Expires On</span>
                  </div>
                  <p className="text-[15px] font-bold text-slate-800">
                    {formatDate(status?.planExpiryDate || status?.trialEndDate || null)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <Button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="w-full justify-start gap-3 bg-slate-900 hover:bg-slate-800 text-white py-6 rounded-2xl transition-all hover:scale-[1.02]"
              >
                <ArrowUpCircle className="w-5 h-5" />
                Upgrade Plan
              </Button>
              <Button 
                onClick={handleUpdatePayment}
                disabled={isPortalLoading}
                variant="outline"
                className="w-full justify-start gap-3 border-slate-200 hover:bg-slate-50 py-6 rounded-2xl"
              >
                {isPortalLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5 text-slate-600" />
                )}
                Update Payment
              </Button>
              <Button 
                onClick={() => setIsManageModalOpen(true)}
                variant="outline"
                className="w-full justify-start gap-3 border-slate-200 hover:bg-slate-50 py-6 rounded-2xl"
              >
                <Settings className="w-5 h-5 text-slate-600" />
                Manage Subscription
              </Button>
            </div>
            
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Shield className="w-4 h-4 text-[#1e855e]" />
                <span className="text-xs font-bold uppercase">Security</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Secure payments powered by Stripe. Your data is encrypted and managed according to highest security standards.
              </p>
            </div>
          </div>
        </div>

        {/* Reminder Banner */}
        {showBanner && (
          <div className={cn(
            "p-4 px-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
            isExpired ? "bg-red-50 border-red-100 text-red-900" : 
            (isUrgent ? "bg-amber-50 border-amber-100 text-amber-900" : "bg-blue-50 border-blue-100 text-blue-900")
          )}>
            <div className="flex items-center gap-3">
              <AlertCircle className={cn("w-5 h-5", isExpired ? "text-red-500" : (isUrgent ? "text-amber-500" : "text-blue-500"))} />
              <div>
                <p className="text-sm font-black">
                  {daysRemaining! > 1 && `Your plan will expire in ${daysRemaining} days`}
                  {daysRemaining! === 1 && `Your plan will expire tomorrow`}
                  {daysRemaining! === 0 && `Your plan expires today`}
                  {daysRemaining! < 0 && `Your plan has expired. Please renew to continue.`}
                </p>
                  {actualRenewalType === 'AUTOPAY' && (
                  <p className="text-[10px] uppercase font-black tracking-widest mt-0.5 opacity-60">
                    Auto-renewal is active. You will be billed automatically.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {actualRenewalType === 'MANUAL' ? (
                <Button 
                  onClick={() => navigate("/subscription")}
                  className={cn(
                    "w-full sm:w-auto font-black px-6 rounded-xl shadow-sm border",
                    isExpired ? "bg-red-600 hover:bg-red-700 text-white border-red-700" : 
                    (isUrgent ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-700" : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700")
                  )}
                >
                  Renew Now
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate("/subscription")}
                  variant="outline"
                  className="w-full sm:w-auto bg-white/50 backdrop-blur-sm border-slate-200 hover:bg-white text-slate-900 font-black px-6 rounded-xl"
                >
                  Upgrade Plan
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Billing History */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Billing History</h3>
              <p className="text-sm text-slate-500">View and download your past invoices</p>
            </div>
            <FileText className="w-6 h-6 text-slate-300" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length > 0 ? invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-slate-900">
                        {new Date(invoice.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm text-slate-600 font-mono">{invoice.number}</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-black text-slate-900">
                        {invoice.currency === 'GBP' ? '£' : '$'}{invoice.amount}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        invoice.status?.toLowerCase() === 'paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {invoice.status?.toLowerCase() === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {invoice.invoice_pdf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 text-[#1e855e] hover:text-[#1e855e] hover:bg-green-50 gap-2 font-bold"
                            onClick={() => window.open(invoice.invoice_pdf, "_blank")}
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-[11px] uppercase tracking-tight">Invoice</span>
                          </Button>
                        )}
                        {invoice.receipt_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-2 font-bold"
                            onClick={() => window.open(invoice.receipt_url, "_blank")}
                          >
                            <Receipt className="w-4 h-4" />
                            <span className="text-[11px] uppercase tracking-tight">Receipt</span>
                          </Button>
                        )}
                        {!invoice.invoice_pdf && !invoice.receipt_url && invoice.hosted_invoice_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 text-[#1e855e] hover:text-[#1e855e] hover:bg-green-50 gap-2 font-bold"
                            onClick={() => window.open(invoice.hosted_invoice_url, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-[11px] uppercase tracking-tight">View Invoice</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                          <FileText className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500">No invoices found for this account.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manage Subscription Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Manage Subscription</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">If you need to cancel your subscription, please contact our support team below.</DialogDescription>
            </div>
            <Shield className="w-8 h-8 text-[#1e855e]/20" />
          </div>
          
          <div className="p-8">
            {cancelRequested ? (
              <div className="py-12 text-center flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div>
                   <h4 className="text-2xl font-black text-green-900">Request Received</h4>
                   <p className="text-slate-600 mt-3 max-w-md mx-auto leading-relaxed">
                     A member of our support team will contact you shortly at <span className="font-bold text-slate-900 underline">{user?.email}</span> to finalize the process.
                   </p>
                </div>
                <Button 
                  onClick={() => {
                    setIsManageModalOpen(false);
                    setCancelRequested(false);
                    setCancelReason("");
                    setCancelDescription("");
                  }}
                  className="mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-6 px-10 rounded-2xl"
                >
                  Close Window
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitCancel} className="space-y-8">
                <div className="space-y-6">
                  <Label className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1e855e]" />
                    Reason for cancellation
                  </Label>
                  <RadioGroup 
                    value={cancelReason} 
                    onValueChange={setCancelReason}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {[
                      { id: "alt", label: "I found an alternative" },
                      { id: "need", label: "I no longer need it" },
                      { id: "cost", label: "It's too expensive" },
                      { id: "other_reason", label: "Other reason" }
                    ].map((option) => (
                      <div key={option.id} className="flex items-center space-x-3 group cursor-pointer p-4 rounded-2xl border border-slate-100 hover:border-[#1e855e]/30 hover:bg-green-50/30 transition-all">
                        <RadioGroupItem value={option.label} id={option.id} className="text-[#1e855e] border-slate-300" />
                        <Label htmlFor={option.id} className="text-sm font-bold text-slate-600 cursor-pointer group-hover:text-slate-900 transition-colors w-full">{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1e855e]" />
                    Additional feedback (Optional)
                  </Label>
                  <Textarea 
                    placeholder="Tell us more about your experience..." 
                    value={cancelDescription}
                    onChange={(e) => setCancelDescription(e.target.value)}
                    className="min-h-[140px] rounded-2xl border-slate-200 focus:border-[#1e855e] focus:ring-[#1e855e]/10 bg-slate-50/50 resize-none p-5 text-slate-700 leading-relaxed font-medium"
                  />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 gap-8">
                  <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed font-medium italic">
                    Note: Our support team will process your request manually within 48 business hours.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={() => setIsManageModalOpen(false)}
                      className="font-bold py-6 px-6 text-slate-400 hover:text-slate-600 rounded-2xl"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmittingCancel}
                      className="bg-[#1e855e] hover:bg-[#16654b] text-white font-bold py-6 px-10 rounded-2xl flex items-center gap-2 shadow-lg shadow-green-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isSubmittingCancel ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Plan Modal */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Upgrade Your Plan</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-1">Select the plan you'd like to switch to and our team will handle the rest.</DialogDescription>
            </div>
            <Zap className="w-8 h-8 text-amber-500/20" />
          </div>
          
          <div className="p-8">
            {upgradeRequested ? (
              <div className="py-12 text-center flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center shadow-inner">
                  <Zap className="w-10 h-10 text-amber-500" />
                </div>
                <div>
                   <h4 className="text-2xl font-black text-amber-900">Upgrade Request Sent</h4>
                   <p className="text-slate-600 mt-3 max-w-md mx-auto leading-relaxed">
                     Perfect! We've received your request to upgrade to the <span className="font-bold text-slate-900">{upgradePlan}</span> plan. A specialist will reach out to <span className="font-bold text-slate-900 underline">{user?.email}</span> shortly.
                   </p>
                </div>
                <Button 
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    setUpgradeRequested(false);
                    setUpgradePlan("");
                    setUpgradeDescription("");
                  }}
                  className="mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-6 px-10 rounded-2xl"
                >
                  Great, Thanks!
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitUpgrade} className="space-y-8">
                <div className="space-y-6">
                  <Label className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Requested Plan Details
                  </Label>
                  <div className="space-y-3">
                    <Input 
                      placeholder="Enter the subscription / plan details that you need to upgrade" 
                      value={upgradePlan}
                      onChange={(e) => setUpgradePlan(e.target.value)}
                      className="rounded-2xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/10 bg-slate-50/50 p-6 h-auto text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium"
                    />
                    <p className="text-[11px] text-slate-400 font-medium px-2 italic">
                      * Please mention the plan name (Dos, Tres, or Contract) and preferred duration.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Additional Requirements (Optional)
                  </Label>
                  <Textarea 
                    placeholder="e.g. Need 5 more users, API access, or specific modules..." 
                    value={upgradeDescription}
                    onChange={(e) => setUpgradeDescription(e.target.value)}
                    className="min-h-[140px] rounded-2xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/10 bg-slate-50/50 resize-none p-5 text-slate-700 leading-relaxed font-medium"
                  />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 gap-8">
                  <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed font-medium italic">
                    Upgrades are typically processed manually to ensure correct billing transitions.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={() => setIsUpgradeModalOpen(false)}
                      className="font-bold py-6 px-6 text-slate-400 rounded-2xl"
                    >
                      Maybe Later
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmittingUpgrade}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-6 px-10 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-900/10 transition-all hover:scale-[1.02]"
                    >
                      {isSubmittingUpgrade ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Zap className="w-5 h-5 fill-amber-400 text-amber-400" />
                          Send Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
