import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIpVelocity, FRAUD_CONFIG } from '../utils/fraudEngine';

describe('Fraud Engine - Velocity Checks', () => {
    let mockPool;

    beforeEach(() => {
        mockPool = {
            query: vi.fn(),
        };
    });

    it('should return FALSE when velocity is below limit', async () => {
        // Mock DB response: count = 1
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });

        // Pass mockPool explicitly (Dependency Injection)
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
        mockPool.query.mockResolvedValueOnce({ rows: [{ count: limit }] });

        const result = await checkIpVelocity('127.0.0.1', 'REGISTRATION', mockPool);

        expect(result).toBe(true);
    });

    it('should return FALSE for unknown action type', async () => {
        const result = await checkIpVelocity('127.0.0.1', 'UNKNOWN_ACTION', mockPool);
        expect(result).toBe(false);
        expect(mockPool.query).not.toHaveBeenCalled();
    });
});
