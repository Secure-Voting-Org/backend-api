const { pool } = require('../config/db');

// Create SysAdmin Table
const createSysAdminTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS sys_admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL, -- Plain text for demo
        full_name VARCHAR(100),
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
    console.log("SysAdmin table checked/created.");

    await seedSysAdmins();
};

// Seed Default SysAdmin
const seedSysAdmins = async () => {
    const admins = [
        { username: 'sys_admin', password: 'sysadmin123', full_name: 'System Administrator' }
    ];

    for (const admin of admins) {
        const { rows } = await pool.query('SELECT * FROM sys_admins WHERE username = $1', [admin.username]);
        if (rows.length === 0) {
            await pool.query('INSERT INTO sys_admins (username, password, full_name) VALUES ($1, $2, $3)',
                [admin.username, admin.password, admin.full_name]);
            console.log(`Seeded sys_admin: ${admin.username}`);
        }
    }
};

// Find SysAdmin by Username
const findSysAdminByUsername = async (username) => {
    const { rows } = await pool.query('SELECT * FROM sys_admins WHERE username = $1', [username]);
    return rows[0];
};

// Create New SysAdmin
const createSysAdmin = async (fullName, email, username, password) => {
    const { rows } = await pool.query(
        'INSERT INTO sys_admins (full_name, email, username, password) VALUES ($1, $2, $3, $4) RETURNING *',
        [fullName, email, username, password]
    );
    return rows[0];
};

// Update SysAdmin Password
const updateSysAdminPassword = async (username, newPassword) => {
    const { rowCount } = await pool.query(
        'UPDATE sys_admins SET password = $1 WHERE username = $2',
        [newPassword, username]
    );
    return rowCount > 0;
};

module.exports = {
    createSysAdminTable,
    seedSysAdmins,
    findSysAdminByUsername,
    createSysAdmin,
    updateSysAdminPassword
};
