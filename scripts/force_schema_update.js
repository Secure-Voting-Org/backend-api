const { pool } = require('../config/db');

const forceMigrate = async () => {
    console.log("=== Staring FORCE Schema Update ===");
    try {
        // 1. Check current schema
        console.log("Checking current schema...");
        const res = await pool.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'votes';
        `);
        console.table(res.rows);

        // 2. FORCE Update voter_id
        console.log("Attempting to ALTER voter_id to TEXT...");
        await pool.query('ALTER TABLE votes ALTER COLUMN voter_id TYPE TEXT;');
        console.log("SUCCESS: voter_id is now TEXT");

        // 3. FORCE Update candidate_id
        console.log("Attempting to ALTER candidate_id to TEXT...");
        await pool.query('ALTER TABLE votes ALTER COLUMN candidate_id TYPE TEXT USING candidate_id::text;');
        console.log("SUCCESS: candidate_id is now TEXT");

        console.log("=== Migration Completed ===");
        process.exit(0);

    } catch (err) {
        console.error("!!! MIGRATION FAILED !!!");
        console.error(err);
        process.exit(1);
    }
};

forceMigrate();
