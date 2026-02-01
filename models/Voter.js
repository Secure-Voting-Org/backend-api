const { pool } = require('../config/db');

// Create Voters Table if not exists
const createVoterTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS voters (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        constituency VARCHAR(100),
        face_descriptor JSON, -- storing 128-float vector as JSON array
        has_voted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// Find Voter by ID
const findVoterById = async (voterId) => {
    const { rows } = await pool.query('SELECT * FROM voters WHERE id = $1', [voterId]);
    return rows[0];
};

// Create a new voter (for seeding/admin use)
const createVoter = async (voter) => {
    const { id, name, constituency, face_descriptor } = voter;
    const query = 'INSERT INTO voters (id, name, constituency, face_descriptor) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [id, name, constituency, JSON.stringify(face_descriptor)]);
};

// Update Voter Face Descriptor
const updateVoterFace = async (voterId, faceDescriptor) => {
    const query = 'UPDATE voters SET face_descriptor = $1 WHERE id = $2';
    await pool.query(query, [JSON.stringify(faceDescriptor), voterId]);
};

module.exports = { createVoterTable, findVoterById, createVoter, updateVoterFace };
