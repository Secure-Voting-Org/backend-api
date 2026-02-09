const MempoolService = require('./MempoolService');
const BlockchainUtils = require('../utils/BlockchainUtils');
const BlockchainModel = require('../models/BlockchainModel');

/**
 * Blockchain Service (Epic 3)
 * Orchestrates block creation, sealing, and ledger integrity verification.
 */
class BlockchainService {
    constructor() {
        this.BLOCK_INTERVAL = 30000; // Seal block every 30 seconds if transactions exist
        this.WATCHDOG_INTERVAL = 10000; // Integrity check every 10 seconds (Verification Mode)
        this.isSealing = false;
        this.isSystemReady = false;
        this.lastIntegrityStatus = {
            isValid: true,
            lastChecked: null,
            error: null
        };
    }

    /**
     * Initializes the Blockchain system.
     * Triggers verification on application startup.
     */
    async initialize() {
        console.log("[BlockchainService] Initializing Ledger...");
        await BlockchainModel.createBlockchainTable();

        // Integrity Check on Startup
        const isValid = await this.verifyChain();
        if (!isValid) {
            console.error("[BlockchainService] FATAL: Blockchain integrity verification failed on startup!");
            // In a real system, we might halt or enter read-only mode.
        } else {
            console.log("[BlockchainService] Ledger integrity verified successfully.");
            this.isSystemReady = true;
        }

        // Start Periodic Block Sealing Job
        this.startBackgroundSealing();

        // Start Integrity Watchdog (Epic 3.5)
        this.startIntegrityWatchdog();
    }

    /**
     * Periodic Background Job
     */
    startBackgroundSealing() {
        setInterval(async () => {
            if (this.isSealing) return;
            await this.sealNewBlock();
        }, this.BLOCK_INTERVAL);
        console.log(`[BlockchainService] Background Sealing Job started (Interval: ${this.BLOCK_INTERVAL}ms).`);
    }

    /**
     * Sealing Process (Epic 3 Requirement 3)
     */
    async sealNewBlock() {
        if (this.isSealing) return;

        const pendingTxs = MempoolService.getPendingTransactions();
        if (pendingTxs.length === 0) return; // Nothing to seal

        this.isSealing = true;
        console.log(`[BlockchainService] Attempting to seal new block with ${pendingTxs.length} transactions...`);

        try {
            // 1. Mandatory Integrity Check BEFORE sealing
            const isValid = await this.verifyChain();
            if (!isValid) {
                console.error("[BlockchainService] REJECT: Cannot seal block. Existing chain is tampered!");
                return;
            }

            // 2. Get Last Block info
            const lastBlock = await BlockchainModel.getLastBlock();
            const blockNumber = lastBlock ? lastBlock.block_number + 1 : 0;
            const previousHash = lastBlock ? lastBlock.block_hash : '0'.repeat(64);

            // 3. Generate Merkle Root
            const txHashes = pendingTxs.map(tx => tx.transaction_id);
            const merkleRoot = BlockchainUtils.generateMerkleRoot(txHashes);

            // 4. Create Block Header
            const blockHeader = {
                block_number: blockNumber,
                previous_hash: previousHash,
                timestamp: new Date().toISOString(),
                merkle_root: merkleRoot,
                nonce: Math.floor(Math.random() * 1000000) // Simplified PoW / Random Nonce
            };

            // 5. Calculate Final Block Hash
            const blockHash = BlockchainUtils.calculateBlockHash(blockHeader);

            // 6. Persist Block
            const block = {
                ...blockHeader,
                block_hash: blockHash,
                transactions: pendingTxs
            };

            await BlockchainModel.saveBlock(block);

            // 7. Clear processed transactions from Mempool
            MempoolService.clearProcessed(pendingTxs.length);

            console.log(`[BlockchainService] Block #${blockNumber} Sealed & Persisted. Hash: ${blockHash.substring(0, 10)}...`);
        } catch (err) {
            console.error("[BlockchainService] ERROR during block scaling:", err);
        } finally {
            this.isSealing = false;
        }
    }

