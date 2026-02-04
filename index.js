const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const { checkDbConnection } = require('./config/db');
const { createVoterTable, createRegistrationTable, findVoterById, updateVoterFace, createVoter, saveRegistrationDetails } = require('./models/Voter');
const { createLogTable, createLog } = require('./models/Log');

const { createCandidateTable, getCandidatesByConstituency, addCandidate } = require('./models/Candidate');
const { createObserverTable, findObserverByUsername, createObserver } = require('./models/Observer');
const { createVoteTable, castVote, getTurnoutStats, getPublicLedger } = require('./models/Vote');

// NEW MODELS
const { createAdminTable, findAdminByUsername } = require('./models/Admin');
const { createElectionTable, getElectionStatus, updateElectionPhase, toggleKillSwitch } = require('./models/Election');
const { createConstituencyTable, addConstituency, getAllConstituencies } = require('./models/Constituency');
const { createElectoralRollTable, findCitizen, markAsRegistered } = require('./models/ElectoralRoll');
const { createRecoveryTable, createRecoveryRequest, getRecoveryRequest, updateRecoveryStatus, getAllRecoveryRequests } = require('./models/RecoveryRequest');
const { incrementRetry, lockAccount, resetLocks } = require('./models/Voter');

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

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'SecureVote Backend API is running' });
});

// --- ADMIN ROUTES ---

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const admin = await findAdminByUsername(username);
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

        if (admin.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

        // Strict Role Check
        if (admin.role !== role) return res.status(403).json({ error: `Access Denied: You are not authorized for ${role} role.` });

        res.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role, name: admin.full_name } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Election Status (Public for Voter App & Admin)
