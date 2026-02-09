const { pool } = require('./config/db');
require('dotenv').config();

async function fixRegistrationTable() {
    try {
        console.log("=== Fixing Voter Registration Table ===\n");

        // Add ip_address column if it doesn't exist
        console.log("Adding 'ip_address' column...");
        const alterQuery = `
            ALTER TABLE voter_registrations 
            ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)
        `;

        await pool.query(alterQuery);
        console.log("✓ Added 'ip_address' column\n");

        // Verify the schema
        const schemaQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'voter_registrations'
            ORDER BY ordinal_position
        `;
        const result = await pool.query(schemaQuery);

        console.log("Current voter_registrations table schema:");
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        console.log("\n✅ Registration table schema is now complete!\n");
        console.log("🎉 Voter registration should work now!\n");

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

fixRegistrationTable();
