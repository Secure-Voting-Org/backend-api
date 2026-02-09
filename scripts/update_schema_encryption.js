const { pool } = require('../config/db');

const updateSchema = async () => {
    try {
        console.log("Starting schema migration...");

        // Alter candidate_id column type from INTEGER to TEXT
        // Since we likely have existing integer data, we can cast it to text.
        await pool.query('ALTER TABLE votes ALTER COLUMN candidate_id TYPE TEXT USING candidate_id::text');

        console.log("Schema migration successful: votes.candidate_id changed to TEXT.");
    } catch (err) {
        console.error("Schema migration failed:", err);
    } finally {
        await pool.end();
    }
};

updateSchema();
