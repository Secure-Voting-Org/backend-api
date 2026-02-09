const { pool } = require('../config/db');

const rollback = async () => {
    console.log("Starting rollback: Removing UNIQUE constraint from votes(voter_id)...");
    try {
        await pool.query('ALTER TABLE votes DROP CONSTRAINT IF EXISTS unique_voter_id;');
        console.log("SUCCESS: Constraint 'unique_voter_id' dropped.");
        process.exit(0);
    } catch (err) {
        console.error("Failed to drop constraint:", err.message);
        process.exit(1);
    }
};

rollback();
