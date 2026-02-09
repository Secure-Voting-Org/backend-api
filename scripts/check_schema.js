const { pool } = require('../config/db');

const checkSchema = async () => {
    try {
        console.log("Checking schema for table 'votes'...");
        const res = await pool.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'votes';
        `);
        console.getTable(res.rows);
        process.exit(0);
    } catch (err) {
        console.error("Error checking schema:", err);
        process.exit(1);
    }
};

// Add console.getTable polyfill if needed for node
console.getTable = (rows) => {
    if (!rows || rows.length === 0) {
        console.log("No results found.");
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
}

checkSchema();
