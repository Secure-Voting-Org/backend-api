import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../config/db.js';
import { createBlockchainTable, getLastBlock, getAllBlocks } from '../models/BlockchainModel.js';

describe('Module 6: Genesis Block Initialization', () => {
    
    beforeAll(async () => {
        // Clear table for testing
        await pool.query('DROP TABLE IF EXISTS blockchain_ledger CASCADE;');
        await createBlockchainTable(); // This should create table AND init Genesis
    });

    afterAll(async () => {
        // Clean up
        // await pool.query('DROP TABLE IF EXISTS blockchain_ledger CASCADE;');
        // Note: keeping the table so other tests don't break, but ideally tests run in an isolated DB
    });

    it('should create the Genesis Block (Block 0) on initialization', async () => {
        const blocks = await getAllBlocks();
        expect(blocks.length).toBeGreaterThan(0);
        
        const genesis = blocks[0];
        expect(genesis.block_number).toBe(0);
        expect(genesis.previous_hash).toBe('0'.repeat(64));
        expect(genesis.transactions[0].type).toBe('GENESIS');
    });

    it('should not duplicate the Genesis Block on subsequent initializations', async () => {
        await createBlockchainTable(); // Call again
        
        const blocks = await getAllBlocks();
        const genesisBlocks = blocks.filter(b => b.block_number === 0);
        
        expect(genesisBlocks.length).toBe(1); // Still only one
    });
});
