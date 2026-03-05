import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Auth API Integration Tests', () => {
    it('POST /api/admin/login should fail with invalid credentials', async () => {
        const response = await request(app)
            .post('/api/admin/login')
            .send({
                username: 'invalid_user',
                password: 'wrongpassword',
                role: 'PRE_POLL'
            });

        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
    });
});
