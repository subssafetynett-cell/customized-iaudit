/**
 * Common validation utilities for the iAudit application.
 */

export {
    PHONE_MAX_DIGITS,
    normalizePhoneDigits,
    isValidPhone,
    getPhoneErrorMessage,
    getPhoneLengthForCountry,
    getPhoneInputPlaceholder,
    toE164,
} from "@/lib/phoneValidation";

import { normalizePhoneDigits as _normalizePhoneDigits, isValidPhone as _isValidPhone } from "@/lib/phoneValidation";

/** Minimum length for new passwords (account creation & updates). */
export const PASSWORD_MIN_LENGTH = 8;

// Comprehensive password complexity requirement:
// - At least PASSWORD_MIN_LENGTH characters
// - At least one uppercase letter
// - At least one digit
// - At least one special character
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\\/~^]).{8,}$/;

export const validatePassword = (password: string): boolean => {
    return PASSWORD_REGEX.test(password);
};

export const PASSWORD_ERROR_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include at least one uppercase letter, one number, and one special character.`;

/** @deprecated Use PHONE_MAX_DIGITS — kept for older imports. */
export const PHONE_DIGITS_LENGTH = 15;

/** @deprecated Use normalizePhoneDigits */
export function normalizePhone10Digits(value: string, countryCode?: string): string {
    return _normalizePhoneDigits(value, countryCode);
}

/** @deprecated Use isValidPhone */
export function isTenDigitPhone(value: string, countryCode?: string): boolean {
    return _isValidPhone(value, countryCode);
}

/** @deprecated Prefer getPhoneErrorMessage(countryCode, value) */
export const PHONE_10_ERROR_MESSAGE = "Enter a valid phone number for the selected country.";
/** Person first/last name (matches server PERSON_NAME_MAX). PSZL-020: no dots/links. */
export const PERSON_NAME_MAX = 100;

export const PERSON_NAME_ERROR_MESSAGE =
    "Name may only contain letters, spaces, hyphens, and apostrophes (no dots or links).";

const PERSON_NAME_DISALLOWED = /[^\p{L}\p{M}\s\-']/u;
const PERSON_NAME_VALID = /^[\p{L}\p{M}]+(?:[\s\-']+[\p{L}\p{M}]+)*$/u;

/** Strip disallowed characters while typing (blocks dots that email clients auto-linkify). */
export function normalizePersonNameInput(value: string): string {
    return String(value || "")
        .replace(/[^\p{L}\p{M}\s\-']/gu, "")
        .replace(/\s+/g, " ")
        .slice(0, PERSON_NAME_MAX);
}

export function isValidPersonName(value: string): boolean {
    const t = String(value || "").trim().replace(/\s+/g, " ");
    if (!t || t.length > PERSON_NAME_MAX) return false;
    return !PERSON_NAME_DISALLOWED.test(t) && PERSON_NAME_VALID.test(t);
}

/** Department name (matches server DEPT_TEXT_LIMITS.name). */
export const DEPT_NAME_MAX = 100;

export const DEPT_NAME_ERROR_MESSAGE = `Department name must be at most ${DEPT_NAME_MAX} characters.`;

/** Site name (matches server SITE_TEXT_LIMITS.name). */
export const SITE_NAME_MAX = 50;

export const SITE_NAME_ERROR_MESSAGE = `Site name must be at most ${SITE_NAME_MAX} characters.`;

/** Site street address (matches server SITE_TEXT_LIMITS.address). */
export const SITE_ADDRESS_MAX = 500;

export const SITE_ADDRESS_ERROR_MESSAGE = `Address must be at most ${SITE_ADDRESS_MAX} characters.`;

/** Company name (matches server COMPANY_TEXT_LIMITS.name). */
export const COMPANY_NAME_MAX = 100;

export const COMPANY_NAME_ERROR_MESSAGE = `Company name must be at most ${COMPANY_NAME_MAX} characters.`;

/** Company description (matches server COMPANY_TEXT_LIMITS.description). */
export const COMPANY_DESCRIPTION_MAX = 500;

export const COMPANY_DESCRIPTION_ERROR_MESSAGE = `Description must be at most ${COMPANY_DESCRIPTION_MAX} characters.`;

/** Company street address (matches server COMPANY_TEXT_LIMITS.streetAddress). */
export const STREET_ADDRESS_MAX = 500;

export const STREET_ADDRESS_ERROR_MESSAGE = `Street address must be at most ${STREET_ADDRESS_MAX} characters.`;

/** Max stored logo payload (base64 data URL, matches server COMPANY_TEXT_LIMITS.logo). */
export const COMPANY_LOGO_MAX_CHARS = 500_000;

/** Raw upload size before compression (10 MB). */
export const COMPANY_LOGO_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const COMPANY_LOGO_TYPE_ERROR_MESSAGE =
    "Invalid logo image. Use PNG, JPEG, or WebP.";

export function getCompanyLogoFileSizeError(fileSizeBytes: number): string | null {
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
        return "Logo file is empty or invalid.";
    }
    if (fileSizeBytes > COMPANY_LOGO_MAX_FILE_BYTES) {
        return "Logo image is too large. Use a smaller file (under 10MB).";
    }
    return null;
}

/** Capitalize the first character as the user types (leaves the rest unchanged). */
export function capitalizeFirstLetter(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function isWithinMaxLength(value: string, max: number): boolean {
    return String(value || "").trim().length <= max;
}

export function truncateForDisplay(text: string, max = 80): string {
    const s = String(text || "").trim();
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…`;
}

/** Safe copy for delete dialogs so long legacy names do not break the layout. */
export function formatDeleteDepartmentDescription(deptName: string, siteName?: string): string {
    const name = truncateForDisplay(deptName, 80);
    const site = siteName ? truncateForDisplay(siteName, 60) : "this site";
    return `Are you sure you want to delete the department "${name}" from ${site}? This action cannot be undone.`;
}

export function formatDeleteSiteDescription(siteName: string): string {
    const name = truncateForDisplay(siteName, 50);
    return `Are you sure you want to delete the site "${name}"? All associated departments, audit programs, and audit plans for this site will be permanently removed. This cannot be undone.`;
}
