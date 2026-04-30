import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Rocket, Check, ShieldCheck, CreditCard } from "lucide-react";

interface TrialModalProps {
  isOpen: boolean;
  onStartTrial: () => void;
  onSubscribe: () => void;
}

const TrialModal: React.FC<TrialModalProps> = ({ isOpen, onStartTrial, onSubscribe }) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Side - Visual/Info */}
          <div className="w-full md:w-1/2 bg-gradient-to-br from-[#00875b] to-[#006e4a] p-8 text-white flex flex-col justify-center">
            <div className="mb-6 flex justify-center md:justify-start">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Rocket className="w-8 h-8" />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold mb-4 leading-tight">Elevate Your Auditing Experience</h2>
            <p className="text-white/80 mb-8 font-medium">Choose how you'd like to continue your journey with iAudit. Unlock premium features and streamline your compliance processes.</p>
            
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-sm font-semibold text-white">Unlimited Audit Plans</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-sm font-semibold text-white">Advanced Analytics & Reporting</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-sm font-semibold text-white">Team Collaboration Tools</span>
              </li>
            </ul>
          </div>

          {/* Right Side - Actions */}
          <div className="flex-1 p-8 flex flex-col justify-center bg-white/50">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to your Dashboard</h3>
              <p className="text-slate-500 text-sm">Please select an option to get started with your account.</p>
            </div>

            <div className="space-y-4">
              {/* Option 1: Free Trial */}
              <button 
                onClick={onStartTrial}
                className="w-full group p-4 rounded-xl border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-start gap-4 outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-none mb-1">14-Day Free Trial</h4>
                  <p className="text-xs text-slate-500">Test all premium features for free. No credit card required.</p>
                </div>
              </button>

              {/* Option 2: Subscription */}
              <button 
                onClick={onSubscribe}
                className="w-full group p-4 rounded-xl border-2 border-slate-100 hover:border-slate-900 hover:bg-slate-50 transition-all text-left flex items-start gap-4 outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-none mb-1">Continue with Subscription</h4>
                  <p className="text-xs text-slate-500">Secure your professional subscription and get started immediately.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialModal;
