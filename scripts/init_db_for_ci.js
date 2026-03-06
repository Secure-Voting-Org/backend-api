const { checkDbConnection } = require('../config/db');
const { createVoterTable, createRegistrationTable, createVoterAuthTable, createVoterRegistrationAuthTable } = require('../models/Voter');
const { createLogTable } = require('../models/Log');
const { createCandidateTable } = require('../models/Candidate');
const { createObserverTable, createObserver } = require('../models/Observer');
const { createVoteTable } = require('../models/Vote');
const { createAdminTable } = require('../models/Admin');
const { createElectionTable } = require('../models/Election');
const { createElectionHistoryTable } = require('../models/ElectionHistory');
const { createConstituencyTable } = require('../models/Constituency');
const { createElectoralRollTable } = require('../models/ElectoralRoll');
const { createRecoveryTable } = require('../models/RecoveryRequest');
const { createSysAdminTable } = require('../models/SysAdmin');

// Added for session tables usually created dynamically or in other files
const { pool } = require('../config/db');

async function createSessionTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
            session_id SERIAL PRIMARY KEY,
            admin_id INTEGER,
            token_hash VARCHAR(255) UNIQUE NOT NULL,
            device_hash VARCHAR(255),
            ip_address VARCHAR(45),
            user_agent TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sysadmin_sessions (
            session_id SERIAL PRIMARY KEY,
            sysadmin_id INTEGER,
            token_hash VARCHAR(255) UNIQUE NOT NULL,
            device_hash VARCHAR(255),
            ip_address VARCHAR(45),
            user_agent TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS observer_sessions (
            session_id SERIAL PRIMARY KEY,
            observer_id INTEGER,
            token_hash VARCHAR(255) UNIQUE NOT NULL,
            device_hash VARCHAR(255),
            ip_address VARCHAR(45),
            user_agent TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS voter_sessions (
            session_id SERIAL PRIMARY KEY,
            voter_id INTEGER,
            token_hash VARCHAR(255) UNIQUE NOT NULL,
            device_hash VARCHAR(255),
            ip_address VARCHAR(45),
            user_agent TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        );
    `);
}

async function init() {
    console.log("Initializing database for CI tests...");
    await checkDbConnection();
    await createVoterTable();
    await createRegistrationTable();
    await createVoterAuthTable();
    await createVoterRegistrationAuthTable();
    await createLogTable();
    await createCandidateTable();
    await createObserverTable();
    await createVoteTable();
    await createAdminTable();
    await createElectionTable();
    await createElectionHistoryTable();
    await createConstituencyTable();
    await createElectoralRollTable();
    await createRecoveryTable();
    await createSysAdminTable();
    await createSessionTables();

    // Seed test admin for jwt_roles.test.js
    await pool.query(`
        INSERT INTO admins (username, password, full_name, role, email) 
        VALUES ('pre_admin', 'admin123', 'Pre Poll Admin', 'PRE_POLL', 'admin@example.com')
        ON CONFLICT (username) DO NOTHING
    `);

    await pool.query(`
        INSERT INTO sys_admins (username, password, full_name) 
        VALUES ('sys_admin', 'sysadmin123', 'System Admin')
        ON CONFLICT (username) DO NOTHING
    `);

    console.log("Database initialized successfully!");
    process.exit(0);
}

init().catch(err => {
    console.error("Failed to initialize database", err);
    process.exit(1);
});
