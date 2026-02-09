const { pool } = require('./config/db');

async function fixObserverRole() {
    try {
        console.log("Fixing observer1 role...\n");

        // Update observer1 to have 'general' role
        const updateQuery = `UPDATE observers SET role = $1 WHERE username = $2`;
        await pool.query(updateQuery, ['general', 'observer1']);

        console.log("✓ Updated observer1 role to 'general'\n");

        // Verify the update
        const checkQuery = 'SELECT * FROM observers WHERE username = $1';
        const result = await pool.query(checkQuery, ['observer1']);

        if (result.rows.length > 0) {
            const obs = result.rows[0];
            console.log("Current observer1 data:");
            console.log(`  Username: ${obs.username}`);
            console.log(`  Password: ${obs.password}`);
            console.log(`  Full Name: ${obs.full_name}`);
            console.log(`  Role: ${obs.role}\n`);
            console.log("✅ You can now log in with:");
            console.log("   Username: observer1");
            console.log("   Password: securepass");
            console.log("   Role: General Observer");
        }

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

fixObserverRole();
