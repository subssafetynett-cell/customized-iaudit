/**
 * Ensures the platform super-admin account exists (local/Docker dev).
 * Usage: cd server && node scripts/ensure-superadmin.js
 */
import { ensureSuperAdminUser } from "../src/ensureSuperAdmin.js";
import prisma from "../src/prisma.js";

async function main() {
    const user = await ensureSuperAdminUser({ resetPassword: true });
    console.log(`[ensure-superadmin] Ready: ${user.email} (id=${user.id}, role=${user.role})`);
}

main()
    .catch((err) => {
        console.error("[ensure-superadmin] Failed:", err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
