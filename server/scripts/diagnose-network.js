import dns from 'node:dns/promises';
import net from 'node:net';
import { prepareDatabaseUrl, parseDatabaseEndpoint } from '../src/resolveDatabaseUrl.js';
import { loadServerEnv } from '../src/loadEnv.js';

loadServerEnv();

async function runNetworkDiagnostics() {
    console.log('=== DATABASE NETWORK DIAGNOSTIC TOOL ===\n');
    
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable is not defined.');
        process.exit(1);
    }
    
    const dbUrl = prepareDatabaseUrl(rawUrl, { allowHostOverride: false });
    console.log(`Analyzing connection target...`);
    
    let endpoint;
    try {
        endpoint = parseDatabaseEndpoint(dbUrl);
        console.log(`- Host: ${endpoint.host}`);
        console.log(`- Port: ${endpoint.port}`);
    } catch (err) {
        console.error(`❌ ERROR: Failed to parse DATABASE_URL: ${err.message}`);
        process.exit(1);
    }

    // 1. DNS Resolution Check
    console.log('\n--- 1. Testing DNS Resolution ---');
    let resolvedIps = [];
    try {
        resolvedIps = await dns.resolve(endpoint.host);
        console.log(`✅ Success: resolved "${endpoint.host}" to:`);
        resolvedIps.forEach(ip => console.log(`   👉 ${ip}`));
    } catch (dnsErr) {
        console.error(`❌ FAILED: DNS lookup failed for "${endpoint.host}".`);
        console.error(`   Error details: ${dnsErr.message}`);
        console.log(`   Tip: Check if the hostname is spelled correctly or if your server lacks DNS/internet access.`);
        process.exit(1);
    }

    // 2. TCP Port Connection Check
    console.log('\n--- 2. Testing TCP Connection (Handshake) ---');
    for (const ip of resolvedIps) {
        console.log(`Attempting to connect to ${ip}:${endpoint.port}...`);
        const result = await new Promise((resolve) => {
            const socket = new net.Socket();
            const timer = setTimeout(() => {
                socket.destroy();
                resolve({ success: false, error: 'TIMEOUT' });
            }, 5000);

            socket.connect(endpoint.port, ip, () => {
                clearTimeout(timer);
                socket.destroy();
                resolve({ success: true });
            });

            socket.on('error', (err) => {
                clearTimeout(timer);
                socket.destroy();
                resolve({ success: false, error: err.message });
            });
        });

        if (result.success) {
            console.log(`✅ SUCCESS: Fully established TCP connection to ${ip}:${endpoint.port}!`);
        } else {
            console.error(`❌ FAILED: Could not connect to ${ip}:${endpoint.port} (${result.error})`);
        }
    }

    console.log('\n--- Troubleshooting Recommendations ---');
    console.log('If DNS succeeds but TCP connection fails (timeout or connection refused):');
    console.log('1. DATABASE FIREWALL / SECURITY GROUPS:');
    console.log('   Go to your database provider (Neon.tech, AWS RDS, Supabase, etc.) and check your network/firewall settings.');
    console.log('   You must allow incoming connections from your live VPS IP address.');
    console.log('   Alternatively, configure it to allow connections from anywhere ("0.0.0.0/0") if you use password authentication.');
    console.log('2. VPS OUTBOUND FIREWALL:');
    console.log('   Check if your hosting provider (e.g. Hostinger, AWS EC2, DigitalOcean) blocks outbound traffic on port 5432.');
    console.log('   Run: ufw status (or check the VPS dashboard provider settings for security firewalls).');
    console.log('3. NEON SERVERLESS NOTE:');
    console.log('   If outbound TCP port 5432 is permanently blocked, consider using a database connection pooler or proxying via HTTP/WebSockets.');
}

runNetworkDiagnostics().catch(console.error);
