require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/db');

async function run() {
  try {
    const vRes = await pool.query('SELECT COUNT(*) as v FROM votes');
    const tRes = await pool.query('SELECT COUNT(*) as t FROM voters WHERE is_token_issued = TRUE');
    console.log(`Votes: ${vRes.rows[0].v}, Tokens: ${tRes.rows[0].t}`);

    const logsRes = await pool.query("SELECT details FROM audit_logs WHERE event='FRAUD_RISK' ORDER BY id DESC LIMIT 2");
    console.log("Recent logs:", JSON.stringify(logsRes.rows, null, 2));

    const allVotes = await pool.query('SELECT * FROM votes');
    console.log(`All Votes:`, JSON.stringify(allVotes.rows, null, 2));

  } catch (e) {
    console.error("ERROR:", e);
  }
  process.exit(0);
}
run();
