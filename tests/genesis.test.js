import { describe, it, expect, beforeEach, vi } from 'vitest';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const BlockchainService = require('../services/BlockchainService');
const BlockchainModel = require('../models/BlockchainModel');
const { pool } = require('../config/db');

describe('User Story 3.6: Genesis Block Implementation', () => {
    
    beforeEach(async () => {
        // Clear blockchain ledger for testing
        await pool.query('TRUNCATE TABLE blockchain_ledger RESTART IDENTITY');
    });

    it('3.6.2.1: Should automatically create Block 0 on initialization if missing', async () => {
        // Initially empty
        const initialBlocks = await BlockchainModel.getAllBlocks();
        expect(initialBlocks.length).toBe(0);

        // Initialize service
        await BlockchainService.bootstrapGenesisBlock();

        const blocks = await BlockchainModel.getAllBlocks();
        expect(blocks.length).toBe(1);
        expect(blocks[0].block_number).toBe(0);
        expect(blocks[0].previous_hash).toBe('0'.repeat(64));
    });

    it('3.6.1.1: Genesis Block should contain correct election metadata', async () => {
        await BlockchainService.bootstrapGenesisBlock();
        const blocks = await BlockchainModel.getAllBlocks();
        const genesisBlock = blocks[0];
        
        const transactions = genesisBlock.transactions;
        expect(transactions.length).toBe(1);
        expect(transactions[0].election_id).toBe('SECURE_VOTE_2026');
        expect(transactions[0].admin_public_key).toBe('0xECI_CONTROL_ROOT_KEY_SAMPLE');
    });

    it('3.6.3.1: System should fail verification if Block 0 is tampered', async () => {
        await BlockchainService.bootstrapGenesisBlock();
        
        // Manual tamper: Change election_id in database
        await pool.query("UPDATE blockchain_ledger SET transactions = '[{\"election_id\": \"HACKED_ELECTION\"}]' WHERE block_number = 0");
        
        const isValid = await BlockchainService.verifyChain();
        expect(isValid).toBe(false);
        expect(BlockchainService.getIntegrityStatus().error).toContain('Genesis Block election metadata corrupted');
    });

    it('3.6.3.1: System should fail verification if first block is not Block 0', async () => {
        // Manually insert Block 1 instead of 0
        await pool.query(`
            INSERT INTO blockchain_ledger 
            (block_number, previous_hash, merkle_root, nonce, block_hash, transactions) 
            VALUES (1, '0000000000000000000000000000000000000000000000000000000000000000', 'merkle', 0, 'hash123', '[{}]')
        `);

        const isValid = await BlockchainService.verifyChain();
        expect(isValid).toBe(false);
        expect(BlockchainService.getIntegrityStatus().error).toContain('Root block must be Block #0');
    });
});
