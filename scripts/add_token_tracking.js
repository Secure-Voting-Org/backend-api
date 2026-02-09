const { pool } = require('../config/db');

const migrate = async () => {
    console.log("Starting migration: Adding is_token_issued column to voters...");
    try {
        await pool.query('ALTER TABLE voters ADD COLUMN IF NOT EXISTS is_token_issued BOOLEAN DEFAULT FALSE;');
        console.log("SUCCESS: is_token_issued column added.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

migrate();
