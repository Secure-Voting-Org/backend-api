const { pool } = require('./config/db');

const updateSchema = async () => {
    try {
        console.log("Adding file columns to voter_registrations table...");

        const queries = [
            "ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS profile_image_data TEXT",
            "ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS dob_proof_data TEXT",
            "ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS address_proof_data TEXT",
            "ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS disability_proof_data TEXT",
            "ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        ];

        for (const query of queries) {
            await pool.query(query);
            console.log(`Executed: ${query}`);
        }

        console.log("Schema update complete!");
        process.exit(0);
    } catch (err) {
        console.error("Schema update failed:", err);
        process.exit(1);
    }
};

updateSchema();
