import prisma from './src/prisma.js';

async function checkPasswords() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, password: true }
        });
        
        console.log("User Passwords (first 10 chars):");
        users.forEach(u => {
            console.log(`ID: ${u.id}, Email: ${u.email}, PassPrefix: ${u.password ? u.password.substring(0, 10) : 'NULL'}`);
        });
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPasswords();
