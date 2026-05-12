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
