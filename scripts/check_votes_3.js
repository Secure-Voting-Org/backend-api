const { pool } = require('../config/db');
async function run() {
  try {
    const vRes = await pool.query('SELECT COUNT(*) as v FROM votes');
    const tRes = await pool.query('SELECT COUNT(*) as t FROM voters WHERE is_token_issued = TRUE');
    console.log(`Current DB State -> Votes: ${vRes.rows[0].v}, Issued Tokens: ${tRes.rows[0].t}`);
    
    // forcefully clear all non-existent block votes
    const delRes = await pool.query("DELETE FROM votes WHERE candidate_id = 'FAKE_CANDIDATE' RETURNING *");
    console.log(`Deleted ${delRes.rowCount} rows associated with FAKE_CANDIDATE.`);

    const vRes2 = await pool.query('SELECT COUNT(*) as v FROM votes');
    console.log(`State After Cleanup -> Votes: ${vRes2.rows[0].v}, Issued Tokens: ${tRes.rows[0].t}`);
    
  } catch(e) { console.error("Script Error:", e); }
  process.exit(0);
}
run();
