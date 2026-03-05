const { pool } = require('../config/db');

// Create Election Config Table
const createElectionTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS election_config (
        id INT PRIMARY KEY DEFAULT 1, -- Singleton Row
        phase VARCHAR(20) DEFAULT 'PRE_POLL' CHECK (phase IN ('PRE_POLL', 'LIVE', 'POST_POLL')),
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        is_kill_switch_active BOOLEAN DEFAULT FALSE,
        CONSTRAINT single_row CHECK (id = 1)
    )`;
    await pool.query(query);
    console.log("Election Config table checked/created.");
    await initElectionConfig();
};

// Initialize Default Config if not exists
const initElectionConfig = async () => {
    const { rows } = await pool.query('SELECT * FROM election_config WHERE id = 1');
    if (rows.length === 0) {
        await pool.query('INSERT INTO election_config (id, phase) VALUES (1, $1)', ['PRE_POLL']);
        console.log("Initialized default Election Config (PRE_POLL).");
    }
};

// Get Current Status
const getElectionStatus = async () => {
    const { rows } = await pool.query('SELECT * FROM election_config WHERE id = 1');
    return rows[0];
};

// Update Phase
const updateElectionPhase = async (phase) => {
    await pool.query('UPDATE election_config SET phase = $1 WHERE id = 1', [phase]);
    return { success: true, phase };
};

// Toggle Kill Switch
const toggleKillSwitch = async (isActive) => {
    await pool.query('UPDATE election_config SET is_kill_switch_active = $1 WHERE id = 1', [isActive]);
    return { success: true, is_kill_switch_active: isActive };
};

// Archive Results (Called by Election Admin after Decryption)
const archiveElectionResults = async (resultsJson, totalVotes) => {
    const { saveElectionResult } = require('./ElectionHistory');
    await saveElectionResult(resultsJson, totalVotes);
    return { success: true };
};

// Reset System for New Election (Called by SysAdmin)
const resetElection = async () => {
    const fs = require('fs');
    const path = require('path');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear votes completely so table is empty
        await client.query('TRUNCATE TABLE votes RESTART IDENTITY');

        // Reset has_voted for all voters
        await client.query('UPDATE voters SET has_voted = FALSE');

        // Set phase back to PRE_POLL
        await client.query('UPDATE election_config SET phase = $1 WHERE id = 1', ['PRE_POLL']);

        // Delete existing Cryptographic Keys
        const keysFile = path.join(__dirname, '../config/election_keys.json');
        const sharesFile = path.join(__dirname, '../config/election_key_shares.json');
        if (fs.existsSync(keysFile)) fs.unlinkSync(keysFile);
        if (fs.existsSync(sharesFile)) fs.unlinkSync(sharesFile);

        await client.query('COMMIT');
        return { success: true };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error during resetElection:", e);
        throw e;
    } finally {
        client.release();
    }
};

module.exports = {
    createElectionTable,
    getElectionStatus,
    updateElectionPhase,
    toggleKillSwitch,
    archiveElectionResults,
    resetElection
};
