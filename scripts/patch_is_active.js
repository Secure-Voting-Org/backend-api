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

        const tables = ['voter_sessions', 'admin_sessions', 'sysadmin_sessions', 'observer_sessions'];

        for (const table of tables) {
            console.log(`Patching ${table}...`);
            await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`);
            console.log(`✅ Added is_active to ${table}.`);
        }

        console.log('Database patched successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error patching database:', error);
        process.exit(1);
    }
};

patchDatabase();
