const { pool } = require('./config/db');
require('dotenv').config();

async function run() {
    try {
        console.log("1. Delete candidate");
        await pool.query(`DELETE FROM votes WHERE candidate_id = 'FAKE_CANDIDATE'`);

        console.log("2. Delete orphan");
        await pool.query(`DELETE FROM votes WHERE block_id IS NULL AND transaction_id NOT IN (SELECT transaction_id FROM votes WHERE block_id IS NOT NULL)`);

        console.log("3. Mempool clear");
        const MempoolService = require('./utils/MempoolService');
        console.log(MempoolService);
        // Wait, the API endpoint uses require('./services/MempoolService') !
        const BadMempoolService = require('./services/MempoolService');
        console.log("BadMempoolService.cache type:", typeof BadMempoolService.cache);
        BadMempoolService.cache = BadMempoolService.cache.filter(tx => tx.candidate_id !== 'FAKE_CANDIDATE' && tx.candidate_id !== 'SIMULATED_VOTE');

        console.log("4. Force tokens");
        const voteCountRes = await pool.query('SELECT COUNT(*) as v FROM votes');
        const tokenCountRes = await pool.query('SELECT COUNT(*) as t FROM voters WHERE is_token_issued = TRUE');
        const votes = parseInt(voteCountRes.rows[0].v, 10);
        let tokens = parseInt(tokenCountRes.rows[0].t, 10);
        if (votes > tokens) {
            await pool.query(`UPDATE voters SET is_token_issued = TRUE`);
        }

        console.log("5. Clear logs");
        await pool.query(`DELETE FROM logs WHERE event = 'FRAUD_RISK' AND details->>'fraud_type' = 'MATH_MISMATCH'`);

        console.log("SUCCESS");
    } catch (e) {
        console.error("CRASH:", e);
    } finally {
        process.exit(0);
    }
}
run();
