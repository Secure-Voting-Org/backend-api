const { pool } = require('../config/db');

const addPrevHashColumn = async () => {
    try {
        const query = `
            ALTER TABLE votes 
            ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64) DEFAULT '0000000000000000000000000000000000000000000000000000000000000000';
        `;
        await pool.query(query);
        console.log("Successfully added 'prev_hash' column to 'votes' table.");
    } catch (err) {
        console.error("Error adding column:", err);
    } finally {
        pool.end();
    }
};

addPrevHashColumn();
