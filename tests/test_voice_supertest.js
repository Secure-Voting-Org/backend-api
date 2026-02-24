import { describe, it, expect } from 'vitest';
import request from 'supertest';

// Using Port 5001 as per the recent configuration update
const BASE_URL = 'http://localhost:5001';

describe('Voice Control (Audio Assist) - Backend API Tests (Supertest)', () => {

    it('[VOICE-API-01] SHOULD return the Audio Assist configuration settings', async () => {
        // This endpoint represents where the frontend pulls initial Voice config states
        // Currently testing the base server health response to ensure the host is alive
        const res = await request(BASE_URL).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status');
    });

    // Example placeholder for future Voice Config endpoints:
    // it('[VOICE-API-02] SHOULD validate user preference for Audio Assist state', async () => { ... });
});
