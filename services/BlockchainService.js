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

        // Genesis Block Metadata (Requirement 3.6.1.1)
        this.GENESIS_DATA = {
            election_id: "SECURE_VOTE_2026",
            start_time: "2026-03-08T00:00:00Z",
            admin_public_key: "0xECI_CONTROL_ROOT_KEY_SAMPLE",
            message: "Genesis Block - Secure Transparent Electronic Voting System"
        };
    }

    /**
     * Initializes the Blockchain system.
     * Triggers verification on application startup.
     */
    async initialize() {
        console.log("[BlockchainService] Initializing Ledger...");
        await BlockchainModel.createBlockchainTable();

        // Bootstrap Genesis Block (Requirement 3.6.2.1)
        await this.bootstrapGenesisBlock();

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
     * Bootstraps the Genesis Block if it doesn't exist.
     * Requirement 3.6.2.1
     */
    async bootstrapGenesisBlock() {
        try {
            const lastBlock = await BlockchainModel.getLastBlock();
            if (!lastBlock) {
                console.log("[BlockchainService] Missing Genesis Block. Bootstrapping Block 0...");

                const blockHeader = {
                    block_number: 0,
                    previous_hash: '0'.repeat(64),
                    timestamp: this.GENESIS_DATA.start_time,
                    merkle_root: '0'.repeat(64),
                    nonce: 0 // Genesis block has fixed nonce for reproducibility
                };

                const blockHash = BlockchainUtils.calculateBlockHash(blockHeader);

                const genesisBlock = {
                    ...blockHeader,
                    block_hash: blockHash,
                    transactions: [this.GENESIS_DATA]
                };

                await BlockchainModel.saveBlock(genesisBlock);
                console.log(`[BlockchainService] Genesis Block (Block 0) created successfully. Hash: ${blockHash.substring(0, 10)}...`);
            }
        } catch (err) {
            console.error("[BlockchainService] FAILED to bootstrap Genesis Block:", err);
            throw err;
        }
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
            const blockNumber = lastBlock.block_number + 1;
            const previousHash = lastBlock.block_hash;

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
     * @param {Array} blocksToVerify - Optional array of blocks. If null, fetches from DB.
     */
    async verifyChain(blocksToVerify = null) {
        const blocks = blocksToVerify || await BlockchainModel.getAllBlocks();
        this.lastIntegrityStatus.lastChecked = new Date().toISOString();

        if (blocks.length === 0) {
            if (!blocksToVerify) {
                this.lastIntegrityStatus.isValid = true;
                this.lastIntegrityStatus.error = null;
            }
            return true;
        }

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            // 0. Condition-based Verification
            if (parseInt(block.block_number) === 0) {
                // Root block must have '0'.repeat(64) previous_hash
                if (block.previous_hash !== '0'.repeat(64)) {
                    const errorMsg = `TAMPER DETECTED: Genesis block pointer invalid.`;
                    if (!blocksToVerify) {
                        this.lastIntegrityStatus.isValid = false;
                        this.lastIntegrityStatus.error = errorMsg;
                    }
                    return false;
                }
                // Verify Genesis Payload matches hardcoded metadata
                const genesisTx = block.transactions[0];
                if (!genesisTx || genesisTx.election_id !== this.GENESIS_DATA.election_id) {
                    const errorMsg = `TAMPER DETECTED: Genesis Block election metadata corrupted.`;
                    if (!blocksToVerify) {
                        this.lastIntegrityStatus.isValid = false;
                        this.lastIntegrityStatus.error = errorMsg;
                    }
                    return false;
                }
            } else if (i === 0 && !blocksToVerify) {
                // If we are verifying the full chain from DB, the FIRST block in the set MUST be Block #0
                const errorMsg = `TAMPER DETECTED: Root block must be Block #0`;
                this.lastIntegrityStatus.isValid = false;
                this.lastIntegrityStatus.error = errorMsg;
                return false;
            } else if (i > 0) {
                // Linkage check only if we have a previous block in the CURRENT array
                const prevBlock = blocks[i - 1];
                if (block.previous_hash !== prevBlock.block_hash) {
                    const errorMsg = `TAMPER DETECTED: Block #${block.block_number} pointer discrepancy.`;
                    if (!blocksToVerify) {
                        this.lastIntegrityStatus.isValid = false;
                        this.lastIntegrityStatus.error = errorMsg;
                    }
                    return false;
                }
            }

            const expectedHash = BlockchainUtils.calculateBlockHash({
                block_number: block.block_number,
                previous_hash: block.previous_hash,
                timestamp: block.timestamp,
                merkle_root: block.merkle_root,
                nonce: block.nonce
            });

            if (block.block_hash !== expectedHash) {
                const errorMsg = `TAMPER DETECTED: Block #${block.block_number} hash mismatch.`;
                if (!blocksToVerify) {
                    this.lastIntegrityStatus.isValid = false;
                    this.lastIntegrityStatus.error = errorMsg;
                }
                return false;
            }

            const txHashes = block.transactions.map(tx => tx.transaction_id || tx.election_id); // Handle genesis metadata too
            const recalculatedMerkleRoot = BlockchainUtils.generateMerkleRoot(txHashes);
            if (block.merkle_root !== recalculatedMerkleRoot) {
                const errorMsg = `TAMPER DETECTED: Block #${block.block_number} Merkle root invalid.`;
                if (!blocksToVerify) {
                    this.lastIntegrityStatus.isValid = false;
                    this.lastIntegrityStatus.error = errorMsg;
                }
                return false;
            }
        }

        if (!blocksToVerify) {
            this.lastIntegrityStatus.isValid = true;
            this.lastIntegrityStatus.error = null;
        }
        return true;
    }

    /**
     * Resolves conflicting data histories (Longest Chain Rule)
     * Requirement 3.9.1.1 & 3.9.2.1
     */
    async handleIncomingBlock(block, peerUrl) {
        const lastLocalBlock = await BlockchainModel.getLastBlock();
        
        if (!lastLocalBlock) {
            await this.syncWithPeer(peerUrl);
            return;
        }

        // 1. Longest Chain Rule: If the incoming block is further ahead
        if (block.block_number > lastLocalBlock.block_number) {
            console.log(`[BlockchainService] Incoming Block #${block.block_number} is ahead of us (#${lastLocalBlock.block_number}).`);
            
            // Check if it's the immediate next block and points to our current tip
            if (block.block_number === lastLocalBlock.block_number + 1 && block.previous_hash === lastLocalBlock.block_hash) {
                // Validate individual block
                const isValid = await this.verifyChain([lastLocalBlock, block]);
                if (isValid) {
                    await BlockchainModel.saveBlock(block);
                    console.log(`[BlockchainService] Successfully added Block #${block.block_number} to chain.`);
                } else {
                    console.warn(`[BlockchainService] REJECTED Block #${block.block_number}: Invalid linkage or hash.`);
                }
            } else {
                // Fork or large gap detected: Sync the whole chain
                console.log(`[BlockchainService] Potential Fork or Gap detected. Triggering full sync with ${peerUrl}...`);
                await this.syncWithPeer(peerUrl);
            }
        }
    }

    /**
     * Synchronizes the entire ledger from a peer.
     * Requirement 3.9.3.1
     */
    async syncWithPeer(peerUrl) {
        try {
            console.log(`[BlockchainService] Syncing chain from ${peerUrl}...`);
            const response = await fetch(`${peerUrl}/api/p2p/chain`);
            if (!response.ok) throw new Error("Failed to fetch chain from peer");

            const { chain: remoteChain } = await response.json();
            const lastLocalBlock = await BlockchainModel.getLastBlock();

            // Only sync if remote chain is longer
            if (remoteChain.length > (lastLocalBlock ? lastLocalBlock.block_number + 1 : 0)) {
                // VALIDATE FULL REMOTE CHAIN BEFORE ACCEPTING
                const isValid = await this.verifyChain(remoteChain);
                if (isValid) {
                    await BlockchainModel.replaceChain(remoteChain);
                    console.log(`[BlockchainService] Local chain replaced with longer valid chain from ${peerUrl} (Length: ${remoteChain.length}).`);
                } else {
                    console.warn(`[BlockchainService] REJECTED chain from ${peerUrl}: Integrity check failed.`);
                }
            } else {
                console.log(`[BlockchainService] Peer chain is not longer. Skipping sync.`);
            }
        } catch (err) {
            console.error(`[BlockchainService] Sync failed for ${peerUrl}:`, err.message);
        }
    }

    /**
     * Get Current Integrity Status for API
     */
    getIntegrityStatus() {
        return this.lastIntegrityStatus;
    }
}

module.exports = new BlockchainService();
