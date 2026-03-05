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
        console.log('✅ Added email column to observers table.');

        console.log('Database patched successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error patching database:', error);
        process.exit(1);
    }
};

patchDatabase();
