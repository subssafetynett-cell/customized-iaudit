import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { useStoredUser } from "@/hooks/useStoredUser";
import { hasValidSuperAdminSession, isSuperAdminRole } from "@/lib/superAdminAuth";
import { isAuditeeUser, isPathAllowedForAuditee } from "@/lib/auditeeAccess";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const { user } = useStoredUser();

    useUserStatus();
    useSessionExpiry();

    const isAuthenticated = !!user;

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isSuperAdminRole(user.role as string | undefined) || hasValidSuperAdminSession()) {
        return <Navigate to="/super-admin" replace />;
    }

    if (isAuditeeUser(user as { role?: string }) && !isPathAllowedForAuditee(location.pathname)) {
        return <Navigate to="/audit-findings" replace />;
    }

    return <>{children}</>;
}
