// verify_req_4_6.js
// Automated script running post-decryption to flag excess votes
// Requirement 4.6.2.1: if (votes > voters) triggerAlarm()

const { pool } = require('../config/db');

async function verifyFraud() {
    console.log("Starting Module 4.6 Verification: Checking for Excess Votes...");

    try {
        // 1. Get total issued tokens
        // Check for users who have been issued tokens
        // Using has_voted for total turned out voters if token issued is not present,
        // Wait, looking at Voter model, there is `is_token_issued` (maybe, check models)
        // Let's check `has_voted` as proxy or `is_token_issued` if it exists.
        // Actually, `has_voted` is usually set when vote is cast.
        // The implementation plan says: "voters where is_token_issued = TRUE".

        let totalIssuedTokens = 0;
        try {
            const tokenRes = await pool.query('SELECT COUNT(*) as count FROM voters WHERE is_token_issued = TRUE');
            totalIssuedTokens = parseInt(tokenRes.rows[0].count, 10);
        } catch (err) {
            // column might not exist, fallback to has_voted
            if (err.code === '42703') { // undefined_column
                console.log("⚠️ Column 'is_token_issued' not found. Using 'has_voted' as fallback.");
                const tokenRes = await pool.query('SELECT COUNT(*) as count FROM voters WHERE has_voted = TRUE');
                totalIssuedTokens = parseInt(tokenRes.rows[0].count, 10);
            } else {
                throw err;
            }
        }

        // 2. Get total decrypted votes (total rows in votes table)
        const voteRes = await pool.query('SELECT COUNT(*) as count FROM votes');
        const totalDecryptedVotes = parseInt(voteRes.rows[0].count, 10);

        console.log(`📊 Statistics:`);
        console.log(`   Expected Max Votes (Tokens Issued): ${totalIssuedTokens}`);
        console.log(`   Actual Votes in Database: ${totalDecryptedVotes}`);

        // 3. Compare and trigger alarm
        if (totalDecryptedVotes > totalIssuedTokens) {
            console.error("\n🚨 ALARM: FRAUD DETECTED!");
            console.error("   Math Mismatch Critical Error: Total votes exceed issued tokens!");

            // Log to database
            const logQuery = 'INSERT INTO logs (event, details, ip_address) VALUES ($1, $2, $3)';
            const details = JSON.stringify({
                fraud_type: 'MATH_MISMATCH',
                expected_max: totalIssuedTokens,
                actual_votes: totalDecryptedVotes,
                excess_votes: totalDecryptedVotes - totalIssuedTokens
            });
            await pool.query(logQuery, ['FRAUD_ALERT_CRITICAL', details, 'localhost']);

            console.error("   Audit log entry created for MATH_MISMATCH.\n");
            process.exit(1); // Exit with failure code
        } else {
            console.log("\n✅ Verification Passed: Vote count is within expected limits (No Math Mismatch).\n");
            process.exit(0);
        }
    } catch (err) {
        console.error("Error during verification:", err);
        process.exit(1);
    }
}

verifyFraud();
