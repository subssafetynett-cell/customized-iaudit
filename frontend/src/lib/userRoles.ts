/** Whether the signed-in user may create users and change roles/status. */
export function canManageOrgUsers(
    user: { role?: string; creatorId?: number | null } | null | undefined,
): boolean {
    if (!user) return false;
    const role = String(user.role ?? "")
        .trim()
        .toLowerCase();
    if (role === "superadmin" || role === "admin") return true;
    // Organization root accounts (no creator) manage users in their org; auditees never may.
    if ((user.creatorId == null || user.creatorId === undefined) && role !== "auditee") {
        return true;
    }
    return false;
}

/** Company administrator (org admin) — can invite auditees without lead-auditor check. */
export function isCompanyAdminUser(
    user: { role?: string; creatorId?: number | null } | null | undefined,
): boolean {
    return canManageOrgUsers(user);
}

export function isAuditeeRole(role: string | undefined | null): boolean {
    return String(role ?? "").trim().toLowerCase() === "auditee";
}

/** Roles offered on the Users page (auditees are managed under Invite Auditee). */
export const USERS_PAGE_ROLE_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "auditor", label: "Auditor" },
    { value: "lead_auditor", label: "Lead Auditor" },
    { value: "other", label: "Other" },
] as const;

export function formatUserRoleLabel(
    role: string | undefined | null,
    customRoleName?: string | null,
): string {
    if (String(role ?? "").toLowerCase() === "other") {
        return customRoleName?.trim() || "Other";
    }
    const match = USERS_PAGE_ROLE_OPTIONS.find(
        (option) => option.value === String(role ?? "").trim().toLowerCase(),
    );
    if (match) return match.label;
    const normalized = String(role ?? "").trim();
    if (!normalized) return "—";
    return normalized
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

/** Users who may be assigned as lead auditor or team auditor (excludes auditees). */
export function usersEligibleAsAuditors<T extends { role?: string }>(users: T[]): T[] {
    return users.filter((u) => !isAuditeeRole(u.role));
}
