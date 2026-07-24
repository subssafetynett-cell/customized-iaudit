import { useEffect } from "react";
import {
    applySessionExpiryFromResponse,
    clearSessionAndRedirectToLogin,
    hasClientAuthSession,
    resolveApiUrl,
    SESSION_EXPIRES_AT_KEY,
    SESSION_EXPIRY_UPDATED_EVENT,
} from "@/lib/api";

const POLL_MS = 60_000;

function isSessionExpired(): boolean {
    if (!hasClientAuthSession()) return false;
    const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
    if (!raw) return false;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) return false;
    return Date.now() >= t;
}

async function confirmSessionWithServer(): Promise<boolean> {
    if (!hasClientAuthSession()) return false;
    try {
        const res = await fetch(resolveApiUrl("/auth/session"), {
            credentials: "include",
        });
        applySessionExpiryFromResponse(res);
        if (res.ok) {
            const data = (await res.json()) as { sessionExpiresAt?: string };
            if (data.sessionExpiresAt) {
                localStorage.setItem(SESSION_EXPIRES_AT_KEY, data.sessionExpiresAt);
                window.dispatchEvent(
                    new CustomEvent(SESSION_EXPIRY_UPDATED_EVENT, { detail: data.sessionExpiresAt }),
                );
            }
            return true;
        }
    } catch {
        // Network blip — don't treat as logout
        return true;
    }
    return false;
}

async function logoutIfExpired() {
    if (!hasClientAuthSession()) return;
    if (!isSessionExpired()) return;

    // Client clock said expired — only logout when the server also rejects the session.
    // Network errors / temporary 5xx must not bounce sidebar navigation to /auth.
    const stillValid = await confirmSessionWithServer();
    if (stillValid) return;

    // Double-check: if the cookie is missing but local profile remains, keep the UI
    // session and let an explicit logout or next successful auth call reconcile.
    try {
        const res = await fetch(resolveApiUrl("/auth/session"), { credentials: "include" });
        if (res.status >= 500 || res.status === 0) return;
        if (res.ok) return;
    } catch {
        return;
    }
    clearSessionAndRedirectToLogin();
}

/**
 * Logs the user out when the server-issued session expiry time is reached.
 * Before logging out, confirms with the server to avoid false positives from stale client clocks.
 */
export function useSessionExpiry() {
    useEffect(() => {
        let exactTimer: ReturnType<typeof setTimeout> | undefined;

        const scheduleExact = () => {
            if (exactTimer !== undefined) {
                clearTimeout(exactTimer);
                exactTimer = undefined;
            }
            if (!hasClientAuthSession()) return;
            const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
            if (!raw) return;
            const t = Date.parse(raw);
            if (!Number.isFinite(t)) return;
            const ms = t - Date.now();
            if (ms <= 0) {
                void logoutIfExpired();
                return;
            }
            exactTimer = setTimeout(() => {
                void logoutIfExpired();
            }, ms);
        };

        void logoutIfExpired();

        const poll = setInterval(() => {
            void logoutIfExpired();
        }, POLL_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") {
                void logoutIfExpired();
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        const onStorage = (e: StorageEvent) => {
            if (e.key !== "user" && e.key !== SESSION_EXPIRES_AT_KEY) return;
            if (!hasClientAuthSession()) {
                const path = window.location.pathname;
                if (!/^\/(login|signup|auth|super-admin-login)(\/|$)/.test(path)) {
                    window.location.href = "/login";
                }
            }
        };
        window.addEventListener("storage", onStorage);

        const onSessionExtended = () => scheduleExact();
        window.addEventListener(SESSION_EXPIRY_UPDATED_EVENT, onSessionExtended);

        scheduleExact();

        return () => {
            clearInterval(poll);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("storage", onStorage);
            window.removeEventListener(SESSION_EXPIRY_UPDATED_EVENT, onSessionExtended);
            if (exactTimer !== undefined) clearTimeout(exactTimer);
        };
    }, []);
}
