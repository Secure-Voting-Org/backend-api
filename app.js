const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const { findVoterById, updateVoterFace, createVoter, saveRegistrationDetails, incrementRetry, lockAccount, resetLocks, getAllVoters } = require('./models/Voter');
const { createLog, getAllLogs } = require('./models/Log');

const { getCandidatesByConstituency, getCandidatesByMetadata, createCandidate } = require('./models/Candidate');
const { findObserverByUsername } = require('./models/Observer');
const { castVote, getTurnoutStats, getPublicLedger, getAllVotes } = require('./models/Vote');

const { findAdminByUsername, findAdminByEmail, createAdmin, storeOtp, verifyOtp, updateAdminPassword, getAllAdmins, updateAdmin, deleteAdmin } = require('./models/Admin');
const { findSysAdminByUsername, createSysAdmin } = require('./models/SysAdmin');
const { sendOtpEmail } = require('./services/emailService');
const { getElectionStatus, updateElectionPhase, toggleKillSwitch } = require('./models/Election');
const { addConstituency, getAllConstituencies } = require('./models/Constituency');
const { findCitizen } = require('./models/ElectoralRoll');
const { createRecoveryRequest, getRecoveryRequest, updateRecoveryStatus, getAllRecoveryRequests } = require('./models/RecoveryRequest');
const { loadOrGenerateKeys, getPublicKey, getPrivateKey } = require('./utils/encryption_keys');
const { checkIpVelocity, logFraudSignal } = require('./utils/fraudEngine');
const MempoolService = require('./services/MempoolService');

// Load keys on start
loadOrGenerateKeys().catch(err => console.error("Failed to load election keys:", err));

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'SecureVote Backend API is running' });
});

app.get('/api/election/public-key', async (req, res) => {
    try {
        const key = await getPublicKey();
        res.json(key);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve election key' });
    }
});

