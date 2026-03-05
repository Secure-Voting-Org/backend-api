import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Backend API Testing - Fraud Detection (Supertest)', () => {
    let adminToken = '';

    beforeAll(async () => {
        // Attempt SysAdmin Login to fetch a valid JWT token
        const res = await request(app)
            .post('/api/sys-admin/login')
            .send({ username: 'sys_admin', password: 'sysadmin123' });

        if (res.body.token) {
            adminToken = res.body.token;
        }
    });

    it('[Fraud] SHOULD inject a Fake Vote into the database', async () => {
        const res = await request(app)
            .post('/api/admin/inject-fake-vote')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('Fake vote injected');
    });

    it('[Fraud] SHOULD clear the test data successfully', async () => {
        const res = await request(app)
            .post('/api/admin/clear-fake-votes')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.message).toContain('stop');
    });

});
