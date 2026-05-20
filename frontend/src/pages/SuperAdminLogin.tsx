/**
 * Deprecated: super admins sign in at /login (same as regular users).
 * Credentials are seeded via server/scripts/ensure-superadmin.js
 * (admin@iaudit.global / 123). App.tsx redirects /super-admin-login → /login.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SuperAdminLogin() {
    const navigate = useNavigate();
    useEffect(() => {
        navigate("/login", { replace: true });
    }, [navigate]);
    return null;
}

/*
 * --- Previous dedicated super-admin login UI (kept for reference) ---
 *
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import {
    clearSuperAdminSession,
    hasValidSuperAdminSession,
    persistSuperAdminSession,
    SUPER_ADMIN_AUTH_KEY,
} from "@/lib/superAdminAuth";
... entire form UI called POST /auth/login and navigated to /super-admin ...
 */