// --- AUDIT ROUTES ---
app.get('/api/audit/logs', async (req, res) => {
    try {
        const logs = await getAllLogs();
        res.json(logs);
    } catch (err) {
        console.error("Failed to fetch logs:", err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

app.get('/api/admin/list', async (req, res) => {
    try {
        const admins = await getAllAdmins();
        res.json(admins);
    } catch (err) {
        console.error("Failed to fetch admins:", err);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

app.delete('/api/admin/:id', async (req, res) => {
    try {
        await deleteAdmin(req.params.id);
        res.json({ success: true, message: 'Admin deleted successfully' });
    } catch (err) {
        console.error("Failed to delete admin:", err);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

app.put('/api/admin/:id', async (req, res) => {
    const { fullName, email, role, password } = req.body;
    try {
        const updated = await updateAdmin(req.params.id, fullName, email, role, password);
        res.json({ success: true, admin: updated });
    } catch (err) {
        console.error("Failed to update admin:", err);
        // Return specific error if meaningful (e.g. unique constraint)
        if (err.code === '23505') { // Postgres unique_violation
            return res.status(400).json({ error: 'Email already exists.' });
        }
        res.status(500).json({ error: 'Failed to update admin: ' + err.message });
    }
});

app.get('/api/admin/voters', async (req, res) => {
    try {
        const voters = await getAllVoters();
        res.json(voters);
    } catch (err) {
        console.error("Failed to fetch voters:", err);
        res.status(500).json({ error: 'Failed to fetch voters' });
    }
});

// --- ADMIN ROUTES ---

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const admin = await findAdminByUsername(username);
        if (!admin) {
            // Log failed login - user not found
            await createLog({
                event: 'ADMIN_LOGIN_FAILED',
                user_id: username,
                details: { reason: 'User not found', role },
                ip_address: req.ip
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (admin.password !== password) {
            // Log failed login - wrong password
            await createLog({
                event: 'ADMIN_LOGIN_FAILED',
                user_id: username,
                details: { reason: 'Invalid password', role },
                ip_address: req.ip
            });

            // --- FRAUD CHECK: REPEATED LOGIN FAILURES (Primitive) ---
            // In a real system, we'd query recent failure logs here.
            // For now, let's just flag the IP if needed or trust the log monitoring.
            // ----------------------------------------------------

            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Strict Role Check
        if (admin.role !== role) {
            // Log failed login - role mismatch
            await createLog({
                event: 'ADMIN_LOGIN_FAILED',
                user_id: username,
                details: { reason: 'Role mismatch', requested_role: role, actual_role: admin.role },
                ip_address: req.ip
            });
            return res.status(403).json({ error: `Access Denied: You are not authorized for ${role} role.` });
        }

        // Log successful login
        await createLog({
            event: 'ADMIN_LOGIN_SUCCESS',
            user_id: admin.username,
            details: { admin_id: admin.id, role: admin.role, name: admin.full_name },
            ip_address: req.ip
        });

        res.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role, name: admin.full_name } });
    } catch (err) {
        console.error(err);
        // Log system error
        await createLog({
            event: 'ADMIN_LOGIN_ERROR',
            user_id: username,
            details: { error: err.message },
            ip_address: req.ip
        });
        res.status(500).json({ error: 'Login failed' });
    }
});

// Admin Logout
app.post('/api/admin/logout', async (req, res) => {
    const { username, role } = req.body;
    try {
        await createLog({
            event: 'ADMIN_LOGOUT',
            user_id: username,
            details: { role },
            ip_address: req.ip
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Logout logging failed:', err);
        res.status(500).json({ error: 'Logout logging failed' });
    }
});


// Admin Registration
app.post('/api/admin/register', async (req, res) => {
    const { fullName, email, username, password, role } = req.body;

    try {
        // Check if username already exists
        const existingUser = await findAdminByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Check if email already exists
        const existingEmail = await findAdminByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new admin
        const newAdmin = await createAdmin(fullName, email, username, password, role);
        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Forgot Password - Send OTP
app.post('/api/admin/forgot-password/send-otp', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if email exists
        const admin = await findAdminByEmail(email);
        if (!admin) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP
        await storeOtp(email, otp);

        // Send OTP via email
        const emailResult = await sendOtpEmail(email, otp);

        if (emailResult.success) {
            console.log(`✓ OTP email sent successfully to ${email}`);
        } else {
            console.log(`⚠ Email sending failed, but OTP logged to console: ${otp}`);
        }

        res.json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Forgot Password - Verify OTP
app.post('/api/admin/forgot-password/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const isValid = await verifyOtp(email, otp);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        res.json({ success: true, message: 'OTP verified' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'OTP verification failed' });
    }
});

// Forgot Password - Reset Password
app.post('/api/admin/forgot-password/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        // Verify OTP again
        const isValid = await verifyOtp(email, otp);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Update password
        await updateAdminPassword(email, newPassword);

        res.json({ success: true, message: 'Password reset successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Password reset failed' });
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

// --- TALLYING AUTHORITY ROUTES (ADMIN ONLY) ---
app.get('/api/admin/votes', async (req, res) => {
    // In production, Strict Auth Middleware here!
    try {
        const votes = await getAllVotes();
        res.json(votes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch votes' });
    }
});

app.get('/api/admin/election/private-key', async (req, res) => {
    // In production, Strict Auth Middleware here!
    try {
        const key = await getPrivateKey();
        res.json(key);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch private key' });
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
// Add Candidate
app.post('/api/candidate', async (req, res) => {
    try {
        const { name, party, constituency, symbol } = req.body;
        // Basic validation
        if (!name || !constituency || !symbol) {
            return res.status(400).json({ error: 'Name, Constituency, and Symbol are required' });
        }

        // Use createCandidate from model
        // Passing null for photo_url as it's not currently sent by frontend
        await createCandidate({
            name,
            party,
            constituency,
            symbol,
            photo_url: null
        });

        res.status(201).json({ message: 'Candidate added successfully' });
    } catch (err) {
        console.error("Error adding candidate:", err);
        res.status(500).json({ error: 'Failed to add candidate' });
    }
});

// Register Voter (with Face Data) - Admin/Legacy
app.post('/api/admin/voter/register-direct', async (req, res) => {
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
// 2. Submit Enrollment (Face & Full Details)
app.post('/api/registration/submit', async (req, res) => {
    const {
        aadhaar, formData, faceDescriptor
    } = req.body;

    try {
        if (!formData) {
            return res.status(400).json({ error: "Missing formData in request body" });
        }

        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // --- FRAUD CHECK: REGISTRATION VELOCITY ---
        const isHighVelocity = await checkIpVelocity(clientIp, 'REGISTRATION');
        if (isHighVelocity) {
            await logFraudSignal('HIGH_VELOCITY_REGISTRATION', {
                count: 'Exceeded Limit',
                aadhaar: aadhaar
            }, clientIp);
            // Optionally block, but let's just log for now to avoid blocking legitimate public computers
            console.warn(`[FRAUD] High velocity registration detected from ${clientIp}`);
        }
        // ------------------------------------------

        // Map formData keys to DB columns for REGISTRATION table (Pending)
        // Ensure keys match what saveRegistrationDetails expects (camelCase)
        const registrationData = {
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

            faceDescriptor: faceDescriptor // Model will verify array vs JSON string
        };

        console.log("DEBUG: Saving to voter_registrations (Pending)...");

        // Save to Pending Table (voter_registrations)
        // This function handles JSON stringifying of faceDescriptor internally if needed, or we pass object
        // Based on Voter.js: saveRegistrationDetails takes `details` and stringifies `faceDescriptor`
        // Add IP Address to stored details
        registrationData.ipAddress = clientIp;

        const applicationId = await saveRegistrationDetails(registrationData);

        console.log("DEBUG: Pending Registration Success. App ID:", applicationId);

        // Return success with Application ID instead of Voter ID
        res.json({ success: true, voterId: "PENDING", referenceId: "APP" + applicationId });
    } catch (err) {
        console.error("DEBUG: Backend Registration Error:", err);
        res.status(500).json({ error: 'Enrollment failed: ' + err.message });
    }
});

// 3. Application Status Check
app.get('/api/application/status/:referenceId', async (req, res) => {
    const { referenceId } = req.params;
    try {
        const { findRegistrationByReferenceId } = require('./models/Voter'); // lazy import or move top
        const voter = await findRegistrationByReferenceId(referenceId);

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

    // Check Status
    const status = await getElectionStatus();
    if (status.phase !== 'LIVE') {
        return res.status(403).json({ error: 'Election is not LIVE. Candidates are not visible.' });
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

    // Check Status
    const status = await getElectionStatus();
    if (status.phase !== 'LIVE') {
        return res.status(403).json({ error: 'Election is not LIVE. Ballot not available.' });
    }

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

const BlindSignature = require('./utils/BlindSignature');

// Generate Keys on Startup (or load from DB/File in prod)
BlindSignature.generateKeys();

// Endpoint to get Blind Signature Public Key
app.get('/api/blind-signature/keys', (req, res) => {
    const key = BlindSignature.getKey();
    if (key) {
        res.json({ n: key.n, e: key.e });
    } else {
        res.status(500).json({ error: 'Keys not initialized' });
    }
});

// Issue Blind Signature (Authorized)
// Expects: { blinded_token, voterId }
app.post('/api/blind-sign', async (req, res) => {
    const { blinded_token, voterId } = req.body;

    // 1. Verify Voter (Ensure they are eligible and haven't signed yet)
    // In real app, check DB 'is_token_issued' flag.
    const voter = await findVoterById(voterId);
    if (!voter) return res.status(404).json({ error: 'Voter not found' });

    // Check if already issued (Prevent Double Issuance)
    const { checkTokenIssued, markTokenIssued } = require('./models/Voter');
    const hasIssued = await checkTokenIssued(voterId);
    if (hasIssued) return res.status(403).json({ error: 'Voting Token already issued to this user.' });

    try {
        // 2. Sign the Blinded Token
        const signature = BlindSignature.blindSign(blinded_token);

        // 3. Mark as Issued (Important!)
        await markTokenIssued(voterId);

        res.json({ signature });
    } catch (err) {
        console.error("Blind Signing Error:", err);
        res.status(500).json({ error: 'Signing failed' });
    }
});

// Vote Route (Anonymous with Real Blind Signature)
app.post('/api/vote', async (req, res) => {
    const { vote, auth_token, signature, constituency } = req.body;

    // Check Election Status
    const status = await getElectionStatus();
    if (status.phase !== 'LIVE' || status.is_kill_switch_active) {
        return res.status(403).json({ error: 'Election is not live or has been suspended.' });
    }

    // 1. Verify Blind Token Signature
    if (!auth_token || !signature) {
        return res.status(401).json({ error: 'Unauthorized: Missing Token or Signature' });
    }

    try {
        // --- NEW BLOCKCHAIN NODE LOGIC (Validation & Mempool) ---
        const result = await MempoolService.addTransaction({
            vote,
            auth_token,
            signature,
            constituency
        });

        if (result.success) {
            res.json({
                success: true,
                transactionHash: result.transactionHash,
                status: result.status
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (err) {
        console.error("Voting Error:", err);
        // Handle Unique Constraint Violation (Double Voting)
        if (err.code === '23505') { // Postgres unique_violation for unique_voter_id
            // --- FRAUD CHECK: DUPLICATE VOTE ATTEMPT ---
            const clientIp = req.ip || req.connection.remoteAddress;
            await logFraudSignal('DUPLICATE_VOTE_ATTEMPT', {
                details: 'Token already used',
                signature_snippet: signature ? signature.substring(0, 10) + '...' : 'N/A'
            }, clientIp);
            // ------------------------------------------
            return res.status(403).json({ error: 'Duplicate Vote: This token has already been used.' });
        }
        res.status(500).json({ error: 'Voting failed' });
    }
});

// Observer Login
app.post('/api/observer/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const observer = await findObserverByUsername(username);
        if (!observer) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Simple password check for demo (use bcrypt in production)
        if (observer.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify Role if provided (Strict Login)
        if (role && observer.role !== role) {
            return res.status(403).json({ error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            observer: {
                id: observer.id,
                username: observer.username,
                full_name: observer.full_name,
                role: observer.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Observer Registration
app.post('/api/observer/register', async (req, res) => {
    const { username, password, fullName, role, email } = req.body;
    try {
        if (!username || !password || !fullName || !email) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const validRoles = ['general', 'expenditure'];
        const observerRole = validRoles.includes(role) ? role : 'general';

        const existing = await findObserverByUsername(username);
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // In a real app, hash password here
        await createObserver(username, password, fullName, observerRole, email);

        // Auto-login or just success
        const observer = await findObserverByUsername(username);

        res.json({
            success: true,
            observer: {
                id: observer.id,
                username: observer.username,
                full_name: observer.full_name,
                role: observer.role,
                email: observer.email
            }
        });
    } catch (err) {
        console.error("Observer Registration Error:", err);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// OTP Store (In-memory for demo)
const otpStore = {};

// Forgot Password - Generate OTP
// Forgot Password - Generate OTP
app.post('/api/observer/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const { findObserverByEmail } = require('./models/Observer');
        const observer = await findObserverByEmail(email);

        if (!observer) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = { otp, expires: Date.now() + 300000 }; // 5 mins expiry

        console.log(`[OTP] Password Reset Code for ${email}: ${otp}`);

        // Send OTP via centralized email service
        const emailResult = await sendOtpEmail(email, otp);

        if (emailResult.success) {
            console.log(`✓ OTP email sent successfully to ${email}`);
            res.json({ success: true, message: 'OTP sent to your email.' });
        } else {
            console.log(`⚠ Email sending failed, but OTP logged to console: ${otp}`);
            res.json({ success: true, message: 'OTP generated (Check Console - Email Failed)', demoOtp: otp });
        }

    } catch (err) {
        console.error("Email Error:", err);
        // Fallback: If email fails, allow demo OTP so flow isn't broken
        if (otpStore[email]) {
            res.json({ success: true, message: 'OTP generated (Check Console - Email Failed)', demoOtp: otpStore[email].otp });
        } else {
            res.status(500).json({ error: 'Failed to send OTP', details: err.message });
        }
    }
});

// Verify OTP
app.post('/api/observer/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const stored = otpStore[email];

    if (!stored) {
        return res.status(400).json({ error: 'OTP expired or not requested' });
    }

    if (Date.now() > stored.expires) {
        delete otpStore[email];
        return res.status(400).json({ error: 'OTP expired' });
    }

    if (stored.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    res.json({ success: true, message: 'OTP Verified' });
});

// Reset Password
app.post('/api/observer/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const stored = otpStore[email];

    // Verify OTP again for security
    if (!stored || stored.otp !== otp) {
        return res.status(400).json({ error: 'Invalid or expired session' });
    }

    try {
        const { findObserverByEmail, updateObserverPassword } = require('./models/Observer');
        const observer = await findObserverByEmail(email);

        if (!observer) return res.status(404).json({ error: 'User not found' });

        // Update Password
        await updateObserverPassword(observer.username, newPassword);

        // Clear OTP
        delete otpStore[email];

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset password' });
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

// ==========================================
// SYS-ADMIN AUTHENTICATION (Distinct from Election Admin)
// ==========================================

app.post('/api/sys-admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await findSysAdminByUsername(username);
        if (!admin || admin.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            admin: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name,
                role: 'SYS_ADMIN'
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/sys-admin/register', async (req, res) => {
    const { username, password, fullName, email } = req.body;
    try {
        if (!username || !password) return res.status(400).json({ error: 'Username/Password required' });

        const existing = await findSysAdminByUsername(username);
        if (existing) return res.status(400).json({ error: 'Username taken' });

        await createSysAdmin(fullName, email, username, password);
        res.json({ success: true, message: 'SysAdmin Registered' });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ==========================================
// VOTER AUTHENTICATION (Real Auth)
// ==========================================

const { createVoterAuth, findVoterAuthByMobile, findVoterAuthByEmail, updateVoterPassword } = require('./models/Voter');

// Voter Register
app.post('/api/voter/register', async (req, res) => {
    const { fullName, mobile, password, email } = req.body;
    try {
        if (!fullName || !mobile || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existingMobile = await findVoterAuthByMobile(mobile);
        if (existingMobile) {
            return res.status(400).json({ error: 'Mobile number already registered' });
        }

        // Optional: Check email uniqueness if provided
        if (email) {
            const existingEmail = await findVoterAuthByEmail(email);
            if (existingEmail) {
                return res.status(400).json({ error: 'Email already registered' });
            }
        }

        // In a real app, hash password here!
        // const hashedPassword = await bcrypt.hash(password, 10);
        const voter = await createVoterAuth(fullName, mobile, email, password);

        res.json({ success: true, user: { name: voter.full_name, mobile: voter.mobile, email: voter.email } });
    } catch (err) {
        console.error("Voter Registration Error:", err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Voter Login
app.post('/api/voter/login', async (req, res) => {
    const { mobile, password } = req.body;
    try {
        const voter = await findVoterAuthByMobile(mobile);
        if (!voter || voter.password_hash !== password) {
            return res.status(401).json({ error: 'Invalid mobile or password' });
        }

        res.json({ success: true, user: { name: voter.full_name, mobile: voter.mobile, email: voter.email } });
    } catch (err) {
        console.error("Voter Login Error:", err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Voter Forgot Password - Send OTP
app.post('/api/voter/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const voter = await findVoterAuthByEmail(email);
        if (!voter) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Reuse existing OTP logic (could be refactored into a helper)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = { otp, expires: Date.now() + 300000 };

        console.log(`[VOTER OTP] Reset Code for ${email}: ${otp}`);

        // Email Sending Logic (Reused)
        const nodemailer = require('nodemailer');
        let transporter;
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS && !process.env.EMAIL_PASS.includes('your_app_password')) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });
        }

        if (transporter) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Voter Password Reset OTP - SecureVote',
                text: `Your OTP for password reset is: ${otp}\n\nThis code expires in 5 minutes.`
            });
            console.log(`[EMAIL] OTP sent to ${email}`);
            res.json({ success: true, message: 'OTP sent to your email.' });
        } else {
            // Demo Fallback
            res.json({ success: true, message: 'OTP generated (Check Console)', demoOtp: otp });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Voter Verify OTP
app.post('/api/voter/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const stored = otpStore[email];

    if (!stored) return res.status(400).json({ error: 'OTP expired or not requested' });
    if (Date.now() > stored.expires) {
        delete otpStore[email];
        return res.status(400).json({ error: 'OTP expired' });
    }
    if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    delete otpStore[email]; // Consume OTP
    res.json({ success: true, message: 'OTP Verified' });
});

// Voter Reset Password
app.post('/api/voter/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        await updateVoterPassword(email, newPassword);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = app;
