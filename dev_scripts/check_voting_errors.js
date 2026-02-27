const { pool } = require('./config/db');
require('dotenv').config();

async function checkLatestErrors() {
    try {
        console.log("=== Checking Recent Backend Activity ===\n");

        // Check if election is LIVE
        const electionQuery = 'SELECT phase, is_kill_switch_active FROM election ORDER BY id DESC LIMIT 1';
        const electionResult = await pool.query(electionQuery);

        if (electionResult.rows.length > 0) {
            const election = electionResult.rows[0];
            console.log(`Election Phase: ${election.phase}`);
            console.log(`Kill Switch Active: ${election.is_kill_switch_active}`);

            if (election.phase !== 'LIVE') {
                console.log("\n⚠️ WARNING: Election is NOT in LIVE phase!");
                console.log("   This will cause voting to fail.");
                console.log("   You need to set the election to LIVE phase.\n");
            }

            if (election.is_kill_switch_active) {
                console.log("\n⚠️ WARNING: Kill switch is ACTIVE!");
                console.log("   This will block all voting attempts.\n");
            }
        } else {
            console.log("❌ No election record found in database!\n");
        }

        // Check recent votes
        const votesQuery = 'SELECT COUNT(*) as count FROM votes';
        const votesResult = await pool.query(votesQuery);
        console.log(`\nTotal Votes in Database: ${votesResult.rows[0].count}`);

        // Check if the voter has a token issued
        console.log("\n=== Blind Signature Token System ===");
        console.log("Note: Check if voter has a token issued in the voters table");

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

checkLatestErrors();
