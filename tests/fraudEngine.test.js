import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIpVelocity, FRAUD_CONFIG } from '../utils/fraudEngine';

// Mock the database module
// Since fraudEngine uses require('../config/db'), we need to mock that module.
vi.mock('../config/db', () => {
    return {
        pool: {
            query: vi.fn(),
        },
    };
});

import { pool } from '../config/db';

describe('Fraud Engine - Velocity Checks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return FALSE when velocity is below limit', async () => {
        // Mock DB response: count = 1 (Below limit of 3)
        pool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });

        const result = await checkIpVelocity('127.0.0.1', 'REGISTRATION');

        expect(result).toBe(false);
        expect(pool.query).toHaveBeenCalledTimes(1);
        // Verify query parameters
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT COUNT(*)'),
            ['127.0.0.1']
        );
    });

    it('should return TRUE when velocity exceeds limit', async () => {
        // Mock DB response: count = 3 (Equal/Above limit)
        const limit = FRAUD_CONFIG.REGISTRATION_VELOCITY_LIMIT;
        pool.query.mockResolvedValueOnce({ rows: [{ count: limit }] });

        const result = await checkIpVelocity('127.0.0.1', 'REGISTRATION');

        expect(result).toBe(true);
    });

    it('should return FALSE for unknown action type', async () => {
        const result = await checkIpVelocity('127.0.0.1', 'UNKNOWN_ACTION');
        expect(result).toBe(false);
        expect(pool.query).not.toHaveBeenCalled();
    });
});
