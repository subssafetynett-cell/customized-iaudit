import prisma from './src/prisma.js';
import fs from 'fs';

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            subscriptionStatus: true,
            trialEndDate: true,
            isActive: true
        }
    });
    fs.writeFileSync('diagnose-output.json', JSON.stringify(users, null, 2));
    console.log("Diagnostic data saved to diagnose-output.json");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
