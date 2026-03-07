// Main entry point for the backend server
const app = require('./app');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

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
const { createElectionHistoryTable } = require('./models/ElectionHistory');
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
        await createElectionHistoryTable();
        await createConstituencyTable();
        await createElectoralRollTable();
        await createRecoveryTable();
        await createSysAdminTable();

        // ============================================================
        // SESSION TABLES - Critical for JWT auth on all portals.
        // These are created here to ensure they exist in production
        // (Render/Neon DB) automatically on every server start.
        // ============================================================
        const { pool } = require('./config/db');

        // Ensure voters.mobile is unique so voter_sessions can reference it
        try {
            await pool.query('ALTER TABLE voters ADD CONSTRAINT voters_mobile_unique UNIQUE (mobile);');
            console.log("Added UNIQUE constraint to voters.mobile");
        } catch (err) {
            // Error 42P07 means constraint already exists, just ignore it.
        }

        await pool.query(`
            CREATE TABLE IF NOT EXISTS voter_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                voter_id VARCHAR(255) REFERENCES voters(mobile) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                device_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                device_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sysadmin_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sysadmin_id INTEGER REFERENCES sys_admins(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                device_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS observer_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                observer_id INTEGER REFERENCES observers(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                device_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            );
        `);
        console.log("✅ All Session Tables Initialized (voter, admin, sysadmin, observer).");

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
