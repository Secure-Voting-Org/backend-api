// Voter Model: Handles user data, registration, and authentication
const { pool } = require('../config/db');

// --- DATABASE SCHEMAS ---

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
    CREATE TABLE IF NOT EXISTS voter_registrations(
    application_id SERIAL PRIMARY KEY,
    reference_id VARCHAR(50) UNIQUE, --Added Reference ID explicitly
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
    face_descriptor_temp JSON, --Store face here temporarily
    profile_image_data TEXT,
    dob_proof_data TEXT,
    address_proof_data TEXT,
    disability_proof_data TEXT,
        status VARCHAR(20) DEFAULT 'PENDING', --PENDING, APPROVED, REJECTED
        rejection_reason TEXT, --Reason for rejection
        ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};



// --- VOTER LOOKUP HELPERS ---

// Find Voter by ID
const findVoterById = async (id) => {
    const query = 'SELECT * FROM voters WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
};

const findVoterByReferenceId = async (referenceId) => {
    const query = 'SELECT * FROM voters WHERE reference_id = $1';
    const { rows } = await pool.query(query, [referenceId]);
    return rows[0];
};

// Find Registration Application by Reference ID
const findRegistrationByReferenceId = async (referenceId) => {
    const query = 'SELECT * FROM voter_registrations WHERE reference_id = $1';
    const { rows } = await pool.query(query, [referenceId]);
    return rows[0];
};

// Find Pending Registration by Aadhaar
const findPendingRegistrationByAadhaar = async (aadhaar) => {
    const query = "SELECT * FROM voter_registrations WHERE aadhaar_number = $1 AND status = 'PENDING'";
    const { rows } = await pool.query(query, [aadhaar]);
    return rows[0];
};

// --- CORE VOTER CREATION ---

