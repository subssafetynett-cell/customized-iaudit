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

/** National number examples for common countries (API still expects 10 digits). */
const PLACEHOLDER_BY_CODE: Record<string, string> = {
    IN: "9876543210",
    US: "5551234567",
    CA: "5551234567",
    GB: "7911123456",
    AU: "4123456789",
    AE: "5012345678",
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
            placeholder: PLACEHOLDER_BY_CODE[c.isoCode] ?? "1234567890",
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
    return getPhoneCountryByCode(countryCode)?.placeholder ?? "1234567890";
}

export function getDialForCountryCode(countryCode: string): string {
    return getPhoneCountryByCode(countryCode)?.dial ?? DEFAULT_PHONE_DIAL;
}

export function getFlagForCountryCode(countryCode: string): string {
    return getPhoneCountryByCode(countryCode)?.flag ?? "🌐";
}
