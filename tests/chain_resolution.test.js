import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
const BlockchainService = require('../services/BlockchainService');
const BlockchainModel = require('../models/BlockchainModel');
const BlockchainUtils = require('../utils/BlockchainUtils');

describe('User Story 3.9: Chain Resolution & Sync', () => {
    
    beforeEach(() => {
        vi.restoreAllMocks();
        global.fetch = vi.fn();
        
        // Mock BlockchainModel
        vi.spyOn(BlockchainModel, 'saveBlock').mockResolvedValue(true);
        vi.spyOn(BlockchainModel, 'replaceChain').mockResolvedValue(true);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('3.9.1.1: Should accept a valid next block (immediate extension)', async () => {
        const lastBlock = { 
            block_number: 1, 
            previous_hash: '0'.repeat(64),
            timestamp: 't0',
            merkle_root: '0'.repeat(64),
            nonce: 0,
            transactions: []
        };
        lastBlock.block_hash = BlockchainUtils.calculateBlockHash(lastBlock);
        vi.spyOn(BlockchainModel, 'getLastBlock').mockResolvedValue(lastBlock);
        
        const nextBlock = { 
            block_number: 2, 
            previous_hash: lastBlock.block_hash, 
            timestamp: new Date().toISOString(),
            merkle_root: '0'.repeat(64),
            nonce: 123,
            transactions: []
        };
        nextBlock.block_hash = BlockchainUtils.calculateBlockHash(nextBlock);

        await BlockchainService.handleIncomingBlock(nextBlock, 'http://peer:5000');

        expect(BlockchainModel.saveBlock).toHaveBeenCalledWith(nextBlock);
    });

    it('3.9.2.1: Should trigger full sync if a fork/gap is detected', async () => {
        const lastBlock = { 
            block_number: 1, 
            block_hash: 'h1',
            previous_hash: '0'.repeat(64),
            timestamp: 't1',
            merkle_root: '0'.repeat(64),
            nonce: 1
        };
        vi.spyOn(BlockchainModel, 'getLastBlock').mockResolvedValue(lastBlock);
        
        // Incoming block is #3 (gap of 1 block)
        const incomingBlock = { block_number: 3, previous_hash: 'some_other_hash' };
        
        // Mock sync endpoint
        const remoteChain = [
            { 
                block_number: 0, 
                previous_hash: '0'.repeat(64), 
                transactions: [BlockchainService.GENESIS_DATA], 
                merkle_root: BlockchainUtils.generateMerkleRoot([BlockchainService.GENESIS_DATA.election_id]), 
                timestamp: BlockchainService.GENESIS_DATA.start_time, 
                nonce: 0
            },
            { 
                block_number: 1, 
                previous_hash: '', // will be set below
                transactions: [], 
                merkle_root: '0'.repeat(64), 
                timestamp: 't1', 
                nonce: 1 
            },
            { 
                block_number: 2, 
                previous_hash: '', // will be set below
                transactions: [], 
                merkle_root: '0'.repeat(64), 
                timestamp: 't2', 
                nonce: 2 
            }
        ];
        
        // Correctly link and hash the chain
        remoteChain[0].block_hash = BlockchainUtils.calculateBlockHash(remoteChain[0]);
        remoteChain[1].previous_hash = remoteChain[0].block_hash;
        remoteChain[1].block_hash = BlockchainUtils.calculateBlockHash(remoteChain[1]);
        remoteChain[2].previous_hash = remoteChain[1].block_hash;
        remoteChain[2].block_hash = BlockchainUtils.calculateBlockHash(remoteChain[2]);

        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ chain: remoteChain })
        });

        await BlockchainService.handleIncomingBlock(incomingBlock, 'http://peer:5000');

        expect(BlockchainModel.replaceChain).toHaveBeenCalledWith(remoteChain);
    });

    it('3.9.3.1: Should reject a longer but invalid chain', async () => {
        const lastBlock = { block_number: 1, block_hash: 'hash1' };
        vi.spyOn(BlockchainModel, 'getLastBlock').mockResolvedValue(lastBlock);
        
        const tamperedChain = [
            { block_number: 0, block_hash: 'BAD_HASH', previous_hash: '000', transactions: [{election_id: 'WRONG'}] }
        ];

        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ chain: tamperedChain })
        });

        await BlockchainService.syncWithPeer('http://peer:5000');

        expect(BlockchainModel.replaceChain).not.toHaveBeenCalled();
    });
});
