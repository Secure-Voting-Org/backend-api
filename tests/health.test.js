import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Health Check API', () => {
    it('GET / should return 200 and welcome message', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'SecureVote Backend API is running' });
    });
});
