const { pool } = require('../config/db');
async function check() {
    console.log("Checking for FAKE_CANDIDATE in votes:");
    const res = await pool.query("SELECT COUNT(*) FROM votes WHERE candidate_id = 'FAKE_CANDIDATE'");
    console.log(res.rows[0]);
    console.log("Clearing FAKE_CANDIDATE from votes...");
    await pool.query("DELETE FROM votes WHERE candidate_id = 'FAKE_CANDIDATE'");
    const res2 = await pool.query("SELECT COUNT(*) FROM votes WHERE candidate_id = 'FAKE_CANDIDATE'");
    console.log("After cleanup:", res2.rows[0]);
    process.exit(0);
}
check();
