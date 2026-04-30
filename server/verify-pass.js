import prisma from './src/prisma.js';
import bcrypt from 'bcrypt';

async function verifyPass() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, password: true, subscriptionStatus: true }
        });
        
        const testPass = 'Syndicate@005';
        console.log(`Testing password: ${testPass}\n`);
        
        for (const u of users) {
            const isMatch = await bcrypt.compare(testPass, u.password);
            const isPlainMatch = (u.password === testPass);
            console.log(`ID: ${u.id}, Email: ${u.email}, Status: ${u.subscriptionStatus}`);
            console.log(`  Bcrypt Match: ${isMatch}`);
            console.log(`  Plain Match: ${isPlainMatch}`);
            console.log('---');
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyPass();
