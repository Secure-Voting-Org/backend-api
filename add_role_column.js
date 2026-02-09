const { pool } = require('./config/db');

async function addRoleColumn() {
    try {
        console.log("Adding role column to observers table...\n");

        // Add role column if it doesn't exist
        const alterQuery = `
            ALTER TABLE observers 
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'general'
        `;

        await pool.query(alterQuery);
        console.log("✓ Role column added successfully\n");

        // Update existing observers to have 'general' role
        const updateQuery = `UPDATE observers SET role = 'general' WHERE role IS NULL`;
        await pool.query(updateQuery);
        console.log("✓ Updated existing observers to have 'general' role\n");

        // Verify
        const checkQuery = 'SELECT * FROM observers WHERE username = $1';
        const result = await pool.query(checkQuery, ['observer1']);

        if (result.rows.length > 0) {
            const obs = result.rows[0];
            console.log("Observer1 updated credentials:");
            console.log(`  Username: ${obs.username}`);
            console.log(`  Password: ${obs.password}`);
            console.log(`  Full Name: ${obs.full_name}`);
            console.log(`  Role: ${obs.role}\n`);
            console.log("✅ Login credentials:");
            console.log("   Username: observer1");
            console.log("   Password: securepass");
            console.log("   Role: General Observer\n");
        }

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

addRoleColumn();
