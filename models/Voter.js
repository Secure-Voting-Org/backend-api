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
        reference_id VARCHAR(50) UNIQUE, -- Added Reference ID explicitly
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



// Save Full Registration Details (Pending Verification)
const saveRegistrationDetails = async (details) => {
    const {
        referenceId, // Expect referenceId from controller
        aadhaar, name, relativeName, relativeType,
        state, district, constituency, dob, gender,
        mobile, email, address, disability, faceDescriptor
    } = details;

    const query = `
        INSERT INTO voter_registrations 
        (reference_id, aadhaar_number, full_name, relative_name, relative_type, state, district, constituency, dob, gender, mobile, email, address, disability_details, face_descriptor_temp, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PENDING')
        RETURNING application_id
    `;

    const { rows } = await pool.query(query, [
        referenceId, // $1
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

// Find Voter by ID
const findVoterById = async (voterId) => {
    const query = 'SELECT * FROM voters WHERE id = $1';
    const { rows } = await pool.query(query, [voterId]);
    return rows[0];
};

// Find Voter by Reference ID (Application Status)
const findVoterByReferenceId = async (referenceId) => {
    // Check voter_registrations first for application status
    const query = 'SELECT * FROM voter_registrations WHERE reference_id = $1';
    const { rows } = await pool.query(query, [referenceId]);
    return rows[0];
};

// Create a new Voter (Admin/Registration approval)
const createVoter = async (voterData) => {
    const {
        id, reference_id, status, name, surname, gender, dob,
        constituency, face_descriptor, mobile, email,
        address, district, state, pincode,
        relative_name, relative_type, disability_type,
        profile_image_data, dob_proof_data, address_proof_data, disability_proof_data
    } = voterData;

    const query = `
        INSERT INTO voters (
            id, reference_id, status, name, surname, gender, dob,
            constituency, face_descriptor, mobile, email,
            address, district, state, pincode,
            relative_name, relative_type, disability_type,
            profile_image_data, dob_proof_data, address_proof_data, disability_proof_data
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18,
            $19, $20, $21, $22
        ) RETURNING *`;

    const values = [
        id, reference_id, status || 'PENDING', name, surname, gender, dob,
        constituency, face_descriptor ? JSON.stringify(face_descriptor) : null, mobile, email,
        address, district, state, pincode,
        relative_name, relative_type, disability_type,
        profile_image_data, dob_proof_data, address_proof_data, disability_proof_data
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Increment Retry Count
const incrementRetry = async (voterId) => {
    const query = 'UPDATE voters SET retry_count = retry_count + 1 WHERE id = $1 RETURNING retry_count';
    const { rows } = await pool.query(query, [voterId]);
    return rows[0] ? rows[0].retry_count : 0;
};

// Lock Account
const lockAccount = async (voterId, lockDurationMinutes = 15) => {
    const lockUntil = new Date(Date.now() + lockDurationMinutes * 60000);
    const query = 'UPDATE voters SET locked_until = $1 WHERE id = $2';
    await pool.query(query, [lockUntil, voterId]);
};

// Reset Locks and Retries
const resetLocks = async (voterId) => {
    const query = 'UPDATE voters SET retry_count = 0, locked_until = NULL WHERE id = $1';
    await pool.query(query, [voterId]);
};


// Find Voter by Email
const findVoterByEmail = async (email) => {
    const query = 'SELECT * FROM voters WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    return rows[0];
};

// Create Voter Auth Table (Pre-registration)
const createVoterAuthTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS voter_auth (
        id SERIAL PRIMARY KEY,
        mobile VARCHAR(15) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// Voter Auth Functions
const createVoterAuth = async (fullName, mobile, email, password) => {
    const query = `
        INSERT INTO voter_auth (full_name, mobile, email, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING *`;
    const { rows } = await pool.query(query, [fullName, mobile, email, password]);
    return rows[0];
};

const findVoterAuthByMobile = async (mobile) => {
    const query = 'SELECT * FROM voter_auth WHERE mobile = $1';
    const { rows } = await pool.query(query, [mobile]);
    return rows[0];
};

const findVoterAuthByEmail = async (email) => {
    const query = 'SELECT * FROM voter_auth WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    return rows[0];
};

const updateVoterPassword = async (email, newPassword) => {
    const query = 'UPDATE voter_auth SET password_hash = $1 WHERE email = $2';
    await pool.query(query, [newPassword, email]);
};

const getAllVoters = async () => {
    const query = `
        SELECT id, reference_id, name, surname, constituency, status, 
               has_voted, retry_count, locked_until, created_at 
        FROM voters 
        ORDER BY created_at DESC`;
    const { rows } = await pool.query(query);
    return rows;
};

module.exports = {
    createVoterTable,
    createRegistrationTable,
    createVoterAuthTable,
    findVoterById,
    findVoterByReferenceId,
    findVoterByEmail,
    createVoter,
    createVoterAuth,
    findVoterAuthByMobile,
    findVoterAuthByEmail,
    updateVoterPassword,
    saveRegistrationDetails,
    updateVoterFace,
    incrementRetry,
    lockAccount,
    resetLocks,
    getAllVoters
};
