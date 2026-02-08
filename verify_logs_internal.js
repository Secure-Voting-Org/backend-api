require('dotenv').config(); // Loads .env from current dir

const { pool } = require('./config/db');
const { createLogTable, createLog, getAllLogs } = require('./models/Log');

(async () => {
    try {
        console.log('Checking connection...');
        const client = await pool.connect();
        console.log('Connected to DB.');
        client.release();

        console.log('Checking for logs table...');
        try {
            await pool.query('SELECT * FROM logs LIMIT 1');
            console.log('Logs table exists.');
        } catch (err) {
            console.log('Logs table does NOT exist or query failed:', err.message);
            // We can try to create it if missing, to see if that fixes it
            console.log('Attempting to create table...');
            await createLogTable();
            console.log('Table created.');
        }

        console.log('Inserting test log...');
        await createLog({
            event: 'TEST_LOG',
            user_id: 'system',
            details: { message: 'verification test' },
            ip_address: '127.0.0.1'
        });
        console.log('Log inserted.');

        console.log('Reading logs...');
        const logs = await getAllLogs(); // Remove filter to see all
        console.log('Total Logs found:', logs.length);
        if (logs.length > 0) {
            console.log('Latest log:', logs[0]);
        } else {
            console.log('No logs found despite insertion.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
