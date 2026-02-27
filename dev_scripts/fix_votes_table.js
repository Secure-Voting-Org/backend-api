const { pool } = require('./config/db');
require('dotenv').config();

async function fixVotesTable() {
    try {
        console.log("=== Fixing Votes Table Schema ===\n");

        // Add prev_hash column if it doesn't exist
        console.log("Adding 'prev_hash' column to votes table...");
        const alterQuery = `
            ALTER TABLE votes 
            ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64)
        `;

        await pool.query(alterQuery);
        console.log("✓ Added 'prev_hash' column\n");

        // Verify the schema
        const schemaQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'votes'
            ORDER BY ordinal_position
        `;
        const result = await pool.query(schemaQuery);

        console.log("Current votes table schema:");
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        console.log("\n✅ Votes table schema is now complete!\n");
        console.log("🎉 You should be able to vote successfully now!\n");

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

fixVotesTable();
