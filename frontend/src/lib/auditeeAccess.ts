import { useStoredUser } from "@/hooks/useStoredUser";
import { isAuditeeRole } from "@/lib/userRoles";

export function isAuditeeUser(
    user: { role?: string } | null | undefined,
): boolean {
    return isAuditeeRole(user?.role);
}

/** Auditee accounts may view and download audit artifacts only — never edit. */
export function useAuditeeReadOnly(): boolean {
    const { user } = useStoredUser();
    return isAuditeeUser(user as { role?: string } | null);
}

const AUDITEE_EXACT_PATHS = new Set([
    "/",
    "/companies",
    "/audits",
    "/audit-program",
    "/audit",
    "/audit-findings",
    "/profile-settings",
    "/account-settings",
    "/feedback",
    "/subscription",
    "/subscription-details",
    "/subscription/success",
]);

const AUDITEE_PREFIX_PATHS = ["/audit/execute/", "/audit-findings/", "/company/"];

export function isPathAllowedForAuditee(pathname: string): boolean {
    if (AUDITEE_EXACT_PATHS.has(pathname)) return true;
    return AUDITEE_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix));
}

/** Sidebar nav URLs visible to auditee accounts (matched on path, not display title). */
export const AUDITEE_SIDEBAR_URLS = new Set([
    "/",
    "/companies",
    "/audits",
    "/audit-program",
    "/audit",
    "/audit-findings",
    "/feedback",
]);
