import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasSuperAdminSession } from "@/lib/api";

export function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    if (!hasSuperAdminSession()) {
        return <Navigate to="/super-admin-login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
