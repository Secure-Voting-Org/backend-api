import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest';
const ExternalStorageService = require('../utils/ExternalStorageService');
const SmartContract = require('../utils/SmartContract');
const BlockchainUtils = require('../utils/BlockchainUtils');
const BlindSignature = require('../utils/BlindSignature');
const { pool } = require('../config/db');

describe('User Story 3.10: External Storage Layer', () => {
    
    beforeAll(async () => {
        // Ensure table exists (Requirement 3.10.1.1)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS external_metadata (
                hash VARCHAR(64) PRIMARY KEY,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    });

    beforeEach(async () => {
        // Clean up external_metadata table
        await pool.query('TRUNCATE TABLE external_metadata CASCADE');
        vi.restoreAllMocks();
    });

    it('3.10.1.1: Should store data and return a cryptographic reference', async () => {
        const data = { test: 'metadata', heavy: 'payload'.repeat(10) };
        const ref = await ExternalStorageService.store(data);

        expect(ref).toMatch(/^ipfs:\/\/[a-f0-9]{64}$/);
        
        const retrieved = await ExternalStorageService.retrieve(ref);
        // JSONB returns object directly
        expect(retrieved).toEqual(data);
    });

    it('3.10.2.1: SmartContract should offload signature to external storage', async () => {
        const voteData = {
            vote: 'CAND_001',
            auth_token: 'valid_token_123',
            signature: 'valid_signature_456',
            constituency: 'ZONE_A'
        };

        // Mock dependencies
        vi.spyOn(BlindSignature, 'verify').mockReturnValue(true);
        vi.spyOn(BlindSignature, 'getKey').mockReturnValue({ n: '123', e: '3' });
        
        vi.spyOn(pool, 'query').mockImplementation((q, v) => {
            if (q.includes('candidates')) return Promise.resolve({ rows: [{ id: 'CAND_001' }] });
            if (q.includes('votes')) return Promise.resolve({ rows: [] });
            if (q.includes('INSERT INTO external_metadata')) return Promise.resolve({ rows: [] });
            if (q.includes('election_config')) return Promise.resolve({ rows: [{ phase: 'LIVE', is_kill_switch_active: false }] });
            return Promise.resolve({ rows: [] });
        });

        const result = await SmartContract.invokeVote(voteData);

        if (!result.isValid) console.error("Validation failed:", result.error);

        expect(result.isValid).toBe(true);
        expect(result.sanitizedTx).toHaveProperty('metadata_ref');
        expect(result.sanitizedTx.metadata_ref).toMatch(/^ipfs:\/\//);
        expect(result.sanitizedTx).not.toHaveProperty('digital_signature');
        expect(result.sanitizedTx).not.toHaveProperty('public_key');
        
        expect(result.sanitizedTx).toHaveProperty('vote_hash');
        expect(result.sanitizedTx.vote_hash).toBe(BlockchainUtils.hash('CAND_001'));
    });

    it('3.10.3.1: Should return null for invalid references', async () => {
        const retrieved = await ExternalStorageService.retrieve('ipfs://non_existent_hash');
        expect(retrieved).toBeNull();
    });
});
