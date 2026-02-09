const ValidationNode = require('../utils/ValidationNode');

/**
 * Mempool Service (Epic 3)
 * Standalone module to manage in-memory transaction queue.
 * Storess only validated transactions as required.
 */
class MempoolService {
    constructor() {
        this.cache = [];
        this.MAX_MEMPOOL_SIZE = 1000;
        this.RATE_LIMIT_WINDOW = 60000; // 1 minute
        this.clientTracking = new Map(); // Basic IP-based rate limiting
    }

    /**
     * Attempts to add a transaction to the mempool.
     * Silent rejection on failure (logs only) as per requirements.
     */
    async add(rawTx, sourceIp = '0.0.0.0') {
        // 1. Rate Limiting Check
        if (!this._checkRateLimit(sourceIp)) {
            console.error(`[Mempool] REJECT: Rate limit exceeded for IP ${sourceIp}`);
            return false;
        }

        // 2. Queue Size Check
        if (this.cache.length >= this.MAX_MEMPOOL_SIZE) {
            console.error("[Mempool] REJECT: Queue size limit reached");
            return false;
        }

        // 3. Validation Logic
        const result = await ValidationNode.validateTransaction(rawTx);
        if (!result.isValid) {
            // Silently log and reject
            console.error(`[Mempool] REJECT: Validation failed - ${result.error}`);
            return false;
        }

        // 4. Duplicate Check within mempool (Prevent same voter hash in same block)
        const isDuplicateInRange = this.cache.some(tx => tx.voter_id_hash === result.sanitizedTx.voter_id_hash);
        if (isDuplicateInRange) {
            console.error("[Mempool] REJECT: Transaction already pending in mempool");
            return false;
        }

        this.cache.push(result.sanitizedTx);
        console.log(`[Mempool] ACCEPTED: Transaction ${result.sanitizedTx.transaction_id.substring(0, 8)}... added to queue.`);
        return true;
    }

    /**
     * Read-only interface for block creation.
     * Returns a snapshot of current transactions.
     */
    getPendingTransactions() {
        return [...this.cache];
    }

    /**
     * Clears processed transactions from the mempool.
     */
    clearProcessed(txCount) {
        this.cache.splice(0, txCount);
    }

    /**
     * IP-based rate limiting logic
     */
    _checkRateLimit(ip) {
        const now = Date.now();
        const data = this.clientTracking.get(ip) || { count: 0, firstSeen: now };

        if (now - data.firstSeen > this.RATE_LIMIT_WINDOW) {
            data.count = 1;
            data.firstSeen = now;
        } else {
            data.count++;
        }

        this.clientTracking.set(ip, data);
        return data.count <= 100; // Max 100 transactions per min per IP
    }
}

// Singleton instance
module.exports = new MempoolService();
