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
    // 1. Get the latest vote hash (or Genesis if none)
    const lastVoteQuery = 'SELECT transaction_hash FROM votes ORDER BY id DESC LIMIT 1';
    const { rows } = await pool.query(lastVoteQuery);
    const prevHash = rows.length > 0 ? rows[0].transaction_hash : '0000000000000000000000000000000000000000000000000000000000000000';

    // 2. Generate current hash including prevHash
    const timestamp = Date.now();
    // candidateId is encrypted, so we treat it as opaque data.
    const data = `${prevHash}-${voterId}-${candidateId}-${timestamp}`;
    const transactionHash = crypto.createHash('sha256').update(data).digest('hex');

    // 3. Insert Vote with prev_hash
    const query = 'INSERT INTO votes (voter_id, candidate_id, constituency, transaction_hash, prev_hash, timestamp) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0)) RETURNING *';
    const result = await pool.query(query, [voterId, candidateId, constituency, transactionHash, prevHash, timestamp]);

    return { success: true, transactionHash, prevHash, block: result.rows[0] };
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
    const query = 'SELECT transaction_hash, prev_hash, constituency, timestamp FROM votes ORDER BY id DESC LIMIT $1';
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
