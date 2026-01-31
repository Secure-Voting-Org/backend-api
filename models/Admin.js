const { mysqlPool } = require('../config/db');

// Create Admin Table
const createAdminTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL, -- Plain text for demo, use bcrypt in prod
        role ENUM('PRE_POLL', 'LIVE', 'POST_POLL') NOT NULL,
        full_name VARCHAR(100)
    )`;
    await mysqlPool.execute(query);
    console.log("Admin table checked/created.");
    await seedAdmins();
};

// Seed Default Admins
const seedAdmins = async () => {
    const admins = [
        { username: 'pre_admin', password: 'admin123', role: 'PRE_POLL', full_name: 'Pre-Poll Officer' },
        { username: 'live_admin', password: 'admin123', role: 'LIVE', full_name: 'Live Election Controller' },
        { username: 'post_admin', password: 'admin123', role: 'POST_POLL', full_name: 'Returning Officer' }
    ];

    for (const admin of admins) {
        const [rows] = await mysqlPool.execute('SELECT * FROM admins WHERE username = ?', [admin.username]);
        if (rows.length === 0) {
            await mysqlPool.execute('INSERT INTO admins (username, password, role, full_name) VALUES (?, ?, ?, ?)',
                [admin.username, admin.password, admin.role, admin.full_name]);
            console.log(`Seeded admin: ${admin.username}`);
        }
    }
};

// Find Admin by Username
const findAdminByUsername = async (username) => {
    const [rows] = await mysqlPool.execute('SELECT * FROM admins WHERE username = ?', [username]);
    return rows[0];
};

module.exports = { createAdminTable, findAdminByUsername };
