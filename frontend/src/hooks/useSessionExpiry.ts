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

type SessionCheckResult = "ok" | "invalid" | "unknown";

async function confirmSessionWithServer(): Promise<SessionCheckResult> {
    if (!hasClientAuthSession()) return "invalid";
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
            return "ok";
        }
        // Only treat definitive auth failures as logout — never network/proxy blips.
        if (res.status === 401 || res.status === 403) return "invalid";
        return "unknown";
    } catch {
        // Network blip — don't treat as logout
        return "unknown";
    }
}

async function logoutIfSessionInvalid() {
    if (!hasClientAuthSession()) return;

    const clientExpired = isSessionExpired();
    // When the client clock has not expired yet, still periodically confirm the
    // cookie is valid so a revoked session (e.g. password reset) does not leave
    // a zombie UI. Only one active session exists per account server-side.
    const result = await confirmSessionWithServer();
    if (result === "ok" || result === "unknown") return;
    if (!clientExpired && result === "invalid") {
        // Double-check before forcing logout (avoid single flaky 401).
        const again = await confirmSessionWithServer();
        if (again !== "invalid") return;
    }
    clearSessionAndRedirectToLogin();
}

/**
 * Keeps the UI in sync with the server session cookie (single active session per user).
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
                void logoutIfSessionInvalid();
                return;
            }
            exactTimer = setTimeout(() => {
                void logoutIfSessionInvalid();
            }, ms);
        };

        void logoutIfSessionInvalid();

        const poll = setInterval(() => {
            void logoutIfSessionInvalid();
        }, POLL_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") {
                void logoutIfSessionInvalid();
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        // Same-browser tabs only (localStorage is per-origin, not shared across browsers).
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
