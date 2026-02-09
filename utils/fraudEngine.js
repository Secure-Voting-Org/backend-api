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
    logFraudSignal,
    FRAUD_CONFIG
};
