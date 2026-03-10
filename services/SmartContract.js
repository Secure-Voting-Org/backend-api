/**
 * SmartContract for Vote Logic (Simulated Chaincode)
 * Enforces business rules before writing to the ledger.
 */

const { getElectionStatus } = require('../models/Election');

class SmartContract {
    /**
     * Validates a vote transaction before it gets added to the blockchain.
     * @param {Object} voteData - The transaction payload.
     * @param {Function} getElectionStatusFn - Dependency injection for testing.
     * @returns {Object} - { valid: boolean, error?: string }
     */
    static async invokeVote(voteData, getElectionStatusFn = getElectionStatus) {
        // 1. Basic Schema Validation
        if (!voteData || !voteData.voter_id || !voteData.candidate_id || !voteData.encrypted_vote || !voteData.signature) {
            return { valid: false, error: 'Missing required vote fields' };
        }

        // 2. Election Phase Validation
        try {
            const status = await getElectionStatusFn();
            if (!status || status.phase !== 'LIVE') {
                return { valid: false, error: 'Election is not in LIVE phase' };
            }
        } catch (err) {
            return { valid: false, error: 'Failed to retrieve election status' };
        }

        // 3. Format/Signature Validation (Simulated)
        // In a real Hyperledger/Ethereum setup, signature verification goes here.
        // For our Node.js implementation, we ensure it looks like a valid Base64 string.
        // Relaxed regex to allow standard and url-safe base64
        const base64Regex = /^[A-Za-z0-9+/=_-]+$/;
        if (!base64Regex.test(voteData.signature)) {
            return { valid: false, error: 'Invalid signature format' };
        }

        // 4. Candidate Validation (Simulated)
        // We'd query the DB to ensure candidate_id exists. For speed in testing, we assume positive INTs are valid.
        const cId = parseInt(voteData.candidate_id, 10);
        if (isNaN(cId) || cId <= 0) {
             return { valid: false, error: 'Invalid candidate ID' };
        }


        // 5. Timestamp Validation
        // Reject votes older than 5 minutes to prevent replay attacks (simple version)
        if (voteData.timestamp) {
            const voteTime = new Date(voteData.timestamp).getTime();
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            if (now - voteTime > fiveMinutes) {
                return { valid: false, error: 'Vote timestamp expired (potential replay)' };
            }
        }

        return { valid: true };
    }
}

module.exports = SmartContract;
