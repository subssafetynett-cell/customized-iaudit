import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

interface TourStepPopoverProps {
  targetId: string;
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TourStepPopover: React.FC<TourStepPopoverProps> = ({
  targetId,
  step,
  totalSteps,
  title,
  description,
  onNext,
  onBack,
  onClose,
  position = 'right'
}) => {
  const [coords, setCoords] = useState<{ top: number, left: number } | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const element = document.getElementById(targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        let top = 0;
        let left = 0;

        switch (position) {
          case 'top':
            top = rect.top - 12;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + 12;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - 12;
            break;
          case 'right':
          default:
            top = rect.top + rect.height / 2;
            left = rect.right + 12;
            break;
        }

        setCoords({ top, left });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updatePosition, 100);
    
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetId]);

  if (!coords) return null;

  return (
    <>
      {/* Overlay Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[90] animate-in fade-in duration-300 pointer-events-auto" 
        aria-hidden="true"
      />
      
      {/* Spotlight Effect - applied via CSS to the target element */}
      <style dangerouslySetInnerHTML={{ __html: `
        #${targetId} {
          position: relative !important;
          z-index: 100 !important;
          background-color: #10B981 !important; /* Force emerald background */
          color: white !important;
          box-shadow: 0 0 0 4px white, 0 10px 40px rgba(0, 0, 0, 0.5) !important;
          border-radius: 12px !important;
          pointer-events: auto !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        #${targetId} * {
          color: white !important;
        }

        #${targetId} .bg-[#ecfdf5], #${targetId} .bg-transparent {
          background-color: transparent !important;
        }

        #${targetId} .text-[#1e855e] {
          color: white !important;
        }
      `}} />

      <div 
        className="fixed z-[110] animate-in fade-in zoom-in duration-200 pointer-events-auto"
        style={{ 
          top: `${coords.top}px`, 
          left: `${coords.left}px`,
          transform: position === 'right' ? 'translateY(-50%)' : 
                     position === 'left' ? 'translate(-100%, -50%)' :
                     position === 'top' ? 'translate(-50%, -100%)' :
                     'translateX(-50%)'
        }}
      >
      {/* Arrow */}
      {position === 'right' && <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-slate-200 shadow-[-2px_2px_5px_rgba(0,0,0,0.05)]" />}
      {position === 'left' && <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-r border-t border-slate-200 shadow-[2px_-2px_5px_rgba(0,0,0,0.05)]" />}
      {position === 'top' && <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-slate-200 shadow-[2px_2px_5px_rgba(0,0,0,0.05)]" />}
      {position === 'bottom' && <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-l border-t border-slate-200 shadow-[-2px_-2px_5px_rgba(0,0,0,0.05)]" />}
      
      <div className="w-[320px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden relative">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[#10B981] text-xs font-bold tracking-tight">Step {step} of {totalSteps}</span>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1.5">
            <h3 className="text-slate-900 font-black text-lg leading-tight tracking-tight">Step {step} — {title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
              {description}
            </p>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 h-11 rounded-xl border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 bg-white"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100"
              onClick={onNext}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
