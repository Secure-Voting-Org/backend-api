const { pool } = require('../config/db');

const checkRegistrations = async () => {
    try {
        console.log('Checking recent registrations...');
        const res = await pool.query('SELECT reference_id, full_name, status, created_at FROM voter_registrations ORDER BY created_at DESC LIMIT 5');
        console.log("Recent Registrations:");
        res.rows.forEach(row => {
            console.log(`RefID: '${row.reference_id}', Name: '${row.full_name}', Status: '${row.status}'`);
        });
    } catch (err) {
        console.error('Error fetching registrations:', err);
    } finally {
        process.exit();
    }
};

checkRegistrations();
