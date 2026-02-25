const { pool } = require('../config/db');

// Create Observers Table
const createObserverTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS observers (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL, -- Storing plain text for demo, should be hashed in prod
        full_name VARCHAR(100),
        email VARCHAR(100),
        role VARCHAR(20) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) `;
    await pool.query(query);
};

// Find Observer by Username
const findObserverByUsername = async (username) => {
    const query = 'SELECT * FROM observers WHERE username = $1';
    const { rows } = await pool.query(query, [username]);
    return rows[0];
};

// Find Observer by Email
const findObserverByEmail = async (email) => {
    const query = 'SELECT * FROM observers WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    return rows[0];
};

// Create Observer (for seeding or registration)
const createObserver = async (username, password, fullName, role = 'general', email) => {
    // Check if exists first
    const existing = await findObserverByUsername(username);
    if (existing) return;

    const query = 'INSERT INTO observers (username, password, full_name, role, email) VALUES ($1, $2, $3, $4, $5)';
    await pool.query(query, [username, password, fullName, role, email]);
    console.log(`Observer ${username} (${role}) created.`);
};

// Update Observer Password
const updateObserverPassword = async (username, newPassword) => {
    const query = 'UPDATE observers SET password = $1 WHERE username = $2';
    await pool.query(query, [newPassword, username]);
};

module.exports = { createObserverTable, findObserverByUsername, createObserver, updateObserverPassword, findObserverByEmail };
