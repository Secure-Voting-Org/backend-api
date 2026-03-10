import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js'; // Assuming app.js exports the express app

describe('JWT Authentication System', () => {
    const testObserver = {
        fullName: `Vitest User`,
        email: `vitest-${Date.now()}@eci.gov.in`,
        mobile_number: `9999${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'password123',
        role: 'general'
    };

    let jwtToken = '';

    it('1. Should securely register a new observer', async () => {
        const res = await request(app)
            .post('/api/observer/register')
            .send(testObserver)
            .set('Accept', 'application/json');

        // Registration API logic currently differs by auto-generating tokens directly or returning a simple success.
        // Usually, in API creation, it might return 200 { success: true, token: '...'}
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        if (res.body.token) {
            jwtToken = res.body.token; // It auto-logged us in!
        }
    });

    it('2. Should authenticate and return an active JWT Token', async () => {
        const res = await request(app)
            .post('/api/observer/login')
            .send({
                mobile_number: testObserver.mobile_number,
                password: testObserver.password,
                role: testObserver.role
            })
            .set('x-device-hash', 'vitest-device');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Assert JWT exists
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.split('.').length).toBe(3); // JWTs always have 3 segments

        jwtToken = res.body.token;

        // Assert user payload is intact
        expect(res.body.observer).toBeDefined();
        expect(res.body.observer.mobile_number).toBe(testObserver.mobile_number);
    });

    it('3. The backend middleware should REJECT missing JWT tokens', async () => {
        // To test middleware, we'll try to hit an admin/sysadmin/observer route but strip the auth.
        // Example: /api/sys-admin/voters requires authentication
        const res = await request(app)
            .get('/api/admin/voters');

        // Ensure the authMiddleware blocked it (401 Unauthorized or 403 Forbidden)
        expect([401, 403]).toContain(res.status);
    });
});
