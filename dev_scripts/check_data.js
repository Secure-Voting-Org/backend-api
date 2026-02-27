const { pool } = require('./config/db');

(async () => {
    try {
        console.log("Checking DB Counts...");

        const adminRes = await pool.query('SELECT COUNT(*) FROM admins');
        console.log(`Admins: ${adminRes.rows[0].count}`);

        const voterRes = await pool.query('SELECT COUNT(*) FROM voters');
        console.log(`Voters: ${voterRes.rows[0].count}`);

        // Assuming table is 'logs' or 'audit_logs' - will check file first but guessing 'logs' based on usage
        const logRes = await pool.query('SELECT COUNT(*) FROM logs');
        console.log(`Logs: ${logRes.rows[0].count}`);

    } catch (err) {
        console.error("DB Check Failed:", err.message);
    } finally {
        process.exit();
    }
})();
