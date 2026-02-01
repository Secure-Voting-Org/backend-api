const { pool } = require('../config/db');

// Create Observers Table
const createObserverTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS observers (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL, -- Storing plain text for demo, should be hashed in prod
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// Find Observer by Username
const findObserverByUsername = async (username) => {
    const query = 'SELECT * FROM observers WHERE username = $1';
    const { rows } = await pool.query(query, [username]);
    return rows[0];
};

// Create Observer (for seeding)
const createObserver = async (username, password, fullName) => {
    // Check if exists first
    const existing = await findObserverByUsername(username);
    if (existing) return;

    const query = 'INSERT INTO observers (username, password, full_name) VALUES ($1, $2, $3)';
    await pool.query(query, [username, password, fullName]);
    console.log(`Observer ${username} created.`);
};

module.exports = { createObserverTable, findObserverByUsername, createObserver };
