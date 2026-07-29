import { Country } from "country-state-city";

export type PhoneCountry = {
    code: string;
    name: string;
    dial: string;
    flag: string;
    placeholder: string;
};

export const DEFAULT_PHONE_DIAL = "+91";
export const DEFAULT_PHONE_COUNTRY_CODE = "IN";

/** National-number digit length ranges (without country dial code). */
export const DEFAULT_PHONE_LENGTH = { min: 6, max: 15 };

/** ISO 3166-1 alpha-2 → { min, max } national digit length. */
export const PHONE_LENGTH_BY_ISO: Record<string, { min: number; max: number }> = {
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

export function getPhoneLengthForCountry(countryCode?: string): { min: number; max: number } {
    if (!countryCode) return DEFAULT_PHONE_LENGTH;
    const iso = countryCode.trim().toUpperCase();
    return PHONE_LENGTH_BY_ISO[iso] ?? DEFAULT_PHONE_LENGTH;
}

const PLACEHOLDER_BY_CODE: Record<string, string> = {
    IN: "Phone number",
    US: "Phone number",
    CA: "Phone number",
    GB: "Phone number",
    AU: "Phone number",
    AE: "Phone number",
};

function formatDialCode(phonecode: string): string {
    const raw = String(phonecode || "").trim();
    if (!raw) return "";
    if (raw.startsWith("+")) return raw;
    return `+${raw}`;
}

function buildPhoneCountries(): PhoneCountry[] {
    return Country.getAllCountries()
        .filter((c) => c.phonecode && c.isoCode)
        .map((c) => ({
            code: c.isoCode,
            name: c.name,
            dial: formatDialCode(c.phonecode),
            flag: c.flag,
            placeholder: PLACEHOLDER_BY_CODE[c.isoCode] ?? "Phone number",
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** All countries with dial codes (~250 entries from country-state-city). */
export const PHONE_COUNTRIES: PhoneCountry[] = buildPhoneCountries();

export function getPhoneCountryByCode(code: string): PhoneCountry | undefined {
    return PHONE_COUNTRIES.find((c) => c.code === code);
}

export function getPhoneCountryByDial(dial: string): PhoneCountry | undefined {
    return PHONE_COUNTRIES.find((c) => c.dial === dial);
}

export function getPhonePlaceholder(countryCode: string): string {
    return getPhoneCountryByCode(countryCode)?.placeholder ?? "Phone number";
}

export function getDialForCountryCode(countryCode: string): string {
    return getPhoneCountryByCode(countryCode)?.dial ?? DEFAULT_PHONE_DIAL;
}

export function getFlagForCountryCode(countryCode: string): string {
    return getPhoneCountryByCode(countryCode)?.flag ?? "🌐";
}
