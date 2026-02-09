const { pool } = require('./config/db');
require('dotenv').config();

async function checkAndResetTokens() {
    try {
        console.log("=== Checking Voter Token Status ===\n");

        // Check voters table schema
        const schemaQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'voters' AND column_name = 'is_token_issued'
        `;
        const schemaResult = await pool.query(schemaQuery);

        if (schemaResult.rows.length === 0) {
            console.log("⚠️ Column 'is_token_issued' does NOT exist in voters table!");
            console.log("   Adding the column now...\n");

            await pool.query('ALTER TABLE voters ADD COLUMN IF NOT EXISTS is_token_issued BOOLEAN DEFAULT FALSE');
            console.log("✓ Added 'is_token_issued' column\n");
        } else {
            console.log("✓ Column 'is_token_issued' exists\n");
        }

        // Check how many voters have tokens issued
        const countQuery = 'SELECT COUNT(*) as count FROM voters WHERE is_token_issued = TRUE';
        const countResult = await pool.query(countQuery);
        console.log(`Voters with tokens issued: ${countResult.rows[0].count}\n`);

        // Show voters with tokens
        const votersQuery = 'SELECT id, name, is_token_issued FROM voters WHERE is_token_issued = TRUE LIMIT 10';
        const votersResult = await pool.query(votersQuery);

        if (votersResult.rows.length > 0) {
            console.log("Voters with tokens issued:");
            votersResult.rows.forEach(v => {
                console.log(`  - ${v.id}: ${v.name} (token issued: ${v.is_token_issued})`);
            });
            console.log();
        }

        // Ask user for voter ID to reset
        console.log("To reset a specific voter's token, you can run:");
        console.log("  UPDATE voters SET is_token_issued = FALSE WHERE id = 'VOTER_ID';\n");

        // For testing, reset ALL tokens (use with caution!)
        console.log("⚠️ Resetting ALL voter tokens...");
        const resetQuery = 'UPDATE voters SET is_token_issued = FALSE';
        const resetResult = await pool.query(resetQuery);
        console.log(`✓ Reset ${resetResult.rowCount} voter token flags\n`);

        console.log("✅ All voters can now request voting tokens!\n");

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

checkAndResetTokens();
