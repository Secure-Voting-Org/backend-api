const app = require('./app');
require('dotenv').config();

const { checkDbConnection } = require('./config/db');
const { createVoterTable, createRegistrationTable, findVoterById, updateVoterFace, createVoter, saveRegistrationDetails } = require('./models/Voter');
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

const PORT = process.env.PORT || 5000;

// Initialize Databases
checkDbConnection().then(async () => {
    try {
        await createVoterTable();
        await createRegistrationTable();
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

        // Seed Observer
        createObserver('observer1', 'securepass', 'Election Observer One');
        console.log("All Database Tables Initialized Successfully.");
    } catch (err) {
        console.error("FATAL ERROR during Database Initialization:", err);
    }
}).catch(err => {
    console.error("Failed to connect to Database during init:", err);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
