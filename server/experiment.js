import prisma from './src/prisma.js';
import bcrypt from 'bcrypt';

async function experiment() {
    const email = 'athulyadasofficial@gmail.com'; // Known working user
    const password = process.env.TEST_PASSWORD || 'Placeholder@123';
    
    try {
        console.log(`Setting user ${email} to 'expired' for testing...`);
        await prisma.user.update({
            where: { email },
            data: { subscriptionStatus: 'expired' }
        });
        
        console.log(`Attempting login for ${email} (should succeed now)...`);
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response User Status: ${data.subscriptionStatus}`);
        
        // Revert status
        console.log(`Reverting user ${email} to 'trial'...`);
        await prisma.user.update({
            where: { email },
            data: { subscriptionStatus: 'trial' }
        });
        
        // NOW: Fix Sidha's password to match the one user is using
        console.log(`Updating Sidha's password to 'Syndicate@005'...`);
        const hashed = await bcrypt.hash(process.env.TEST_PASSWORD || 'Placeholder@123', 10);
        await prisma.user.update({
            where: { email: 'sidhaasamad@gmail.com' },
            data: { password: hashed }
        });
        console.log(`Sidha's password updated.`);

    } catch (error) {
        console.error("Experiment failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

experiment();
