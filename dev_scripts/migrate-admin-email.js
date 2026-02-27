const { pool } = require('./config/db');

async function migrateAdminEmail() {
    try {
        console.log('Starting migration: Adding email column to admins table...');

        // Add email column if it doesn't exist
        await pool.query(`
            ALTER TABLE admins 
            ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE
        `);

        console.log('✓ Email column added successfully');

        // Create admin_otps table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_otps (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                otp VARCHAR(6) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            )
        `);

        console.log('✓ Admin OTP table created successfully');
        console.log('Migration completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateAdminEmail();
