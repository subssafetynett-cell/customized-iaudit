import { Country } from "country-state-city";
import { getPhoneInputPlaceholder, getPhoneLengthForCountry, PHONE_MAX_DIGITS } from "@/lib/phoneValidation";

export type PhoneCountry = {
    code: string;
    name: string;
    dial: string;
    flag: string;
    placeholder: string;
};

export const DEFAULT_PHONE_DIAL = "+91";
export const DEFAULT_PHONE_COUNTRY_CODE = "IN";

export { getPhoneLengthForCountry, PHONE_MAX_DIGITS };

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
            placeholder: "Phone number",
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
    return getPhoneInputPlaceholder(countryCode);
}

export function getDialForCountryCode(countryCode: string): string {
    return getPhoneCountryByCode(countryCode)?.dial ?? DEFAULT_PHONE_DIAL;
}

export function getFlagForCountryCode(countryCode: string): string {
    return getPhoneCountryByCode(countryCode)?.flag ?? "🌐";
}
