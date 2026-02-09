const { pool } = require('../config/db');

/**
 * Blockchain Model
 * Manages the persistence of blocks to the blockchain_ledger table.
 */

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
        await pool.query(query);
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
    const { rows } = await pool.query(query, values);
    return rows[0].id;
};

const getLastBlock = async () => {
    const query = `SELECT * FROM blockchain_ledger ORDER BY block_number DESC LIMIT 1;`;
    const { rows } = await pool.query(query);
    return rows[0] || null;
};

const getAllBlocks = async () => {
    const query = `SELECT * FROM blockchain_ledger ORDER BY block_number ASC;`;
    const { rows } = await pool.query(query);
    return rows;
};

module.exports = {
    createBlockchainTable,
    saveBlock,
    getLastBlock,
    getAllBlocks
};
