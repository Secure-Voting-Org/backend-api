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

// Create Registration Details Table (Full Form Data)
const createRegistrationTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS voter_registrations (
        application_id SERIAL PRIMARY KEY,
        voter_id VARCHAR(20) REFERENCES voters(id),
        aadhaar_number VARCHAR(20),
        full_name VARCHAR(100),
        relative_name VARCHAR(100),
        relative_type VARCHAR(20),
        state VARCHAR(50),
        district VARCHAR(50),
        constituency VARCHAR(100),
        dob VARCHAR(20),
        gender VARCHAR(20),
        mobile VARCHAR(15),
        email VARCHAR(100),
        address TEXT,
        disability_details TEXT,
        face_descriptor_temp JSON, -- Store face here temporarily
        status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
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

// Save Full Registration Details (Pending Verification)
const saveRegistrationDetails = async (details) => {
    const {
        aadhaar, name, relativeName, relativeType,
        state, district, constituency, dob, gender,
        mobile, email, address, disability, faceDescriptor
    } = details;

    const query = `
        INSERT INTO voter_registrations 
        (aadhaar_number, full_name, relative_name, relative_type, state, district, constituency, dob, gender, mobile, email, address, disability_details, face_descriptor_temp, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'PENDING')
        RETURNING application_id
    `;

    const { rows } = await pool.query(query, [
        aadhaar, name, relativeName, relativeType,
        state, district, constituency, dob, gender,
        mobile, email, address, disability, JSON.stringify(faceDescriptor)
    ]);
    return rows[0].application_id;
};

// Update Voter Face Descriptor
const updateVoterFace = async (voterId, faceDescriptor) => {
    const query = 'UPDATE voters SET face_descriptor = $1 WHERE id = $2';
    await pool.query(query, [JSON.stringify(faceDescriptor), voterId]);
};

module.exports = { createVoterTable, createRegistrationTable, findVoterById, createVoter, saveRegistrationDetails, updateVoterFace, incrementRetry, lockAccount, resetLocks };
