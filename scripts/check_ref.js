const { pool } = require('../config/db');

const checkRef = async () => {
    const refId = 'HDDPBJMWKK37';
    try {
        console.log(`Checking for Reference ID: ${refId}`);
        const res = await pool.query('SELECT * FROM voter_registrations WHERE reference_id = $1', [refId]);
        if (res.rows.length > 0) {
            console.log('Found:', res.rows[0]);
        } else {
            console.log('Not Found in voter_registrations');
        }

        const resVoter = await pool.query('SELECT * FROM voters WHERE reference_id = $1', [refId]);
        if (resVoter.rows.length > 0) {
            console.log('Found in voters:', resVoter.rows[0]);
        } else {
            console.log('Not Found in voters');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
};

checkRef();
