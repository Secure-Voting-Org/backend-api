import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as BlockchainModel from '../models/BlockchainModel.js';

describe('Module 9: Fork Resolution & Consensus (Longest Chain)', () => {
    let mockClient;
    let mockPool;

    beforeEach(() => {
        vi.clearAllMocks();
        mockClient = {
            query: vi.fn(),
            release: vi.fn()
        };
        mockPool = {
            query: vi.fn(),
            connect: vi.fn().mockResolvedValue(mockClient)
        };
        BlockchainModel.setPool(mockPool);
    });

    it('should reject a chain that is shorter or equal in length', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ block_number: 0 }, { block_number: 1 }] }); // Current chain len 2
        
        const newChain = [{ block_number: 0 }]; // Incoming chain len 1
        const result = await BlockchainModel.replaceChain(newChain);
        
        expect(result).toBe(false);
        expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should reject a chain with a different Genesis Block', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ block_number: 0, block_hash: 'hashA' }] }); // Current genesis hashA
        
        const newChain = [
            { block_number: 0, block_hash: 'hashB' }, // Different genesis
            { block_number: 1, block_hash: 'hashC' }
        ];
        const result = await BlockchainModel.replaceChain(newChain);
        
        expect(result).toBe(false);
        expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should replace the chain successfully if it is longer and valid', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ block_number: 0, block_hash: 'hashA' }] }); // Current len 1
        
        const newChain = [
            { block_number: 0, block_hash: 'hashA', previous_hash: '0', merkle_root: 'm', nonce: 0, transactions: [] },
            { block_number: 1, block_hash: 'hashB', previous_hash: 'hashA', merkle_root: 'm2', nonce: 1, transactions: [] }
        ];

        const result = await BlockchainModel.replaceChain(newChain);
        
        expect(result).toBe(true);
        // It starts a transaction, truncates, inserts 2 blocks, commits
        expect(mockClient.query).toHaveBeenCalledTimes(5);
        expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
        expect(mockClient.query).toHaveBeenNthCalledWith(2, 'TRUNCATE TABLE blockchain_ledger RESTART IDENTITY');
        expect(mockClient.query.mock.calls[2][0]).toContain('INSERT INTO');
        expect(mockClient.query.mock.calls[3][0]).toContain('INSERT INTO');
        expect(mockClient.query).toHaveBeenNthCalledWith(5, 'COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on database error', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ block_number: 0, block_hash: 'hashA' }] }); 
        
        const newChain = [
            { block_number: 0, block_hash: 'hashA', previous_hash: '0', merkle_root: 'm', nonce: 0, transactions: [] },
            { block_number: 1, block_hash: 'hashB', previous_hash: 'hashA', merkle_root: 'm2', nonce: 1, transactions: [] }
        ];

        // Simulate INSERT error
        mockClient.query.mockImplementation((q) => {
            if (q.includes('INSERT')) throw new Error('DB Crash');
        });

        const result = await BlockchainModel.replaceChain(newChain);
        
        expect(result).toBe(false);
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
    });
});
