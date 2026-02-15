const { pool } = require('../config/db');

const migrate = async () => {
    try {
        console.log('Starting migration for rejection_reason...');

        await pool.query(`
            ALTER TABLE voter_registrations 
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        `);

        console.log('Migration successful: Added rejection_reason to voter_registrations.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
};

migrate();
