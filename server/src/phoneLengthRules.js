/**
 * Back-compat re-exports — prefer importing from `./phoneValidation.js`.
 */
export {
    PHONE_MAX_DIGITS,
    getPhoneLengthForCountry,
    phoneLengthErrorMessage,
    isValidPhoneForCountry,
} from './phoneValidation.js';
