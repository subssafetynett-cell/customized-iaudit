import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { ArrowLeft, ArrowRight, X, GripVertical } from "lucide-react";

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
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - VIEWPORT_MARGIN - box.width);
  const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - VIEWPORT_MARGIN - box.height);
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

function anchorToBoxTopLeft(
  anchorTop: number,
  anchorLeft: number,
  pos: PopoverPosition,
): { top: number; left: number } {
  switch (pos) {
    case 'top':
      return { top: anchorTop - POPOVER_HEIGHT_EST, left: anchorLeft - POPOVER_WIDTH / 2 };
    case 'bottom':
      return { top: anchorTop, left: anchorLeft - POPOVER_WIDTH / 2 };
    case 'left':
      return { top: anchorTop - POPOVER_HEIGHT_EST / 2, left: anchorLeft - POPOVER_WIDTH };
    case 'right':
      return { top: anchorTop - POPOVER_HEIGHT_EST / 2, left: anchorLeft };
    case 'center':
    default:
      return { top: anchorTop - POPOVER_HEIGHT_EST / 2, left: anchorLeft };
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
  const [manualCoords, setManualCoords] = useState<{ top: number; left: number } | null>(null);
  const [userPositioned, setUserPositioned] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startTop: number;
    startLeft: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [resolvedPosition, setResolvedPosition] = useState<PopoverPosition>(
    position === 'center' ? 'center' : position
  );
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const MAX_ATTEMPTS = 40;
    let hasScrolledToTarget = false;

    const updatePosition = () => {
      if (userPositioned) return;

      if (targetId === 'viewport' && position === 'center') {
        setIsFallback(true);
        setTargetRect(null);
        setResolvedPosition('center');
        setCoords({
          top: window.innerHeight / 2 + offsetY,
          left: window.innerWidth / 2 + 80 + offsetX,
        });
        return;
      }

      const element = document.getElementById(targetId);

      if (element) {
        const inHiddenTab = element.closest('[data-state="inactive"]');
        if (inHiddenTab) return;

        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        // Scroll once per target — repeated scrollIntoView causes popover jump.
        if (!hasScrolledToTarget) {
          element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
          hasScrolledToTarget = true;
        }
        const visibleRect = element.getBoundingClientRect();

        setTargetRect(visibleRect);
        setIsFallback(false);

        const preferred: Exclude<PopoverPosition, 'center'> =
          position === 'top' || position === 'bottom' || position === 'left' || position === 'right'
            ? position
            : 'right';

        // Prefer staying on the configured side (especially left/right for dropdowns)
        // so open select menus are not covered by a flipped bottom popover.
        const candidates: Exclude<PopoverPosition, 'center'>[] =
          preferred === 'left' || preferred === 'right'
            ? [preferred, preferred === 'left' ? 'right' : 'left', 'top', 'bottom']
            : [preferred, 'left', 'right', 'top', 'bottom'];

        const tryOrder = candidates.filter((p, i) => candidates.indexOf(p) === i);

        let chosen = preferred;
        let anchor = getAnchorCoords(visibleRect, preferred);
        let box = getPopoverBox(anchor.top, anchor.left, preferred);

        // Prefer preferred side with clamping when possible, so dropdowns stay clear.
        const preferredClamped = clampPopoverBox(box);
        const preferredStillBeside =
          preferred === 'left'
            ? preferredClamped.left + preferredClamped.width <= visibleRect.left + 8
            : preferred === 'right'
              ? preferredClamped.left >= visibleRect.right - 8
              : true;

        if (preferredStillBeside || preferred === 'top' || preferred === 'bottom') {
          chosen = preferred;
          box = preferredClamped;
          anchor = boxToAnchorCoords(box, preferred);
        } else {
          for (const candidate of tryOrder) {
            const candidateAnchor = getAnchorCoords(visibleRect, candidate);
            const candidateBox = getPopoverBox(candidateAnchor.top, candidateAnchor.left, candidate);
            if (boxFitsViewport(candidateBox)) {
              chosen = candidate;
              anchor = candidateAnchor;
              box = candidateBox;
              break;
            }
          }
          box = clampPopoverBox(box);
          anchor = boxToAnchorCoords(box, chosen);
        }

        anchor = {
          top: anchor.top + offsetY,
          left: anchor.left + offsetX,
        };

        setResolvedPosition(chosen);
        setCoords(anchor);
        attempts = 0;
        // Keep updating briefly so skeleton→content size changes re-anchor cleanly.
        if (!intervalId) return;
      } else {
        attempts++;
        // Keep popover hidden until the real target exists — avoids center→target jump.
        // Only fall back after many attempts (e.g. missing DOM id).
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

    intervalId = setInterval(updatePosition, 50);
    updatePosition();

    // Stop polling after the target has been stable for a while.
    const stopTimer = window.setTimeout(() => {
      clearInterval(intervalId);
    }, 2500);

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearInterval(intervalId);
      window.clearTimeout(stopTimer);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetId, position, offsetX, offsetY, userPositioned]);

  useEffect(() => {
    setUserPositioned(false);
    setManualCoords(null);
    setIsDragging(false);
    dragStartRef.current = null;
  }, [targetId, step]);

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;

      const dx = e.clientX - start.startX;
      const dy = e.clientY - start.startY;

      const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - VIEWPORT_MARGIN - POPOVER_WIDTH);
      const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - VIEWPORT_MARGIN - POPOVER_HEIGHT_EST);

      const nextLeft = Math.min(Math.max(start.startLeft + dx, VIEWPORT_MARGIN), maxLeft);
      const nextTop = Math.min(Math.max(start.startTop + dy, VIEWPORT_MARGIN), maxTop);

      setManualCoords({ top: nextTop, left: nextLeft });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    document.body.classList.add('tour-active');
    return () => document.body.classList.remove('tour-active');
  }, []);

  if (!coords) return null;

  const PADDING = 6;

  const resolveTransform = () => {
    if (userPositioned) return 'none';
    if (isFallback || resolvedPosition === 'center') return 'translateY(-50%)';
    switch (resolvedPosition) {
      case 'right':  return 'translateY(-50%)';
      case 'left':   return 'translate(-100%, -50%)';
      case 'top':    return 'translate(-50%, -100%)';
      case 'bottom': return 'translateX(-50%)';
      default:       return 'translateY(-50%)';
    }
  };

  const beginDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!coords) return;

    const currentAbsolute = manualCoords
      ?? clampPopoverBox({
          ...anchorToBoxTopLeft(coords.top, coords.left, resolvedPosition),
          width: POPOVER_WIDTH,
          height: POPOVER_HEIGHT_EST,
        });

    setUserPositioned(true);
    setManualCoords({ top: currentAbsolute.top, left: currentAbsolute.left });
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: currentAbsolute.top,
      startLeft: currentAbsolute.left,
    };
    setIsDragging(true);
  };

  const content = (
    <>
      {targetId !== 'viewport' && (
        <style dangerouslySetInnerHTML={{ __html: `
          #${targetId} {
            z-index: 10000 !important;
            pointer-events: auto !important;
          }

          #${targetId}:not(.fixed):not(.absolute):not(.sticky) {
            position: relative !important;
          }

          body.tour-active aside,
          body.tour-active [data-sidebar="sidebar"],
          body.tour-active .fixed.z-10 {
            z-index: 45 !important;
          }

          /* Hide dialog backdrop during tours to prevent shadow */
          body.tour-active [data-radix-dialog-overlay] {
            display: none !important;
          }

          body.tour-active [data-radix-dialog-content],
          body.tour-active [role="dialog"] {
            z-index: 30000 !important;
          }

          body.tour-active:has([data-state="open"][role="dialog"]) #${targetId}:not([role="dialog"]) {
            z-index: 1 !important;
          }

          body.tour-active [data-radix-popper-content-wrapper],
          body.tour-active [data-radix-select-content] {
            z-index: 40000 !important;
          }
        `}} />
      )}

      {!disableShadow && targetRect && (() => {
        // Clamp the hole to the intersection of the padded target and the viewport.
        // Using full element height with a floored top overshoots when the target is tall/scrolled.
        const paddedTop = targetRect.top - PADDING;
        const paddedLeft = targetRect.left - PADDING;
        const paddedBottom = targetRect.bottom + PADDING;
        const paddedRight = targetRect.right + PADDING;
        const holeTop = Math.max(0, paddedTop);
        const holeLeft = Math.max(0, paddedLeft);
        const holeBottom = Math.min(window.innerHeight, paddedBottom);
        const holeRight = Math.min(window.innerWidth, paddedRight);
        const holeWidth = Math.max(0, holeRight - holeLeft);
        const holeHeight = Math.max(0, holeBottom - holeTop);
        const dim = "rgba(0,0,0,0.65)";

        if (holeWidth <= 0 || holeHeight <= 0) return null;

        return (
          <>
            {/* Four click-blocking panels around the spotlight so the target stays clickable */}
            <div
              className="fixed z-[90] pointer-events-auto"
              style={{ top: 0, left: 0, right: 0, height: holeTop, background: dim }}
              aria-hidden="true"
            />
            <div
              className="fixed z-[90] pointer-events-auto"
              style={{ top: holeBottom, left: 0, right: 0, bottom: 0, background: dim }}
              aria-hidden="true"
            />
            <div
              className="fixed z-[90] pointer-events-auto"
              style={{ top: holeTop, left: 0, width: holeLeft, height: holeHeight, background: dim }}
              aria-hidden="true"
            />
            <div
              className="fixed z-[90] pointer-events-auto"
              style={{ top: holeTop, left: holeRight, right: 0, height: holeHeight, background: dim }}
              aria-hidden="true"
            />
            {/* Visual green ring only — does not capture clicks */}
            <div
              className="fixed pointer-events-none z-[96]"
              style={{
                top: holeTop,
                left: holeLeft,
                width: holeWidth,
                height: holeHeight,
                borderRadius: 10,
                boxShadow: "0 0 0 2px #10b981, 0 4px 24px rgba(16,185,129,0.3)",
              }}
            />
          </>
        );
      })()}

      <div
        className="fixed pointer-events-auto"
        style={{
          zIndex: 11000,
          top: `${(manualCoords?.top ?? coords.top)}px`,
          left: `${(manualCoords?.left ?? coords.left)}px`,
          transform: resolveTransform(),
          cursor: isDragging ? 'grabbing' : undefined,
        }}
      >
        {!isFallback && !userPositioned && resolvedPosition !== 'center' && (
          <>
            {resolvedPosition === 'right'  && <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-slate-200" />}
            {resolvedPosition === 'left'   && <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-r border-t border-slate-200" />}
            {resolvedPosition === 'top'    && <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-slate-200" />}
            {resolvedPosition === 'bottom' && <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-l border-t border-slate-200" />}
          </>
        )}

        <div className="w-[300px] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden">
          <div
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={beginDrag}
            title="Drag to move"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase">
              Drag to move
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-emerald-500 text-[11px] font-bold tracking-wide">
                Step {step} of {totalSteps}
              </span>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-slate-900 font-black text-sm leading-snug tracking-tight">
                Step {step} — {title}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                {description}
              </p>
            </div>

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
