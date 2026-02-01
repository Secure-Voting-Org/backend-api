const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { checkDbConnection } = require('./config/db');
const { createVoterTable, findVoterById, updateVoterFace, createVoter } = require('./models/Voter');
const { createLogTable, createLog } = require('./models/Log');

const { createCandidateTable, getCandidatesByConstituency, addCandidate } = require('./models/Candidate');
const { createObserverTable, findObserverByUsername, createObserver } = require('./models/Observer');
const { createVoteTable, castVote, getTurnoutStats, getPublicLedger } = require('./models/Vote');

// NEW MODELS
const { createAdminTable, findAdminByUsername } = require('./models/Admin');
const { createElectionTable, getElectionStatus, updateElectionPhase, toggleKillSwitch } = require('./models/Election');
const { createConstituencyTable, addConstituency, getAllConstituencies } = require('./models/Constituency');

// Initialize Databases
checkDbConnection().then(async () => {
    try {
        await createVoterTable();
        await createLogTable();
        await createCandidateTable();
        await createObserverTable();
        await createVoteTable();

        // Init New Tables
        await createAdminTable();
        await createElectionTable();
        await createConstituencyTable();

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
