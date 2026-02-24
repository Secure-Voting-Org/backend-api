require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/db');

async function run() {
    try {
        const vRes = await pool.query('SELECT COUNT(*) as v FROM votes');
        const tRes = await pool.query('SELECT COUNT(*) as t FROM voters WHERE is_token_issued = TRUE');
        console.log(`Current DB State -> Total Votes in DB: ${vRes.rows[0].v}, Issued Tokens: ${tRes.rows[0].t}`);

        const allVotes = await pool.query('SELECT * FROM votes');
        console.log(`All Votes:`, allVotes.rows);
    } catch (e) {
        console.error("Script Error:", e);
    } finally {
        process.exit(0);
    }
}
run();