    /**
     * Integrity Watchdog Daemon (Requirement 3.5.2)
     */
    startIntegrityWatchdog() {
        setInterval(async () => {
            try {
                // console.log(`[${new Date().toLocaleTimeString()}] [BlockchainService-Watchdog] Starting periodic integrity verification...`);
                await this.verifyChain();
                // console.log(`[${new Date().toLocaleTimeString()}] [BlockchainService-Watchdog] Integrity verification completed.`);
            } catch (err) {
                console.error("[BlockchainService-Watchdog] FATAL: Watchdog loop encountered an error:", err);
            }
        }, this.WATCHDOG_INTERVAL);
        console.log(`[BlockchainService-Watchdog] Integrity Watchdog initiated (Interval: ${this.WATCHDOG_INTERVAL}ms).`);
    }

    /**
     * Blockchain Integrity Verification (Epic 3 Requirement 4)
     * Checks hash correctness, linkage, and merkle root validity.
     */
    async verifyChain() {
        const blocks = await BlockchainModel.getAllBlocks();
        // console.log(`[BlockchainService] Verifying chain... Blocks count: ${blocks.length}`);
        this.lastIntegrityStatus.lastChecked = new Date().toISOString();

        if (blocks.length === 0) {
            this.lastIntegrityStatus.isValid = true;
            this.lastIntegrityStatus.error = null;
            return true; // Empty chain is valid
        }

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];

            // 1. Verify Header Integrity (Hash Correctness)
            const expectedHash = BlockchainUtils.calculateBlockHash({
                block_number: block.block_number,
                previous_hash: block.previous_hash,
                timestamp: block.timestamp,
                merkle_root: block.merkle_root,
                nonce: block.nonce
            });

            if (block.block_hash !== expectedHash) {
                const errorMsg = `TAMPER DETECTED: Block #${block.block_number} hash mismatch.`;
                console.error(`[BlockchainService] ${errorMsg}`);
                this.lastIntegrityStatus.isValid = false;
                this.lastIntegrityStatus.error = errorMsg;
                return false;
            }

            // 2. Verify Linkage (Previous Hash)
            if (i > 0) {
                const prevBlock = blocks[i - 1];
                if (block.previous_hash !== prevBlock.block_hash) {
                    const errorMsg = `TAMPER DETECTED: Block #${block.block_number} pointer discrepancy.`;
                    console.error(`[BlockchainService] ${errorMsg}`);
                    this.lastIntegrityStatus.isValid = false;
                    this.lastIntegrityStatus.error = errorMsg;
                    return false;
                }
            } else if (block.previous_hash !== '0'.repeat(64)) {
                const errorMsg = `TAMPER DETECTED: Genesis block pointer invalid.`;
                console.error(`[BlockchainService] ${errorMsg}`);
                this.lastIntegrityStatus.isValid = false;
                this.lastIntegrityStatus.error = errorMsg;
                return false;
            }

            // 3. Verify Merkle Root validity
            const txHashes = block.transactions.map(tx => tx.transaction_id);
            const recalculatedMerkleRoot = BlockchainUtils.generateMerkleRoot(txHashes);
            if (block.merkle_root !== recalculatedMerkleRoot) {
                const errorMsg = `TAMPER DETECTED: Block #${block.block_number} Merkle root invalid.`;
                console.error(`[BlockchainService] ${errorMsg}`);
                this.lastIntegrityStatus.isValid = false;
                this.lastIntegrityStatus.error = errorMsg;
                return false;
            }
        }

        this.lastIntegrityStatus.isValid = true;
        this.lastIntegrityStatus.error = null;
        return true;
    }

    /**
     * Get Current Integrity Status for API
     */
    getIntegrityStatus() {
        return this.lastIntegrityStatus;
    }
}

module.exports = new BlockchainService();
