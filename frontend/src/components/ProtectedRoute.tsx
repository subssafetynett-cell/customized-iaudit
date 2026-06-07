import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { hasValidSuperAdminSession, isSuperAdminRole } from "@/lib/superAdminAuth";
import { isPathAllowedForExpiredTrial, isTrialExpired } from "@/lib/trialUtils";
import { isAuditeeUser, isPathAllowedForAuditee } from "@/lib/auditeeAccess";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    useUserStatus();
    useSessionExpiry();

    const userData = localStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;
    const isAuthenticated = !!user;

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isSuperAdminRole(user.role) || hasValidSuperAdminSession()) {
        return <Navigate to="/super-admin" replace />;
    }

    if (isTrialExpired(user) && user.subscriptionStatus !== "active") {
        if (!isPathAllowedForExpiredTrial(location.pathname)) {
            return <Navigate to="/" replace />;
        }
    }

    if (isAuditeeUser(user) && !isPathAllowedForAuditee(location.pathname)) {
        return <Navigate to="/audit-findings" replace />;
    }

    return <>{children}</>;
}
