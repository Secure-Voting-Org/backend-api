const { pool } = require('../config/db');

// Create Recovery Requests Table
const createRecoveryTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS recovery_requests (
        id SERIAL PRIMARY KEY,
        voter_id VARCHAR(20) REFERENCES voters(id),
        status VARCHAR(20) DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'NFC_VERIFIED', 'PENDING_ADMIN', 'APPROVED', 'REJECTED', 'FAILED')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// Create Request
const createRecoveryRequest = async (voterId) => {
    const query = 'INSERT INTO recovery_requests (voter_id) VALUES ($1) RETURNING id';
    const { rows } = await pool.query(query, [voterId]);
    return rows[0].id;
};

// Get Request by ID
const getRecoveryRequest = async (id) => {
    const { rows } = await pool.query('SELECT * FROM recovery_requests WHERE id = $1', [id]);
    return rows[0];
};

// Update Status
const updateRecoveryStatus = async (id, status, adminId = null) => {
    let query = 'UPDATE recovery_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    let params = [status, id];

    if (adminId) {
        query = 'UPDATE recovery_requests SET status = $1, approved_by = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
        params = [status, id, adminId];
    }
    await pool.query(query, params);
};

// Get All Requests (For Admin)
const getAllRecoveryRequests = async () => {
    const query = 'SELECT * FROM recovery_requests ORDER BY created_at DESC';
    const { rows } = await pool.query(query);
    return rows;
};

module.exports = { createRecoveryTable, createRecoveryRequest, getRecoveryRequest, updateRecoveryStatus, getAllRecoveryRequests };
