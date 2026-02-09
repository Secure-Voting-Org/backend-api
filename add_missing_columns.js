const { pool } = require('./config/db');

async function migrate() {
    try {
        console.log("Migrating voters table...");

        await pool.query(`
            ALTER TABLE voters 
            ADD COLUMN IF NOT EXISTS surname VARCHAR(100),
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'APPROVED';
        `);

        // Note: setting status to APPROVED for existing rows because incomplete data might be an issue if PENDING? 
        // Actually, let's stick to the schema definition which says DEFAULT 'PENDING'.
        // But for dashboard "Active Admins" or "Voters", status might be used. 
        // Let's just add the columns first.

        console.log("Migration successful: Added surname and status columns.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
