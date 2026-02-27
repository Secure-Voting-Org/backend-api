const { pool } = require('./config/db');
require('dotenv').config();

async function checkSpecificVoter() {
    try {
        console.log("=== Checking Voter Token Status ===\n");

        // Get the voter ID from command line or check all voters
        console.log("Checking all voters and their token status:\n");

        const query = `
            SELECT id, name, constituency, is_token_issued 
            FROM voters 
            ORDER BY id
        `;
        const result = await pool.query(query);

        console.log(`Total voters: ${result.rows.length}\n`);

        result.rows.forEach((voter, index) => {
            const status = voter.is_token_issued ? '❌ TOKEN ISSUED' : '✅ READY TO VOTE';
            console.log(`${index + 1}. Voter ID: ${voter.id}`);
            console.log(`   Name: ${voter.name}`);
            console.log(`   Constituency: ${voter.constituency}`);
            console.log(`   Status: ${status}\n`);
        });

        // Count how many have tokens
        const issued = result.rows.filter(v => v.is_token_issued).length;
        const ready = result.rows.filter(v => !v.is_token_issued).length;

        console.log("=== Summary ===");
        console.log(`Voters with tokens issued: ${issued}`);
        console.log(`Voters ready to vote: ${ready}\n`);

        if (issued > 0) {
            console.log("⚠️ Some voters still have tokens marked as issued!");
            console.log("Run this to reset ALL tokens:");
            console.log("  node reset_voter_tokens.js\n");
        }

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

checkSpecificVoter();
