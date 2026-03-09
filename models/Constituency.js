const { pool } = require('../config/db');

// Create Constituency Table
const createConstituencyTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS constituencies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        district VARCHAR(100),
        state VARCHAR(100),
        voter_count INT DEFAULT 0
    )`;
    await pool.query(query);

    // Add missing columns for existing tables
    try {
        await pool.query('ALTER TABLE constituencies ADD COLUMN IF NOT EXISTS state VARCHAR(100)');
    } catch (err) { /* ignore */ }

    // Remove duplicates before adding UNIQUE constraint
    try {
        await pool.query(`
            DELETE FROM constituencies a USING constituencies b
            WHERE a.id > b.id AND a.name = b.name
        `);
    } catch (err) {
        console.error("Error removing duplicate constituencies:", err);
    }

    // Add UNIQUE constraint on name for existing tables that were created without it
    try {
        await pool.query('ALTER TABLE constituencies ADD CONSTRAINT constituencies_name_unique UNIQUE (name)');
        console.log("Added UNIQUE constraint to constituencies.name");
    } catch (err) { 
        // Constraint already exists or another error
    }

    console.log("Constituency table checked/created.");
};

// Add Constituency
const addConstituency = async (name, district, state) => {
    const { rows } = await pool.query(
        'INSERT INTO constituencies (name, district, state) VALUES ($1, $2, $3) RETURNING id',
        [name, district, state]
    );
    return rows[0].id;
};

// Get All Constituencies
const getAllConstituencies = async () => {
    const { rows } = await pool.query('SELECT * FROM constituencies');
    return rows;
};

// Delete Constituency
const deleteConstituency = async (id) => {
    await pool.query('DELETE FROM constituencies WHERE id = $1', [id]);
};

module.exports = { createConstituencyTable, addConstituency, getAllConstituencies, deleteConstituency };
