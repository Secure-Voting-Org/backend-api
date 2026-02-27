const { pool } = require('./config/db');

async function checkObservers() {
    try {
        console.log("Checking Observers in database...\n");
        const result = await pool.query('SELECT id, username, password, full_name, role FROM observers');

        if (result.rows.length === 0) {
            console.log("❌ No observers found in database!");
        } else {
            console.log(`✓ Found ${result.rows.length} observer(s):\n`);
            result.rows.forEach((observer, index) => {
                console.log(`${index + 1}. Username: ${observer.username}`);
                console.log(`   Password: ${observer.password}`);
                console.log(`   Full Name: ${observer.full_name}`);
                console.log(`   Role: ${observer.role}`);
                console.log(`   ID: ${observer.id}\n`);
            });
        }

        pool.end();
    } catch (err) {
        console.error("Database error:", err.message);
        pool.end();
    }
}

checkObservers();
