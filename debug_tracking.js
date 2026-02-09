const { pool } = require('./config/db');

const checkRef = async () => {
    const refId = '2AAIGKC18WAU';
    console.log(`Checking DB for Reference ID: ${refId}`);

    try {
        const resReg = await pool.query("SELECT * FROM voter_registrations WHERE reference_id = $1", [refId]);
        if (resReg.rows.length > 0) {
            console.log("Found in Pending/Rejected Registrations:");
            console.log(resReg.rows[0].status);
        } else {
            console.log("Not found in Pending Registrations.");
        }

        const resVoter = await pool.query("SELECT * FROM voters WHERE reference_id = $1", [refId]);
        if (resVoter.rows.length > 0) {
            console.log("Found in Approved Voters:");
            console.log(resVoter.rows[0].status);
        } else {
            console.log("Not found in Approved Voters.");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkRef();
