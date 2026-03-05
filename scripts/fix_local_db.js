require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'SecureVote',
    port: process.env.DB_PORT || 5432,
});

const patchDatabase = async () => {
    try {
        console.log('Connecting to Local PostgreSQL instance...');

        // 1. Add email column to observers table
        console.log('Patching observers table...');
        await pool.query(`ALTER TABLE observers ADD COLUMN IF NOT EXISTS email VARCHAR(100);`);
        console.log('✅ Added email column to observers table (if it did not exist).');

        // 2. Create voter_sessions table
        console.log('Creating voter_sessions table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS voter_sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                voter_id VARCHAR(50) NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
                device_hash VARCHAR(255) NOT NULL,
                token VARCHAR(500) NOT NULL,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address VARCHAR(45)
            );
        `);
        console.log('✅ Created voter_sessions table.');

        console.log('Database patched successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error patching database:', error);
        process.exit(1);
    }
};

patchDatabase();
