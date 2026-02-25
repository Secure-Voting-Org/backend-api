import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:8081';

describe('Auth API Integration Tests', () => {
    it('POST /api/auth/login should fail with invalid credentials', async () => {
        const response = await request(BASE_URL)
            .post('/api/auth/login')
            .send({
                email: 'invalid@example.com',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(400); // Or 401, depending on implementation
        expect(response.body).toHaveProperty('error');
    });

    // Add more tests as needed, e.g., successful login if we have a seed user
});
