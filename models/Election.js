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
        results_published BOOLEAN DEFAULT FALSE,
        CONSTRAINT single_row CHECK (id = 1)
    )`;
    await pool.query(query);
    
    // Auto-migration for existing setups
    try {
        await pool.query('ALTER TABLE election_config ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE');
    } catch(e) {}
    
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

// Toggle Publish Results
const togglePublishResults = async (isPublished) => {
    await pool.query('UPDATE election_config SET results_published = $1 WHERE id = 1', [isPublished]);
    return { success: true, results_published: isPublished };
};

// Archive Results (Called by Election Admin after Decryption)
const archiveElectionResults = async (resultsJson, totalVotes) => {
    const { saveElectionResult } = require('./ElectionHistory');
    await saveElectionResult(resultsJson, totalVotes);
    return { success: true };
};

// Reset System for New Election (Called by SysAdmin)
const resetElection = async () => {
    try {
        // Only reset the phase back to PRE_POLL and unpublish results — all vote data is preserved
        await pool.query('UPDATE election_config SET phase = $1, results_published = FALSE WHERE id = 1', ['PRE_POLL']);
        return { success: true };
    } catch (e) {
        console.error("Error during resetElection:", e);
        throw e;
    }
};

module.exports = {
    createElectionTable,
    getElectionStatus,
    updateElectionPhase,
    toggleKillSwitch,
    togglePublishResults,
    archiveElectionResults,
    resetElection
};
