import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { pool } from '../config/db.js';

describe('Role-Based JWT Authentication & Session Tests', () => {

    // Test Credentials (Seeded by default)
    const adminCreds = {
        username: 'pre_admin',
        password: 'admin123',
        role: 'PRE_POLL'
    };

    const sysAdminCreds = {
        username: 'sys_admin',
        password: 'sysadmin123'
    };

    let adminToken = '';
    let sysAdminToken = '';

    describe('1. Admin (PRE_POLL) Authentication', () => {
        it('should login successfully and return a token', async () => {
            const res = await request(app)
                .post('/api/admin/login')
                .send(adminCreds)
                .set('x-device-hash', 'test-admin-device');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            adminToken = res.body.token;
        });

        it('should have created a session in admin_sessions table', async () => {
            const tokenHash = adminToken.split('.').pop();
            const { rows } = await pool.query(
                'SELECT * FROM admin_sessions WHERE token_hash = $1 AND is_active = TRUE',
                [tokenHash]
            );
            expect(rows.length).toBe(1);
            expect(rows[0].device_hash).toBe('test-admin-device');
        });

        it('should access protected admin route with valid token', async () => {
            const res = await request(app)
                .get('/api/admin/list')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('x-device-hash', 'test-admin-device');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('2. SysAdmin Authentication', () => {
        it('should login successfully and return a token', async () => {
            const res = await request(app)
                .post('/api/sys-admin/login')
                .send(sysAdminCreds)
                .set('x-device-hash', 'test-sysadmin-device');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            sysAdminToken = res.body.token;
        });

        it('should have created a session in sysadmin_sessions table', async () => {
            const tokenHash = sysAdminToken.split('.').pop();
            const { rows } = await pool.query(
                'SELECT * FROM sysadmin_sessions WHERE token_hash = $1 AND is_active = TRUE',
                [tokenHash]
            );
            expect(rows.length).toBe(1);
            expect(rows[0].device_hash).toBe('test-sysadmin-device');
        });

        it('should access protected admin route with valid sysadmin token', async () => {
            const res = await request(app)
                .get('/api/admin/list')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('3. Middleware Security Enforcements', () => {
        it('should reject access without token', async () => {
            const res = await request(app).get('/api/admin/list');
            expect(res.status).toBe(401);
            expect(res.body.error).toContain('No token provided');
        });

        it('should reject access with invalid token signature', async () => {
            const invalidToken = adminToken.substring(0, adminToken.length - 5) + 'abcde';
            const res = await request(app)
                .get('/api/admin/list')
                .set('Authorization', `Bearer ${invalidToken}`)
                .set('x-device-hash', 'test-admin-device');

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Invalid or expired session');
        });

        it('should reject access with device mismatch', async () => {
            const res = await request(app)
                .get('/api/admin/list')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('x-device-hash', 'wrong-device');

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Device mismatch');
        });
    });
});
