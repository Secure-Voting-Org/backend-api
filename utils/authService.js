const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Secret Key (In prod, use env variable)
const JWT_SECRET = process.env.JWT_SECRET || 'securevote_secret_key_123';
const TOKEN_EXPIRY = '2h'; // Token expires in 2 hours
const IDLE_TIMEOUT_MINUTES = 15; // Inactivity timeout

/**
 * Generate a JWT token for a user session.
 */
const generateToken = (user, deviceHash) => {
    return jwt.sign(
        {
            id: user.id || user.mobile, // Use mobile if ID not available (e.g. at auth stage)
            role: user.role || 'VOTER',
            deviceHash: deviceHash
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

/**
 * Create a new session in the database.
 * Invalidates previous active sessions for the same user (Single Concurrent Login).
 */
const createSession = async (userId, token, deviceHash, ipAddress, userAgent) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Invalidate existing active sessions for this user (Single Session Rule)
        await client.query(
            "UPDATE voter_sessions SET is_active = FALSE WHERE voter_id = $1 AND is_active = TRUE",
            [userId]
        );

        // 2. Create new session
        // Only store token signature or hash for validation if needed, 
        // but for simplicity we'll assume token is passed securely.
        // Storing full token hash is best practice.
        const tokenHash = token.split('.').pop(); // Store signature part as identifier

        const query = `
            INSERT INTO voter_sessions 
            (voter_id, token_hash, device_hash, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '2 hours')
            RETURNING session_id
        `;

        await client.query(query, [userId, tokenHash, deviceHash, ipAddress, userAgent]);

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Verify session validity (Token + DB Check).
 * Checks: Token Signature, Expiry, DB Active Status, Idle Timeout, Device Binding.
 */
const verifySession = async (token, deviceHash) => {
    try {
        // 1. Verify JWT Signature
        const decoded = jwt.verify(token, JWT_SECRET);

        // 2. Device Binding Check
        if (decoded.deviceHash && decoded.deviceHash !== deviceHash) {
            return { valid: false, error: 'Device mismatch' };
        }

        const tokenHash = token.split('.').pop();

        // 3. DB Session Check (Is Active? Not Idle?)
        const query = `
            SELECT * FROM voter_sessions 
            WHERE token_hash = $1 AND is_active = TRUE
        `;
        const { rows } = await pool.query(query, [tokenHash]);
        const session = rows[0];

        if (!session) {
            return { valid: false, error: 'Session invalidated' };
        }

        // 4. Idle Timeout Check
        const lastActive = new Date(session.last_active_at);
        const now = new Date();
        const diffMinutes = (now - lastActive) / 1000 / 60;

        if (diffMinutes > IDLE_TIMEOUT_MINUTES) {
            // Expire session
            await pool.query("UPDATE voter_sessions SET is_active = FALSE WHERE session_id = $1", [session.session_id]);
            return { valid: false, error: 'Session timed out due to inactivity' };
        }

        // 5. Update Last Active
        await pool.query("UPDATE voter_sessions SET last_active_at = NOW() WHERE session_id = $1", [session.session_id]);

        return { valid: true, user: decoded, sessionId: session.session_id };

    } catch (err) {
        return { valid: false, error: err.message };
    }
};

const invalidateSession = async (token) => {
    if (!token) return;
    const tokenHash = token.split('.').pop();
    await pool.query("UPDATE voter_sessions SET is_active = FALSE WHERE token_hash = $1", [tokenHash]);
};

module.exports = {
    generateToken,
    createSession,
    verifySession,
    invalidateSession
};
