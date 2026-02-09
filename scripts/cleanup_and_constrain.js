const { pool } = require('../config/db');

const cleanupAndConstrain = async () => {
    console.log("=== Checking for Duplicate Votes ===");
    try {
        // 1. Find duplicates
        const res = await pool.query(`
            SELECT voter_id, COUNT(*) 
            FROM votes 
            GROUP BY voter_id 
            HAVING COUNT(*) > 1;
        `);

        if (res.rows.length > 0) {
            console.log(`Found ${res.rows.length} duplicate voter_ids. Cleaning up...`);
            for (const row of res.rows) {
                // Keep the one with the latest timestamp, delete others
                console.log(`Processing duplicate for: ${row.voter_id}`);
                await pool.query(`
                    DELETE FROM votes 
                    WHERE id IN (
                        SELECT id FROM votes 
                        WHERE voter_id = $1 
                        ORDER BY timestamp DESC 
                        OFFSET 1
                    )
                `, [row.voter_id]);
            }
            console.log("Duplicates removed.");
        } else {
            console.log("No duplicates found.");
        }

        // 2. Add Constraint
        console.log("Applying UNIQUE constraint...");
        await pool.query('ALTER TABLE votes ADD CONSTRAINT unique_voter_id UNIQUE (voter_id);');
        console.log("SUCCESS: Constraint added.");
        process.exit(0);

    } catch (err) {
        if (err.code === '42710') {
            console.log("Constraint 'unique_voter_id' already exists.");
            process.exit(0);
        }
        console.error("Error:", err);
        process.exit(1);
    }
};

cleanupAndConstrain();
