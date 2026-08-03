/**
 * Country-aware phone validation powered by libphonenumber-js.
 * Forms store national digits (no dial code) paired with a selected ISO country.
 */
import {
    type CountryCode,
    getCountries,
    getExampleNumber,
    isSupportedCountry,
    isValidPhoneNumber,
    parsePhoneNumberFromString,
    validatePhoneNumberLength,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

/** ITU upper bound for national significant numbers. */
export const PHONE_MAX_DIGITS = 15;

const FALLBACK_LENGTH = { min: 6, max: PHONE_MAX_DIGITS };

function asCountryCode(countryCode?: string | null): CountryCode | undefined {
    if (!countryCode) return undefined;
    const iso = String(countryCode).trim().toUpperCase();
    if (!iso || !isSupportedCountry(iso)) return undefined;
    return iso as CountryCode;
}

/**
 * Soft length hints for UX (maxLength / placeholders).
 * Acceptance always uses isValidPhone() — not these ranges alone.
 */
export function getPhoneLengthForCountry(countryCode?: string): { min: number; max: number } {
    const country = asCountryCode(countryCode);
    if (!country) return { ...FALLBACK_LENGTH };

    try {
        const example = getExampleNumber(country, examples);
        if (example?.nationalNumber) {
            const len = String(example.nationalNumber).length;
            // Allow variance for landline vs mobile / area codes.
            const min = Math.max(4, len - 3);
            const max = Math.min(PHONE_MAX_DIGITS, Math.max(len + 3, len));
            return { min, max };
        }
    } catch {
        // fall through
    }
    return { ...FALLBACK_LENGTH };
}

/** Digits only, capped to a safe national max for the country. */
export function normalizePhoneDigits(value: string, countryCode?: string): string {
    const digits = String(value || "").replace(/\D/g, "");
    const { max } = getPhoneLengthForCountry(countryCode);
    return digits.slice(0, max);
}

export function isValidPhone(value: string, countryCode?: string): boolean {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return false;

    const country = asCountryCode(countryCode);
    if (country) {
        return isValidPhoneNumber(digits, country);
    }

    const trimmed = String(value || "").trim();
    if (trimmed.startsWith("+")) {
        return isValidPhoneNumber(trimmed);
    }
    return digits.length >= FALLBACK_LENGTH.min && digits.length <= FALLBACK_LENGTH.max;
}

export function getPhoneErrorMessage(countryCode?: string, value?: string): string {
    const digits = String(value || "").replace(/\D/g, "");
    const country = asCountryCode(countryCode);

    if (!digits) {
        return "Phone number is required.";
    }

    if (country) {
        const lengthResult = validatePhoneNumberLength(digits, country);
        if (lengthResult === "TOO_SHORT") {
            return "Phone number is too short for the selected country.";
        }
        if (lengthResult === "TOO_LONG") {
            return "Phone number is too long for the selected country.";
        }
        if (lengthResult === "INVALID_LENGTH") {
            return "Phone number length is invalid for the selected country.";
        }
        if (!isValidPhoneNumber(digits, country)) {
            return "Enter a valid phone number for the selected country.";
        }
        return "Enter a valid phone number for the selected country.";
    }

    const { min, max } = FALLBACK_LENGTH;
    if (digits.length < min || digits.length > max) {
        return `Phone number must be between ${min} and ${max} digits.`;
    }
    return "Enter a valid phone number.";
}

/** Placeholder updates when the country changes (no hardcoded 10-digit text). */
export function getPhoneInputPlaceholder(countryCode?: string): string {
    const country = asCountryCode(countryCode);
    if (!country) return "Phone number";
    try {
        const example = getExampleNumber(country, examples);
        if (example?.nationalNumber) {
            const len = String(example.nationalNumber).length;
            return `${len}-digit number`;
        }
    } catch {
        // fall through
    }
    const { min, max } = getPhoneLengthForCountry(country);
    if (min === max) return `${min}-digit number`;
    return `${min}–${max} digit number`;
}

export function toE164(nationalDigits: string, countryCode?: string): string | null {
    const digits = String(nationalDigits || "").replace(/\D/g, "");
    const country = asCountryCode(countryCode);
    if (!digits || !country) return null;
    const parsed = parsePhoneNumberFromString(digits, country);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.format("E.164");
}

export function listSupportedPhoneCountries(): string[] {
    return getCountries();
}
