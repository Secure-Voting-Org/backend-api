const { pool } = require('../config/db');

// Create Admin Table
const createAdminTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL, -- Plain text for demo, use bcrypt in prod
        role VARCHAR(20) NOT NULL CHECK (role IN ('PRE_POLL', 'LIVE', 'POST_POLL')),
        full_name VARCHAR(100)
    )`;
    await pool.query(query);
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
        const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [admin.username]);
        if (rows.length === 0) {
            await pool.query('INSERT INTO admins (username, password, role, full_name) VALUES ($1, $2, $3, $4)',
                [admin.username, admin.password, admin.role, admin.full_name]);
            console.log(`Seeded admin: ${admin.username}`);
        }
    }
};

// Find Admin by Username
const findAdminByUsername = async (username) => {
    const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    return rows[0];
};

module.exports = { createAdminTable, findAdminByUsername };
