const { pool } = require('../config/db');

// Create Election History Table
const createElectionHistoryTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS election_history (
        id SERIAL PRIMARY KEY,
        election_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        results_json JSONB NOT NULL,
        total_votes INT NOT NULL
    )`;
    await pool.query(query);
    console.log("Election History table checked/created.");
};

// Save historical election result
const saveElectionResult = async (resultsJson, totalVotes) => {
    const query = 'INSERT INTO election_history (results_json, total_votes) VALUES ($1, $2) RETURNING *';
    const { rows } = await pool.query(query, [resultsJson, totalVotes]);
    return rows[0];
};

// Retrieve all historical elections
const getElectionHistory = async () => {
    const query = 'SELECT * FROM election_history ORDER BY election_date DESC';
    const { rows } = await pool.query(query);
    return rows;
};

module.exports = {
    createElectionHistoryTable,
    saveElectionResult,
    getElectionHistory
};
