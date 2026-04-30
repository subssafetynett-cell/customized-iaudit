import prisma from './src/prisma.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    console.log('--- BACKEND DIAGNOSTIC START ---');
    console.log('Time:', new Date().toISOString());
    console.log('Environment:', process.env.NODE_ENV || 'not set');

    // 1. Check Database connection
    console.log('\n1. Testing Database Connection...');
    try {
        await prisma.$connect();
        console.log('✅ Prisma connected to database.');

        // Test a simple query
        const userCount = await prisma.user.count();
        console.log(`✅ Database query successful. Total users: ${userCount}`);

        // Test Otp table access
        console.log('Testing Otp table access...');
        await prisma.otp.findFirst();
        console.log('✅ Otp table is accessible.');
    } catch (dbError) {
        console.error('❌ Database connection/query failed:');
        console.error(dbError);
        console.log('\n--- RDS TROUBLESHOOTING TIPS ---');
        console.log('1. SSL: RDS often requires SSL. Try adding "?sslmode=no-verify" to your DATABASE_URL.');
        console.log('2. MIGRATIONS: If you see "relation does not exist", run:');
        console.log('   npx prisma db push');
        console.log('3. TIMEOUT: I have increased the timeout to 15s in the latest code.');
        console.log('4. SECURITY GROUPS: Ensure Port 5432 is open for your EC2 Private IP.');
        console.log('\nCurrent DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    }

    try {
        const transporterConfig = process.env.SMTP_HOST ? {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        } : {
            service: process.env.SMTP_SERVICE || 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };

        const transporter = nodemailer.createTransport(transporterConfig);

        await transporter.verify();
        console.log('✅ Nodemailer transporter is ready.');
    } catch (emailError) {
        console.error('❌ Email service verification failed:');
        console.error(emailError);
        console.log('\nTIP: Ensure Gmail "App Password" is still valid and not blocked by AWS Security Groups.');
    }

    console.log('\n--- DIAGNOSTIC COMPLETE ---');
    process.exit();
}

diagnose();
