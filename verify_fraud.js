
const { checkIpVelocity, logFraudSignal } = require('./utils/fraudEngine');
const { pool } = require('./config/db');

async function testFraudEngine() {
    console.log("Starting Fraud Engine Verification...");

    const testIp = '127.0.0.1';

    // 1. Test Logging
    console.log("\n1. Testing Log Function...");
    await logFraudSignal('TEST_SIGNAL', { message: 'verification test' }, testIp);
    console.log("   Logged signal. Verifying in DB...");

    const logRes = await pool.query("SELECT * FROM logs WHERE event = 'FRAUD_RISK' AND details->>'fraud_type' = 'TEST_SIGNAL' ORDER BY id DESC LIMIT 1");
    if (logRes.rows.length > 0) {
        console.log("   ✅ Log found:", logRes.rows[0].details);
    } else {
        console.error("   ❌ Log NOT found!");
    }

    // 2. Test Velocity Check (Mocking Data)
    console.log("\n2. Testing Velocity Check...");

    // Clear previous test data
    await pool.query("DELETE FROM voter_registrations WHERE aadhaar_number LIKE 'TEST%'");

    // Insert 4 records (Limit is 3)
    for (let i = 0; i < 4; i++) {
        await pool.query(`
            INSERT INTO voter_registrations (ip_address, created_at, aadhaar_number, full_name, mobile)
            VALUES ($1, NOW(), $2, 'Test User', '9999999999')
        `, [testIp, `TEST_${i}`]);
    }

    const isHighVelocity = await checkIpVelocity(testIp, 'REGISTRATION');
    if (isHighVelocity) {
        console.log("   ✅ Velocity Check PASSED (Detected high velocity)");
    } else {
        console.error("   ❌ Velocity Check FAILED (Did not detect high velocity)");
    }

    // Cleanup
    await pool.query("DELETE FROM voter_registrations WHERE aadhaar_number LIKE 'TEST%'");
    await pool.query("DELETE FROM logs WHERE event = 'FRAUD_RISK' AND details->>'fraud_type' = 'TEST_SIGNAL'");

    console.log("\nVerification Complete.");
    pool.end();
}

testFraudEngine().catch(err => {
    console.error("Test Failed:", err);
    pool.end();
});
