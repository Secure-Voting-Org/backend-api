
const { pool } = require('./config/db');

const migrate = async () => {
    try {
        console.log("Checking if email column exists in admins table...");

        // Check if column exists
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='admins' AND column_name='email';
        `;
        const { rows } = await pool.query(checkQuery);

        if (rows.length === 0) {
            console.log("Email column missing. Adding it now...");
            await pool.query('ALTER TABLE admins ADD COLUMN email VARCHAR(255) UNIQUE;');
            console.log("Email column added successfully.");
        } else {
            console.log("Email column already exists.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

migrate();
