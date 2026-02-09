const { pool } = require('../config/db');

async function migrate() {
    try {
        console.log("Creating voter_sessions table...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS voter_sessions (
                session_id SERIAL PRIMARY KEY,
                voter_id VARCHAR(20), -- Can be linked to voters(id) or just store mobile/identifier
                token_hash VARCHAR(64) NOT NULL,
                device_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("✅ Migration successful: voter_sessions table created.");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        pool.end();
    }
}

migrate();
