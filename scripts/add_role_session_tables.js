require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../config/db');

async function createRoleSessionTables() {
    console.log("Creating session tables for Admin, SysAdmin, and Observer...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Observer Sessions table
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

        // Admin Sessions table
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

        // SysAdmin Sessions table
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

        await client.query('COMMIT');
        console.log("✅ Session tables successfully created.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error creating session tables:", err);
    } finally {
        client.release();
        process.exit();
    }
}

createRoleSessionTables();
