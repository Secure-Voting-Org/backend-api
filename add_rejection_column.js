const { pool } = require('./config/db');

const addColumn = async () => {
    try {
        await pool.query("ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS rejection_reason TEXT");
        console.log("Column rejection_reason added successfully.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

addColumn();
