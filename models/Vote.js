// Vote Model: Handles database operations for voting and blockchain ledger
const { pool } = require('../config/db');
const crypto = require('crypto');

// Create Votes Table (Schema)
const createVoteTable = async () => {
    // Note: ensure 'prev_hash' column exists in actual DB for blockchain linkage
    const query = `
    CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        voter_id TEXT NOT NULL,         -- Hashed Anonymous ID (SHA-256)
        candidate_id TEXT NOT NULL,     -- Encrypted Vote Data (Ciphertext)
        constituency VARCHAR(100) NOT NULL,
        transaction_hash VARCHAR(64) NOT NULL,
        prev_hash VARCHAR(64),          -- Added for blockchain integrity
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) `;
    await pool.query(query);

    // Ensure prev_hash exists if table was already created without it
    try {
        await pool.query('ALTER TABLE votes ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64)');
    } catch (e) { /* ignore */ }
};

// Cast Vote: Inserts a new vote effectively as a block in the chain
const castVote = async (voterId, candidateId, constituency) => {
    // 1. Get the latest vote hash (or Genesis hash if none exists)
    const lastVoteQuery = 'SELECT transaction_hash FROM votes ORDER BY id DESC LIMIT 1';
    const { rows } = await pool.query(lastVoteQuery);
    const prevHash = rows.length > 0 ? rows[0].transaction_hash : '0000000000000000000000000000000000000000000000000000000000000000';

    // 2. Generate current hash including prevHash for integrity
    const timestamp = Date.now();
    // candidateId is encrypted, so we treat it as opaque data.
    const data = `${prevHash}-${voterId}-${candidateId}-${timestamp}`;
    const transactionHash = crypto.createHash('sha256').update(data).digest('hex');

    // 3. Insert Vote with prev_hash to link the chain
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

// Get Turnout Stats: Counts votes per constituency
const getTurnoutStats = async () => {
    const query = 'SELECT constituency, COUNT(*) as count FROM votes GROUP BY constituency';
    const { rows } = await pool.query(query);
    return rows;
};

// Get Recent Votes (Public Ledger): Show latest transactions for verification
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
