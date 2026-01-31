const { mysqlPool } = require('../config/db');

// Create Election Config Table
const createElectionTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS election_config (
        id INT PRIMARY KEY DEFAULT 1, -- Singleton Row
        phase ENUM('PRE_POLL', 'LIVE', 'POST_POLL') DEFAULT 'PRE_POLL',
        start_time DATETIME,
        end_time DATETIME,
        is_kill_switch_active BOOLEAN DEFAULT FALSE,
        CONSTRAINT single_row CHECK (id = 1)
    )`;
    await mysqlPool.execute(query);
    console.log("Election Config table checked/created.");
    await initElectionConfig();
};

// Initialize Default Config if not exists
const initElectionConfig = async () => {
    const [rows] = await mysqlPool.execute('SELECT * FROM election_config WHERE id = 1');
    if (rows.length === 0) {
        await mysqlPool.execute('INSERT INTO election_config (id, phase) VALUES (1, "PRE_POLL")');
        console.log("Initialized default Election Config (PRE_POLL).");
    }
};

// Get Current Status
const getElectionStatus = async () => {
    const [rows] = await mysqlPool.execute('SELECT * FROM election_config WHERE id = 1');
    return rows[0];
};

// Update Phase
const updateElectionPhase = async (phase) => {
    await mysqlPool.execute('UPDATE election_config SET phase = ? WHERE id = 1', [phase]);
    return { success: true, phase };
};

// Toggle Kill Switch
const toggleKillSwitch = async (isActive) => {
    await mysqlPool.execute('UPDATE election_config SET is_kill_switch_active = ? WHERE id = 1', [isActive]);
    return { success: true, is_kill_switch_active: isActive };
};

module.exports = {
    createElectionTable,
    getElectionStatus,
    updateElectionPhase,
    toggleKillSwitch
};
