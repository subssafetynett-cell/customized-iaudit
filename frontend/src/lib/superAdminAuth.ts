/** Super-admin console session (separate from regular app routes; uses same JWT as /auth/login). */
export const SUPER_ADMIN_AUTH_KEY = "isSuperAdminAuthenticated";

/** Seeded platform super admin (see server/scripts/ensure-superadmin.js). */
export const SUPER_ADMIN_EMAIL = "admin@iaudit.global";

export function isSuperAdminRole(role: unknown): boolean {
    return String(role || "").toLowerCase() === "superadmin";
}
const SESSION_EXPIRES_AT_KEY = "sessionExpiresAt";

export function isSuperAdminLoginPath(pathname: string): boolean {
    return /^\/super-admin-login(\/|$)/.test(pathname);
}

export function isSuperAdminConsolePath(pathname: string): boolean {
    return /^\/super-admin(\/|$)/.test(pathname);
}

export function isSuperAdminAreaPath(pathname: string): boolean {
    return isSuperAdminLoginPath(pathname) || isSuperAdminConsolePath(pathname);
}

function getStoredUser(): { role?: string } | null {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
        return JSON.parse(raw) as { role?: string };
    } catch {
        return null;
    }
}

/** True when super-admin console flag, JWT, and DB role all align. */
export function hasValidSuperAdminSession(): boolean {
    if (localStorage.getItem(SUPER_ADMIN_AUTH_KEY) !== "true") return false;
    if (!localStorage.getItem("token")) return false;
    return isSuperAdminRole(getStoredUser()?.role);
}

export function persistSuperAdminSession(data: Record<string, unknown>) {
    const { sessionExpiresAt, token, ...profile } = data;
    localStorage.setItem("user", JSON.stringify(profile));
    if (typeof token === "string" && token) {
        localStorage.setItem("token", token);
    }
    if (typeof sessionExpiresAt === "string" && sessionExpiresAt) {
        localStorage.setItem(SESSION_EXPIRES_AT_KEY, sessionExpiresAt);
    }
    localStorage.setItem(SUPER_ADMIN_AUTH_KEY, "true");
}

export function clearSuperAdminSession() {
    localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
}

/** End super-admin console session and send user to regular login. */
export function logoutSuperAdmin() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    clearSuperAdminSession();
    window.location.href = "/login";
}
