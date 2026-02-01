const { pool } = require('../config/db');

// Create Constituency Table
const createConstituencyTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS constituencies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        district VARCHAR(100),
        voter_count INT DEFAULT 0
    )`;
    await pool.query(query);
    console.log("Constituency table checked/created.");
};

// Add Constituency
const addConstituency = async (name, district) => {
    const { rows } = await pool.query(
        'INSERT INTO constituencies (name, district) VALUES ($1, $2) RETURNING id',
        [name, district]
    );
    return rows[0].id;
};

// Get All Constituencies
const getAllConstituencies = async () => {
    const { rows } = await pool.query('SELECT * FROM constituencies');
    return rows;
};

module.exports = { createConstituencyTable, addConstituency, getAllConstituencies };
