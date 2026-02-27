const { pool } = require('./config/db');

async function setupObserver() {
    try {
        console.log("Creating observers table...\n");

        // Create table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS observers (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'general',
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;

        await pool.query(createTableQuery);
        console.log("✓ Observers table created/verified\n");

        // Check if observer1 exists
        const checkQuery = 'SELECT * FROM observers WHERE username = $1';
        const existing = await pool.query(checkQuery, ['observer1']);

        if (existing.rows.length > 0) {
            console.log("Observer1 already exists:");
            console.log(`  Username: ${existing.rows[0].username}`);
            console.log(`  Password: ${existing.rows[0].password}`);
            console.log(`  Full Name: ${existing.rows[0].full_name}`);
            console.log(`  Role: ${existing.rows[0].role}\n`);
        } else {
            // Create observer1
            const insertQuery = 'INSERT INTO observers (username, password, full_name, role, email) VALUES ($1, $2, $3, $4, $5)';
            await pool.query(insertQuery, ['observer1', 'securepass', 'Election Observer One', 'general', null]);
            console.log("✓ Observer1 created successfully!\n");
            console.log("Login credentials:");
            console.log("  Username: observer1");
            console.log("  Password: securepass\n");
        }

        pool.end();
    } catch (err) {
        console.error("Error:", err.message);
        pool.end();
    }
}

setupObserver();
