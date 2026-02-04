const { pool } = require('../config/db');

// Create Voters Table if not exists
const createVoterTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS voters (
        id VARCHAR(20) PRIMARY KEY,
        reference_id VARCHAR(50) UNIQUE,
        status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
        
        -- Personal Details
        name VARCHAR(100) NOT NULL,
        surname VARCHAR(100),
        gender VARCHAR(20),
        dob VARCHAR(20),
        
        -- Meta
        constituency VARCHAR(100),
        face_descriptor JSON,
        
        -- Contact
        mobile VARCHAR(15),
        email VARCHAR(100),
        
        -- Address
        address TEXT,
        district VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        
        -- Family
        relative_name VARCHAR(100),
        relative_type VARCHAR(50), -- Father, Mother, etc.
        
        -- Disability
        disability_type VARCHAR(50),
        
        -- Documents (Base64 Storage)
        profile_image_data TEXT,
        dob_proof_data TEXT,
        address_proof_data TEXT,
        disability_proof_data TEXT,

        -- System
        has_voted BOOLEAN DEFAULT FALSE,
        retry_count INT DEFAULT 0,
        locked_until TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// ... (existing functions)

// Lockout Helpers
const incrementRetry = async (voterId) => {
    const query = 'UPDATE voters SET retry_count = retry_count + 1 WHERE id = $1 RETURNING retry_count';
    const { rows } = await pool.query(query, [voterId]);
    return rows[0].retry_count;
};

const lockAccount = async (voterId, durationMinutes) => {
    // interval syntax for postgres
    const query = `UPDATE voters SET locked_until = NOW() + interval '${durationMinutes} minutes' WHERE id = $1`;
    await pool.query(query, [voterId]);
};

const resetLocks = async (voterId) => {
    const query = 'UPDATE voters SET retry_count = 0, locked_until = NULL WHERE id = $1';
    await pool.query(query, [voterId]);
};

// Find Voter by ID
const findVoterById = async (voterId) => {
    const { rows } = await pool.query('SELECT * FROM voters WHERE id = $1', [voterId]);
    return rows[0];
};

// Find Voter by Reference ID
const findVoterByReferenceId = async (refId) => {
    const { rows } = await pool.query('SELECT * FROM voters WHERE reference_id = $1', [refId]);
    return rows[0];
};

// Create a new voter (Full Registration)
const createVoter = async (voter) => {
    const {
        id, reference_id, name, surname, gender, dob,
        constituency, face_descriptor,
        mobile, email,
        address, district, state, pincode,
        relative_name, relative_type,
        disability_type,
        profile_image_data, dob_proof_data, address_proof_data, disability_proof_data
    } = voter;

    const query = `
        INSERT INTO voters (
            id, reference_id, name, surname, gender, dob,
            constituency, face_descriptor,
            mobile, email,
            address, district, state, pincode,
            relative_name, relative_type,
            disability_type,
            profile_image_data, dob_proof_data, address_proof_data, disability_proof_data,
            status
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8,
            $9, $10,
            $11, $12, $13, $14,
            $15, $16,
            $17,
            $18, $19, $20, $21,
            'PENDING'
        )
    `;

    await pool.query(query, [
        id, reference_id, name, surname, gender, dob,
        constituency, JSON.stringify(face_descriptor),
        mobile, email,
        address, district, state, pincode,
        relative_name, relative_type,
        disability_type,
        profile_image_data, dob_proof_data, address_proof_data, disability_proof_data
    ]);
};

// Update Voter Face Descriptor
const updateVoterFace = async (voterId, faceDescriptor) => {
    const query = 'UPDATE voters SET face_descriptor = $1 WHERE id = $2';
    await pool.query(query, [JSON.stringify(faceDescriptor), voterId]);
};

module.exports = { createVoterTable, findVoterById, findVoterByReferenceId, createVoter, updateVoterFace, incrementRetry, lockAccount, resetLocks };
