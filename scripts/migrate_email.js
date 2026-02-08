const { pool } = require('../config/db');

const migrateEmail = async () => {
    try {
        const query = `
            ALTER TABLE observers 
            ADD COLUMN IF NOT EXISTS email VARCHAR(255);
        `;
        await pool.query(query);
        console.log("Successfully added 'email' column to 'observers' table.");
    } catch (err) {
        console.error("Migration Failed:", err);
    } finally {
        pool.end();
    }
};

migrateEmail();
