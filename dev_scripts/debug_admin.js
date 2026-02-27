const { pool } = require('./config/db');
const { getAllAdmins } = require('./models/Admin');

const testAdmins = async () => {
    try {
        console.log("Testing getAllAdmins()...");
        const admins = await getAllAdmins();
        console.log("Success! Admins found:", admins.length);
        console.log(admins);
    } catch (err) {
        console.error("Error fetching admins:", err);
    } finally {
        pool.end();
    }
};

testAdmins();
