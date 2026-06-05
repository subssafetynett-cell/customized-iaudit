/** Whether the signed-in user may create users and change roles/status. */
export function canManageOrgUsers(
    user: { role?: string; creatorId?: number | null } | null | undefined,
): boolean {
    if (!user) return false;
    const role = String(user.role ?? "")
        .trim()
        .toLowerCase();
    if (role === "superadmin" || role === "admin") return true;
    if (user.creatorId == null || user.creatorId === undefined) return true;
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

/** Users who may be assigned as lead auditor or team auditor (excludes auditees). */
export function usersEligibleAsAuditors<T extends { role?: string }>(users: T[]): T[] {
    return users.filter((u) => !isAuditeeRole(u.role));
}
