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
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  hideNext?: boolean;
  disableShadow?: boolean;
  /** Extra horizontal nudge in px (negative = move left). Applied after viewport clamping. */
  offsetX?: number;
  /** Extra vertical nudge in px (negative = move up). */
  offsetY?: number;
}

const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT_EST = 200;
const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 12;

type PopoverPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

function getAnchorCoords(rect: DOMRect, pos: PopoverPosition): { top: number; left: number } {
  switch (pos) {
    case 'top':
      return { top: rect.top - ANCHOR_GAP, left: rect.left + rect.width / 2 };
    case 'bottom':
      return { top: rect.bottom + ANCHOR_GAP, left: rect.left + rect.width / 2 };
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - ANCHOR_GAP };
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + ANCHOR_GAP };
    default:
      return { top: rect.top + rect.height / 2, left: rect.right + ANCHOR_GAP };
  }
}

function getPopoverBox(top: number, left: number, pos: PopoverPosition) {
  switch (pos) {
    case 'top':
      return {
        top: top - POPOVER_HEIGHT_EST,
        left: left - POPOVER_WIDTH / 2,
        width: POPOVER_WIDTH,
        height: POPOVER_HEIGHT_EST,
      };
    case 'bottom':
      return {
        top,
        left: left - POPOVER_WIDTH / 2,
        width: POPOVER_WIDTH,
        height: POPOVER_HEIGHT_EST,
      };
    case 'left':
      return {
        top: top - POPOVER_HEIGHT_EST / 2,
        left: left - POPOVER_WIDTH,
        width: POPOVER_WIDTH,
        height: POPOVER_HEIGHT_EST,
      };
    case 'right':
    default:
      return {
        top: top - POPOVER_HEIGHT_EST / 2,
        left,
        width: POPOVER_WIDTH,
        height: POPOVER_HEIGHT_EST,
      };
  }
}

function boxFitsViewport(box: { top: number; left: number; width: number; height: number }) {
  return (
    box.left >= VIEWPORT_MARGIN &&
    box.top >= VIEWPORT_MARGIN &&
    box.left + box.width <= window.innerWidth - VIEWPORT_MARGIN &&
    box.top + box.height <= window.innerHeight - VIEWPORT_MARGIN
  );
}

function clampPopoverBox(box: { top: number; left: number; width: number; height: number }) {
  const maxLeft = window.innerWidth - VIEWPORT_MARGIN - box.width;
  const maxTop = window.innerHeight - VIEWPORT_MARGIN - box.height;
  return {
    ...box,
    left: Math.min(Math.max(box.left, VIEWPORT_MARGIN), maxLeft),
    top: Math.min(Math.max(box.top, VIEWPORT_MARGIN), maxTop),
  };
}

