import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js'; // Assuming app.js exports the express instance

const BASE_URL = 'http://localhost:5000';

describe('Backend API Testing - Fraud Detection (Supertest)', () => {
    let adminToken = '';

    beforeAll(async () => {
        // Attempt Admin Login to fetch a valid JWT token
        const res = await request(BASE_URL)
            .post('/api/auth/login')
            .send({ username: 'sys_admin', password: 'admin_password123' }); // Adjust if needed

        if (res.body.token) {
            adminToken = res.body.token;
        }
    });

    it('[Fraud] SHOULD inject a Fake Vote into the database', async () => {
        const res = await request(BASE_URL)
            .post('/api/admin/inject-fake-vote')
            .set('Authorization', `Bearer ${adminToken}`);

        // As per the recent fix, the endpoints no longer mandate strict authentication for tests
        // so we can expect a 200 OK regardless of x-device-hash
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('Fake vote injected');
    });

    it('[Fraud] SHOULD clear the test data successfully', async () => {
        const res = await request(BASE_URL)
            .post('/api/admin/clear-fake-votes')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('stopped');
    });

});
