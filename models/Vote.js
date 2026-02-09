const { pool } = require('../config/db');
const crypto = require('crypto');

// Create Votes Table
const createVoteTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        voter_id TEXT NOT NULL,         -- Hashed Anonymous ID (SHA-256)
        candidate_id TEXT NOT NULL,     -- Encrypted Vote Data (Ciphertext)
        constituency VARCHAR(100) NOT NULL,
        transaction_hash VARCHAR(64) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// Cast Vote (Direct)
const castVote = async (voterId, candidateId, constituency) => {
    // Generate a mock blockchain hash
    // candidateId is now an encrypted string, so we just treat it as data.
    const data = `${voterId}-${candidateId}-${Date.now()}`;
    const transactionHash = crypto.createHash('sha256').update(data).digest('hex');

    const query = 'INSERT INTO votes (voter_id, candidate_id, constituency, transaction_hash) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [voterId, candidateId, constituency, transactionHash]);

    return { success: true, transactionHash };
};

/**
 * Commits a pre-validated transaction to the database
 */
const commitTransaction = async (voterId, candidateId, constituency, transactionHash) => {
    const query = 'INSERT INTO votes (voter_id, candidate_id, constituency, transaction_hash) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [voterId, candidateId, constituency, transactionHash]);
    return { success: true };
};

// Get Turnout Stats
const getTurnoutStats = async () => {
    const query = 'SELECT constituency, COUNT(*) as count FROM votes GROUP BY constituency';
    const { rows } = await pool.query(query);
    return rows;
};

// Get Recent Votes (Public Ledger)
const getPublicLedger = async (limit = 20) => {
    // Note: limit coming from function arg so use param to be safe or ensure it is int
    const query = 'SELECT transaction_hash, constituency, timestamp FROM votes ORDER BY timestamp DESC LIMIT $1';
    const { rows } = await pool.query(query, [limit]);
    return rows;
};

// Get All Votes (For Tallying - Admin Only)
const getAllVotes = async () => {
    const query = 'SELECT candidate_id, constituency FROM votes';
    const { rows } = await pool.query(query);
    return rows;
};

module.exports = { createVoteTable, castVote, commitTransaction, getTurnoutStats, getPublicLedger, getAllVotes };
