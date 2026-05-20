import bcrypt from "bcrypt";
import prisma from "./prisma.js";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "admin@iaudit.global").toLowerCase().trim();
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "123";

/**
 * Creates or updates the platform super-admin account (idempotent).
 * @param {{ resetPassword?: boolean }} options - When true, sets password to SUPER_ADMIN_PASSWORD (CLI seed only).
 */
export async function ensureSuperAdminUser({ resetPassword = false } = {}) {
    const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    const existing = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });

    if (existing) {
        const data = {
            role: "superadmin",
            isActive: true,
            onboardingCompleted: true,
            failedLoginAttempts: 0,
        };
        if (resetPassword) {
            data.password = hashed;
        }
        return prisma.user.update({
            where: { email: SUPER_ADMIN_EMAIL },
            data,
        });
    }

    return prisma.user.create({
        data: {
            firstName: "Super",
            lastName: "Admin",
            email: SUPER_ADMIN_EMAIL,
            password: hashed,
            role: "superadmin",
            isActive: true,
            onboardingCompleted: true,
        },
    });
}
