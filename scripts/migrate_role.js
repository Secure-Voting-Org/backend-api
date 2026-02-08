const { pool } = require('../config/db');

const migrate = async () => {
    try {
        const checkQuery = "SELECT column_name FROM information_schema.columns WHERE table_name='observers' AND column_name='role'";
        const { rows } = await pool.query(checkQuery);

        if (rows.length === 0) {
            console.log('Adding role column to observers table...');
            await pool.query("ALTER TABLE observers ADD COLUMN role VARCHAR(20) DEFAULT 'general'");
            console.log('Migration successful: role column added.');
        } else {
            console.log('Role column already exists.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
