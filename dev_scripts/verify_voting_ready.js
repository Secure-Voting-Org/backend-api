const { pool } = require('./config/db');
require('dotenv').config();

async function finalVerification() {
    try {
        console.log("=== FINAL VOTING SYSTEM VERIFICATION ===\n");

        // 1. Check election status
        console.log("1. Election Status:");
        const electionQuery = 'SELECT phase, is_kill_switch_active FROM election_config WHERE id = 1';
        const election = await pool.query(electionQuery);
        if (election.rows.length > 0) {
            const e = election.rows[0];
            console.log(`   Phase: ${e.phase} ${e.phase === 'LIVE' ? '✅' : '❌'}`);
            console.log(`   Kill Switch: ${e.is_kill_switch_active ? '❌ ACTIVE' : '✅ DISABLED'}\n`);
        } else {
            console.log("   ❌ No election config found\n");
        }

        // 2. Check voter tokens
        console.log("2. Voter Token Status:");
        const tokenQuery = 'SELECT COUNT(*) as total, SUM(CASE WHEN is_token_issued = TRUE THEN 1 ELSE 0 END) as issued FROM voters';
        const tokens = await pool.query(tokenQuery);
        const t = tokens.rows[0];
        console.log(`   Total Voters: ${t.total}`);
        console.log(`   Tokens Issued: ${t.issued} ${t.issued === '0' ? '✅' : '⚠️'}`);
        console.log(`   Ready to Vote: ${t.total - t.issued} ✅\n`);

        // 3. Check votes table schema
        console.log("3. Votes Table Schema:");
        const schemaQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'votes' AND column_name IN ('prev_hash', 'transaction_hash')
        `;
        const schema = await pool.query(schemaQuery);
        const hasHash = schema.rows.some(r => r.column_name === 'transaction_hash');
        const hasPrevHash = schema.rows.some(r => r.column_name === 'prev_hash');
        console.log(`   transaction_hash: ${hasHash ? '✅' : '❌'}`);
        console.log(`   prev_hash: ${hasPrevHash ? '✅' : '❌'}\n`);

        // 4. Summary
        const allGood = election.rows.length > 0 &&
            election.rows[0].phase === 'LIVE' &&
            !election.rows[0].is_kill_switch_active &&
            t.issued === '0' &&
            hasHash && hasPrevHash;

        console.log("=== VERIFICATION RESULT ===");
        if (allGood) {
            console.log("✅ ALL SYSTEMS GO!");
            console.log("🎉 Voting should work successfully now!\n");
            console.log("Try these steps:");
            console.log("1. Open voter app (http://localhost:3000)");
            console.log("2. Login with a voter account");
            console.log("3. Click 'Cast Vote'");
            console.log("4. Select a candidate");
            console.log("5. Confirm your vote");
            console.log("6. You should receive a transaction hash receipt!\n");
        } else {
            console.log("⚠️ Some issues remain - check the status above\n");
        }

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

finalVerification();
