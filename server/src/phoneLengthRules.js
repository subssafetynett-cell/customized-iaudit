/** National-number digit length ranges (without country dial code). */
export const DEFAULT_PHONE_LENGTH = { min: 6, max: 15 };

/** ISO 3166-1 alpha-2 → { min, max } national digit length. */
export const PHONE_LENGTH_BY_ISO = {
    AE: { min: 9, max: 9 },
    AR: { min: 10, max: 10 },
    AT: { min: 10, max: 13 },
    AU: { min: 9, max: 10 },
    BD: { min: 10, max: 10 },
    BE: { min: 9, max: 9 },
    BR: { min: 10, max: 11 },
    CA: { min: 10, max: 10 },
    CH: { min: 9, max: 9 },
    CN: { min: 11, max: 11 },
    DE: { min: 10, max: 11 },
    EG: { min: 10, max: 10 },
    ES: { min: 9, max: 9 },
    FR: { min: 9, max: 9 },
    GB: { min: 10, max: 11 },
    GR: { min: 10, max: 10 },
    HK: { min: 8, max: 8 },
    ID: { min: 9, max: 12 },
    IE: { min: 9, max: 9 },
    IL: { min: 9, max: 9 },
    IN: { min: 10, max: 10 },
    IT: { min: 9, max: 10 },
    JP: { min: 10, max: 11 },
    KE: { min: 9, max: 9 },
    KR: { min: 9, max: 11 },
    MX: { min: 10, max: 10 },
    MY: { min: 9, max: 10 },
    NG: { min: 10, max: 10 },
    NL: { min: 9, max: 9 },
    NZ: { min: 8, max: 10 },
    PH: { min: 10, max: 10 },
    PK: { min: 10, max: 10 },
    PL: { min: 9, max: 9 },
    PT: { min: 9, max: 9 },
    RU: { min: 10, max: 10 },
    SA: { min: 9, max: 9 },
    SE: { min: 9, max: 10 },
    SG: { min: 8, max: 8 },
    TH: { min: 9, max: 9 },
    TR: { min: 10, max: 10 },
    TW: { min: 9, max: 9 },
    US: { min: 10, max: 10 },
    VN: { min: 9, max: 10 },
    ZA: { min: 9, max: 9 },
};

export const PHONE_MAX_DIGITS = DEFAULT_PHONE_LENGTH.max;

export function getPhoneLengthForCountry(countryCode) {
    if (!countryCode) return DEFAULT_PHONE_LENGTH;
    const iso = String(countryCode).trim().toUpperCase();
    return PHONE_LENGTH_BY_ISO[iso] ?? DEFAULT_PHONE_LENGTH;
}

export function phoneLengthErrorMessage(countryCode, fieldLabel = 'Phone number') {
    const { min, max } = getPhoneLengthForCountry(countryCode);
    if (min === max) {
        return `${fieldLabel} must be exactly ${min} digits (no letters or extra characters).`;
    }
    return `${fieldLabel} must be between ${min} and ${max} digits (no letters or extra characters).`;
}