app.get('/api/election/status', async (req, res) => {
    try {
        const status = await getElectionStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

// Update Phase (Live Admin Only - In real app, check JWT)
app.post('/api/election/update', async (req, res) => {
    const { phase, isKillSwitch } = req.body;
    try {
        if (phase) await updateElectionPhase(phase);
        if (typeof isKillSwitch === 'boolean') await toggleKillSwitch(isKillSwitch);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// --- MASTER DATA ROUTES (Pre-Poll Admin) ---

// Get All Constituencies
app.get('/api/constituencies', async (req, res) => {
    try {
        const list = await getAllConstituencies();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch constituencies' });
    }
});

// Add Constituency
app.post('/api/constituency', async (req, res) => {
    const { name, district } = req.body;
    try {
        const id = await addConstituency(name, district);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add constituency' });
    }
});

// Add Candidate
app.post('/api/candidate', async (req, res) => {
    // Not implemented yet in Candidate Model
    // await addCandidate(req.body);
    res.json({ message: 'Candidate added successfully (Mock)' });
});

// Register Voter (with Face Data)
app.post('/api/voter/register', async (req, res) => {
    try {
        const { id, name, constituency, faceDescriptor } = req.body;

        if (!id || !name || !constituency || !faceDescriptor) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existing = await findVoterById(id);
        if (existing) return res.status(400).json({ error: 'Voter ID already registered' });

        await createVoter({ id, name, constituency, face_descriptor: faceDescriptor });
        res.json({ success: true, message: 'Voter Registered Successfully' });
    } catch (err) {
        console.error("Voter Registration Error:", err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// --- SELF-REGISTRATION ROUTES ---

// 1. Validate Identity
app.post('/api/registration/validate', async (req, res) => {
    const { aadhaar, phone } = req.body;
    try {
        const citizen = await findCitizen(aadhaar, phone);
        if (!citizen) {
            return res.status(404).json({ error: 'Identity not found in Electoral Roll. Check Aadhaar and Phone.' });
        }
        if (citizen.is_registered) {
            return res.status(400).json({ error: 'This Aadhaar is already registered as a voter.' });
        }
        res.json({
            success: true,
            name: citizen.name,
            constituency: citizen.constituency
        });
    } catch (err) {
        res.status(500).json({ error: 'Validation failed' });
    }
});

// 2. Submit Enrollment (Face)
// 2. Submit Enrollment (Face & Full Details)
app.post('/api/registration/submit', async (req, res) => {
    const {
        aadhaar, name, constituency, faceDescriptor,
        state, district, mobile, email, dob, gender,
        relativeName, relativeType, address, disability
    } = req.body;

    try {
        // 1. Submit Application (Pending Verification)
        const applicationId = await saveRegistrationDetails({
            aadhaar, name, relativeName, relativeType,
            state, district, constituency, dob, gender,
            mobile, email, address, disability, faceDescriptor
        });

        // 2. Mark as Registered in Electoral Roll (OPTIONAL: Maybe wait for approval? 
        // For now, let's keep it to prevent double submission)
        // if (aadhaar) { await markAsRegistered(aadhaar); }

        res.json({ success: true, applicationId, message: 'Application Submitted for Verification' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Enrollment failed' });
    }
});

// 3. Application Status Check
app.get('/api/application/status/:referenceId', async (req, res) => {
    const { referenceId } = req.params;
    try {
        const { findVoterByReferenceId } = require('./models/Voter'); // lazy import or move top
        const voter = await findVoterByReferenceId(referenceId);

        if (!voter) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({
            success: true,
            status: voter.status,
            name: voter.name,
            constituency: voter.constituency,
            submittedAt: voter.created_at
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

// Get Voter by ID
app.get('/api/voter/:id', async (req, res) => {
    try {
        const voter = await findVoterById(req.params.id);
        if (!voter) return res.status(404).json({ error: 'Voter not found' });
        res.json(voter);
    } catch (err) {
        res.status(500).json({ error: 'Lookup failed' });
    }
});

// --- EXISTING ROUTES ---

// Get Candidates by Constituency
app.get('/api/candidates', async (req, res) => {
    const { constituency } = req.query;
    if (!constituency) {
        return res.status(400).json({ error: 'Constituency is required' });
    }
    try {
        const candidates = await getCandidatesByConstituency(constituency);
        res.json(candidates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// Verify Voter ID
app.post('/api/verify-voter', async (req, res) => {
    const { voterId } = req.body;
    try {
        const voter = await findVoterById(voterId);
        if (!voter) {
            return res.status(404).json({ error: 'Voter not found' });
        }
        res.json({
            id: voter.id,
            name: voter.name,
            constituency: voter.constituency,
            faceDescriptor: voter.face_descriptor // stored as JSON
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update Voter Face (Enrollment)
app.post('/api/update-face', async (req, res) => {
    const { voterId, faceDescriptor } = req.body;
    try {
        await updateVoterFace(voterId, faceDescriptor);
        res.json({ success: true, message: 'Face data updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Login / Log Event
app.post('/api/login', async (req, res) => {
    const { userId, status, details } = req.body;

    // Log to MySQL
    try {
        await createLog({
            event: 'LOGIN_ATTEMPT',
            user_id: userId,
            details: { status, ...details },
            ip_address: req.ip
        });
    } catch (err) {
        console.error('Logging failed:', err);
    }

    res.json({ success: true });
});

// Vote Route
app.post('/api/vote', async (req, res) => {
    const { voterId, candidateId, constituency } = req.body;

    // Check Election Status First
    const status = await getElectionStatus();
    if (status.phase !== 'LIVE' || status.is_kill_switch_active) {
        return res.status(403).json({ error: 'Election is not live or has been suspended.' });
    }

    try {
        const result = await castVote(voterId, candidateId, constituency);
        if (result.success) {
            res.json({ success: true, transactionHash: result.transactionHash });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (err) {
        res.status(500).json({ error: 'Voting failed' });
    }
});

// Observer Login
app.post('/api/observer/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const observer = await findObserverByUsername(username);
        if (!observer) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Simple password check for demo (use bcrypt in production)
        if (observer.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            observer: {
                id: observer.id,
                username: observer.username,
                full_name: observer.full_name
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Stats Route
app.get('/api/stats/turnout', async (req, res) => {
    try {
        const stats = await getTurnoutStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Public Ledger
app.get('/api/public-ledger', async (req, res) => {
    try {
        const ledger = await getPublicLedger();
        res.json(ledger);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});


// Example route calling Python AI module
app.post('/api/fraud-check', (req, res) => {
    const data = req.body;

    const pythonProcess = spawn('python', [
        path.join(__dirname, 'ai_modules', 'fraud_detect.py')
    ]);

    let result = '';

    pythonProcess.stdin.write(JSON.stringify(data));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: 'Fraud detection process failed' });
        }
        try {
            res.json(JSON.parse(result));
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse AI response' });
        }
    });
});

// --- ACCOUNT RECOVERY ROUTES ---

// 1. Initiate Recovery
app.post('/api/recovery/initiate', async (req, res) => {
    const { voterId } = req.body;
    try {
        const voter = await findVoterById(voterId);
        if (!voter) return res.status(404).json({ error: 'Voter not found' });

        // Check Lockout
        if (voter.locked_until && new Date(voter.locked_until) > new Date()) {
            return res.status(403).json({ error: `Account locked. Try again after ${voter.locked_until}` });
        }

        const requestId = await createRecoveryRequest(voterId);
        res.json({ success: true, requestId, message: 'Recovery Initiated. Proceed to NFC Verification.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to initiate recovery' });
    }
});

// 2. Verify NFC (Mock)
app.post('/api/recovery/verify-nfc', async (req, res) => {
    const { requestId } = req.body;
    try {
        const request = await getRecoveryRequest(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        if (request.status !== 'INITIATED') return res.status(400).json({ error: 'Invalid step' });

        await updateRecoveryStatus(requestId, 'NFC_VERIFIED');
        res.json({ success: true, message: 'NFC Verified. Proceed to Face Verification.' });
    } catch (err) {
        res.status(500).json({ error: 'NFC Verification Failed' });
    }
});

// 3. Verify Face
app.post('/api/recovery/verify-face', async (req, res) => {
    const { requestId, faceDescriptor } = req.body;
    try {
        const request = await getRecoveryRequest(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        const voter = await findVoterById(request.voter_id);

        // Simple Vector Math for similarity (Euclidean Distance or Cosine Similarity)
        // Assuming faceDescriptor is an array of numbers.
        // NOTE: In a real app, use a library like face-api.js or python module.
        // Here we simulate a match check.

        // Mocking match logic:
        const isMatch = true; // Replace with actual vector comparison logic

        if (isMatch) {
            await updateRecoveryStatus(requestId, 'PENDING_ADMIN');
            res.json({ success: true, message: 'Face Verified. Waiting for Admin Approval.' });
        } else {
            const retryCount = await incrementRetry(request.voter_id);
            if (retryCount >= 3) {
                await lockAccount(request.voter_id, 15); // Lock for 15 mins
                await updateRecoveryStatus(requestId, 'FAILED');
                return res.status(403).json({ error: 'Face verification failed too many times. Account Locked for 15 minutes.' });
            }
            res.status(401).json({ error: 'Face verification failed. Try again.', retriesLeft: 3 - retryCount });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Face Verification Error' });
    }
});

// 3.5 Get All Pending (Admin)
app.get('/api/admin/recovery/pending', async (req, res) => {
    try {
        const requests = await getAllRecoveryRequests();
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// 4. Admin Approval
app.post('/api/admin/recovery/approve', async (req, res) => {
    const { requestId, adminId } = req.body; // In real app, verify admin session
    try {
        const request = await getRecoveryRequest(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        await updateRecoveryStatus(requestId, 'APPROVED', adminId);
        await resetLocks(request.voter_id); // Unlock account

        res.json({ success: true, message: 'Recovery Request Approved. User can now login.' });
    } catch (err) {
        res.status(500).json({ error: 'Approval Failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
