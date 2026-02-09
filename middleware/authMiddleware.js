const { verifySession } = require('../utils/authService');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        const deviceHash = req.headers['x-device-hash'];

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        if (!deviceHash) {
            return res.status(400).json({ error: 'Device identification required.' });
        }

        const verification = await verifySession(token, deviceHash);

        if (!verification.valid) {
            return res.status(401).json({ error: 'Invalid or expired session: ' + verification.error });
        }

        // Attach user info to request
        req.user = verification.user;
        req.sessionId = verification.sessionId;
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = authMiddleware;
