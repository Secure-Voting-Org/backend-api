const BASE_URL = 'http://localhost:8081/api';
const AUTH_URL = `${BASE_URL}/voter/login`;
const PROTECTED_URL_TEMPLATE = `${BASE_URL}/voter`; // /api/voter/:id

// Mock Data
const mockDeviceA = "device-hash-A-" + Date.now();
const mockDeviceB = "device-hash-B-" + Date.now();

// Helper to register a voter
async function registerVoter() {
    const mobile = "9" + Math.floor(Math.random() * 900000000).toString();
    const payload = {
        fullName: "Session Test User",
        mobile: mobile,
        email: `session_test_${mobile}@example.com`,
        password: "password123"
    };

    await fetch(`${BASE_URL}/voter/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return payload;
}

async function login(mobile, password, deviceHash) {
    const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-device-hash': deviceHash
        },
        body: JSON.stringify({ mobile, password })
    });
    return await res.json();
}

async function accessProtected(token, mobile, deviceHash) {
    const res = await fetch(`${PROTECTED_URL_TEMPLATE}/${mobile}`, { // accessing by mobile as ID
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-device-hash': deviceHash
        }
    });
    return { status: res.status, body: await res.json() };
}

async function runTests() {
    console.log("=== TESTING SESSION SECURITY (1.8) ===\n");

    // Setup
    const user = await registerVoter();
    console.log(`Created User: ${user.mobile}`);

    // Test 1: Successful Login & Session Creation
    console.log("\n--- TEST 1: LOGIN & SESSION CREATION ---");
    const login1 = await login(user.mobile, user.password, mockDeviceA);
    if (login1.success && login1.token) {
        console.log("✅ Login Successful. Token received.");
    } else {
        console.error("❌ Login Failed:", login1);
        return;
    }

    // Test 2: Access Protected Route (Valid Session)
    console.log("\n--- TEST 2: PROTECTED ROUTE ACCESS (VALID) ---");
    const access1 = await accessProtected(login1.token, user.mobile, mockDeviceA);
    if (access1.status === 200) {
        console.log("✅ Access Granted.");
    } else {
        console.error("❌ Access Denied:", access1.status, access1.body);
    }

    // Test 3: Device Binding Check (Device Mismatch)
    console.log("\n--- TEST 3: DEVICE BINDING (MISMATCH) ---");
    const access2 = await accessProtected(login1.token, user.mobile, mockDeviceB); // Wrong Device
    if (access2.status === 401) {
        console.log("✅ Access Denied for Wrong Device (Correct).");
    } else {
        console.error("❌ Failed to block wrong device:", access2.status);
    }

    // Test 4: Concurrent Login (Single Session Rule)
    console.log("\n--- TEST 4: CONCURRENT LOGIN (SESSION INVALIDATION) ---");
    const login2 = await login(user.mobile, user.password, mockDeviceB); // Login from Device B
    console.log("Logged in from Device B.");

    // Try accessing with Token 1 (Device A) -> Should fail
    const access3 = await accessProtected(login1.token, user.mobile, mockDeviceA);
    if (access3.status === 401) {
        console.log("✅ Session A invalidated by Session B (Correct).");
    } else {
        console.error("❌ Session A still active after concurrent login:", access3.status);
    }

    // Test 5: Logout
    console.log("\n--- TEST 5: LOGOUT ---");
    const logoutRes = await fetch(`${BASE_URL}/voter/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${login2.token}` }
    });
    console.log("Logout Status:", logoutRes.status);

    const access4 = await accessProtected(login2.token, user.mobile, mockDeviceB);
    if (access4.status === 401) {
        console.log("✅ Token invalidated after logout.");
    } else {
        console.error("❌ Token still valid after logout:", access4.status);
    }

    console.log("\n✅ Session Security Tests Complete.");
}

runTests();
