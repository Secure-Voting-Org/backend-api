const app = require('./app');
require('dotenv').config();

const { checkDbConnection } = require('./config/db');
const { createVoterTable, createRegistrationTable, createVoterAuthTable, findVoterById, updateVoterFace, createVoter, saveRegistrationDetails } = require('./models/Voter');
const { createLogTable, createLog, getAllLogs } = require('./models/Log');

const { createCandidateTable } = require('./models/Candidate');
const { createObserverTable, createObserver } = require('./models/Observer');
const { createVoteTable } = require('./models/Vote');

// NEW MODELS
const { createAdminTable } = require('./models/Admin');
const { createElectionTable } = require('./models/Election');
const { createConstituencyTable } = require('./models/Constituency');
const { createElectoralRollTable } = require('./models/ElectoralRoll');
const { createRecoveryTable } = require('./models/RecoveryRequest');
const { createSysAdminTable } = require('./models/SysAdmin');

const PORT = process.env.PORT || 5000;

// Initialize Databases
checkDbConnection().then(async () => {
    try {
        await createVoterTable();
        await createRegistrationTable();
        await createVoterAuthTable();
        await createLogTable();
        await createCandidateTable();
        await createObserverTable();
        await createVoteTable();

        // Init New Tables
        await createAdminTable();
        await createElectionTable();
        await createConstituencyTable();
        await createElectoralRollTable();
        await createRecoveryTable();
        await createSysAdminTable();

        // Seed Observer
        createObserver('observer1', 'securepass', 'Election Observer One');

        // Init Epic 3 Blockchain Service
        const BlockchainService = require('./services/BlockchainService');
        await BlockchainService.initialize();

        console.log("All Database Tables & Blockchain Ledger Initialized.");
    } catch (err) {
        console.error("FATAL ERROR during Database Initialization:", err);
    }
}).catch(err => {
    console.error("Failed to connect to Database during init:", err);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
