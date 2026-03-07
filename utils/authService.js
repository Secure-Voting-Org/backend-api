const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Secret Key (In prod, use env variable)
const JWT_SECRET = process.env.JWT_SECRET || 'securevote_secret_key_123';
const TOKEN_EXPIRY = '8h'; // Token valid for 8 hours
const VOTER_IDLE_TIMEOUT_MINUTES = 15;    // Voters: 15 min idle timeout
const ADMIN_IDLE_TIMEOUT_MINUTES = 60;   // Admins/SysAdmins: 60 min idle timeout

/**
 * Generate a JWT token for a user session.
 */
const generateToken = (user, deviceHash, role = 'VOTER') => {
    return jwt.sign(
        {
            id: user.id || user.mobile || user.username, // Handle different ID fields
            role: user.role || role,
            deviceHash: deviceHash
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

// Helper function to determine session table and foreign key based on role
const getSessionTableConfig = (role) => {
    switch (role) {
        case 'ADMIN':
        case 'ELECTION_ADMIN':
        case 'PRE_POLL':
        case 'POST_POLL':
        case 'LIVE':
            return { table: 'admin_sessions', idCol: 'admin_id' };
        case 'SYS_ADMIN':
            return { table: 'sysadmin_sessions', idCol: 'sysadmin_id' };
        case 'OBSERVER':
            return { table: 'observer_sessions', idCol: 'observer_id' };
        case 'VOTER':
        default:
            return { table: 'voter_sessions', idCol: 'voter_id' };
    }
};

/**
 * Create a new session in the database.
 * Invalidates previous active sessions for the same user (Single Concurrent Login).
 */
const createSession = async (userId, token, deviceHash, ipAddress, userAgent, role = 'VOTER') => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { table, idCol } = getSessionTableConfig(role);

        // 1. Invalidate existing active sessions for this user (Single Session Rule)
        await client.query(
            `UPDATE ${table} SET is_active = FALSE WHERE ${idCol} = $1 AND is_active = TRUE`,
            [userId]
        );

        // 2. Create new session
        // Only store token signature or hash for validation if needed, 
        // but for simplicity we'll assume token is passed securely.
        // Storing full token hash is best practice.
        const tokenHash = token.split('.').pop(); // Store signature part as identifier

        const query = `
            INSERT INTO ${table} 
            (${idCol}, token_hash, device_hash, ip_address, user_agent, expires_at, is_active)
            VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '2 hours', TRUE)
            RETURNING session_id
        `;

        const { rows } = await client.query(query, [userId, tokenHash, deviceHash, ipAddress, userAgent]);
        const sessionId = rows[0].session_id;

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
const verifySession = async (token, deviceHash, role = 'VOTER') => {
    try {
        // 1. Verify JWT Signature
        const decoded = jwt.verify(token, JWT_SECRET);

        // 2. Device Binding Check
        // Only check if BOTH the token AND the request have a device hash,
        // and they don't match. If either is missing/null, skip this check.
        const tokenDeviceHash = decoded.deviceHash;
        if (tokenDeviceHash && deviceHash && tokenDeviceHash !== deviceHash) {
            console.warn(`[Auth] Device mismatch. Token has: '${tokenDeviceHash}', Request has: '${deviceHash}'`);
            return { valid: false, error: 'Device mismatch' };
        }

        const tokenHash = token.split('.').pop();

        // 3. DB Session Check (Is Active? Not Idle?)
        const tokenRole = decoded.role || role;
        const { table } = getSessionTableConfig(tokenRole);

        const query = `
            SELECT * FROM ${table} 
            WHERE token_hash = $1 AND is_active = TRUE
        `;
        const { rows } = await pool.query(query, [tokenHash]);
        const session = rows[0];

        if (!session) {
            return { valid: false, error: 'Session not found or was invalidated. Please log in again.' };
        }

        // 4. Idle Timeout Check (role-aware)
        const lastActive = new Date(session.last_active_at);
        const now = new Date();
        const diffMinutes = (now - lastActive) / 1000 / 60;

        const isAdmin = ['ADMIN', 'ELECTION_ADMIN', 'SYS_ADMIN', 'PRE_POLL', 'POST_POLL', 'LIVE'].includes(tokenRole);
        const idleTimeout = isAdmin ? ADMIN_IDLE_TIMEOUT_MINUTES : VOTER_IDLE_TIMEOUT_MINUTES;

        if (diffMinutes > idleTimeout) {
            await pool.query(`UPDATE ${table} SET is_active = FALSE WHERE session_id = $1`, [session.session_id]);
            return { valid: false, error: `Session timed out after ${idleTimeout} minutes of inactivity. Please log in again.` };
        }

        // 5. Update Last Active
        await pool.query(`UPDATE ${table} SET last_active_at = NOW() WHERE session_id = $1`, [session.session_id]);

        return { valid: true, user: decoded, sessionId: session.session_id };

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return { valid: false, error: 'Token has expired. Please log in again.' };
        }
        if (err.name === 'JsonWebTokenError') {
            return { valid: false, error: 'Invalid token. Please log in again.' };
        }
        return { valid: false, error: err.message };
    }
};

const invalidateSession = async (token, role = 'VOTER') => {
    if (!token) return;
    try {
        const decoded = jwt.decode(token);
        const tokenRole = decoded?.role || role;
        const { table } = getSessionTableConfig(tokenRole);

        const tokenHash = token.split('.').pop();
        await pool.query(`UPDATE ${table} SET is_active = FALSE WHERE token_hash = $1`, [tokenHash]);
    } catch (e) {
        // Fallback for invalid token or decode fail during invalidation
        console.error("Session Invalidation Error:", e);
    }
};

module.exports = {
    generateToken,
    createSession,
    verifySession,
    invalidateSession
};
