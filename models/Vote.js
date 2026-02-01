const { pool } = require('../config/db');
const crypto = require('crypto');

// Create Votes Table
const createVoteTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        voter_id VARCHAR(50) NOT NULL, -- Hashed or encrypted in real system
        candidate_id INT NOT NULL,
        constituency VARCHAR(100) NOT NULL,
        transaction_hash VARCHAR(64) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// Cast Vote
const castVote = async (voterId, candidateId, constituency) => {
    // Generate a mock blockchain hash
    const data = `${voterId}-${candidateId}-${Date.now()}`;
    const transactionHash = crypto.createHash('sha256').update(data).digest('hex');

    const query = 'INSERT INTO votes (voter_id, candidate_id, constituency, transaction_hash) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [voterId, candidateId, constituency, transactionHash]);

    return transactionHash;
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

module.exports = { createVoteTable, castVote, getTurnoutStats, getPublicLedger };
