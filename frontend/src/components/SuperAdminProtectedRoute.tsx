import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    // Check super admin auth synchronously
    const isSuperAdminAuthenticated = localStorage.getItem("isSuperAdminAuthenticated") === "true";

    if (!isSuperAdminAuthenticated) {
        // Redirect them to the /super-admin-login page
        return <Navigate to="/super-admin-login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
