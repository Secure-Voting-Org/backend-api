const { pool } = require('../config/db');

/**
 * Blockchain Model
 * Manages the persistence of blocks to the blockchain_ledger table.
 * Genesis Block is managed by BlockchainService, not here.
 */

let dbPool = pool;

const setPool = (mockPool) => {
    dbPool = mockPool;
};

const createBlockchainTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS blockchain_ledger (
        id SERIAL PRIMARY KEY,
        block_number INT NOT NULL UNIQUE,
        previous_hash VARCHAR(64) NOT NULL,
        merkle_root VARCHAR(64) NOT NULL,
        nonce INT NOT NULL,
        block_hash VARCHAR(64) NOT NULL UNIQUE,
        transactions JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    try {
        await dbPool.query(query);
        console.log("Blockchain Ledger Table Initialized.");
    } catch (err) {
        console.error("Error creating blockchain table:", err);
    }
};

const saveBlock = async (block) => {
    const { block_number, previous_hash, merkle_root, nonce, block_hash, transactions } = block;
    const query = `
    INSERT INTO blockchain_ledger 
    (block_number, previous_hash, merkle_root, nonce, block_hash, transactions) 
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id;`;
    const values = [block_number, previous_hash, merkle_root, nonce, block_hash, JSON.stringify(transactions)];
    const { rows } = await dbPool.query(query, values);
    return rows[0].id;
};

const getLastBlock = async () => {
    const query = `SELECT * FROM blockchain_ledger ORDER BY block_number DESC LIMIT 1;`;
    const { rows } = await dbPool.query(query);
    return rows[0] || null;
};

const getAllBlocks = async () => {
    const query = `SELECT * FROM blockchain_ledger ORDER BY block_number ASC;`;
    const { rows } = await dbPool.query(query);
    return rows;
};

const replaceChain = async (newChain) => {
    // Basic Longest Chain Rule validation
    const currentBlocks = await getAllBlocks();
    
    // 1. Must be strictly longer
    if (newChain.length <= currentBlocks.length) {
        console.log("Consensus: Received chain is not longer.");
        return false;
    }
    
    // 2. Must share the same Genesis Block
    if (currentBlocks.length > 0 && newChain[0].block_hash !== currentBlocks[0].block_hash) {
        console.log("Consensus: Received chain has invalid Genesis block.");
        return false;
    }

    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE blockchain_ledger RESTART IDENTITY');
        
        for (const block of newChain) {
            const query = `
                INSERT INTO blockchain_ledger 
                (block_number, previous_hash, merkle_root, nonce, block_hash, transactions, timestamp) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            const txData = typeof block.transactions === 'string' ? block.transactions : JSON.stringify(block.transactions);
            const values = [
                block.block_number, 
                block.previous_hash, 
                block.merkle_root, 
                block.nonce, 
                block.block_hash, 
                txData,
                block.timestamp || new Date()
            ];
            await client.query(query, values);
        }
        await client.query('COMMIT');
        console.log("Consensus: Chain replaced successfully.");
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Consensus Error: Chain replacement failed, rolled back.", err);
        return false;
    } finally {
        client.release();
    }
};

module.exports = {
    createBlockchainTable,
    saveBlock,
    getLastBlock,
    getAllBlocks,
    replaceChain,
    setPool
};
