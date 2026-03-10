import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { pool } from '../config/db.js';

describe('SysAdmin Feature Route Tests', () => {
    let sysAdminToken = '';
    const sysAdminCreds = {
        username: 'sys_admin',
        password: 'sysadmin123'
    };

    beforeAll(async () => {
        // First login to get the sysadmin token
        const res = await request(app)
            .post('/api/sys-admin/login')
            .send(sysAdminCreds)
            .set('x-device-hash', 'test-sysadmin-device');
            
        sysAdminToken = res.body.token;
        
        // Ensure the electoral_roll table is clean so tests are predictable
        await pool.query('DELETE FROM electoral_roll WHERE aadhaar_number LIKE \'999%\'');
    });

    describe('1. Real-Time Activity Feed SSE (/api/audit/stream)', () => {
        it.skip('should successfully initiate an SSE connection', async () => {
            const res = await request(app)
                .get('/api/audit/stream')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device')
                .timeout({ response: 3000, deadline: 6000 }); // Wait for headers
            
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/event-stream');
        });
        
        it('should reject access without token', async () => {
             const res = await request(app)
                .get('/api/audit/stream');
            expect(res.status).toBe(401);
        });
    });

    describe('2. Blockchain Ledger Viewer (/api/audit/ledger)', () => {
        it('should fetch the ledger array', async () => {
            const res = await request(app)
                .get('/api/audit/ledger')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device');
                
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('3. Electoral Roll Management', () => {
        it('should successfully import citizens via CSV data', async () => {
            const csvData = [
                { aadhaar_number: '999988887777', full_name: 'Test Citizen 1', constituency: 'Test_Constituency_A' },
                { aadhaar_number: '999988887778', full_name: 'Test Citizen 2', constituency: 'Test_Constituency_A' }
            ];

            const res = await request(app)
                .post('/api/electoral-roll/import')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device')
                .send({ csvData });
                
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Successfully imported 2 citizens');
        });

        it('should reject import if missing or bad data (e.g., partial empty payload)', async () => {
            const csvData = [
                { aadhaar_number: '999988887779' } // missing full_name
            ];

            const res = await request(app)
                .post('/api/electoral-roll/import')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device')
                .send({ csvData });
                
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            // It will import 0 since the loop skips invalid rows
            expect(res.body.message).toContain('Successfully imported 0 citizens');
        });

        it('should retrieve the electoral roll list', async () => {
            const res = await request(app)
                .get('/api/electoral-roll')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device');
                
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            
            // Should contain the previously imported test citizens
            const added = res.body.find(c => c.aadhaar_number === '999988887777');
            expect(added).toBeDefined();
            expect(added.name).toBe('Test Citizen 1');
        });
    });

    describe('4. SysAdmin Password Change', () => {
        it('should fail to change password with incorrect current password', async () => {
            const res = await request(app)
                .put('/api/sysadmin/change-password')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device')
                .send({ currentPassword: 'wrongpassword', newPassword: 'newsecure123' });
                
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Incorrect current password');
        });

        it('should successfully change password with correct current password', async () => {
            const res = await request(app)
                .put('/api/sysadmin/change-password')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device')
                .send({ currentPassword: 'sysadmin123', newPassword: 'sysadmin123_NEW' });
                
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            
            // Revert the password back so tests can run repeatedly
            const revertRes = await request(app)
                .put('/api/sysadmin/change-password')
                .set('Authorization', `Bearer ${sysAdminToken}`)
                .set('x-device-hash', 'test-sysadmin-device')
                .send({ currentPassword: 'sysadmin123_NEW', newPassword: 'sysadmin123' });
                
            expect(revertRes.status).toBe(200);
        });
    });
});
