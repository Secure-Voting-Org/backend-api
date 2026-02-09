const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Try the default DB
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function testConnection() {
    console.log("Attempting to connect to 'postgres' DB with:");
    console.log("User:", process.env.DB_USER);
    console.log("Port:", process.env.DB_PORT || 5432);

    try {
        const client = await pool.connect();
        console.log("✓ Connection to 'postgres' DB Successful!");
        client.release();
    } catch (err) {
        console.error("✗ Connection Failed!");
        console.error("Error Code:", err.code);
        console.error("Error Message:", err.message);
    } finally {
        pool.end();
    }
}

testConnection();
