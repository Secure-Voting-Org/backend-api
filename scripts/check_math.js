const { pool } = require('../config/db');
async function run() {
  try {
    const vRes = await pool.query('SELECT COUNT(*) as v FROM votes');
    const tRes = await pool.query('SELECT COUNT(*) as t FROM voters WHERE is_token_issued = TRUE');
    console.log(`DB says: Votes = ${vRes.rows[0].v}, Tokens = ${tRes.rows[0].t}`);
    
    // forcefully clear all non-existent block votes
    await pool.query('DELETE FROM votes WHERE block_id IS NULL');
    
    const vRes2 = await pool.query('SELECT COUNT(*) as v FROM votes');
    console.log(`After cleanup: Votes = ${vRes2.rows[0].v}, Tokens = ${tRes.rows[0].t}`);
  } catch(e) { console.error(e); }
  process.exit(0);
}
run();
