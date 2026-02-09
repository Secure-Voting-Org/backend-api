const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function testConnection() {
    console.log("Attempting to connect with:");
    console.log("User:", process.env.DB_USER);
    console.log("Host:", process.env.DB_HOST);
    console.log("DB:", process.env.DB_NAME);
    console.log("Port:", process.env.DB_PORT || 5432);
    // Not printing password for security, but we know it's Sandeep0512 from .env

    try {
        const client = await pool.connect();
        console.log("✓ Connection Successful!");
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
