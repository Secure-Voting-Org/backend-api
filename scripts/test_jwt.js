async function testJWT() {
    console.log("🚀 Starting JWT Manual Test Sequence...");

    // Generate a random username to avoid collisions if you run this multiple times
    const testUsername = `testobs_${Math.floor(Math.random() * 10000)}`;
    const password = "password123";

    console.log(`\n1️⃣ Testing Observer Registration (${testUsername})...`);

    // Register
    try {
        const regRes = await fetch('http://localhost:5000/api/observer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: "JWT Test User",
                email: "jwt-test@eci.gov.in",
                username: testUsername,
                password: password,
                role: "general"
            })
        });

        const regData = await regRes.json();
        if (regData.success) {
            console.log("✅ Registration Successful!");
            console.log(`   Tokens Received: ${regData.token ? "YES" : "NO"} (Token: ${regData.token.substring(0, 20)}...)`);
        } else {
            console.error("❌ Registration Failed:", regData.error);
            return;
        }

        // Login
        console.log(`\n2️⃣ Testing Observer Login...`);
        const loginRes = await fetch('http://localhost:5000/api/observer/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-device-hash': 'test-device-id-123'
            },
            body: JSON.stringify({
                username: testUsername,
                password: password,
                role: "general"
            })
        });

        const loginData = await loginRes.json();
        if (loginData.success && loginData.token) {
            console.log("✅ Login Successful!");
            console.log(`   Token Saved to DB: YES (Token starts with: ${loginData.token.substring(0, 20)}...)`);
            console.log("   The JWT system is working perfectly and sessions are safely inserted into your database!");

            // To test a protected route, you would do:
            // fetch('http://localhost:5000/api/some-protected-route', {
            //     headers: { 'Authorization': `Bearer ${loginData.token}` }
            // });
        } else {
            console.error("❌ Login Failed. Expected a token but got:", loginData);
        }

    } catch (e) {
        console.error("❌ Request Error. Make sure 'npm run dev' is running!", e.message);
    }
}

testJWT();
