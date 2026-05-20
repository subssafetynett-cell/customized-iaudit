import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
    clearSuperAdminSession,
    hasValidSuperAdminSession,
    isSuperAdminRole,
    persistSuperAdminSession,
} from "@/lib/superAdminAuth";

export function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    if (!hasValidSuperAdminSession()) {
        const raw = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (raw && token) {
            try {
                const user = JSON.parse(raw) as { role?: string };
                if (isSuperAdminRole(user.role)) {
                    persistSuperAdminSession({ ...user, token });
                }
            } catch {
                /* ignore */
            }
        }
    }

    if (!hasValidSuperAdminSession()) {
        clearSuperAdminSession();
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
