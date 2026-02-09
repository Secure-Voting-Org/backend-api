// Main entry point for the backend server
const app = require('./app');
require('dotenv').config();

// Import database connection check
const { checkDbConnection } = require('./config/db');

// Import models for database tables
const { createVoterTable, createRegistrationTable, createVoterAuthTable, createVoterRegistrationAuthTable, findVoterById, updateVoterFace, createVoter, saveRegistrationDetails } = require('./models/Voter');
const { createLogTable, createLog, getAllLogs } = require('./models/Log');

const { createCandidateTable } = require('./models/Candidate');
const { createObserverTable, createObserver } = require('./models/Observer');
const { createVoteTable } = require('./models/Vote');

// Import new models for extended functionality
const { createAdminTable } = require('./models/Admin');
const { createElectionTable } = require('./models/Election');
const { createConstituencyTable } = require('./models/Constituency');
const { createElectoralRollTable } = require('./models/ElectoralRoll');
const { createRecoveryTable } = require('./models/RecoveryRequest');
const { createSysAdminTable } = require('./models/SysAdmin');

const PORT = process.env.PORT || 5000;

// Initialize Databases and Tables
checkDbConnection().then(async () => {
    try {
        // Create necessary tables if they don't exist
        await createVoterTable();
        await createRegistrationTable();
        await createVoterAuthTable(); // Keeps old table if needed
        await createVoterRegistrationAuthTable(); // New required table
        await createLogTable();
        await createCandidateTable();
        await createObserverTable();
        await createVoteTable();

        // Initialize new tables
        await createAdminTable();
        await createElectionTable();
        await createConstituencyTable();
        await createElectoralRollTable();
        await createRecoveryTable();
        await createSysAdminTable();

        // Seed default Observer account
        createObserver('observer1', 'securepass', 'Election Observer One');

        // Initialize Blockchain Service for secure logging
        const BlockchainService = require('./services/BlockchainService');
        await BlockchainService.initialize();

        console.log("All Database Tables & Blockchain Ledger Initialized.");
    } catch (err) {
        console.error("FATAL ERROR during Database Initialization:", err);
    }
}).catch(err => {
    console.error("Failed to connect to Database during init:", err);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
