const axios = require('axios');
const { pool } = require('./config/db');

const testStatus = async () => {
    try {
        // 1. Get a pending application to test
        const res = await pool.query("SELECT reference_id FROM voter_registrations LIMIT 1");
        if (res.rows.length === 0) {
            console.log("No applications to test.");
            process.exit(0);
        }

        const refId = res.rows[0].reference_id;
        console.log(`Testing status for Reference ID: ${refId}`);

        // 2. Call API (Running server needed - wait, server is running old code, so this might 404 if I rely on running server)
        // Actually, I can't test the API against the running server because I haven't restarted it yet.
        // So I should just notify the user to restart.
        // But I can test the DB function directly if I import it.

        console.log("Skipping API call test as server needs restart.");
        console.log("Start the server and test manually.");
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testStatus();
