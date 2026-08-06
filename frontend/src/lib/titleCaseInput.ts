import type React from "react";

/** Capitalize the first letter of each word; lowercase the rest (e.g. "john doe" → "John Doe"). */
export function toTitleCaseWord(word: string): string {
    if (!word) return word;
    if (shouldPreserveWordAsIs(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function shouldPreserveWordAsIs(word: string): boolean {
    if (/^\d+([.,]\d+)?$/.test(word)) return true;
    // Hyphenated codes: OHS-RQ-120, PRP-RQ-001
    if (/^[A-Z0-9]+(-[A-Z0-9]+)+$/i.test(word)) return true;
    return false;
}

/** Values that should not be reformatted (codes, emails, URLs, long tokens). */
export function looksLikeCodeOrIdValue(value: string): boolean {
    const t = value.trim();
    if (!t) return false;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return true;
    if (/^https?:\/\//i.test(t)) return true;
    if (/^\d+([.,]\d+)?$/.test(t)) return true;
    if (/^[A-Z0-9]+(-[A-Z0-9]+)+$/i.test(t)) return true;
    if (/^[a-f0-9-]{20,}$/i.test(t)) return true;
    if (/^[A-Za-z0-9+/=_-]{24,}$/.test(t)) return true;
    return false;
}

/** Title-case a single-line string; preserves leading/trailing whitespace. */
export function formatTitleCaseSingleLine(value: string): string {
    const leading = value.match(/^\s*/)?.[0] ?? "";
    const trailing = value.match(/\s*$/)?.[0] ?? "";
    const core = value.slice(leading.length, value.length - trailing.length);
    if (!core || looksLikeCodeOrIdValue(core)) return value;
    return leading + core.replace(/\S+/g, toTitleCaseWord) + trailing;
}

/** Title-case each line of a multiline string. */
export function formatTitleCaseMultiline(value: string): string {
    return value.split("\n").map((line) => formatTitleCaseSingleLine(line)).join("\n");
}

export type TitleCaseFieldHints = {
    type?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    autoComplete?: string;
    readOnly?: boolean;
    disabled?: boolean;
    /** Explicit opt-out (false) or opt-in (true). Default: auto-detect. */
    titleCase?: boolean;
    className?: string;
    name?: string;
    id?: string;
    maxLength?: number;
};

const EXCLUDED_INPUT_TYPES = new Set([
    "email",
    "password",
    "number",
    "tel",
    "url",
    "search",
    "date",
    "datetime-local",
    "time",
    "month",
    "week",
    "file",
    "hidden",
    "color",
    "range",
    "checkbox",
    "radio",
    "submit",
    "button",
    "reset",
]);

const EXCLUDED_FIELD_NAME = /\b(email|password|otp|token|search|query|url|phone|mobile|zip|postal|username)\b/i;

/** Whether automatic title case should apply to this field. */
export function shouldApplyTitleCaseToField(hints: TitleCaseFieldHints): boolean {
    if (hints.titleCase === false) return false;
    if (hints.readOnly || hints.disabled) return false;

    const type = String(hints.type || "text").toLowerCase();
    if (EXCLUDED_INPUT_TYPES.has(type)) return false;

    const inputMode = String(hints.inputMode || "").toLowerCase();
    if (inputMode === "numeric" || inputMode === "decimal" || inputMode === "email") {
        return false;
    }

    const autoComplete = String(hints.autoComplete || "").toLowerCase();
    if (/email|password|one-time-code|username|current-password|new-password/.test(autoComplete)) {
        return false;
    }

    if (hints.className?.includes("font-mono")) return false;

    const fieldKey = `${hints.name || ""} ${hints.id || ""}`;
    if (EXCLUDED_FIELD_NAME.test(fieldKey)) return false;

    if (
        hints.maxLength != null &&
        hints.maxLength <= 8 &&
        /\b(otp|code|pin|captcha)\b/i.test(fieldKey)
    ) {
        return false;
    }

    if (hints.titleCase === true) return true;

    return type === "text" || type === "";
}

type TextElement = HTMLInputElement | HTMLTextAreaElement;

function formatValue(value: string, multiline: boolean): string {
    return multiline ? formatTitleCaseMultiline(value) : formatTitleCaseSingleLine(value);
}

function restoreCaret(el: TextElement, raw: string, selStart: number, multiline: boolean) {
    const before = raw.slice(0, selStart);
    const formattedBefore = formatValue(before, multiline);
    const newPos = formattedBefore.length;
    requestAnimationFrame(() => {
        try {
            if (document.activeElement === el) {
                el.setSelectionRange(newPos, newPos);
            }
        } catch {
            /* ignore */
        }
    });
}

/** Wrap onChange to apply title case while typing (with caret preservation). */
export function mergeTitleCaseChangeHandler<E extends TextElement>(
    onChange: React.ChangeEventHandler<E> | undefined,
    apply: boolean,
    multiline: boolean,
): React.ChangeEventHandler<E> | undefined {
    if (!apply || !onChange) return onChange;

    return (event) => {
        const el = event.target;
        const raw = el.value;
        const formatted = formatValue(raw, multiline);
        if (formatted !== raw) {
            const selStart = el.selectionStart ?? formatted.length;
            // Keep the real DOM node as the event target (required by AutoResizeTextarea
            // and other handlers that call methods on currentTarget).
            el.value = formatted;
            onChange(event);
            restoreCaret(el, raw, selStart, multiline);
            return;
        }
        onChange(event);
    };
}

/** Wrap onBlur to title-case on focus loss (updates controlled state via onChange). */
export function mergeTitleCaseBlurHandler<E extends TextElement>(
    onBlur: React.FocusEventHandler<E> | undefined,
    onChange: React.ChangeEventHandler<E> | undefined,
    apply: boolean,
    multiline: boolean,
): React.FocusEventHandler<E> | undefined {
    if (!apply) return onBlur;

    return (event) => {
        const el = event.target;
        const raw = el.value;
        const formatted = formatValue(raw, multiline);
        if (formatted !== raw && onChange) {
            el.value = formatted;
            onChange(event as unknown as React.ChangeEvent<E>);
        }
        onBlur?.(event);
    };
}
