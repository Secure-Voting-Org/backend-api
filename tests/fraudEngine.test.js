import { describe, it, expect, vi } from 'vitest';
import { checkIpVelocity, checkDeviceVelocity, FRAUD_CONFIG } from '../utils/fraudEngine';

// Mock the Log module to prevent real DB inserts during tests
vi.mock('../models/Log', () => ({
    createLog: vi.fn(),
}));

describe('Fraud Engine - Velocity Checks', () => {

    it('should return FALSE when velocity is below limit', async () => {
        // Create an explicit mock pool
        const mockPool = {
            query: vi.fn().mockResolvedValueOnce({ rows: [{ count: 1 }] })
        };

        // Pass mockPool to the function directly (dependency injection)
        const result = await checkIpVelocity('127.0.0.1', 'REGISTRATION', mockPool);

        expect(result).toBe(false);
        expect(mockPool.query).toHaveBeenCalledTimes(1);
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT COUNT(*)'),
            ['127.0.0.1']
        );
    });

    it('should return TRUE when velocity exceeds limit', async () => {
        const limit = FRAUD_CONFIG.REGISTRATION_VELOCITY_LIMIT;

        const mockPool = {
            query: vi.fn().mockResolvedValueOnce({ rows: [{ count: limit }] })
        };

        const result = await checkIpVelocity('127.0.0.1', 'REGISTRATION', mockPool);

        expect(result).toBe(true);
    });

    it('should return FALSE for unknown action type', async () => {
        const mockPool = { query: vi.fn() };

        const result = await checkIpVelocity('127.0.0.1', 'UNKNOWN_ACTION', mockPool);

        expect(result).toBe(false);
        // The unknown action type returns false early, before querying the db
        expect(mockPool.query).not.toHaveBeenCalled();
    });
});
