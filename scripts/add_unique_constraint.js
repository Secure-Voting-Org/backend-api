const { pool } = require('../config/db');

const migrate = async () => {
    console.log("Starting migration: Adding UNIQUE constraint to votes(voter_id)...");
    try {
        // Attempt to add unique constraint. 
        // This might fail if there are already duplicates.
        // If so, we might need to truncate or clean up, but for dev we'll just try.
        await pool.query('ALTER TABLE votes ADD CONSTRAINT unique_voter_id UNIQUE (voter_id);');
        console.log("SUCCESS: Added UNIQUE constraint to votes(voter_id).");
        process.exit(0);
    } catch (err) {
        if (err.code === '42710') { // duplicate_object (constraint already exists) or similar
            console.log("Constraint already exists or similar error:", err.message);
            process.exit(0);
        }
        console.error("Failed to add constraint:", err.message);
        console.error("Ensure there are no duplicate votes in the table before running this.");
        process.exit(1);
    }
};

migrate();
