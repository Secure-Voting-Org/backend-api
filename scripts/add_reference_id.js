const { pool } = require('../config/db');

async function migrate() {
    try {
        console.log("Adding reference_id column to voter_registrations...");
        await pool.query("ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS reference_id VARCHAR(50) UNIQUE");
        console.log("✅ Migration successful.");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        pool.end();
    }
}

migrate();
