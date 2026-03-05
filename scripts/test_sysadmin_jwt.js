/**
 * Manual Test Script: SysAdmin JWT Verification
 * 
 * This script verifies:
 * 1. Login with a seeded SysAdmin (sys_admin).
 * 2. Receiving a JWT token.
 * 3. Accessing a protected route (/api/admin/list) using the token.
 */

async function testSysAdminJWT() {
    console.log("🚀 Starting SysAdmin JWT Manual Test...");

    const credentials = {
        username: "sys_admin",
        password: "sysadmin123"
    };

    try {
        // 1. Login
        console.log(`\n1️⃣ Testing SysAdmin Login (${credentials.username})...`);
        const loginRes = await fetch('http://localhost:5000/api/sys-admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-device-hash': 'sysadmin-test-device-999'
            },
            body: JSON.stringify(credentials)
        });

        const loginData = await loginRes.json();
        if (loginData.success && loginData.token) {
            console.log("✅ Login Successful!");
            console.log(`   Token: ${loginData.token.substring(0, 30)}...`);

            const token = loginData.token;

            // 2. Access Protected Route
            // SysAdmins can also view the admin list
            console.log(`\n2️⃣ Testing Access to Protected Route (/api/admin/list)...`);
            const protectedRes = await fetch('http://localhost:5000/api/admin/list', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-device-hash': 'sysadmin-test-device-999'
                }
            });

            if (protectedRes.status === 200) {
                const admins = await protectedRes.json();
                console.log("✅ Protected Route Access Successful!");
                console.log(`   Fetched ${admins.length} admins from database.`);
                console.log("\n🎊 SysAdmin JWT Verification Passed!");
            } else {
                const error = await protectedRes.json();
                console.error("❌ Protected Route Access Failed:", protectedRes.status, error);
            }
        } else {
            console.error("❌ Login Failed:", loginData.error || loginData);
        }

    } catch (e) {
        console.error("❌ Request Error. Make sure 'npm run dev' is running!", e.message);
    }
}

testSysAdminJWT();
