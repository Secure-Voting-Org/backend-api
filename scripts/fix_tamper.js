const { pool } = require('../config/db');
const BlockchainUtils = require('../utils/BlockchainUtils');

async function fixTamper() {
    console.log("--- RESTORING BLOCKCHAIN INTEGRITY ---");
    try {
        // 1. Fetch the corrupted block
        const query = "SELECT * FROM blockchain_ledger WHERE block_number = 0";
        const res = await pool.query(query);

        if (res.rows.length === 0) {
            console.log("No blocks found to fix.");
            return;
        }

        const block = res.rows[0];

        // 2. Recalculate the CORRECT hash using the original data
        const correctHash = BlockchainUtils.calculateBlockHash({
            block_number: block.block_number,
            previous_hash: block.previous_hash,
            timestamp: block.timestamp,
            merkle_root: block.merkle_root,
            nonce: block.nonce
        });

        // 3. Update the database with the correct hash
        await pool.query("UPDATE blockchain_ledger SET block_hash = $1 WHERE block_number = 0", [correctHash]);

        console.log("✓ Successfully restored Block #0 hash.");
        console.log("✓ The portal will turn GREEN automatically in the next watchdog cycle (30s).");
    } catch (err) {
        console.error("Failed to fix data:", err);
    } finally {
        pool.end();
    }
}

fixTamper();
