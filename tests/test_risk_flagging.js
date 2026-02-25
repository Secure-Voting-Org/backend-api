const BASE_URL = 'http://localhost:8081/api/registration/submit';
const ADMIN_URL = 'http://localhost:8081/api/admin/flagged-registrations';

// Mock Data
const generateAadhaar = () => Math.floor(100000000000 + Math.random() * 900000000000).toString();
const generateFace = () => Array.from({ length: 128 }, () => Math.random());

const validPayload = (aadhaar, deviceHash, face) => ({
    aadhaar: aadhaar,
    faceDescriptor: face,
    formData: {
        firstName: "Test", surname: "User", relativeName: "Parent", relationType: "Father",
        state: "State", district: "District", assemblyConstituency: "Constituency1",
        dobDay: "01", dobMonth: "01", dobYear: "1990", gender: "Male",
        mobileSelf: true, mobileNumber: "9999999999", emailSelf: true, email: "test@example.com",
        houseNo: "1", streetArea: "Street", villageTown: "City", pincode: "123456",
        disabilityCategories: { locomotive: false }
    }
});

async function runTests() {
    console.log("=== TESTING HIGH-RISK FLAGGING SYSTEM ===\n");

    // Test 1: Normal Registration (Risk Score = 0)
    console.log("--- TEST 1: NORMAL REGISTRATION ---");
    const normalAadhaar = generateAadhaar();
    const normalFace = generateFace();

    let res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload(normalAadhaar, null, normalFace))
    });
    console.log("Normal Registration:", res.status);
    console.log("Expected: Risk Score = 0\n");

    // Test 2: High-Risk Registration (Duplicate Face)
    console.log("--- TEST 2: HIGH-RISK (DUPLICATE FACE) ---");
    const highRiskAadhaar = generateAadhaar();

    // Submit same face twice
    await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload(generateAadhaar(), null, normalFace))
    });

    res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload(highRiskAadhaar, null, normalFace))
    });
    console.log("Duplicate Face Registration:", res.status);
    console.log("Expected: Risk Score = 50 (BIOMETRIC_MATCH)\n");

    // Test 3: Very High-Risk (Device + Face)
    console.log("--- TEST 3: VERY HIGH-RISK (DEVICE + FACE) ---");
    const deviceHash = "test-device-" + Date.now();

    // Create 4 registrations from same device
    for (let i = 0; i < 4; i++) {
        await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-device-hash': deviceHash
            },
            body: JSON.stringify(validPayload(generateAadhaar(), null, generateFace()))
        });
    }

    // 5th registration with duplicate face
    res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-device-hash': deviceHash
        },
        body: JSON.stringify(validPayload(generateAadhaar(), null, normalFace))
    });
    console.log("Device + Face Duplicate:", res.status);
    console.log("Expected: Risk Score = 80 (DEVICE_VELOCITY + BIOMETRIC_MATCH)\n");

    // Test 4: Check Admin Endpoint
    console.log("--- TEST 4: ADMIN FLAGGED REGISTRATIONS ---");
    res = await fetch(ADMIN_URL);
    const data = await res.json();
    console.log(`Flagged Registrations Count: ${data.count}`);
    console.log("Sample:", data.registrations.slice(0, 2));
    console.log("\n✅ All tests complete. Check server logs for [RISK ASSESSMENT] messages.");
}

runTests();
