import { Country } from "country-state-city";

export type WorldCountry = {
    code: string;
    name: string;
    flag: string;
};

/** All countries (~250) sorted alphabetically. */
export const WORLD_COUNTRIES: WorldCountry[] = Country.getAllCountries()
    .filter((c) => c.isoCode && c.name)
    .map((c) => ({
        code: c.isoCode,
        name: c.name,
        flag: c.flag,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

export function getWorldCountryByCode(code: string): WorldCountry | undefined {
    return WORLD_COUNTRIES.find((c) => c.code === code);
}

export function getWorldCountryByName(name: string): WorldCountry | undefined {
    const trimmed = name.trim();
    if (!trimmed) return undefined;
    return WORLD_COUNTRIES.find(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
}

export function resolveCountryIsoFromName(name: string): string {
    return getWorldCountryByName(name)?.code ?? "";
}
