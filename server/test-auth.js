async function testLogin(email, password) {
    console.log(`Testing login for: ${email}`);
    try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Fetch error:`, error.message);
    }
}

async function main() {
    // Test expired user
    await testLogin('sidhaasamad@gmail.com', 'Syndicate@005');
    console.log('---');
    // Test active user
    await testLogin('athulyadasofficial@gmail.com', 'Syndicate@005');
}

main();
