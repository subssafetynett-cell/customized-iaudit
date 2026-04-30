import prisma from './server/src/prisma.js';

async function main() {
    try {
        const users = await prisma.user.findMany({
            take: 10,
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true
            }
        });
        console.log('Users:', JSON.stringify(users, null, 2));

        const programs = await prisma.auditProgram.findMany({
            take: 10,
            include: {
                auditors: true,
                leadAuditor: true
            }
        });
        console.log('Programs:', JSON.stringify(programs, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
