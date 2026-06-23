import { API_BASE_URL } from "@/config";
import { clearSuperAdminSession, isSuperAdminConsolePath } from "@/lib/superAdminAuth";

/** Full URL for an API path (e.g. `/users`). Only this module reads `API_BASE_URL` — use `apiFetch` from app code. */
export function resolveApiUrl(endpoint: string): string {
    if (endpoint.startsWith("http")) return endpoint;
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}/api${path}`;
}

/** ISO timestamp from server — when reached, client should clear session (matches DB session expiry). */
export const SESSION_EXPIRES_AT_KEY = "sessionExpiresAt";

export function clearClientSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    clearSuperAdminSession();
}

function redirectToLoginIfNeeded() {
    const path = window.location.pathname;
    if (/^\/(login|signup|auth|super-admin-login)(\/|$)/.test(path)) {
        return;
    }
    if (isSuperAdminConsolePath(path)) {
        window.location.href = "/login";
        return;
    }
    window.location.href = "/login";
}

/** Clears stored auth and sends the user to login when not already on a public auth route. */
export function clearSessionAndRedirectToLogin() {
    clearClientSession();
    redirectToLoginIfNeeded();
}

export async function parseApiJson<T = unknown>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        const text = await response.text();
        if (response.status === 502 || response.status === 503 || response.status === 504) {
            throw new Error("The API is temporarily unavailable. Please wait a moment and try again.");
        }
        throw new Error(text?.slice(0, 200) || `Unexpected response (${response.status})`);
    }
    return response.json() as Promise<T>;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const extra = options.headers;
    if (extra && typeof extra === "object" && !Array.isArray(extra) && !(extra instanceof Headers)) {
        Object.assign(headers, extra as Record<string, string>);
    }

    const url = resolveApiUrl(endpoint);

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        clearSessionAndRedirectToLogin();
    }

    return response;
}
