/**
 * Common validation utilities for the iAudit application.
 */

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

/** US-style 10-digit phone (digits only in API). */
export const PHONE_DIGITS_LENGTH = 10;

export function normalizePhone10Digits(value: string): string {
    return String(value || "").replace(/\D/g, "").slice(0, PHONE_DIGITS_LENGTH);
}

export function isTenDigitPhone(value: string): boolean {
    return normalizePhone10Digits(value).length === PHONE_DIGITS_LENGTH;
}

export const PHONE_10_ERROR_MESSAGE = `Phone number must be exactly ${PHONE_DIGITS_LENGTH} digits.`;

/** Department name (matches server DEPT_TEXT_LIMITS.name). */
export const DEPT_NAME_MAX = 100;

export const DEPT_NAME_ERROR_MESSAGE = `Department name must be at most ${DEPT_NAME_MAX} characters.`;

/** Site name (matches server SITE_TEXT_LIMITS.name). */
export const SITE_NAME_MAX = 50;

export const SITE_NAME_ERROR_MESSAGE = `Site name must be at most ${SITE_NAME_MAX} characters.`;

/** Company name (matches server COMPANY_TEXT_LIMITS.name). */
export const COMPANY_NAME_MAX = 100;

export const COMPANY_NAME_ERROR_MESSAGE = `Company name must be at most ${COMPANY_NAME_MAX} characters.`;

/** Company description (matches server COMPANY_TEXT_LIMITS.description). */
export const COMPANY_DESCRIPTION_MAX = 500;

export const COMPANY_DESCRIPTION_ERROR_MESSAGE = `Description must be at most ${COMPANY_DESCRIPTION_MAX} characters.`;

/** Max stored logo payload (base64 data URL, matches server COMPANY_TEXT_LIMITS.logo). */
export const COMPANY_LOGO_MAX_CHARS = 500_000;

/** Max logo file size before upload (matches client compression + server guidance). */
export const COMPANY_LOGO_MAX_BYTES = 10 * 1024 * 1024;
export const COMPANY_LOGO_MAX_MB = 10;

export const COMPANY_LOGO_TYPE_ERROR_MESSAGE =
    "Logo must be a PNG, JPEG, or WebP image.";

export const COMPANY_LOGO_TOO_LARGE_ERROR_MESSAGE = `This logo is over ${COMPANY_LOGO_MAX_MB} MB and cannot be uploaded. Please choose a smaller image (maximum ${COMPANY_LOGO_MAX_MB} MB).`;

export function formatMegabytes(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
}

/** Returns a user-facing error when the selected file exceeds the logo size limit. */
export function getCompanyLogoFileSizeError(fileSizeBytes: number): string | null {
    if (fileSizeBytes <= COMPANY_LOGO_MAX_BYTES) return null;
    return `This logo is ${formatMegabytes(fileSizeBytes)} MB. Files over ${COMPANY_LOGO_MAX_MB} MB cannot be uploaded — please choose a smaller image.`;
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
