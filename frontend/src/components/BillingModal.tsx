import React, { useState } from "react";
import { X, Loader2, CreditCard, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Price display map: currency → plan → duration → { monthly, yearly }
const PRICE_MAP: Record<string, Record<string, Record<string, { monthly: number; yearly: number }>>> = {
  usd: {
    Unos: {
      "1year":  { monthly: 15.60, yearly: 187.20 },
      "3years": { monthly: 11.60, yearly: 417.60 },
      "6years": { monthly: 7.60,  yearly: 547.20 },
    },
    Dos: {
      "1year":  { monthly: 25.90, yearly: 310.80 },
      "3years": { monthly: 22.90, yearly: 824.40 },
      "6years": { monthly: 18.90, yearly: 1360.80 },
    },
    Tres: {
      "1year":  { monthly: 30.10, yearly: 361.20 },
      "3years": { monthly: 25.10, yearly: 903.60 },
      "6years": { monthly: 21.10, yearly: 1519.20 },
    },
  },
  gbp: {
    Unos: {
      "1year":  { monthly: 12.50, yearly: 150.00 },
      "3years": { monthly: 9.30,  yearly: 334.80 },
      "6years": { monthly: 6.10,  yearly: 439.20 },
    },
    Dos: {
      "1year":  { monthly: 20.70, yearly: 248.40 },
      "3years": { monthly: 18.30, yearly: 659.80 },
      "6years": { monthly: 15.10, yearly: 1087.20 },
    },
    Tres: {
      "1year":  { monthly: 24.10, yearly: 289.20 },
      "3years": { monthly: 20.10, yearly: 723.60 },
      "6years": { monthly: 16.90, yearly: 1216.80 },
    },
  },
};

// Map to exact Stripe price IDs: currency → plan → duration → { monthly, yearly }
const STRIPE_PRICE_IDS: Record<string, Record<string, Record<string, Record<string, string>>>> = {
  usd: {
    Unos: {
      "1year":  { monthly: "price_1TR3C1DIou8RJDFOcbtlBsNJ", yearly: "price_1TR3C1DIou8RJDFOcbtlBsNJ" },
      "3years": { monthly: "price_1TR3C1DIou8RJDFOgBHXHwLk", yearly: "price_1TR3C1DIou8RJDFOgBHXHwLk" },
      "6years": { monthly: "price_1TR3C1DIou8RJDFOWMzu0Odd", yearly: "price_1TR3C1DIou8RJDFOWMzu0Odd" },
    },
    Dos: {
      "1year":  { monthly: "price_1TR3C8DIou8RJDFOb18x0jwU", yearly: "price_1TR3C8DIou8RJDFOb18x0jwU" },
      "3years": { monthly: "price_1TR3C8DIou8RJDFO8fBRVYuT", yearly: "price_1TR3C8DIou8RJDFO8fBRVYuT" },
      "6years": { monthly: "price_1TR3C8DIou8RJDFOPK5Wx5Fo", yearly: "price_1TR3C8DIou8RJDFOPK5Wx5Fo" },
    },
    Tres: {
      "1year":  { monthly: "price_1TR3CCDIou8RJDFOb7BPrfsw", yearly: "price_1TR3CCDIou8RJDFOb7BPrfsw" },
      "3years": { monthly: "price_1TR3CCDIou8RJDFOJXA3sImc", yearly: "price_1TR3CCDIou8RJDFOJXA3sImc" },
      "6years": { monthly: "price_1TR3CCDIou8RJDFO1gAo8FvM", yearly: "price_1TR3CCDIou8RJDFO1gAo8FvM" },
    },
  },
  gbp: {
    Unos: {
      "1year":  { monthly: "price_1TR3C1DIou8RJDFOr4v6AYfZ", yearly: "price_1TR3C1DIou8RJDFOr4v6AYfZ" },
      "3years": { monthly: "price_1TR3C1DIou8RJDFOX1j0euCI", yearly: "price_1TR3C1DIou8RJDFOX1j0euCI" },
      "6years": { monthly: "price_1TR3C1DIou8RJDFOehChO7ct", yearly: "price_1TR3C1DIou8RJDFOehChO7ct" },
    },
    Dos: {
      "1year":  { monthly: "price_1TR3C8DIou8RJDFOWdJTy184", yearly: "price_1TR3C8DIou8RJDFOWdJTy184" },
      "3years": { monthly: "price_1TR3C8DIou8RJDFOpISOdAUX", yearly: "price_1TR3C8DIou8RJDFOpISOdAUX" },
      "6years": { monthly: "price_1TR3C8DIou8RJDFO8apofHEz", yearly: "price_1TR3C8DIou8RJDFO8apofHEz" },
    },
    Tres: {
      "1year":  { monthly: "price_1TR3CCDIou8RJDFOjA6mRn54", yearly: "price_1TR3CCDIou8RJDFOjA6mRn54" },
      "3years": { monthly: "price_1TR3CCDIou8RJDFO4HL1lu8G", yearly: "price_1TR3CCDIou8RJDFO4HL1lu8G" },
      "6years": { monthly: "price_1TR3CCDIou8RJDFOOqVVWDsY", yearly: "price_1TR3CCDIou8RJDFOOqVVWDsY" },
    },
  },
};

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  duration: string; // "1year" | "3years" | "6years"
  currency: string; // "usd" | "gbp"
  onContinue: (billingType: string, priceId: string) => void;
  isProcessing: boolean;
}

