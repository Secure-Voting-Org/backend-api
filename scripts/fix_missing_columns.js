const { pool } = require('../config/db');

async function fix() {
    console.log("Adding missing columns to local development database...");
    try {
        await pool.query('ALTER TABLE voters ADD COLUMN IF NOT EXISTS is_token_issued BOOLEAN DEFAULT FALSE');
        console.log("Added voters.is_token_issued");
    } catch (e) { console.error(e.message); }

    try {
        await pool.query('ALTER TABLE votes ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(255)');
        console.log("Added votes.prev_hash");
    } catch (e) { console.error(e.message); }

    process.exit(0);
}

fix();
