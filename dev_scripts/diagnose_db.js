const { pool } = require('./config/db');
require('dotenv').config();

async function diagnoseTables() {
    try {
        console.log("=== DATABASE DIAGNOSTICS ===\n");
        console.log(`Database: ${process.env.DB_NAME}`);
        console.log(`Host: ${process.env.DB_HOST}`);
        console.log(`Port: ${process.env.DB_PORT}\n`);

        // List all tables in current database
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;

        const result = await pool.query(tablesQuery);
        console.log(`Found ${result.rows.length} tables:\n`);
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.table_name}`);
        });

        // Check if observers table exists
        const hasObservers = result.rows.some(row => row.table_name === 'observers');

        if (hasObservers) {
            console.log("\n✓ Observers table exists!");

            // Get observer data
            const observersData = await pool.query('SELECT * FROM observers');
            console.log(`\nObservers count: ${observersData.rows.length}\n`);

            observersData.rows.forEach((obs, idx) => {
                console.log(`Observer ${idx + 1}:`);
                console.log(`  ID: ${obs.id}`);
                console.log(`  Username: ${obs.username}`);
                console.log(`  Password: ${obs.password}`);
                console.log(`  Full Name: ${obs.full_name}`);
                console.log(`  Role: ${obs.role}`);
                console.log(`  Email: ${obs.email || 'N/A'}\n`);
            });
        } else {
            console.log("\n❌ Observers table NOT found!");
        }

        pool.end();
    } catch (err) {
        console.error("Error:", err);
        pool.end();
    }
}

diagnoseTables();
