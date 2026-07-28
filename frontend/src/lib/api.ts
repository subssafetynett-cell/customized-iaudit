import { API_BASE_URL } from "@/config";
import { clearSuperAdminSession, isSuperAdminConsolePath } from "@/lib/superAdminAuth";

// Remove legacy bearer tokens from localStorage (session is httpOnly cookie only).
try {
    localStorage.removeItem("token");
} catch {
    /* ignore */
}

/** Full URL for an API path (e.g. `/users`). Only this module reads `API_BASE_URL` — use `apiFetch` from app code. */
export function resolveApiUrl(endpoint: string): string {
    if (endpoint.startsWith("http")) return endpoint;
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}/api${path}`;
}

/** ISO timestamp from server — when reached, client should clear session (matches DB session expiry). */
export const SESSION_EXPIRES_AT_KEY = "sessionExpiresAt";
export const SESSION_EXPIRY_UPDATED_EVENT = "session-expiry-updated";

export type ApiFetchOptions = RequestInit & {
    /** When true, a 401 response will not clear local auth (caller handles session expiry). */
    skipSessionLogout?: boolean;
};

/** Whether the client believes the user is signed in (profile cached; session token is httpOnly). */
export function hasClientAuthSession(): boolean {
    try {
        return Boolean(localStorage.getItem("user"));
    } catch {
        return false;
    }
}

export function clearClientSession() {
    // Legacy: bearer tokens must not remain in localStorage.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    clearSuperAdminSession();
    try {
        window.dispatchEvent(new Event("user-updated"));
    } catch {
        /* ignore */
    }
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

/** Persist server-issued sliding session expiry and notify listeners to reschedule timers. */
export function applySessionExpiryFromResponse(response: Response) {
    const raw = response.headers.get("X-Session-Expires-At");
    if (!raw) return;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) return;
    localStorage.setItem(SESSION_EXPIRES_AT_KEY, raw);
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRY_UPDATED_EVENT, { detail: raw }));
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

/** Coalesce identical in-flight GETs so React Strict Mode / dual mounts don't double-fetch. */
const inflightGetRequests = new Map<string, Promise<Response>>();

export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}) {
    const { skipSessionLogout = false, ...fetchOptions } = options;
    const method = String(fetchOptions.method || "GET").toUpperCase();
    const hadSession = hasClientAuthSession();

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    const extra = fetchOptions.headers;
    if (extra && typeof extra === "object" && !Array.isArray(extra) && !(extra instanceof Headers)) {
        Object.assign(headers, extra as Record<string, string>);
    }

    const url = resolveApiUrl(endpoint);
    const canCoalesce = method === "GET" && !fetchOptions.body;
    const coalesceKey = canCoalesce ? `${method}:${url}` : "";

    if (canCoalesce) {
        const existing = inflightGetRequests.get(coalesceKey);
        if (existing) {
            const shared = await existing;
            return shared.clone();
        }
    }

    const run = (async () => {
        let response: Response;
        try {
            response = await fetch(url, {
                ...fetchOptions,
                method,
                headers,
                credentials: "include",
            });
        } catch {
            // Proxy/backend blip (ECONNRESET during nodemon restart, etc.) — never treat as logout.
            throw new Error("The API is temporarily unavailable. Please try again.");
        }

        applySessionExpiryFromResponse(response);

        // Never auto-logout from a single 401. Sidebar pages and optional polls must not
        // destroy a valid UI session if the cookie briefly fails to attach. Explicit
        // status/session hooks handle real expiry.
        if (response.status === 401 && hadSession && !skipSessionLogout) {
            // Soft signal only — leave localStorage intact so navigation keeps working.
            console.warn(`[apiFetch] 401 for ${endpoint} (session left intact)`);
        }

        return response;
    })();

    if (canCoalesce) {
        inflightGetRequests.set(coalesceKey, run);
        try {
            const response = await run;
            return response.clone();
        } finally {
            inflightGetRequests.delete(coalesceKey);
        }
    }

    return run;
}
