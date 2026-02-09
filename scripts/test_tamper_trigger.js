const { pool } = require('../config/db');
const BlockchainUtils = require('../utils/BlockchainUtils');

async function tamperWithData() {
    console.log("--- TAMPING WITH BLOCKCHAIN DATA ---");
    try {
        // 1. Check if we have any blocks. If not, create a Genesis block first.
        const checkQuery = "SELECT COUNT(*) FROM blockchain_ledger";
        const checkRes = await pool.query(checkQuery);
        const count = parseInt(checkRes.rows[0].count);

        if (count === 0) {
            console.log("No blocks found. Creating a Genesis block for testing...");
            const genesisHeader = {
                block_number: 0,
                previous_hash: '0'.repeat(64),
                timestamp: new Date().toISOString(),
                merkle_root: '0'.repeat(64),
                nonce: 12345
            };
            const genesisHash = BlockchainUtils.calculateBlockHash(genesisHeader);
            const insertQuery = `
                INSERT INTO blockchain_ledger 
                (block_number, previous_hash, merkle_root, nonce, block_hash, transactions) 
                VALUES ($1, $2, $3, $4, $5, $6)`;
            await pool.query(insertQuery, [0, genesisHeader.previous_hash, genesisHeader.merkle_root, genesisHeader.nonce, genesisHash, JSON.stringify([])]);
            console.log("✓ Genesis block created.");
        }

        // 2. Corrupt the block
        const query = "UPDATE blockchain_ledger SET block_hash = 'TAMPERED_HASH' WHERE block_number = 0";
        await pool.query(query);
        console.log("✓ Successfully corrupted block #0. Wait up to 30 seconds for watchdog to detect...");

    } catch (err) {
        console.error("Failed to tamper with data:", err);
    } finally {
        pool.end();
    }
}

tamperWithData();
