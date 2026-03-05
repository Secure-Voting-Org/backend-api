require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'SecureVote',
    port: process.env.DB_PORT || 5432,
});

async function recreateVoterSessions() {
    console.log("Re-creating voter_sessions table to exactly match the other auth tables...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Drop the old wrongly structured table
        await client.query('DROP TABLE IF EXISTS voter_sessions CASCADE;');

        // Create the correct one
        await client.query(`
            CREATE TABLE voter_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                voter_id VARCHAR(50) REFERENCES voters(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                device_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            );
        `);

        await client.query('COMMIT');
        console.log("✅ Voter sessions table created with correct 'token_hash' and 'user_agent' columns.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error recreating voter sessions table:", err);
    } finally {
        client.release();
        process.exit();
    }
}

recreateVoterSessions();
