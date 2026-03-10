import { describe, it, expect } from 'vitest';
import SmartContract from '../services/SmartContract.js';

// Simple mock function to inject into the Smart Contract
const mockGetElectionStatus = async () => ({ phase: 'LIVE' });

describe('Module 7: Smart Contract for Vote Logic', () => {

    it('should reject votes missing required fields', async () => {
        const result = await SmartContract.invokeVote({ voter_id: '123' }, mockGetElectionStatus);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Missing required vote fields');
    });

    it('should reject votes with invalid signature formats', async () => {
        const vote = {
            voter_id: '123',
            candidate_id: 1,
            encrypted_vote: 'enc123',
            signature: 'invalid_sig!@#',
            timestamp: new Date().toISOString()
        };
        const result = await SmartContract.invokeVote(vote, mockGetElectionStatus);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid signature format');
    });

    it('should reject votes with invalid candidate IDs', async () => {
        const vote = {
            voter_id: '123',
            candidate_id: -5,
            encrypted_vote: 'enc123',
            signature: 'YWJjZA==', // valid base64
            timestamp: new Date().toISOString()
        };
        const result = await SmartContract.invokeVote(vote, mockGetElectionStatus);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid candidate ID');
    });

    it('should reject expired votes (replay protection)', async () => {
        const pastDate = new Date(Date.now() - (10 * 60 * 1000)); // 10 mins ago
        const vote = {
            voter_id: '123',
            candidate_id: 1,
            encrypted_vote: 'enc123',
            signature: 'YWJjZA==',
            timestamp: pastDate.toISOString()
        };
        const result = await SmartContract.invokeVote(vote, mockGetElectionStatus);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Vote timestamp expired');
    });

    it('should accept valid votes', async () => {
        const vote = {
            voter_id: '123',
            candidate_id: 1,
            encrypted_vote: 'enc123',
            signature: 'YWJjZA==',
            timestamp: new Date().toISOString()
        };
        const result = await SmartContract.invokeVote(vote, mockGetElectionStatus);
        expect(result.valid).toBe(true);
    });
});
