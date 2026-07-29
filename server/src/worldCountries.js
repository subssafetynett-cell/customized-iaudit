import { Country } from 'country-state-city';

export function resolveCountryIsoFromName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const found = Country.getAllCountries().find(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    return found?.isoCode ?? null;
}
