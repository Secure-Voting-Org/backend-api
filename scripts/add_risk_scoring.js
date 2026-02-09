const { pool } = require('../config/db');

async function migrate() {
    try {
        console.log("Adding risk_score and risk_flags columns to voter_registrations...");

        await pool.query(`
            ALTER TABLE voter_registrations 
            ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS risk_flags JSON DEFAULT '[]'::json
        `);

        console.log("✅ Migration successful.");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        pool.end();
    }
}

migrate();
