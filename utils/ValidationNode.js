const BlindSignature = require('./BlindSignature');
const crypto = require('crypto');

/**
 * ValidationNode Utility
 * Centralizes the logic for validating transactions (votes) 
 * to ensure integrity and block junk data.
 */
class ValidationNode {
    /**
     * Validates a transaction object
     * @param {Object} tx - The transaction data
     * @returns {Object} { isValid: boolean, error: string }
     */
    static validateTransaction(tx) {
        const { vote, auth_token, signature, constituency } = tx;

        // 1. Schema Check (Basic junk blocking)
        if (!vote || typeof vote !== 'string' || vote.length === 0) {
            return { isValid: false, error: 'Invalid vote data: Missing or empty' };
        }
        if (!auth_token || typeof auth_token !== 'string') {
            return { isValid: false, error: 'Invalid auth token: Missing or wrong type' };
        }
        if (!signature || typeof signature !== 'string') {
            return { isValid: false, error: 'Invalid signature: Missing or wrong type' };
        }
        if (!constituency || typeof constituency !== 'string') {
            return { isValid: false, error: 'Invalid constituency: Missing or wrong type' };
        }

        // 2. Signature verification
        try {
            const isSignatureValid = BlindSignature.verify(auth_token, signature);
            if (!isSignatureValid) {
                return { isValid: false, error: 'Signature Verification Failed: Forged or invalid token' };
            }
        } catch (err) {
            console.error('ValidationNode Signature Error:', err);
            return { isValid: false, error: 'Verification system error' };
        }

        // 3. Junk Data Filtering (e.g. malformed JSON strings if 'vote' is supposed to be JSON)
        // Since 'vote' is currently an encrypted string, we just ensure it's not a trivial string.
        if (vote.length < 10) { // Arbitrary length check for "junk"
            return { isValid: false, error: 'Junk data blocked: Vote data too short' };
        }

        return { isValid: true };
    }

    /**
     * Generates an Anonymous ID from the auth token
     */
    static getAnonymousId(authToken) {
        return crypto.createHash('sha256').update(authToken).digest('hex');
    }
}

module.exports = ValidationNode;
