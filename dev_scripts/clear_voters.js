require('dotenv').config();
const { pool } = require('./config/db');

const clearVoters = async () => {
    const client = await pool.connect();
    try {
        console.log("Clearing Voters table...");
        await client.query('BEGIN');

        // 1. Unlink or Clear Registrations
        // If we want to keep the registrations but just remove the 'Approved' voter status:
        console.log("Resetting linked registrations to PENDING...");
        await client.query("UPDATE voter_registrations SET status = 'PENDING', voter_id = NULL WHERE voter_id IS NOT NULL");

        // 2. Delete Voters
        console.log("Deleting all records from voters table...");
        const res = await client.query("DELETE FROM voters");

        await client.query('COMMIT');
        console.log(`Successfully deleted ${res.rowCount} voters.`);
        console.log("Any linked registrations have been reset to PENDING status.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error clearing voters:", err);
    } finally {
        client.release();
        process.exit();
    }
};

clearVoters();
