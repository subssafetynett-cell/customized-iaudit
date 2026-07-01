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

export function formatUserDisplayName(
    user:
        | {
              firstName?: string | null;
              lastName?: string | null;
              email?: string | null;
              id?: number | string | null;
          }
        | null
        | undefined,
): string {
    if (!user) return "";
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    if (name) return name;
    if (user.email?.trim()) return user.email.trim();
    if (user.id != null) return `User #${user.id}`;
    return "Unknown user";
}

/** Ensure assigned auditors appear in picker options even if missing from the users API list. */
export function mergeAuditorUserOptions<T extends { id?: number | string | null }>(
    baseUsers: T[],
    ...extraSources: (T | T[] | null | undefined)[]
): T[] {
    const byId = new Map<string, T>();
    const add = (user: T | null | undefined) => {
        if (user?.id == null) return;
        const key = String(user.id);
        if (!byId.has(key)) byId.set(key, user);
    };

    baseUsers.forEach(add);
    extraSources.forEach((source) => {
        if (!source) return;
        if (Array.isArray(source)) source.forEach(add);
        else add(source);
    });

    return Array.from(byId.values());
}

/** Match a saved display name back to an org user id (for draft restore). */
export function resolveOrgUserIdByDisplayName<
    T extends {
        id?: number | string | null;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
    },
>(
    users: T[],
    displayName: string,
    normalizeForMatch: (name: string) => string = (name) => name.trim().replace(/\s+/g, " "),
): string | null {
    const normalized = normalizeForMatch(displayName).toLowerCase();
    if (!normalized) return null;
    const match = users.find(
        (u) => normalizeForMatch(formatUserDisplayName(u)).toLowerCase() === normalized,
    );
    return match?.id != null ? String(match.id) : null;
}
