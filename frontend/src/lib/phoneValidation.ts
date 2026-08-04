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

const FALLBACK_LENGTH = { min: 6, max: 15 };

function asCountryCode(countryCode?: string | null): CountryCode | undefined {
    if (!countryCode) return undefined;
    const iso = String(countryCode).trim().toUpperCase();
    if (!iso || !isSupportedCountry(iso)) return undefined;
    return iso as CountryCode;
}

/**
 * Exact national-digit length range for a country (from libphonenumber).
 * Used for maxLength / placeholders so users cannot type past the country max.
 */
export function getPhoneLengthForCountry(countryCode?: string): { min: number; max: number } {
    const country = asCountryCode(countryCode);
    if (!country) return { ...FALLBACK_LENGTH };

    const validLengths: number[] = [];
    for (let len = 1; len <= PHONE_MAX_DIGITS; len++) {
        // Digit shape doesn't matter for length checks — only count does.
        const result = validatePhoneNumberLength("9".repeat(len), country);
        if (result === undefined) {
            // `undefined` => this length is possible for the country.
            validLengths.push(len);
        } else if (result === "TOO_LONG") {
            break;
        }
    }

    if (validLengths.length > 0) {
        return {
            min: validLengths[0],
            max: validLengths[validLengths.length - 1],
        };
    }

    // Fallback: example mobile number length (strict — no +3 padding).
    try {
        const example = getExampleNumber(country, examples);
        if (example?.nationalNumber) {
            const len = String(example.nationalNumber).length;
            return { min: len, max: len };
        }
    } catch {
        // fall through
    }
    return { ...FALLBACK_LENGTH };
}

/** Digits only, capped to the selected country's max national length. */
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
        const { min, max } = getPhoneLengthForCountry(country);
        if (digits.length < min) {
            return min === max
                ? `Phone number must be ${min} digits for the selected country.`
                : `Phone number must be at least ${min} digits for the selected country.`;
        }
        if (digits.length > max) {
            return min === max
                ? `Phone number must be ${max} digits for the selected country.`
                : `Phone number must be at most ${max} digits for the selected country.`;
        }
        const lengthResult = validatePhoneNumberLength(digits, country);
        if (lengthResult === "TOO_SHORT") {
            return "Phone number is too short for the selected country.";
        }
        if (lengthResult === "TOO_LONG") {
            return "Phone number is too long for the selected country.";
        }
        if (lengthResult === "INVALID_LENGTH") {
            return min === max
                ? `Phone number must be ${min} digits for the selected country.`
                : `Phone number must be ${min}–${max} digits for the selected country.`;
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

/** Placeholder matches the country length limit enforced by maxLength. */
export function getPhoneInputPlaceholder(countryCode?: string): string {
    const country = asCountryCode(countryCode);
    if (!country) return "Phone number";
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
