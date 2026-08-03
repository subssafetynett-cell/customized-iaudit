/**
 * Country-aware phone validation powered by libphonenumber-js (server).
 */
import {
    getCountries,
    getExampleNumber,
    isSupportedCountry,
    isValidPhoneNumber,
    parsePhoneNumberFromString,
    validatePhoneNumberLength,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

export const PHONE_MAX_DIGITS = 15;
const FALLBACK_LENGTH = { min: 6, max: PHONE_MAX_DIGITS };

function asCountryCode(countryCode) {
    if (!countryCode) return undefined;
    const iso = String(countryCode).trim().toUpperCase();
    if (!iso || !isSupportedCountry(iso)) return undefined;
    return iso;
}

export function getPhoneLengthForCountry(countryCode) {
    const country = asCountryCode(countryCode);
    if (!country) return { ...FALLBACK_LENGTH };

    try {
        const example = getExampleNumber(country, examples);
        if (example?.nationalNumber) {
            const len = String(example.nationalNumber).length;
            const min = Math.max(4, len - 3);
            const max = Math.min(PHONE_MAX_DIGITS, Math.max(len + 3, len));
            return { min, max };
        }
    } catch {
        // fall through
    }
    return { ...FALLBACK_LENGTH };
}

export function isValidPhoneForCountry(nationalDigits, countryCode) {
    const digits = String(nationalDigits || '').replace(/\D/g, '');
    if (!digits) return false;
    const country = asCountryCode(countryCode);
    if (country) {
        return isValidPhoneNumber(digits, country);
    }
    return digits.length >= FALLBACK_LENGTH.min && digits.length <= FALLBACK_LENGTH.max;
}

export function phoneLengthErrorMessage(countryCode, fieldLabel = 'Phone number', value = '') {
    const digits = String(value || '').replace(/\D/g, '');
    const country = asCountryCode(countryCode);

    if (!digits) {
        return `${fieldLabel} is required.`;
    }

    if (country) {
        const lengthResult = validatePhoneNumberLength(digits, country);
        if (lengthResult === 'TOO_SHORT') {
            return `${fieldLabel} is too short for the selected country.`;
        }
        if (lengthResult === 'TOO_LONG') {
            return `${fieldLabel} is too long for the selected country.`;
        }
        if (lengthResult === 'INVALID_LENGTH') {
            return `${fieldLabel} length is invalid for the selected country.`;
        }
        if (!isValidPhoneNumber(digits, country)) {
            return `Enter a valid ${fieldLabel.toLowerCase()} for the selected country.`;
        }
        return `Enter a valid ${fieldLabel.toLowerCase()} for the selected country.`;
    }

    const { min, max } = FALLBACK_LENGTH;
    if (digits.length < min || digits.length > max) {
        return `${fieldLabel} must be between ${min} and ${max} digits (no letters or extra characters).`;
    }
    return `Enter a valid ${fieldLabel.toLowerCase()}.`;
}

export function toE164(nationalDigits, countryCode) {
    const digits = String(nationalDigits || '').replace(/\D/g, '');
    const country = asCountryCode(countryCode);
    if (!digits || !country) return null;
    const parsed = parsePhoneNumberFromString(digits, country);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.format('E.164');
}

export function listSupportedPhoneCountries() {
    return getCountries();
}
