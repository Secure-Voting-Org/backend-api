require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/db');
async function run() {
  try {
    const vRes = await pool.query('SELECT COUNT(*) as v FROM votes');
    const tRes = await pool.query('SELECT COUNT(*) as t FROM voters WHERE is_token_issued = TRUE');
    console.log(`Current DB State -> Votes: ${vRes.rows[0].v}, Issued Tokens: ${tRes.rows[0].t}`);
    
    console.log("Emptying the votes table of the unlinked FAKE_CANDIDATE entries...");
    await pool.query("DELETE FROM votes WHERE transaction_id NOT IN (SELECT transaction_id FROM votes WHERE block_id IS NOT NULL) AND block_id IS NULL");
    
    const vRes2 = await pool.query('SELECT COUNT(*) as v FROM votes');
    console.log(`State After Cleanup -> Votes: ${vRes2.rows[0].v}, Issued Tokens: ${tRes.rows[0].t}`);
  } catch(e) { console.error("Script Error:", e); }
  process.exit(0);
}
run();
