const { pool } = require('./config/db');

async function quickCheck() {
    const e = await pool.query('SELECT phase FROM election_config WHERE id = 1');
    const t = await pool.query('SELECT COUNT(*) as ready FROM voters WHERE is_token_issued = FALSE');
    const v = await pool.query('SELECT COUNT(*) as total FROM votes');

    console.log("✅ Election: " + (e.rows[0]?.phase || 'N/A'));
    console.log("✅ Voters Ready: " + (t.rows[0]?.ready || '0'));
    console.log("📊 Total Votes Cast: " + (v.rows[0]?.total || '0'));
    console.log("\n🎉 Try voting now!");

    pool.end();
}

quickCheck().catch(e => { console.error(e); pool.end(); });
