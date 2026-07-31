/** Shared password rules for invite, change-password, and reset flows. */

export const PASSWORD_REGEX =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\\/~^]).{8,}$/;

export const PASSWORD_REQUIREMENTS_MESSAGE =
    'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.';

/** PSZL-018 / VDP-019: do not accept a "change" that leaves the password unchanged. */
export const NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE =
    'The new password must be different from your current password.';
