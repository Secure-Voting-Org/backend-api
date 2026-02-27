const { pool } = require('./config/db');

const fixSchema = async () => {
    console.log("Attempting to fix database schema...");
    try {
        // Fix: Add reference_id if missing
        await pool.query(`
            ALTER TABLE voters 
            ADD COLUMN IF NOT EXISTS reference_id VARCHAR(50) UNIQUE;
        `);
        console.log("Verified/Added 'reference_id' column.");

        // Fix: Add status if missing
        await pool.query(`
            ALTER TABLE voters 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';
        `);
        console.log("Verified/Added 'status' column.");

        // Fix: Add face_descriptor if missing
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS face_descriptor JSON;`);

        // Fix: Add all other missing personal/meta columns
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS surname VARCHAR(100);`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS gender VARCHAR(20);`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS dob VARCHAR(20);`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS mobile VARCHAR(15);`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS email VARCHAR(100);`);

        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS address TEXT;`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS district VARCHAR(100);`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS state VARCHAR(100);`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);`);

        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS relative_name VARCHAR(100);`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS relative_type VARCHAR(50);`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS disability_type VARCHAR(50);`);

        // Documents
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS profile_image_data TEXT;`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS dob_proof_data TEXT;`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS address_proof_data TEXT;`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS disability_proof_data TEXT;`);

        // System
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP DEFAULT NULL;`);
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

        console.log("Schema Fix Complete!");
        process.exit(0);
    } catch (err) {
        console.error("Schema Fix Failed:", err);
        process.exit(1);
    }
};

fixSchema();
