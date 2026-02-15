const { pool } = require('../config/db');

async function clearData() {
    try {
        console.log("Starting data cleanup...");

        // Determine if we need to clear other related tables (like logs, voter_auth)
        // User requested: voters, votes, registration
        // 'voter_registrations' depends on 'voters' (sometimes)
        // 'votes' depends on 'voters' (sometimes)
        // 'voter_auth' likely depends on nothing or is standalone.
        // To be safe and thorough for a "workflow verification", we should probably clear auth too if they want to re-register.
        // However, I will strictly follow "voters, votes, registration" first, but use CASCADE.

        // Truncate tables
        // voter_registrations references voters (voter_id)
        // votes might reference voters

        const tables = ['voter_registrations', 'votes', 'voters'];

        console.log(`Truncating tables: ${tables.join(', ')}...`);

        // Using CASCADE to handle all foreign key constraints automatically
        await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);

        console.log("✅ Data cleared successfully.");
    } catch (err) {
        console.error("❌ Error clearing data:", err);
    } finally {
        await pool.end();
    }
}

clearData();
