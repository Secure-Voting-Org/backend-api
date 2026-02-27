const { pool } = require('./config/db');

const checkContent = async () => {
    try {
        const res = await pool.query("SELECT profile_image_data, address_proof_data FROM voter_registrations WHERE status = 'PENDING' LIMIT 1");
        if (res.rows.length > 0) {
            const row = res.rows[0];
            console.log("--- Profile Image Data (First 100 chars) ---");
            console.log(row.profile_image_data ? row.profile_image_data.substring(0, 100) : "NULL");

            console.log("\n--- Address Proof Data (First 100 chars) ---");
            console.log(row.address_proof_data ? row.address_proof_data.substring(0, 100) : "NULL");

            console.log("\n--- Type Check ---");
            console.log("Is Profile Object? ", typeof row.profile_image_data);
        } else {
            console.log("No pending rows found.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkContent();