// Create Voter (Approved/Full Profile)
const createVoter = async (voter) => {
    const query = `
        INSERT INTO voters(
        id, reference_id, name, surname, gender, dob,
        mobile, email, address, district, state, pincode,
        relative_name, relative_type, disability_type,
        profile_image_data, dob_proof_data, address_proof_data, disability_proof_data,
        constituency, face_descriptor,
        status
    ) VALUES(
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21,
        'APPROVED'
    ) RETURNING *
        `;
    const values = [
        voter.id, voter.reference_id, voter.name, voter.surname, voter.gender, voter.dob,
        voter.mobile, voter.email, voter.address, voter.district, voter.state, voter.pincode,
        voter.relative_name, voter.relative_type, voter.disability_type,
        voter.profile_image_data, voter.dob_proof_data, voter.address_proof_data, voter.disability_proof_data,
        voter.constituency, JSON.stringify(voter.face_descriptor)
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// --- ACCOUNT SECURITY ---

// Increment Retry Count
const incrementRetry = async (voterId) => {
    const query = 'UPDATE voters SET retry_count = retry_count + 1 WHERE id = $1 RETURNING retry_count';
    const { rows } = await pool.query(query, [voterId]);
    return rows[0] ? rows[0].retry_count : 0;
};

// Lock Account
const lockAccount = async (voterId, minutes) => {
    const lockedUntil = new Date(Date.now() + minutes * 60000);
    await pool.query('UPDATE voters SET locked_until = $1 WHERE id = $2', [lockedUntil, voterId]);
    const query = `UPDATE voters SET locked_until = NOW() + INTERVAL '${minutes} minutes' WHERE id = $1`;
    await pool.query(query, [voterId]);
};

// Check if Token Issued
const checkTokenIssued = async (voterId) => {
    const query = 'SELECT is_token_issued FROM voters WHERE id = $1';
    const { rows } = await pool.query(query, [voterId]);
    return rows[0] ? rows[0].is_token_issued : false;
};

// Mark Token Issued
const markTokenIssued = async (voterId) => {
    const query = 'UPDATE voters SET is_token_issued = TRUE WHERE id = $1';
    await pool.query(query, [voterId]);
};

// Reset Locks
const resetLocks = async (voterId) => {
    await pool.query('UPDATE voters SET retry_count = 0, locked_until = NULL WHERE id = $1', [voterId]);
};

// Save Full Registration Details (Pending Verification)
const saveRegistrationDetails = async (details) => {
    const {
        referenceId, // Expect referenceId from controller
        aadhaar, name, relativeName, relativeType,
        state, district, constituency, dob, gender,
        mobile, email, address, disability, faceDescriptor,
        profileImage, dobProof, addressProof, disabilityProof // New fields
    } = details;

    const query = `
        INSERT INTO voter_registrations
    (reference_id, aadhaar_number, full_name, relative_name, relative_type, state, district, constituency, dob, gender, mobile, email, address, disability_details, face_descriptor_temp, profile_image_data, dob_proof_data, address_proof_data, disability_proof_data, status)
VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'PENDING')
        RETURNING application_id
    `;

    console.log("DEBUG: Saving Registration. RefID:", referenceId, "Name:", name);

    const { rows } = await pool.query(query, [
        referenceId, // $1
        aadhaar, name, relativeName, relativeType,
        state, district, constituency, dob, gender,
        mobile, email, address, disability, JSON.stringify(faceDescriptor),
        profileImage, dobProof, addressProof, disabilityProof
    ]);
    return rows[0].application_id;
};

// Update Voter Face Descriptor
const updateVoterFace = async (voterId, faceDescriptor) => {
    const query = 'UPDATE voters SET face_descriptor = $1 WHERE id = $2';
    await pool.query(query, [JSON.stringify(faceDescriptor), voterId]);
};

// Get Pending Registrations
// Get Pending Registrations (Lightweight for List View)
const getPendingRegistrations = async () => {
    // Exclude heavy base64 columns
    const query = `
        SELECT application_id, reference_id, full_name, constituency, aadhaar_number, created_at 
        FROM voter_registrations 
        WHERE status = 'PENDING' 
        ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

// Get Full Application Details (including images)
const getApplicationDetails = async (applicationId) => {
    const query = "SELECT * FROM voter_registrations WHERE application_id = $1";
    const { rows } = await pool.query(query, [applicationId]);
    return rows[0];
};

// Approve Registration (Move from Registration to Main Voter Table)
const approveRegistration = async (applicationId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Application Details
        const resApp = await client.query("SELECT * FROM voter_registrations WHERE application_id = $1", [applicationId]);
        const app = resApp.rows[0];

        if (!app) throw new Error("Application not found");
        if (app.status !== 'PENDING') throw new Error("Application is not pending");

        // 2. Generate Voter ID (Format: RDV + 7 Random Digits)
        const voterId = `RDV${Math.floor(1000000 + Math.random() * 9000000)}`;

        // 3. Insert into Voters Table
        const insertQuery = `
            INSERT INTO voters(
        id, reference_id, name, surname, gender, dob, constituency, face_descriptor,
        mobile, email, address, district, state,
        relative_name, relative_type, disability_type,
        profile_image_data, dob_proof_data, address_proof_data, disability_proof_data,
        status
    ) VALUES(
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19, $20,
        'APPROVED'
    )
        `;

        // Parse name into Name + Surname if needed, or just use full name as Name
        // The registration table has full_name. The voters table has name, surname.
        // We will just use full_name in name and empty surname for simplicity or split.

        await client.query(insertQuery, [
            voterId, app.reference_id, app.full_name, '', app.gender, app.dob, app.constituency, JSON.stringify(app.face_descriptor_temp),
            app.mobile, app.email, app.address, app.district, app.state,
            app.relative_name, app.relative_type, app.disability_details,
            app.profile_image_data, app.dob_proof_data, app.address_proof_data, app.disability_proof_data
        ]);

        // 4. Update Registration Status
        await client.query("UPDATE voter_registrations SET status = 'APPROVED', voter_id = $1 WHERE application_id = $2", [voterId, applicationId]);

        await client.query('COMMIT');
        return { success: true, voterId };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// Reject Registration
const rejectRegistration = async (applicationId, reason) => {
    const query = "UPDATE voter_registrations SET status = 'REJECTED', rejection_reason = $2 WHERE application_id = $1";
    await pool.query(query, [applicationId, reason || 'Rejected by Admin']);
};

// Get Application Status by Reference ID
const getApplicationStatus = async (referenceId) => {
    // Check both pending registration table and approved voters table

    // 1. Check Pending/Rejected in Registration Table
    const resReg = await pool.query(
        "SELECT status, rejection_reason, full_name as name, constituency, voter_id FROM voter_registrations WHERE reference_id = $1",
        [referenceId]
    );

    if (resReg.rows.length > 0) {
        return resReg.rows[0];
    }

    // 2. Check Approved in Main Voters Table
    const resVoter = await pool.query(
        "SELECT status, id as voter_id, name, surname, constituency FROM voters WHERE reference_id = $1",
        [referenceId]
    );

    if (resVoter.rows.length > 0) {
        const v = resVoter.rows[0];
        return {
            status: 'APPROVED',
            voter_id: v.voter_id,
            name: `${v.name} ${v.surname} `.trim(),
            constituency: v.constituency
        };
    }

    return null; // Not found
};





// Find Voter by Email
const findVoterByEmail = async (email) => {
    const query = 'SELECT * FROM voters WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    return rows[0];
};

// --- VOTER AUTHENTICATION (Login) ---

// --- VOTER REGISTRATION AUTH (Sign Up Credentials) ---

// Create Voter Registration Auth Table
const createVoterRegistrationAuthTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS voter_registration_auth(
        id SERIAL PRIMARY KEY,
        mobile VARCHAR(15) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// Create Voter Auth Record
const createVoterRegistrationAuth = async (fullName, mobile, email, password) => {
    const crypto = require('crypto');
    // Simple hash for now (In prod, use bcrypt or argon2)
    const hash = crypto.createHash('sha256').update(password).digest('hex');

    const query = `
        INSERT INTO voter_registration_auth(full_name, mobile, email, password_hash)
        VALUES($1, $2, $3, $4)
        RETURNING *
    `;
    const { rows } = await pool.query(query, [fullName, mobile, email, hash]);
    return rows[0];
};

const findVoterAuthByMobile = async (mobile) => {
    const query = 'SELECT * FROM voter_registration_auth WHERE mobile = $1';
    const { rows } = await pool.query(query, [mobile]);
    return rows[0];
};

const findVoterAuthByEmail = async (email) => {
    const query = 'SELECT * FROM voter_registration_auth WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    return rows[0];
};

const updateVoterPassword = async (email, newPassword) => {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
    const query = 'UPDATE voter_registration_auth SET password_hash = $1 WHERE email = $2';
    await pool.query(query, [hash, email]);
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

// Get Flagged Registrations (High Risk)
const getFlaggedRegistrations = async () => {
    const query = `
        SELECT application_id, aadhaar_number, full_name, risk_score, risk_flags, status, created_at
        FROM voter_registrations
        WHERE risk_score >= 50 OR status = 'FLAGGED'
        ORDER BY risk_score DESC, created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
};

module.exports = {
    createVoterTable,
    createRegistrationTable,
    createVoterAuthTable: createVoterRegistrationAuthTable, // Alias for backward compatibility if needed, or just replace
    findVoterById,
    findVoterByReferenceId,
    findRegistrationByReferenceId,
    findPendingRegistrationByAadhaar,
    findVoterByEmail,
    createVoter,
    createVoterRegistrationAuth,
    findVoterAuthByMobile,
    findVoterAuthByEmail,
    updateVoterPassword,
    saveRegistrationDetails,
    updateVoterFace,
    incrementRetry,
    lockAccount,
    resetLocks,
    getAllVoters,
    getFlaggedRegistrations,
    checkTokenIssued,
    markTokenIssued,
    getPendingRegistrations,
    getApplicationDetails,
    approveRegistration,
    rejectRegistration,
    getApplicationStatus,
    createVoterRegistrationAuthTable // Explicit export
};

const getApprovedRegistrations = async () => {
    // Approved entries are in 'voters' table usually, but we also can check 'voter_registrations' if we keep them updated
    // Strategy: PendingVerifications.jsx seems to use voter_registrations table structure.
    // However, when approved, we might only update status in voter_registrations OR move them.
    // Let's check 'voter_registrations' status = 'APPROVED'
    const query = "SELECT * FROM voter_registrations WHERE status = 'APPROVED' ORDER BY created_at DESC";
    const { rows } = await pool.query(query);
    return rows;
};

// Update Voter ID (e.g., Assigning NFC UID)
const updateVoterId = async (currentId, newId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check if newId already exists
        const checkRes = await client.query("SELECT id FROM voters WHERE id = $1", [newId]);
        if (checkRes.rows.length > 0) {
            throw new Error("New ID (NFC UID) is already assigned to another voter.");
        }

        // 2. Find linked registrations
        const regRes = await client.query("SELECT application_id FROM voter_registrations WHERE voter_id = $1", [currentId]);
        const linkedAppIds = regRes.rows.map(r => r.application_id);

        // 3. Unlink registrations (set voter_id = NULL temporarily)
        // This avoids Foreign Key constraint violation during parent update
        if (linkedAppIds.length > 0) {
            await client.query("UPDATE voter_registrations SET voter_id = NULL WHERE voter_id = $1", [currentId]);
        }

        // 4. Update Voter ID in Parent Table
        const updateRes = await client.query("UPDATE voters SET id = $1 WHERE id = $2 RETURNING *", [newId, currentId]);
        if (updateRes.rows.length === 0) {
            throw new Error("Voter not found.");
        }
        const updatedVoter = updateRes.rows[0];

        // 5. Relink registrations to New ID
        if (linkedAppIds.length > 0) {
            // Need to handle array for IN clause
            // easiest way is loop or ANY($1)
            await client.query("UPDATE voter_registrations SET voter_id = $1 WHERE application_id = ANY($2)", [newId, linkedAppIds]);
        }

        await client.query('COMMIT');
        return updatedVoter;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const getRejectedRegistrations = async () => {
    const query = "SELECT * FROM voter_registrations WHERE status = 'REJECTED' ORDER BY created_at DESC";
    const { rows } = await pool.query(query);
    return rows;
};

module.exports = {
    createVoterTable,
    createRegistrationTable,
    createVoterAuthTable: createVoterRegistrationAuthTable, // Alias for backward compatibility if needed, or just replace
    findVoterById,
    findVoterByReferenceId,
    findRegistrationByReferenceId,
    findPendingRegistrationByAadhaar,
    findVoterByEmail,
    createVoter,
    createVoterRegistrationAuth,
    findVoterAuthByMobile,
    findVoterAuthByEmail,
    updateVoterPassword,
    saveRegistrationDetails,
    updateVoterFace,
    incrementRetry,
    lockAccount,
    resetLocks,
    getAllVoters,
    getFlaggedRegistrations,
    checkTokenIssued,
    markTokenIssued,
    markVoterAsVoted: async (voterId) => {
        await pool.query('UPDATE voters SET has_voted = TRUE WHERE id = $1', [voterId]);
    },
    getPendingRegistrations,
    getApprovedRegistrations, // NEW
    getRejectedRegistrations, // NEW
    getApplicationDetails,
    approveRegistration,
    rejectRegistration,
    getApplicationStatus,
    updateVoterId, // NEW
    createVoterRegistrationAuthTable // Explicit export
};
