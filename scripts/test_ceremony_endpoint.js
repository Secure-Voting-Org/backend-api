const axios = require('axios');
const fs = require('fs');
const path = require('path');

const baseUrl = 'http://localhost:5000/api';
const SHARES_FILE = path.join(__dirname, '../config/election_key_shares.json');

async function runTest() {
    try {
        console.log("1. Logging in as Admin...");
        // Use a known good admin credentials from previous tests, or the db fallback
        // Looking at jwt.test.js or auth.test.js, admin login is POST /admin/login
        // In jwt_roles.test.js, they use mobile: "admin1", password: "password123"
        let sysAdminToken;
        try {
            const loginRes = await axios.post(`${baseUrl}/sys-admin/login`, {
                username: "sys_admin",
                password: "sysadmin123"
            }, {
                headers: { 'x-device-hash': 'test-ceremony-device' }
            });
            sysAdminToken = loginRes.data.token;
            console.log("✅ Admin logged in. Token acquired.");
        } catch (e) {
            console.error("❌ Failed to login as admin.", e.response?.data || e.message);
            return;
        }

        console.log("\n2. Loading Shamir Shares from config...");
        if (!fs.existsSync(SHARES_FILE)) {
            console.error("❌ Share file not found!");
            return;
        }
        const sharesData = JSON.parse(fs.readFileSync(SHARES_FILE, 'utf8'));
        const sharesArray = Object.values(sharesData.shares);
        console.log(`Loaded ${sharesArray.length} shares.`);

        console.log("\n3. Calling /api/admin/ceremony/decrypt endpoint...");
        const ceremonyRes = await axios.post(`${baseUrl}/admin/ceremony/decrypt`,
            { shares: sharesArray },
            {
                headers: {
                    Authorization: `Bearer ${sysAdminToken}`,
                    'x-device-hash': 'test-ceremony-device'
                }
            }
        );

        console.log("✅ Decryption Ceremony Success!");
        console.log("Response:", JSON.stringify(ceremonyRes.data, null, 2));

    } catch (err) {
        console.error("❌ Ceremony Test Error:", err.response ? err.response.data : err.message);
    }
}

runTest();
