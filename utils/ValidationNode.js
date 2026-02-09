const BlindSignature = require('./BlindSignature');
const BlockchainUtils = require('./BlockchainUtils');
const { getElectionStatus } = require('../models/Election');
const { pool } = require('../config/db');

/**
 * ValidationNode Utility (Epic 3)
 * Centralizes the logic for validating transactions (votes) 
 * as part of the Blockchain Ledger system.
 */
class ValidationNode {
    /**
     * Validates a transaction against Epic 3 blockchain requirements.
     * Rejects invalid transactions silently (logs only).
     * @param {Object} txData - Incoming raw transaction
     * @returns {Promise<{isValid: boolean, error?: string, sanitizedTx?: Object}>}
     */
    static async validateTransaction(txData) {
        const { vote, auth_token, signature, constituency } = txData;

        // 1. Schema Validation (missing fields, data types, payload size)
        if (!vote || typeof vote !== 'string' || vote.length > 5000) {
            console.error("[ValidationNode] REJECT: Invalid or oversized candidate_id/vote");
            return { isValid: false, error: 'Invalid candidate_id' };
        }
        if (!auth_token || typeof auth_token !== 'string') {
            console.error("[ValidationNode] REJECT: Missing or invalid auth_token");
            return { isValid: false, error: 'Missing auth_token' };
        }
        if (!signature || typeof signature !== 'string') {
            console.error("[ValidationNode] REJECT: Missing or invalid digital_signature");
            return { isValid: false, error: 'Missing signature' };
        }
        if (!constituency || typeof constituency !== 'string') {
            console.error("[ValidationNode] REJECT: Missing or invalid constituency");
            return { isValid: false, error: 'Missing constituency' };
        }

        // 2. Election Rule Checks (expired voting window)
        try {
            const status = await getElectionStatus();
            if (status.phase !== 'LIVE' || status.is_kill_switch_active) {
                console.error("[ValidationNode] REJECT: Election is not LIVE or Suspended");
                return { isValid: false, error: 'Election not live' };
            }
        } catch (err) {
            console.error("[ValidationNode] ERROR: Failed to check election status", err);
            return { isValid: false, error: 'System error' };
        }

        // 3. Digital Signature Verification
        try {
            const isSignatureValid = BlindSignature.verify(auth_token, signature);
            if (!isSignatureValid) {
                console.error("[ValidationNode] REJECT: Digital Signature Verification Failed");
                return { isValid: false, error: 'Invalid Signature' };
            }
        } catch (err) {
            console.error("[ValidationNode] ERROR: Signature verification crashed", err);
            return { isValid: false, error: 'Verification error' };
        }

        // 4. Duplicate Transaction/Voting Detection
        // voter_id_hash is SHA-256 of the unblinded auth_token
        const voter_id_hash = BlockchainUtils.hash(auth_token);
        try {
            const { rows } = await pool.query('SELECT 1 FROM votes WHERE voter_id = $1', [voter_id_hash]);
            if (rows.length > 0) {
                console.error("[ValidationNode] REJECT: Duplicate voting attempt detected for hash:", voter_id_hash);
                return { isValid: false, error: 'Duplicate Vote' };
            }
        } catch (err) {
            console.error("[ValidationNode] ERROR: Duplicate check failed", err);
            return { isValid: false, error: 'System error' };
        }

        // 5. Construct Blockchain-specific Transaction Schema
        const publicKey = BlindSignature.getKey();
        const sanitizedTx = {
            transaction_id: BlockchainUtils.hash(auth_token + signature + Date.now()),
            voter_id_hash: voter_id_hash,
            candidate_id: vote,
            constituency: constituency,
            timestamp: new Date().toISOString(),
            public_key: publicKey ? { n: publicKey.n, e: publicKey.e } : null,
            digital_signature: signature
        };

        return { isValid: true, sanitizedTx };
    }
}

module.exports = ValidationNode;
