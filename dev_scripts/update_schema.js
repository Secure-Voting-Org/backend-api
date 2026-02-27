const { pool } = require('./config/db');

const updateSchema = async () => {
    try {
        console.log("Checking schema...");
        const checkQuery = "SELECT column_name FROM information_schema.columns WHERE table_name='voter_registrations' AND column_name='reference_id'";
        const { rows } = await pool.query(checkQuery);

        if (rows.length === 0) {
            console.log("Adding reference_id column to voter_registrations...");
            await pool.query("ALTER TABLE voter_registrations ADD COLUMN reference_id VARCHAR(50) UNIQUE");
            console.log("Column added successfully.");
        } else {
            console.log("Column reference_id already exists.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Schema Update Failed:", err);
        process.exit(1);
    }
};

updateSchema();
