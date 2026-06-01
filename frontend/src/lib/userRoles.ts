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
