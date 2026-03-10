import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const SmartContract = require('../utils/SmartContract');
const BlindSignature = require('../utils/BlindSignature');
const { pool } = require('../config/db');

describe('User Story 3.7: Smart Contract Validation', () => {
    
    // Test data
    const validVote = {
        vote: '1', // Candidate ID
        auth_token: '123456789',
        signature: 'sig123',
        constituency: 'Kuppam'
    };

    beforeEach(async () => {
        // Reset database state for testing
        await pool.query('TRUNCATE TABLE votes RESTART IDENTITY');
        await pool.query('TRUNCATE TABLE candidates RESTART IDENTITY');
        await pool.query('TRUNCATE TABLE election_config RESTART IDENTITY');
        
        // Seed a candidate
        await pool.query("INSERT INTO candidates (id, name, constituency) VALUES (1, 'Test Candidate', 'Kuppam')");
        
        // Seed LIVE election phase
        await pool.query("INSERT INTO election_config (id, phase, is_kill_switch_active) VALUES (1, 'LIVE', false)");

        // Mock Signature Verification to return true by default
        vi.spyOn(BlindSignature, 'verify').mockReturnValue(true);
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it('3.7.1.1: Should accept a valid vote payload', async () => {
        const result = await SmartContract.invokeVote(validVote);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedTx).toBeDefined();
        expect(result.sanitizedTx.candidate_id).toBe('1');
    });

    it('3.7.2.1: Should reject invalid blind signatures', async () => {
        vi.spyOn(BlindSignature, 'verify').mockReturnValue(false);
        const result = await SmartContract.invokeVote(validVote);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Cryptographic signature verification failed');
    });

    it('3.7.3.1: Should reject non-existent candidate IDs', async () => {
        const invalidVote = { ...validVote, vote: '999' };
        const result = await SmartContract.invokeVote(invalidVote);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid Candidate ID');
    });

    it('3.7.3.1: Should reject votes when election is NOT LIVE', async () => {
        await pool.query("UPDATE election_config SET phase = 'POST_POLL' WHERE id = 1");
        const result = await SmartContract.invokeVote(validVote);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be LIVE');
    });

    it('3.7.3.1: Should reject votes when kill switch is active', async () => {
        await pool.query("UPDATE election_config SET is_kill_switch_active = true WHERE id = 1");
        const result = await SmartContract.invokeVote(validVote);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('suspended by Admin');
    });

    it('3.7.2.1: Should reject duplicate votes (same token)', async () => {
        // First vote
        await SmartContract.invokeVote(validVote);
        
        // Manually insert into votes table to simulate persistent storage
        const crypto = require('crypto');
        const voter_id_hash = crypto.createHash('sha256').update(validVote.auth_token).digest('hex');
        await pool.query("INSERT INTO votes (voter_id, candidate_id, constituency, transaction_hash) VALUES ($1, $2, $3, $4)", 
            [voter_id_hash, validVote.vote, validVote.constituency, 'hash123']);

        // Second vote with same token
        const result = await SmartContract.invokeVote(validVote);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duplicate vote detected');
    });

    it('3.7.2.1: Should reject missing format fields', async () => {
        const result = await SmartContract.invokeVote({ vote: '1' }); // missing others
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid format');
    });
});
