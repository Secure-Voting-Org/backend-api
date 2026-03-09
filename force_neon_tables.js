require('dotenv').config();
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_nYgvDBq1G8bh@ep-divine-morning-aibkw8y4-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }, // Crucial for Neon
    connectionTimeoutMillis: 10000,
});

async function createSessions() {
    let client;
    try {
        console.log('Connecting to Neon DB...');
        client = await pool.connect();

        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS voter_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                voter_id VARCHAR(255) REFERENCES voters(mobile) ON DELETE CASCADE,
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
        console.log('✓ voter_sessions table created');

        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
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
        console.log('✓ admin_sessions table created');

        await client.query(`
            CREATE TABLE IF NOT EXISTS sysadmin_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sysadmin_id INTEGER REFERENCES sys_admins(id) ON DELETE CASCADE,
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
        console.log('✓ sysadmin_sessions table created');

        await client.query(`
            CREATE TABLE IF NOT EXISTS observer_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                observer_id INTEGER REFERENCES observers(id) ON DELETE CASCADE,
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
        console.log('✓ observer_sessions table created');

        await client.query('COMMIT');
        console.log('✅ Success! All session tables exist in the Production DB.');
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('❌ Error creating tables:', err);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

createSessions();
