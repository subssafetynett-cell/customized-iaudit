import { useEffect } from "react";
import { clearSessionAndRedirectToLogin, SESSION_EXPIRES_AT_KEY } from "@/lib/api";

const POLL_MS = 5000;

function isSessionExpired(): boolean {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
    if (!token || !raw) return false;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) return false;
    return Date.now() >= t;
}

function logoutIfExpired() {
    if (!localStorage.getItem("token")) return;
    if (isSessionExpired()) {
        clearSessionAndRedirectToLogin();
    }
}

/**
 * Logs the user out when the server-issued session expiry time is reached (client clock),
 * without waiting for the next API call. Also re-checks on an interval and when the tab becomes visible.
 */
export function useSessionExpiry() {
    useEffect(() => {
        logoutIfExpired();

        const poll = setInterval(logoutIfExpired, POLL_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") logoutIfExpired();
        };
        document.addEventListener("visibilitychange", onVisible);

        const onStorage = (e: StorageEvent) => {
            if (e.key !== "token" && e.key !== "user" && e.key !== SESSION_EXPIRES_AT_KEY) return;
            if (!localStorage.getItem("token") && !localStorage.getItem("user")) {
                const path = window.location.pathname;
                if (!/^\/(login|signup|auth)(\/|$)/.test(path)) {
                    window.location.href = "/login";
                }
            }
        };
        window.addEventListener("storage", onStorage);

        let exactTimer: ReturnType<typeof setTimeout> | undefined;
        const scheduleExact = () => {
            if (exactTimer !== undefined) {
                clearTimeout(exactTimer);
                exactTimer = undefined;
            }
            const token = localStorage.getItem("token");
            const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
            if (!token || !raw) return;
            const t = Date.parse(raw);
            if (!Number.isFinite(t)) return;
            const ms = t - Date.now();
            if (ms <= 0) {
                clearSessionAndRedirectToLogin();
                return;
            }
            exactTimer = setTimeout(() => {
                clearSessionAndRedirectToLogin();
            }, ms);
        };
        scheduleExact();

        return () => {
            clearInterval(poll);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("storage", onStorage);
            if (exactTimer !== undefined) clearTimeout(exactTimer);
        };
    }, []);
}
