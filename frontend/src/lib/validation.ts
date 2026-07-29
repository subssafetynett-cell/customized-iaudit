/**
 * Common validation utilities for the iAudit application.
 */

import { getPhoneLengthForCountry, PHONE_MAX_DIGITS } from "@/lib/phoneCountries";

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
export const PHONE_DIGITS_LENGTH = PHONE_MAX_DIGITS;

export function normalizePhoneDigits(value: string, countryCode?: string): string {
    const { max } = getPhoneLengthForCountry(countryCode);
    return String(value || "").replace(/\D/g, "").slice(0, max);
}

export function isValidPhone(value: string, countryCode?: string): boolean {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return false;
    const { min, max } = getPhoneLengthForCountry(countryCode);
    return digits.length >= min && digits.length <= max;
}

export function getPhoneErrorMessage(countryCode?: string): string {
    const { min, max } = getPhoneLengthForCountry(countryCode);
    if (min === max) {
        return `Phone number must be exactly ${min} digits.`;
    }
    return `Phone number must be between ${min} and ${max} digits.`;
}

/** @deprecated Use normalizePhoneDigits */
export function normalizePhone10Digits(value: string, countryCode?: string): string {
    return normalizePhoneDigits(value, countryCode);
}

/** @deprecated Use isValidPhone */
export function isTenDigitPhone(value: string, countryCode?: string): boolean {
    return isValidPhone(value, countryCode);
}

/** @deprecated Use getPhoneErrorMessage */
export const PHONE_10_ERROR_MESSAGE = getPhoneErrorMessage();

/** Person first/last name (matches server PERSON_NAME_MAX). */
export const PERSON_NAME_MAX = 100;

export const PERSON_NAME_ERROR_MESSAGE = `Name must be at most ${PERSON_NAME_MAX} characters.`;

export function normalizePersonNameInput(value: string): string {
    return String(value || "").slice(0, PERSON_NAME_MAX);
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
    return `Are you sure you want to delete the site "${name}"? All associated departments will be permanently removed. This cannot be undone.`;
}
