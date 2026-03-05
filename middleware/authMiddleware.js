const { verifySession } = require('../utils/authService');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        const deviceHash = req.headers['x-device-hash'] || 'unknown-device';

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        // Decode token to find role
        const jwt = require('jsonwebtoken');
        let decodedRole = 'VOTER';
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.role) {
                decodedRole = decoded.role;
            }
        } catch (e) {
            // let verifySession handle invalid token
        }

        const verification = await verifySession(token, deviceHash, decodedRole);

        if (!verification.valid) {
            return res.status(401).json({ error: 'Invalid or expired session: ' + verification.error });
        }

        // Attach user info to request
        req.user = verification.user;
        req.sessionId = verification.sessionId;
        req.role = decodedRole;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = authMiddleware;
