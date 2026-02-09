const ValidationNode = require('../utils/ValidationNode');
const { castVote } = require('../models/Vote');

/**
 * Mempool Service
 * Manages transactions before they are committed to the blockchain (DB).
 */
class MempoolService {
    constructor() {
        this.mempool = [];
        this.blockProcessingLimit = 5; // Commit to DB every 5 transactions (or on timer)
        this.processing = false;
    }

    /**
     * Entry point for a new voting transaction
     * @param {Object} txData - { vote, auth_token, signature, constituency }
     * @returns {Promise<Object>} Result of validation and addition
     */
    async addTransaction(txData) {
        console.log(`[Mempool] Received transaction from constituency: ${txData.constituency}`);

        // 1. Validate using the Validation Node
        const validation = ValidationNode.validateTransaction(txData);
        if (!validation.isValid) {
            console.warn(`[Mempool] REJECTED: ${validation.error}`);
            return { success: false, error: validation.error };
        }

        // 2. Compute Anonymous ID
        const anonymousId = ValidationNode.getAnonymousId(txData.auth_token);

        // 3. Check if already in mempool to prevent spamming the same token
        const isDuplicate = this.mempool.some(t => t.anonymousId === anonymousId);
        if (isDuplicate) {
            return { success: false, error: 'Transaction already in mempool' };
        }

        // 4. Generate Transaction Hash (Mocking Blockchain ID generation)
        const hashData = `${anonymousId}-${txData.vote}-${Date.now()}`;
        const transactionHash = require('crypto').createHash('sha256').update(hashData).digest('hex');

        // 5. Add to Mempool
        const entry = {
            ...txData,
            anonymousId,
            transactionHash,
            timestamp: Date.now()
        };
        this.mempool.push(entry);
        console.log(`[Mempool] Transaction added. Hash: ${transactionHash.substring(0, 10)}... Current size: ${this.mempool.length}`);

        // 6. Check if it's time to "Mine" a block (Commit to DB)
        if (this.mempool.length >= this.blockProcessingLimit) {
            this.processMempool();
        }

        // Return success with Hash (consistent with old UI logic)
        return {
            success: true,
            transactionHash,
            status: 'MEMPOOL_ACCEPTED'
        };
    }

    /**
     * Simulates "Mining" a block by committing mempool transactions to the Database
     */
    async processMempool() {
        if (this.processing || this.mempool.length === 0) return;
        this.processing = true;

        console.log(`[Mempool] Starting Block Creation for ${this.mempool.length} transactions...`);

        const currentBatch = [...this.mempool];
        this.mempool = [];

        const { commitTransaction } = require('../models/Vote');

        for (const tx of currentBatch) {
            try {
                await commitTransaction(tx.anonymousId, tx.vote, tx.constituency, tx.transactionHash);
                console.log(`[Mempool] Block Item Committed: ${tx.transactionHash.substring(0, 10)}...`);
            } catch (err) {
                if (err.code === '23505') {
                    console.warn(`[Mempool] Duplicate ignored: ${tx.anonymousId}`);
                } else {
                    console.error(`[Mempool] Error committing ${tx.anonymousId}:`, err.message);
                }
            }
        }

        console.log('[Mempool] Block creation finished.');
        this.processing = false;
    }

    /**
     * Forced process (e.g. on shutdown or manual admin trigger)
     */
    async flush() {
        await this.processMempool();
    }
}

// Singleton instance
module.exports = new MempoolService();
