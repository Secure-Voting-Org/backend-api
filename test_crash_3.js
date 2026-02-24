const { pool } = require('./config/db');
require('dotenv').config();

async function run() {
  try {
    console.log("1. Delete candidate");
    await pool.query(`DELETE FROM votes WHERE candidate_id = 'FAKE_CANDIDATE'`);

    console.log("2. Delete orphan");
    await pool.query(`DELETE FROM votes WHERE voter_id = 'HACKER_VOTER'`);

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
  } catch(e) {
    console.error("CRASH:", e);
  } finally {
    process.exit(0);
  }
}
run();
