import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
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
  hideNext?: boolean;
  disableShadow?: boolean;
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
  position = 'right',
  hideNext = false,
  disableShadow = false
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updatePosition = () => {
      const element = document.getElementById(targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        setTargetRect(rect);

        let top = 0;
        let left = 0;
        switch (position) {
          case 'top':    top = rect.top - 12;              left = rect.left + rect.width / 2; break;
          case 'bottom': top = rect.bottom + 12;           left = rect.left + rect.width / 2; break;
          case 'left':   top = rect.top + rect.height / 2; left = rect.left - 12;             break;
          case 'right':
          default:       top = rect.top + rect.height / 2; left = rect.right + 12;            break;
        }
        setCoords({ top, left });

        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    intervalId = setInterval(updatePosition, 100);
    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetId, position]);

  useEffect(() => {
    document.body.classList.add('tour-active');
    return () => document.body.classList.remove('tour-active');
  }, []);

  if (!coords || !targetRect) return null;

  const PADDING = 6;

  const content = (
    <>
      {/* Ensure target element sits above overlay and is clickable */}
      <style dangerouslySetInnerHTML={{ __html: `
        #${targetId} {
          position: relative !important;
          z-index: 100 !important;
          pointer-events: auto !important;
        }

        /* Bring sidebar above the z-90 invisible blocker, but make it unclickable */
        body.tour-active aside,
        body.tour-active [data-sidebar="sidebar"],
        body.tour-active .fixed.z-10 {
          z-index: 95 !important;
          pointer-events: none !important;
        }
      `}} />

      {/* ✅ FIXED: Both the full overlay AND the spotlight cutout are now inside the
          same !disableShadow guard. Previously the overlay div was always rendered
          even when disableShadow=true, causing the black page cover on step 4. */}
      {!disableShadow && (
        <>
          {/* Full overlay — invisible click blocker */}
          <div className="fixed inset-0 z-[90] pointer-events-auto" aria-hidden="true" />

          {/* Spotlight cutout — transparent hole over target using box-shadow */}
          <div
            className="fixed pointer-events-none z-[96]"
            style={{
              top: targetRect.top - PADDING,
              left: targetRect.left - PADDING,
              width: targetRect.width + PADDING * 2,
              height: targetRect.height + PADDING * 2,
              borderRadius: 10,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 2px #10b981, 0 4px 24px rgba(16,185,129,0.3)',
            }}
          />
        </>
      )}

      {/* Popover */}
      <div
        className="fixed z-[110] animate-in fade-in zoom-in duration-200 pointer-events-auto"
        style={{
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          transform:
            position === 'right'  ? 'translateY(-50%)' :
            position === 'left'   ? 'translate(-100%, -50%)' :
            position === 'top'    ? 'translate(-50%, -100%)' :
                                    'translateX(-50%)'
        }}
      >
        {/* Arrow */}
        {position === 'right'  && <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-slate-200" />}
        {position === 'left'   && <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-r border-t border-slate-200" />}
        {position === 'top'    && <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-slate-200" />}
        {position === 'bottom' && <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-l border-t border-slate-200" />}

        <div className="w-[300px] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden">
          <div className="p-4 space-y-3">

            {/* Step label + close */}
            <div className="flex items-center justify-between">
              <span className="text-emerald-500 text-[11px] font-bold tracking-wide">Step {step} of {totalSteps}</span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Title & description */}
            <div className="space-y-1">
              <h3 className="text-slate-900 font-black text-sm leading-snug tracking-tight">
                Step {step} — {title}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                {description}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onBack}
                className="flex-1 h-8 rounded-lg border border-emerald-600 text-emerald-700 text-xs font-bold hover:bg-emerald-50 bg-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              {!hideNext && (
                <button
                  onClick={onNext}
                  className="flex-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-100"
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
};