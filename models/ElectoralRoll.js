const { pool } = require('../config/db');

// Create Electoral Roll Table
const createElectoralRollTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS electoral_roll (
            aadhaar_number VARCHAR(12) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(15) NOT NULL,
            constituency VARCHAR(100) NOT NULL,
            is_registered BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    await pool.query(query);
};

// Find by Aadhaar and Phone
const findCitizen = async (aadhaar, phone) => {
    const query = 'SELECT * FROM electoral_roll WHERE aadhaar_number = $1 AND phone = $2';
    const { rows } = await pool.query(query, [aadhaar, phone]); // pg returns { rows }
    return rows[0];
};

// Mark as Registered
const markAsRegistered = async (aadhaar) => {
    await pool.query('UPDATE electoral_roll SET is_registered = TRUE WHERE aadhaar_number = $1', [aadhaar]);
};

// Seed/Add Citizen (Internal/Seed use)
const addCitizen = async (citizen) => {
    const { aadhaar_number, name, phone, constituency } = citizen;
    const query = `INSERT INTO electoral_roll (aadhaar_number, name, phone, constituency) VALUES ($1, $2, $3, $4) ON CONFLICT (aadhaar_number) DO NOTHING`;
    await pool.query(query, [aadhaar_number, name, phone, constituency]);
};

module.exports = {
    createElectoralRollTable,
    findCitizen,
    markAsRegistered,
    addCitizen
};
