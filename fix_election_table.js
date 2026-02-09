const { pool } = require('./config/db');
require('dotenv').config();

async function fixElectionTable() {
    try {
        console.log("=== Fixing Election Table ===\n");

        // Check both tables
        const checkElection = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'election'");
        const checkElectionConfig = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'election_config'");

        console.log(`'election' table exists: ${checkElection.rows.length > 0}`);
        console.log(`'election_config' table exists: ${checkElectionConfig.rows.length > 0}\n`);

        // Create election_config if it doesn't exist
        if (checkElectionConfig.rows.length === 0) {
            console.log("Creating 'election_config' table...");
            const createQuery = `
                CREATE TABLE IF NOT EXISTS election_config (
                    id INT PRIMARY KEY DEFAULT 1,
                    phase VARCHAR(20) DEFAULT 'PRE_POLL' CHECK (phase IN ('PRE_POLL', 'LIVE', 'POST_POLL')),
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    is_kill_switch_active BOOLEAN DEFAULT FALSE,
                    CONSTRAINT single_row CHECK (id = 1)
                )`;
            await pool.query(createQuery);
            console.log("✓ Created 'election_config' table\n");
        }

        // Check if record exists
        const checkRecord = await pool.query('SELECT * FROM election_config WHERE id = 1');

        if (checkRecord.rows.length === 0) {
            console.log("Inserting LIVE election config...");
            await pool.query("INSERT INTO election_config (id, phase, is_kill_switch_active) VALUES (1, 'LIVE', FALSE)");
            console.log("✓ Election config set to LIVE\n");
        } else {
            const current = checkRecord.rows[0];
            console.log(`Current election_config:`);
            console.log(`  Phase: ${current.phase}`);
            console.log(`  Kill Switch: ${current.is_kill_switch_active}\n`);

            if (current.phase !== 'LIVE') {
                console.log("Updating to LIVE phase...");
                await pool.query("UPDATE election_config SET phase = 'LIVE' WHERE id = 1");
                console.log("✓ Updated to LIVE\n");
            }
        }

        // Final verification
        const final = await pool.query('SELECT * FROM election_config WHERE id = 1');
        console.log("=== Final Status ===");
        console.log(`Phase: ${final.rows[0].phase}`);
        console.log(`Kill Switch: ${final.rows[0].is_kill_switch_active}`);
        console.log("\n✅ You can now vote!\n");

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

fixElectionTable();
