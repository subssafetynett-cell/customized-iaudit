/** Strip ASCII control chars except tab/newline/carriage return. */
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Remove HTML-like markup and angle brackets (plain text only). */
function stripMarkup(s) {
    let out = s;
    let prev;
    do {
        prev = out;
        out = out.replace(/<[^>]*>/g, '');
    } while (out !== prev);
    return out.replace(/</g, '').replace(/>/g, '');
}

/**
 * @param {unknown} value
 * @param {number} maxLen
 * @param {{ preserveNewlines?: boolean }} [opts]
 */
export function sanitizePlainText(value, maxLen, opts = {}) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return null;
    let s = String(value).replace(CTRL, '');
    s = stripMarkup(s);
    const preserveNewlines = Boolean(opts.preserveNewlines);
    if (preserveNewlines) {
        s = s
            .split('\n')
            .map((line) => line.replace(/[^\S\r\n]+/g, ' ').trimEnd())
            .join('\n')
            .trim();
        s = s.replace(/\n{4,}/g, '\n\n\n');
    } else {
        s = s.trim().replace(/\s+/g, ' ');
    }
    if (s.length > maxLen) s = s.slice(0, maxLen);
    return s;
}

/** Logo / image URL: strip markup; block dangerous URL schemes. */
export function sanitizeLogoField(value, maxLen = 2000) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const s = sanitizePlainText(value, maxLen);
    if (s === undefined || s === null) return s;
    if (s === '') return '';
    const low = s.toLowerCase();
    if (
        low.startsWith('javascript:') ||
        low.startsWith('data:') ||
        low.startsWith('vbscript:') ||
        low.includes(' ')
    ) {
        return '';
    }
    return s;
}

/** ISO / standards tags from the client. */
export function sanitizeStringArray(arr, { maxItems = 40, maxItemLen = 120 } = {}) {
    if (!Array.isArray(arr)) return [];
    return arr
        .slice(0, maxItems)
        .map((x) => sanitizePlainText(String(x ?? ''), maxItemLen) || '')
        .filter((x) => x.length > 0);
}

export const PERSON_NAME_MAX = 100;

/**
 * Single-line given/family name: strip markup, control chars, and characters outside letters/marks/digits
 * plus space, hyphen, apostrophe, period, comma (covers most real names; blocks HTML/template junk).
 */
export function sanitizePersonName(value, maxLen = PERSON_NAME_MAX) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return null;
    const oneLine = String(value).replace(/[\r\n\t]+/g, ' ');
    let s = sanitizePlainText(oneLine, maxLen);
    if (s === undefined || s === null) return s;
    s = s.replace(/[`\\]/g, '');
    s = s.replace(/[^\p{L}\p{M}\p{N}\s\-'.,]/gu, '');
    s = s.trim().replace(/\s+/g, ' ');
    if (s.length > maxLen) s = s.slice(0, maxLen);
    return s;
}

/** Short label (e.g. custom role): single line, no markup. */
export function sanitizeShortLabel(value, maxLen = 120) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const oneLine = String(value).replace(/[\r\n\t]+/g, ' ');
    return sanitizePlainText(oneLine, maxLen);
}

/** Exactly 10 digits (US-style line); strips formatting. Empty optional input → `''`. Invalid length → `null` (reject). */
export const PHONE_DIGITS_LENGTH = 10;

export function sanitizePhoneField(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length !== PHONE_DIGITS_LENGTH) return null;
    return digits;
}

/** Company / site / street lines: plain text plus common business & address punctuation (no brackets/script). */
export function sanitizeOrganizationText(value, maxLen) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return null;
    const oneLine = String(value).replace(/[\r\n\t]+/g, ' ');
    let s = sanitizePlainText(oneLine, maxLen);
    if (s === undefined || s === null) return s;
    s = s.replace(/[`\\<>]/g, '');
    s = s.replace(/[^\p{L}\p{M}\p{N}\s\-'.,#/&()°–—]/gu, '');
    s = s.trim().replace(/\s+/g, ' ');
    if (s.length > maxLen) s = s.slice(0, maxLen);
    return s;
}

export const COMPANY_TEXT_LIMITS = {
    name: 300,
    industry: 200,
    description: 20000,
    logo: 2000,
    contactNumber: PHONE_DIGITS_LENGTH,
    streetAddress: 500,
    city: 120,
    state: 120,
    country: 120,
    postalCode: 40
};

export const SITE_TEXT_LIMITS = {
    name: 300,
    description: 20000,
    siteType: 120,
    status: 80,
    address: 500,
    city: 120,
    state: 120,
    country: 120,
    postalCode: 40,
    contactName: 200,
    contactPosition: 200,
    contactNumber: PHONE_DIGITS_LENGTH,
    email: 254
};

export const DEPT_TEXT_LIMITS = {
    name: 300,
    code: 80,
    status: 80,
    manager: 200,
    description: 10000
};
