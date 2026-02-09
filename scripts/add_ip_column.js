const { pool } = require('../config/db');

async function migrate() {
    try {
        console.log("Adding ip_address column to voter_registrations...");
        await pool.query("ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)");
        console.log("✅ Migration successful.");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        pool.end();
    }
}

migrate();
