const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));



const { findVoterById, updateVoterFace, createVoter, saveRegistrationDetails, incrementRetry, lockAccount, resetLocks } = require('./models/Voter');
const { createLog } = require('./models/Log');

const { getCandidatesByConstituency, getCandidatesByMetadata } = require('./models/Candidate');
const { findObserverByUsername } = require('./models/Observer');
const { castVote, getTurnoutStats, getPublicLedger } = require('./models/Vote');

// NEW MODELS
const { findAdminByUsername } = require('./models/Admin');
const { getElectionStatus, updateElectionPhase, toggleKillSwitch } = require('./models/Election');
const { addConstituency, getAllConstituencies } = require('./models/Constituency');
const { findCitizen } = require('./models/ElectoralRoll');
const { createRecoveryRequest, getRecoveryRequest, updateRecoveryStatus, getAllRecoveryRequests } = require('./models/RecoveryRequest');

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

        // Generate Reference ID (Same logic as self-registration)
        const referenceId = 'REF-ADMIN-' + Math.floor(10000000 + Math.random() * 90000000);

        // Populate object for createVoter (which expects full schema)
        await createVoter({
            id,
            reference_id: referenceId,
            name,
            constituency,
            face_descriptor: faceDescriptor,

            // Defaults for Admin-created incomplete profiles
            surname: '',
            gender: 'Unknown',
            dob: '01/01/1970',
            mobile: 'N/A',
            email: 'N/A',
            address: 'Registered at Polling Station',
            district: 'N/A',
            state: 'N/A',
            pincode: '000000',
            relative_name: '',
            relative_type: '',
            disability_type: 'None',

            // Empty Docs
            profile_image_data: null,
            dob_proof_data: null,
            address_proof_data: null,
            disability_proof_data: null
        });

        // Admin registrations should probably be auto-approved? 
        // For now, createVoter defaults to PENDING. 
        // We can manually update it if needed, or leave as PENDING for verification.
        // Let's UPDATE to APPROVED immediately since an Officer did it.
        const { pool } = require('./config/db');
        await pool.query("UPDATE voters SET status = 'APPROVED' WHERE id = $1", [id]);

        res.json({ success: true, message: 'Voter Registered & Approved Successfully' });
    } catch (err) {
        console.error("Voter Registration Error:", err);
        res.status(500).json({ error: 'Registration failed: ' + err.message });
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
// Helper to generate 12-char alphanumeric Reference ID
const generateReferenceId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// 2. Submit Enrollment (Face & Full Details)
app.post('/api/registration/submit', async (req, res) => {
    const {
        aadhaar, formData, faceDescriptor
    } = req.body;

    try {
        console.log("DEBUG: Received Registration Submit for Pending Queue");

        // Generate 12-char Reference ID
        const referenceId = generateReferenceId();

        // Helper to extract base64 from possible file object
        const getFileBase64 = (file) => {
            if (!file) return null;
            if (typeof file === 'string') return file;
            if (file.base64) return file.base64; // Handle { name, base64 } object from FormContext
            return null;
        };

        const registrationData = {
            referenceId: referenceId, // Pass the generated ID
            aadhaar: aadhaar,
            name: `${formData.firstName} ${formData.surname}`,
            relativeName: formData.relativeName,
            relativeType: formData.relationType,

            state: formData.state,
            district: formData.district,
            constituency: formData.assemblyConstituency,

            dob: `${formData.dobDay}/${formData.dobMonth}/${formData.dobYear}`,
            gender: formData.gender,

            mobile: formData.mobileSelf ? formData.mobileNumber : formData.mobileRelativeNumber,
            email: formData.emailSelf ? formData.email : formData.emailRelative,

            address: `${formData.houseNo}, ${formData.streetArea}, ${formData.villageTown}, ${formData.pincode}`,

            disability: formData.disabilityOtherSpec || (formData.disabilityCategories?.locomotive ? 'Locomotive' : 'None'),

            faceDescriptor: faceDescriptor, // Model will verify array vs JSON string

            // Files from formData (Base64 strings)
            // Extract base64 if object
            profileImage: getFileBase64(formData.image),
            dobProof: getFileBase64(formData.dobProofFile),
            addressProof: getFileBase64(formData.addressProofFile),
            disabilityProof: getFileBase64(formData.disabilityFile)
        };

        console.log("DEBUG: Saving to voter_registrations (Pending)...");

        // Save to Pending Table (voter_registrations)
        // This function handles JSON stringifying of faceDescriptor internally if needed, or we pass object
        // Based on Voter.js: saveRegistrationDetails takes `details` and stringifies `faceDescriptor`
        const applicationId = await saveRegistrationDetails(registrationData);

        console.log("DEBUG: Pending Registration Success. App ID:", applicationId);

        // Return success with Reference ID
        res.json({ success: true, voterId: "PENDING", referenceId: referenceId });
    } catch (err) {
        console.error("DEBUG: Backend Registration Error:", err);
        res.status(500).json({ error: 'Enrollment failed: ' + err.message });
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

// Search Candidates by Metadata (District, Constituency)
app.get('/api/candidates/search', async (req, res) => {
    const { district, constituency } = req.query;
    try {
        const candidates = await getCandidatesByMetadata({ district, constituency });
        res.json(candidates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to search candidates' });
    }
});

/**
 * FEATURE 2.1.1.1: Define API endpoints to retrieve candidate lists based on user metadata.
 * GET /api/voter/ballot/:voterId
 * Retrieves candidates based on the voter's stored constituency.
 */
app.get('/api/voter/ballot/:voterId', async (req, res) => {
    const { voterId } = req.params;
    try {
        const voter = await findVoterById(voterId);
        if (!voter) {
            return res.status(404).json({ error: 'Voter not found' });
        }

        if (!voter.constituency) {
            return res.status(400).json({ error: 'Voter profile is missing constituency metadata' });
        }

        const candidates = await getCandidatesByConstituency(voter.constituency);
        res.json({
            constituency: voter.constituency,
            candidates: candidates
        });
    } catch (err) {
        console.error("Ballot Retrieval Error:", err);
        res.status(500).json({ error: 'Failed to retrieve local ballot' });
    }
});

// Verify Voter ID (Encrypted)
const CryptoJS = require('crypto-js');
const SECRET_KEY = "SECURE_VOTING_NFC_SECRET"; // In prod, use env var

app.post('/api/verify-voter', async (req, res) => {
    let { voterId } = req.body;
    // encryptedPayload support
    const { encryptedData } = req.body;

    if (encryptedData) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
            voterId = bytes.toString(CryptoJS.enc.Utf8);
            console.log("Decrypted Voter ID:", voterId);
        } catch (e) {
            console.error("Decryption Failed:", e);
            return res.status(400).json({ error: 'Decryption failed' });
        }
    } else {
        console.log("Received Plain Voter ID:", voterId);
    }

    if (!voterId) {
        // The test expects 401 and "EPIC ID Required"
        return res.status(401).json({ message: 'EPIC ID Required' });
    }
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

// --- PENDING VOTER VERIFICATION ROUTES ---

const { getPendingRegistrations, approveRegistration, rejectRegistration } = require('./models/Voter');

// Get Pending Registrations
app.get('/api/admin/pending-voters', async (req, res) => {
    try {
        const list = await getPendingRegistrations();
        res.json(list);
    } catch (err) {
        console.error("Fetch Pending Error:", err);
        res.status(500).json({ error: 'Failed to fetch pending voters' });
    }
});

// Get Single Application Details
const { getApplicationDetails } = require('./models/Voter');
app.get('/api/admin/pending-voter/:id', async (req, res) => {
    try {
        const details = await getApplicationDetails(req.params.id);
        if (!details) return res.status(404).json({ error: 'Application not found' });
        res.json(details);
    } catch (err) {
        console.error("Fetch Detail Error:", err);
        res.status(500).json({ error: 'Failed to fetch application details' });
    }
});

// Approve Voter Registration
app.post('/api/admin/approve-voter', async (req, res) => {
    const { applicationId } = req.body;
    try {
        const result = await approveRegistration(applicationId);
        res.json(result);
    } catch (err) {
        console.error("Approve Error:", err);
        res.status(500).json({ error: 'Approval failed: ' + err.message });
    }
});

// Reject Voter Registration
app.post('/api/admin/reject-voter', async (req, res) => {
    const { applicationId, reason } = req.body;
    try {
        await rejectRegistration(applicationId, reason);
        res.json({ success: true, message: 'Application Rejected' });
    } catch (err) {
        console.error("Reject Error:", err);
        res.status(500).json({ error: 'Rejection failed' });
    }
});

// Check Application Status (Public)
// Check Application Status (Public)
const { getApplicationStatus } = require('./models/Voter');
app.get('/api/application/status/:referenceId', async (req, res) => {
    try {
        const { referenceId } = req.params;
        const status = await getApplicationStatus(referenceId);

        if (!status) {
            return res.status(404).json({ success: false, error: 'Application not found with this Reference ID' });
        }

        res.json({ success: true, ...status });
    } catch (err) {
        console.error("Status Check Error:", err);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

module.exports = app;
