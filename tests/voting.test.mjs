import request from 'supertest';
import app from '../app.js'; // Your express app

describe('POST /api/verify-voter', () => {
    it('should return 401 if EPIC ID is missing', async () => {
        const response = await request(app)
            .post('/api/verify-voter')
            .send({});

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('EPIC ID Required');
    });
});