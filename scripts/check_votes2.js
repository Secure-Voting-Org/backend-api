const { pool } = require('../config/db');
async function run() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM votes WHERE candidate_id = 'FAKE_CANDIDATE'");
    console.log("Current fake votes in DB:", res.rows[0].count);
    
    await pool.query("DELETE FROM votes WHERE candidate_id = 'FAKE_CANDIDATE'");
    console.log("Deleted from DB");
    
    const res2 = await pool.query("SELECT COUNT(*) FROM votes WHERE candidate_id = 'FAKE_CANDIDATE'");
    console.log("Remaining fake votes in DB:", res2.rows[0].count);
  } catch(e) { console.error(e); }
  process.exit(0);
}
run();
