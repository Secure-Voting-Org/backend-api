const { pool } = require('./config/db');

const checkPending = async () => {
    try {
        const res = await pool.query("SELECT COUNT(*) FROM voter_registrations WHERE status = 'PENDING'");
        console.log("Pending Count:", res.rows[0].count);

        if (parseInt(res.rows[0].count) === 0) {
            console.log("No pending registrations found. Inserting a mock record...");
            const mock = `
                INSERT INTO voter_registrations 
                (reference_id, aadhaar_number, full_name, relative_name, relative_type, state, district, constituency, dob, gender, mobile, email, address, disability_details, status, created_at)
                VALUES 
                ('REF123TEST99', '123456789012', 'Demo User', 'Father Name', 'Father', 'Andhra Pradesh', 'Visakhapatnam', 'Bheemili', '01/01/1990', 'Male', '9876543210', 'demo@test.com', '123 Test St, Vizag', 'None', 'PENDING', NOW())
            `;
            await pool.query(mock);
            console.log("Mock record inserted.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkPending();
