const { pool } = require('../config/db');

const migrate = async () => {
    try {
        console.log('Starting migration for nfc_tag_id...');

        await pool.query(`
            ALTER TABLE voters 
            ADD COLUMN IF NOT EXISTS nfc_tag_id VARCHAR(50) UNIQUE;
        `);

        console.log('Migration successful: Added nfc_tag_id to voters.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
};

migrate();
