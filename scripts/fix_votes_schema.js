const { pool } = require('../config/db');

const migrate = async () => {
    console.log("Starting migration: Fixing votes table schema...");

    // 1. Alter voter_id
    try {
        await pool.query('ALTER TABLE votes ALTER COLUMN voter_id TYPE VARCHAR(100);');
        console.log("Success: Updated voter_id column to VARCHAR(100)");
    } catch (err) {
        console.error("Failed to update voter_id:", err.message);
    }

    // 2. Alter candidate_id
    try {
        await pool.query('ALTER TABLE votes ALTER COLUMN candidate_id TYPE TEXT USING candidate_id::text;');
        console.log("Success: Updated candidate_id column to TEXT");
    } catch (err) {
        console.error("Failed to update candidate_id:", err.message);
    }

    console.log("Migration finished.");
    process.exit(0);
};

migrate();
