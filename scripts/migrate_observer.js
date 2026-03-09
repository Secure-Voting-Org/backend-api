require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrateObserverTable() {
    try {
        console.log("Starting Observer table migration...");

        // 1. Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'observers'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log("Table 'observers' does not exist yet. No migration needed.");
            return;
        }

        // 2. Check if username column exists
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='observers' and column_name='username';
        `);

        if (columnCheck.rows.length === 0) {
            console.log("Column 'username' already missing. Migration may have already run.");
        } else {
            console.log("Renaming 'username' to 'mobile_number'...");
            await pool.query(`ALTER TABLE observers RENAME COLUMN username TO mobile_number;`);

            console.log("Changing 'mobile_number' column type to VARCHAR(15)...");
            await pool.query(`ALTER TABLE observers ALTER COLUMN mobile_number TYPE VARCHAR(15);`);

            console.log("✓ Migration successful!");
        }

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrateObserverTable();
