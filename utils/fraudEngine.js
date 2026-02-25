const { pool } = require('../config/db');
const { createLog } = require('../models/Log');

// Configurable thresholds
const FRAUD_CONFIG = {
    REGISTRATION_VELOCITY_LIMIT: 3, // Max registrations per IP per hour
    VOTE_VELOCITY_LIMIT: 5,        // Max votes per IP per hour (for public computers, but still worth monitoring)
    LOGIN_FAILURE_LIMIT: 5         // Max failed login attempts before flagging
};

/**
 * Check if an IP has exceeded the velocity limit for a specific action.
 * @param {string} ipAddress - The IP address to check.
 * @param {string} actionType - 'REGISTRATION' or 'VOTE'.
 * @returns {Promise<boolean>} - True if limit exceeded, False otherwise.
 */
const checkIpVelocity = async (ipAddress, actionType) => {
    if (!ipAddress) return false;

    let table, timeColumn;
    let limit = 0;

    if (actionType === 'REGISTRATION') {
        table = 'voter_registrations';
        timeColumn = 'created_at';
        limit = FRAUD_CONFIG.REGISTRATION_VELOCITY_LIMIT;
    } else {
        return false; // Unknown action
    }

    const query = `
        SELECT COUNT(*) as count 
        FROM ${table} 
        WHERE ip_address = $1 
        AND ${timeColumn} > NOW() - INTERVAL '1 hour'
    `;

    const { rows } = await pool.query(query, [ipAddress]);
    const count = parseInt(rows[0].count, 10);

    return count >= limit;
};

/**
 * Log a potential fraud signal.
 * @param {string} type - The type of fraud (e.g., 'HIGH_VELOCITY_REGISTRATION').
 * @param {object} details - Additional details about the event.
 * @param {string} ipAddress - The source IP address.
 * @param {string} userId - Optional user ID related to the event.
 */
const checkDeviceVelocity = async (deviceHash) => {
    if (!deviceHash) return false;

    const limit = FRAUD_CONFIG.REGISTRATION_VELOCITY_LIMIT; // Re-use same limit for now

    // Check pending registrations
    const query = `
        SELECT COUNT(*) as count 
        FROM voter_registrations 
        WHERE device_hash = $1 
        AND created_at > NOW() - INTERVAL '1 hour'
    `;

    const { rows } = await pool.query(query, [deviceHash]);
    const count = parseInt(rows[0].count, 10);

    return count >= limit;
};

// Euclidean Distance Helper
const euclideanDistance = (descriptor1, descriptor2) => {
    if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
    }
    return Math.sqrt(sum);
};

const checkFaceSimilarity = async (newDescriptor) => {
    if (!newDescriptor || newDescriptor.length === 0) return false;

    // 1. Fetch recent pending registrations (e.g., last 100) to scan against
    // Optimization: In prod, use pgvector or dedicated service. 
    // Here we scan recent pending applications.
    const query = `
        SELECT application_id, face_descriptor_temp 
        FROM voter_registrations 
        WHERE status = 'PENDING' 
        ORDER BY created_at DESC 
        LIMIT 100
    `;

    const { rows } = await pool.query(query);

    for (const row of rows) {
        let storedDescriptor = row.face_descriptor_temp;

        // Handle if stored as string
        if (typeof storedDescriptor === 'string') {
            try { storedDescriptor = JSON.parse(storedDescriptor); } catch (e) { }
        }

        const distance = euclideanDistance(newDescriptor, storedDescriptor);

        // Threshold: 0.6 is typical for 128D vectors (dlib). Adjust based on model.
        if (distance < 0.5) {
            return { match: true, applicationId: row.application_id, distance };
        }
    }

    return { match: false };
};

/**
 * Calculate risk score based on fraud check results.
 * @param {object} checks - Object containing fraud check results
 * @param {boolean} checks.ipVelocity - IP velocity check result
 * @param {boolean} checks.deviceVelocity - Device velocity check result
 * @param {object} checks.faceSimilarity - Face similarity check result
 * @returns {object} - { score: number, flags: string[] }
 */
const calculateRiskScore = (checks) => {
    let score = 0;
    const flags = [];

    // IP Velocity: +20 points
    if (checks.ipVelocity) {
        score += 20;
        flags.push('IP_VELOCITY');
    }

    // Device Velocity: +30 points
    if (checks.deviceVelocity) {
        score += 30;
        flags.push('DEVICE_VELOCITY');
    }

    // Biometric Match: +50 points (highest risk)
    if (checks.faceSimilarity && checks.faceSimilarity.match) {
        score += 50;
        flags.push('BIOMETRIC_MATCH');
    }

    return { score, flags };
};

/**
 * Check if the total number of decrypted votes exceeds the total number of issued tokens (voters).
 * Requirement 4.6.1.1 and 4.6.2.1
 * @returns {Promise<boolean>} - True if excess votes detected (fraud), False otherwise.
 */
const checkExcessVotes = async () => {
    try {
        // 1. Total Decrypted Votes (Total ballots cast)
        const voteQuery = 'SELECT COUNT(*) as total_votes FROM votes';
        const voteRes = await pool.query(voteQuery);
        const totalVotes = parseInt(voteRes.rows[0].total_votes, 10);

        // 2. Total Issued Tokens (Eligible voters who received a blind signature)
        const tokenQuery = 'SELECT COUNT(*) as issued_tokens FROM voters WHERE is_token_issued = TRUE';
        const tokenRes = await pool.query(tokenQuery);
        const issuedTokens = parseInt(tokenRes.rows[0].issued_tokens, 10);

        // 3. Compare (Requirement 4.6.2.1: if votes > voters trigger alarm)
        if (totalVotes > issuedTokens) {
            await logFraudSignal('MATH_MISMATCH', {
                reason: 'Total votes cast exceeds total authorized tokens issued.',
                total_votes_found: totalVotes,
                total_tokens_issued: issuedTokens
            }, 'SYSTEM_WATCHDOG');

            return true; // Fraud detected
        }

        return false; // Valid
    } catch (err) {
        console.error("Error checking excess votes:", err);
        return false;
    }
};


const logFraudSignal = async (type, details, ipAddress, userId = null) => {
    console.warn(`[FRAUD_SIGNAL] ${type} from ${ipAddress}`, details);

    await createLog({
        event: 'FRAUD_RISK',
        user_id: userId || 'SYSTEM',
        details: {
            fraud_type: type,
            ...details
        },
        ip_address: ipAddress
    });
};

module.exports = {
    checkIpVelocity,
    checkDeviceVelocity,
    checkFaceSimilarity,
    calculateRiskScore,
    checkExcessVotes,
    logFraudSignal,
    FRAUD_CONFIG
};