function boxToAnchorCoords(box: { top: number; left: number; width: number; height: number }, pos: PopoverPosition) {
  switch (pos) {
    case 'top':
      return { top: box.top + box.height + ANCHOR_GAP, left: box.left + box.width / 2 };
    case 'bottom':
      return { top: box.top - ANCHOR_GAP, left: box.left + box.width / 2 };
    case 'left':
      return { top: box.top + box.height / 2, left: box.left + box.width + ANCHOR_GAP };
    case 'right':
    default:
      return { top: box.top + box.height / 2, left: box.left - ANCHOR_GAP };
  }
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
  disableShadow = false,
  offsetX = 0,
  offsetY = 0,
}) => {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [resolvedPosition, setResolvedPosition] = useState<PopoverPosition>(
    position === 'center' ? 'center' : position
  );
  // True when the target element was not found and we're using a fixed fallback position
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // ~4 seconds at 100ms

    const updatePosition = () => {
      if (targetId === 'viewport' || position === 'center') {
        setIsFallback(true);
        setTargetRect(null);
        setCoords({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2 + (position === 'center' ? 80 : 0),
        });
        return;
      }

      const element = document.getElementById(targetId);

      if (element) {
        const inHiddenTab = element.closest('[data-state="inactive"]');
        if (inHiddenTab) return;

        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        const visibleRect = element.getBoundingClientRect();

        setTargetRect(visibleRect);
        setIsFallback(false);

        if (position === 'center') {
          setResolvedPosition('center');
          setCoords({
            top: window.innerHeight / 2 + offsetY,
            left: window.innerWidth / 2 + 80 + offsetX,
          });
          if (intervalId) clearInterval(intervalId);
          return;
        }

        const preferred: PopoverPosition = position === 'center' ? 'right' : position;
        const tryOrder: PopoverPosition[] = [
          preferred,
          'bottom',
          'left',
          'top',
          'right',
        ].filter((p, i, arr) => arr.indexOf(p) === i);

        let chosen = preferred;
        let anchor = getAnchorCoords(rect, preferred);
        let box = getPopoverBox(anchor.top, anchor.left, preferred);

        for (const candidate of tryOrder) {
          const candidateAnchor = getAnchorCoords(rect, candidate);
          const candidateBox = getPopoverBox(candidateAnchor.top, candidateAnchor.left, candidate);
          if (boxFitsViewport(candidateBox)) {
            chosen = candidate;
            anchor = candidateAnchor;
            box = candidateBox;
            break;
          }
        }

        const clamped = clampPopoverBox(box);
        anchor = boxToAnchorCoords(clamped, chosen);
        anchor = {
          top: anchor.top + offsetY,
          left: anchor.left + offsetX,
        };

        setResolvedPosition(chosen);
        setCoords(anchor);
        if (intervalId) clearInterval(intervalId);
      } else {
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          setIsFallback(true);
          setTargetRect(null);
          setCoords({
            top: window.innerHeight / 2,
            left: Math.min(window.innerWidth - 340, window.innerWidth * 0.65),
          });
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
  }, [targetId, position, offsetX, offsetY]);

  useEffect(() => {
    document.body.classList.add('tour-active');
    return () => document.body.classList.remove('tour-active');
  }, []);

  if (!coords) return null;

  const PADDING = 6;

  // Resolve transform based on position or fallback (center = vertical-center only)
  const resolveTransform = () => {
    if (isFallback || resolvedPosition === 'center') return 'translateY(-50%)';
    switch (resolvedPosition) {
      case 'right':  return 'translateY(-50%)';
      case 'left':   return 'translate(-100%, -50%)';
      case 'top':    return 'translate(-50%, -100%)';
      case 'bottom': return 'translateX(-50%)';
      default:       return 'translateY(-50%)';
    }
  };

  const content = (
    <>
      {/* 
        Boost z-index for the target element AND for common modal/dialog
        elements (Radix UI Dialog, shadcn Sheet, etc.) so they appear above
        the tour overlay when disableShadow=false on other steps.
      */}
      {targetId !== 'viewport' && (
        <style dangerouslySetInnerHTML={{ __html: `
          #${targetId} {
            z-index: 10000 !important;
            pointer-events: auto !important;
          }

          #${targetId}:not(.fixed):not(.absolute):not(.sticky) {
            position: relative !important;
          }

          /* Keep sidebar visible but below dialog overlays (z-50) so it gets dimmed */
          body.tour-active aside,
          body.tour-active [data-sidebar="sidebar"],
          body.tour-active .fixed.z-10 {
            z-index: 45 !important;
            pointer-events: none !important;
          }

          /*
            During step 4 & 5 (disableShadow=true) we need the modal and its backdrop
            to be fully visible above everything. Radix/shadcn portals render dialogs
            with z-index ~50; raise them above the tour overlay (z-90) but below
            the popover itself (z-110).
          */
          body.tour-active [data-radix-dialog-overlay],
          body.tour-active [role="dialog"] {
            z-index: 9999 !important;
          }

          /* Select / popper dropdowns must sit above the dialog so they're clickable */
          body.tour-active [data-radix-popper-content-wrapper] {
            z-index: 10000 !important;
          }
        `}} />
      )}

      {/*
        Only render the dark overlay + spotlight when disableShadow=false.
        When disableShadow=true (step 4 with the Add Site modal open) we skip
        both so the modal content is fully visible.
      */}
      {!disableShadow && targetRect && (
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

      {/* Popover — always rendered above the modal (z-[10001]) */}
      <div
        className="fixed animate-in fade-in zoom-in duration-200 pointer-events-auto"
        style={{
          zIndex: 11000,
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          transform: resolveTransform(),
        }}
      >
        {/* Directional arrow — only shown when anchored to a real element */}
        {!isFallback && resolvedPosition !== 'center' && (
          <>
            {resolvedPosition === 'right'  && <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-slate-200" />}
            {resolvedPosition === 'left'   && <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-r border-t border-slate-200" />}
            {resolvedPosition === 'top'    && <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-slate-200" />}
            {resolvedPosition === 'bottom' && <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-l border-t border-slate-200" />}
          </>
        )}

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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBack();
                }}
                className="flex-1 h-8 rounded-lg border border-emerald-600 text-emerald-700 text-xs font-bold hover:bg-emerald-50 bg-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              {!hideNext && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNext();
                  }}
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