const { pool } = require('./config/db');

const fixSchema = async () => {
    try {
        console.log("Fixing admins table schema...");

        // Add full_name
        try {
            await pool.query("ALTER TABLE admins ADD COLUMN full_name VARCHAR(100)");
            console.log("Added column: full_name");
        } catch (err) {
            if (err.code === '42701') console.log("Column full_name already exists.");
            else console.error("Error adding full_name:", err.message);
        }

        // Add email
        try {
            await pool.query("ALTER TABLE admins ADD COLUMN email VARCHAR(255) UNIQUE");
            console.log("Added column: email");
        } catch (err) {
            if (err.code === '42701') console.log("Column email already exists.");
            else console.error("Error adding email:", err.message);
        }

        console.log("Schema fix complete.");
    } catch (err) {
        console.error("Fatal Schema Fix Error:", err);
    } finally {
        pool.end();
    }
};

fixSchema();
