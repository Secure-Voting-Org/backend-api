const BASE_URL = 'http://localhost:5001/api/registration/submit';

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
    console.log("=== STARTING DUPLICATE DETECTION TESTS ===");

    // 1. Test ID Duplicate (Pending)
    console.log("\n--- TEST 1: ID DUPLICATE ---");
    const aadhaar1 = generateAadhaar();
    const face1 = generateFace();

    // First Request (Should Succeed)
    console.log(`Sending Initial Request (Aadhaar: ${aadhaar1})...`);
    let res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload(aadhaar1, null, face1))
    });
    let data = await res.json();
    console.log("Response 1:", res.status, data);

    // Second Request (Should Fail with 409)
    console.log(`Sending Duplicate Request (Aadhaar: ${aadhaar1})...`);
    res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload(aadhaar1, null, face1))
    });
    data = await res.json();
    console.log("Response 2:", res.status, data);
    if (res.status === 409) console.log("✅ ID Duplicate Blocked"); else console.error("❌ ID Duplicate NOT Blocked");

    // 2. Test Device Velocity (Fraud Signal)
    console.log("\n--- TEST 2: DEVICE VELOCITY ---");
    const deviceHash = "test-device-" + Date.now();
    const aadhaarDev = generateAadhaar(); // Different ID, but same device

    for (let i = 1; i <= 4; i++) {
        // Use unique Aadhaar for each to avoid ID block, we want to test DEVICE block/log
        const uniqueAadhaar = generateAadhaar();
        console.log(`Sending Request ${i} from Device ${deviceHash}...`);
        res = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-device-hash': deviceHash
            },
            body: JSON.stringify(validPayload(uniqueAadhaar, null, generateFace()))
        });
        console.log(`Response ${i}:`, res.status);
    }
    console.log("👉 Check Server Logs for [FRAUD] High velocity registration detected from Device");

    // 3. Test Face Similarity (Fraud Signal)
    console.log("\n--- TEST 3: FACE SIMILARITY ---");
    const face2 = generateFace(); // A specific face
    const aadhaarFace1 = generateAadhaar();
    const aadhaarFace2 = generateAadhaar();

    // Submit Face 1
    console.log(`Sending Face 1 (Aadhaar: ${aadhaarFace1})...`);
    await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload(aadhaarFace1, null, face2))
    });

    // Submit Face 1 Again (Different Aadhaar)
    console.log(`Sending Face 1 AGAIN (Aadhaar: ${aadhaarFace2}) - Should trigger Fraud Log...`);
    // Ideally we perturb face2 slightly to test similarity, but identical is distance 0 < 0.6
    res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload(aadhaarFace2, null, face2))
    });
    console.log("Response:", res.status);
    console.log("👉 Check Server Logs for [FRAUD] Face matches pending application");

}

runTests();
