const BlindSignature = require('./BlindSignature');
const BlockchainUtils = require('./BlockchainUtils');
const ExternalStorageService = require('./ExternalStorageService');
const { getElectionStatus } = require('../models/Election');
const { pool } = require('../config/db');

/**
 * SmartContract Layer (User Story 3.7 & 3.10)
 * Enforces automated validity rules and manages external metadata storage.
 */
class SmartContract {
    /**
     * Formally invokes a vote transaction with strict code-enforced rules.
     * Requirement 3.7.1.1 & 3.10.1.1
     * @param {Object} voteData - The raw vote payload
     * @returns {Promise<{isValid: boolean, error?: string, sanitizedTx?: Object}>}
     */
    static async invokeVote(voteData) {
        const { vote, auth_token, signature, constituency } = voteData;

        // 1. Format and Type Checks (Requirement 3.7.2.1)
        if (!vote || typeof vote !== 'string' || vote.length > 5000) {
            return { isValid: false, error: 'Invalid format: vote payload missing or too large' };
        }
        if (!auth_token || typeof auth_token !== 'string') {
            return { isValid: false, error: 'Invalid format: auth_token missing or invalid' };
        }
        if (!signature || typeof signature !== 'string') {
            return { isValid: false, error: 'Invalid format: signature missing or invalid' };
        }
        if (!constituency || typeof constituency !== 'string') {
            return { isValid: false, error: 'Invalid format: constituency missing or invalid' };
        }

        // 2. Timestamp/Phase Verification (Requirement 3.7.3.1)
        try {
            const status = await getElectionStatus();
            if (status.phase !== 'LIVE') {
                return { isValid: false, error: `REJECTED: Election is in ${status.phase} phase (must be LIVE)` };
            }
            if (status.is_kill_switch_active) {
                return { isValid: false, error: 'REJECTED: Election has been suspended by Admin' };
            }
        } catch (err) {
            console.error("[SmartContract] Phase check failed:", err);
            return { isValid: false, error: 'Internal validation error: phase check failed' };
        }

        // 3. Signature Validity (Requirement 3.7.2.1)
        try {
            const isSignatureValid = BlindSignature.verify(auth_token, signature);
            if (!isSignatureValid) {
                return { isValid: false, error: 'REJECTED: Cryptographic signature verification failed' };
            }
        } catch (err) {
            console.error("[SmartContract] Signature verification crashed:", err);
            return { isValid: false, error: 'Internal validation error: signature check failed' };
        }

        // 4. Candidate ID Validity (Requirement 3.7.3.1)
        try {
            const candidateCheck = await pool.query('SELECT id FROM candidates WHERE id = $1', [vote]);
            if (candidateCheck.rows.length === 0) {
                const nameCheck = await pool.query('SELECT id FROM candidates WHERE name = $1', [vote]);
                if (nameCheck.rows.length === 0) {
                    return { isValid: false, error: 'REJECTED: Invalid Candidate ID - Candidate does not exist' };
                }
            }
        } catch (err) {
            console.error("[SmartContract] Candidate check failed:", err);
            return { isValid: false, error: 'Internal validation error: candidate lookup failed' };
        }

        // 5. Duplicate Vote Detection (SHA-256 of auth_token)
        const voter_id_hash = BlockchainUtils.hash(auth_token);
        try {
            const { rows } = await pool.query('SELECT 1 FROM votes WHERE voter_id = $1', [voter_id_hash]);
            if (rows.length > 0) {
                return { isValid: false, error: 'REJECTED: Duplicate vote detected for this token' };
            }
        } catch (err) {
            console.error("[SmartContract] Duplicate check failed:", err);
            return { isValid: false, error: 'Internal validation error: duplicate check failed' };
        }

        // 6. External Storage Offloading (Requirement 3.10.1.1)
        let metadataRef = null;
        try {
            const publicKey = BlindSignature.getKey();
            const heavyMetadata = {
                public_key: publicKey ? { n: publicKey.n, e: publicKey.e } : null,
                digital_signature: signature,
                auth_token_preview: auth_token.substring(0, 20) + '...'
            };
            metadataRef = await ExternalStorageService.store(heavyMetadata);
        } catch (err) {
            console.error("[SmartContract] External storage offloading failed:", err);
            return { isValid: false, error: 'Internal validation error: storage offloading failed' };
        }

        // Construct Sanitized Transaction for Blockchain storage (LEAN VERSION)
        // Requirement 3.10.2.1
        const sanitizedTx = {
            transaction_id: BlockchainUtils.hash(auth_token + signature + Date.now()),
            voter_id_hash: voter_id_hash,
            candidate_id: vote, // Keep actual candidate ID for indexing
            vote_hash: BlockchainUtils.hash(vote), // Store hash of vote on-chain
            constituency: constituency,
            timestamp: new Date().toISOString(),
            metadata_ref: metadataRef // Reference link to heavy data
        };

        return { isValid: true, sanitizedTx };
    }
}

module.exports = SmartContract;
