const { pool } = require('./config/db');

async function debugTable() {
    try {
        console.log("Checking voters table columns...");
        // This query fetches column names for 'voters' table in PostgreSQL
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'voters';
        `);
        console.table(res.rows);
    } catch (err) {
        console.error("Error inspecting table:", err);
    } finally {
        pool.end();
    }
}

debugTable();
