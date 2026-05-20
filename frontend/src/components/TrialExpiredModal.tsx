import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        hideClose
        className="z-[110] max-w-md p-0 overflow-hidden border-none bg-white rounded-2xl shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="relative">
          <div className="h-2 bg-red-600" />

          <div className="p-8">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 border border-red-200">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3">
                Your trial has ended
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Your free trial has ended and your account is <span className="font-semibold text-red-700">suspended</span>.
                You can no longer use the app for free. Upgrade now to restore full access to your
                data and features.
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => {
                  onClose();
                  navigate('/subscription');
                }}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
              >
                <CreditCard className="w-5 h-5" />
                Upgrade now
                <ArrowRight className="w-5 h-5 ml-auto" />
              </Button>

              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs text-red-800 text-center font-medium leading-relaxed">
                  Until you upgrade, you can only access the Dashboard, Feedback, and
                  Subscription pages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrialExpiredModal;
