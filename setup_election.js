const { pool } = require('./config/db');
require('dotenv').config();

async function setupElection() {
    try {
        console.log("=== Setting up Election Table ===\n");

        // Create election table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS election (
                id SERIAL PRIMARY KEY,
                phase VARCHAR(20) DEFAULT 'SETUP',
                is_kill_switch_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;

        await pool.query(createTableQuery);
        console.log("✓ Election table created\n");

        // Check if election record exists
        const checkQuery = 'SELECT * FROM election LIMIT 1';
        const existing = await pool.query(checkQuery);

        if (existing.rows.length === 0) {
            // Insert initial election record with LIVE phase
            const insertQuery = `
                INSERT INTO election (phase, is_kill_switch_active) 
                VALUES ('LIVE', FALSE)`;
            await pool.query(insertQuery);
            console.log("✓ Election initialized with PHASE: LIVE\n");
        } else {
            const current = existing.rows[0];
            console.log(`Current Election Status:`);
            console.log(`  Phase: ${current.phase}`);
            console.log(`  Kill Switch: ${current.is_kill_switch_active}\n`);

            // Update to LIVE if not already
            if (current.phase !== 'LIVE') {
                const updateQuery = `UPDATE election SET phase = 'LIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
                await pool.query(updateQuery, [current.id]);
                console.log("✓ Updated election phase to LIVE\n");
            }
        }

        // Verify final state
        const verify = await pool.query('SELECT * FROM election LIMIT 1');
        const final = verify.rows[0];

        console.log("=== Election Ready ===");
        console.log(`Phase: ${final.phase}`);
        console.log(`Kill Switch Active: ${final.is_kill_switch_active}`);
        console.log("\n✅ Voting is now enabled!\n");

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

setupElection();
