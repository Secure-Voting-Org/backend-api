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

    // DROP TABLES TO ENSURE CLEAN SCHEMA (OPTIONAL BUT RECOMMENDED FOR CI)
    console.log("Dropping existing tables for clean start...");
    await pool.query(`
        DROP TABLE IF EXISTS observer_sessions, admin_sessions, sysadmin_sessions, voter_sessions;
        DROP TABLE IF EXISTS voters, voter_registrations, voter_registration_auth, logs, candidates, observers, votes, admins, elections, election_history, constituencies, electoral_roll, recovery_requests, sys_admins, admin_otps CASCADE;
    `);

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

    // Add missing columns if models didn't create them but tests expect them
    console.log("Adding schema columns expected by integration tests...");
    try {
        await pool.query(`ALTER TABLE voters ADD COLUMN IF NOT EXISTS is_token_issued BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE votes ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(255);`);
        await pool.query(`ALTER TABLE votes ALTER COLUMN candidate_id TYPE TEXT USING candidate_id::text;`);
    } catch (err) {
        console.log("Columns likely already exist or schema is fine:", err.message);
    }

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
