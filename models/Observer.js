const { pool } = require('../config/db');

// Create Observers Table
const createObserverTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS observers (
        id SERIAL PRIMARY KEY,
        mobile_number VARCHAR(15) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL, -- Storing plain text for demo, should be hashed in prod
        full_name VARCHAR(100),
        email VARCHAR(100),
        role VARCHAR(20) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) `;
    await pool.query(query);
};

// Find Observer by Mobile Number
const findObserverByMobile = async (mobileNumber) => {
    const query = 'SELECT * FROM observers WHERE mobile_number = $1';
    const { rows } = await pool.query(query, [mobileNumber]);
    return rows[0];
};

// Find Observer by Email
const findObserverByEmail = async (email) => {
    const query = 'SELECT * FROM observers WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    return rows[0];
};

// Create Observer (for seeding or registration)
const createObserver = async (mobileNumber, password, fullName, role = 'general', email) => {
    // Check if exists first
    const existing = await findObserverByMobile(mobileNumber);
    if (existing) return;

    const query = 'INSERT INTO observers (mobile_number, password, full_name, role, email) VALUES ($1, $2, $3, $4, $5)';
    await pool.query(query, [mobileNumber, password, fullName, role, email]);
    console.log(`Observer ${mobileNumber} (${role}) created.`);
};

// Update Observer Password
const updateObserverPassword = async (mobileNumber, newPassword) => {
    const query = 'UPDATE observers SET password = $1 WHERE mobile_number = $2';
    await pool.query(query, [newPassword, mobileNumber]);
};

module.exports = { createObserverTable, findObserverByMobile, createObserver, updateObserverPassword, findObserverByEmail };