export default function BillingModal({
  isOpen,
  onClose,
  planName,
  duration,
  currency,
  onContinue,
  isProcessing,
}: BillingModalProps) {
  const [billingType, setBillingType] = useState<"monthly" | "yearly">("monthly");

  if (!isOpen) return null;

  const currencyKey = currency.toLowerCase();
  const prices = PRICE_MAP[currencyKey]?.[planName]?.[duration];
  const priceIds = STRIPE_PRICE_IDS[currencyKey]?.[planName]?.[duration];
  const currencySymbol = currency === "usd" ? "$" : "£";

  const durationLabel = duration === "1year" ? "1 Year" : duration === "3years" ? "3 Years" : "6 Years";
  const monthlyPrice = prices?.monthly || 0;
  const yearlyPrice = prices?.yearly || 0;

  const displayTotal = billingType === "monthly"
    ? `${currencySymbol}${monthlyPrice.toFixed(2)}/mo`
    : `${currencySymbol}${yearlyPrice.toFixed(2)}`;

  const handleContinue = () => {
    const selectedPriceId = priceIds?.[billingType];
    if (!selectedPriceId) {
      alert("Price not configured yet for this plan.");
      return;
    }
    onContinue(billingType.toUpperCase(), selectedPriceId);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClose();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Select Billing Type</h2>
            <p className="text-sm text-slate-500 mt-0.5">{planName} · {durationLabel} Contract</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Billing Options */}
        <div className="px-6 py-5 space-y-3">
          {/* Monthly Option */}
          <label
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
              billingType === "monthly"
                ? "border-[#1e855e] bg-green-50/50 shadow-sm"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <input
              type="radio"
              name="billingType"
              value="monthly"
              checked={billingType === "monthly"}
              onChange={() => setBillingType("monthly")}
              className="sr-only"
            />
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              billingType === "monthly" ? "border-[#1e855e]" : "border-slate-300"
            )}>
              {billingType === "monthly" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#1e855e]" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900">Pay Monthly</span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {currencySymbol}{monthlyPrice.toFixed(2)} per month
              </p>
            </div>
          </label>

          {/* Yearly Option */}
          <label
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
              billingType === "yearly"
                ? "border-[#1e855e] bg-green-50/50 shadow-sm"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <input
              type="radio"
              name="billingType"
              value="yearly"
              checked={billingType === "yearly"}
              onChange={() => setBillingType("yearly")}
              className="sr-only"
            />
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              billingType === "yearly" ? "border-[#1e855e]" : "border-slate-300"
            )}>
              {billingType === "yearly" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#1e855e]" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900">Pay Yearly</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Save more
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {currencySymbol}{yearlyPrice.toFixed(2)} billed once
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-xl font-bold text-slate-900">{displayTotal}</span>
          </div>
          <Button
            onClick={handleContinue}
            disabled={isProcessing}
            className="w-full py-6 rounded-xl font-bold bg-[#1e855e] hover:bg-[#16654b] text-white shadow-md transition-all duration-200"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            Continue to Payment
          </Button>
        </div>
      </div>
    </div>
  );
}