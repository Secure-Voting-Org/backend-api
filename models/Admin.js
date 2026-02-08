const { pool } = require('../config/db');

// Create Admin Table
const createAdminTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL, -- Plain text for demo, use bcrypt in prod
        role VARCHAR(20) NOT NULL CHECK (role IN ('PRE_POLL', 'LIVE', 'POST_POLL')),
        full_name VARCHAR(100),
        email VARCHAR(255) UNIQUE
    )`;
    await pool.query(query);
    console.log("Admin table checked/created.");

    // Create OTP table for password recovery
    const otpQuery = `
    CREATE TABLE IF NOT EXISTS admin_otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
    )`;
    await pool.query(otpQuery);
    console.log("Admin OTP table checked/created.");

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

// Find Admin by Email
const findAdminByEmail = async (email) => {
    const { rows } = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    return rows[0];
};

// Create New Admin (Registration)
const createAdmin = async (fullName, email, username, password, role) => {
    const { rows } = await pool.query(
        'INSERT INTO admins (full_name, email, username, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [fullName, email, username, password, role]
    );
    return rows[0];
};

// Store OTP for Password Recovery
const storeOtp = async (email, otp) => {
    // Delete old OTPs for this email
    await pool.query('DELETE FROM admin_otps WHERE email = $1', [email]);

    // Store new OTP with 5 minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
        'INSERT INTO admin_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
        [email, otp, expiresAt]
    );
};

// Verify OTP
const verifyOtp = async (email, otp) => {
    const { rows } = await pool.query(
        'SELECT * FROM admin_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
        [email, otp]
    );
    return rows.length > 0;
};

// Update Admin Password
const updateAdminPassword = async (email, newPassword) => {
    await pool.query('UPDATE admins SET password = $1 WHERE email = $2', [newPassword, email]);
    // Delete used OTP
    await pool.query('DELETE FROM admin_otps WHERE email = $1', [email]);
};

module.exports = {
    createAdminTable,
    findAdminByUsername,
    findAdminByEmail,
    createAdmin,
    storeOtp,
    verifyOtp,
    updateAdminPassword
};
