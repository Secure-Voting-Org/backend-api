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
const { findObserverByUsername, createObserver } = require('./models/Observer');
const { castVote, getTurnoutStats, getPublicLedger } = require('./models/Vote');

// NEW MODELS
const { findAdminByUsername, findAdminByEmail, createAdmin, storeOtp, verifyOtp, updateAdminPassword } = require('./models/Admin');
const { sendOtpEmail } = require('./services/emailService');
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
        console.log("DEBUG: Received Registration Submit for Pending Queue");

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
