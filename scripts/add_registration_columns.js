const { pool } = require('../config/db');

const migrate = async () => {
    try {
        console.log('Starting migration...');

        await pool.query(`
            ALTER TABLE voter_registrations 
            ADD COLUMN IF NOT EXISTS profile_image_data TEXT,
            ADD COLUMN IF NOT EXISTS dob_proof_data TEXT,
            ADD COLUMN IF NOT EXISTS address_proof_data TEXT,
            ADD COLUMN IF NOT EXISTS disability_proof_data TEXT;
        `);

        console.log('Migration successful: Added missing columns to voter_registrations.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
};

migrate();
