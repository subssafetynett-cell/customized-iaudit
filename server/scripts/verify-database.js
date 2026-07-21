import prisma from "../src/prisma.js";

let failed = false;

try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.user.findFirst({ select: { id: true } });
    console.log("[verify-database] Database OK");
} catch (error) {
    failed = true;
    console.error("[verify-database] FATAL:", error.message);
} finally {
    try {
        await prisma.$disconnect();
    } catch (disconnectError) {
        console.warn(
            "[verify-database] disconnect warning:",
            disconnectError.message,
        );
    }
}

if (failed) {
    process.exit(1);
}
