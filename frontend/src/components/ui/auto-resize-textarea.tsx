import * as React from "react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type AutoResizeTextareaProps = TextareaProps & {
    /** Minimum height in px (default 72). */
    minHeight?: number;
    /** Optional cap so extremely long notes don't dominate the page. */
    maxHeight?: number;
};

function resizeTextarea(
    el: HTMLTextAreaElement,
    minHeight: number,
    maxHeight?: number,
) {
    el.style.height = "auto";
    const next = Math.max(minHeight, el.scrollHeight);
    el.style.height = `${maxHeight != null ? Math.min(next, maxHeight) : next}px`;
    el.style.overflowY = maxHeight != null && next > maxHeight ? "auto" : "hidden";
}

/**
 * Textarea that grows with content so the user can see everything without
 * scrolling inside the field (used for Evidence / Comments on Perform Audit).
 */
const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
    ({ className, value, onChange, minHeight = 72, maxHeight, style, titleCase = false, ...props }, ref) => {
        const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

        const setRefs = React.useCallback(
            (node: HTMLTextAreaElement | null) => {
                innerRef.current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) ref.current = node;
            },
            [ref],
        );

        React.useLayoutEffect(() => {
            if (innerRef.current) {
                resizeTextarea(innerRef.current, minHeight, maxHeight);
            }
        }, [value, minHeight, maxHeight]);

        return (
            <Textarea
                {...props}
                ref={setRefs}
                value={value}
                rows={1}
                // Evidence / comments must stay free-form; title-case also breaks resize
                // when it synthesizes a non-DOM event target.
                titleCase={titleCase}
                onChange={(e) => {
                    if (innerRef.current) {
                        resizeTextarea(innerRef.current, minHeight, maxHeight);
                    }
                    onChange?.(e);
                }}
                className={cn("resize-none overflow-hidden", className)}
                style={{
                    minHeight,
                    ...style,
                }}
            />
        );
    },
);
AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
