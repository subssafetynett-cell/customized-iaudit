/** Strip trailing slashes from an origin (no path segment). */
function stripTrailingSlash(url: string) {
    return url.replace(/\/+$/, "");
}

/**
 * API origin for JSON requests (no trailing slash).
 * - Build-time: set `VITE_API_BASE_URL` or legacy `VITE_API_URL` in `.env` (repo root or `frontend/`).
 * - Use empty string for same-origin `/api/...` (Docker nginx proxy to backend).
 * - If unset at build, falls back at runtime: localhost → `http://localhost:3001`, else `""`.
 */
function readEnvApiOrigin(): string | undefined {
    const primary = import.meta.env.VITE_API_BASE_URL;
    if (primary !== undefined && primary !== null) {
        const s = String(primary).trim();
        return s === "" ? "" : stripTrailingSlash(s);
    }
    const legacy = import.meta.env.VITE_API_URL;
    if (legacy !== undefined && legacy !== null && String(legacy).trim() !== "") {
        return stripTrailingSlash(String(legacy).trim());
    }
    return undefined;
}

function getIsLocalhost(): boolean {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1";
}

function resolveApiBaseUrl(): string {
    const fromEnv = readEnvApiOrigin();
    if (fromEnv !== undefined) {
        return fromEnv;
    }
    if (typeof window === "undefined") {
        return "";
    }
    return getIsLocalhost() ? "http://localhost:3001" : "";
}

export const API_BASE_URL = resolveApiBaseUrl();

export const FRONTEND_URL = typeof window !== "undefined" && window.location
    ? window.location.origin
    : "https://apps.iaudit.global";
