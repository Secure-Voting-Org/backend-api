import { describe, it, expect } from 'vitest';
import request from 'supertest';
const BASE_URL = 'http://localhost:5000'; // Assuming server is running, or we can import app if exported

describe('Health Check API', () => {
    it('GET / should return 200 and welcome message', async () => {
        // Note: For a true unit/integration test without running server, we should import { app } from '../app';
        // However, app.js in this project might start the server immediately.
        // For now, we'll test against the running dev server or require the user to start it.
        // Ideally, refactor app.js to export app without listening if imported.

        // Attempting to use the running server URL for now to avoid side-effects of importing app.js
        const response = await request(BASE_URL).get('/');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'SecureVote Backend API is running' });
    });
});
