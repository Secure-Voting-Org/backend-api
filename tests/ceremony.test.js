import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHARES_FILE = path.join(__dirname, '../config/election_key_shares.json');

describe('Decryption Ceremony API', () => {

    let adminToken = '';
    let sharesArray = [];

    it('should authenticate as an admin first', async () => {
        const res = await request(app)
            .post('/api/admin/login')
            .send({
                username: 'pre_admin',  // or sys_admin, try both if seeded
                password: 'admin123',
                role: 'PRE_POLL'
            })
            .set('x-device-hash', 'test-ceremony');

        // If PRE_POLL fails, try SYS_ADMIN just in case
        if (res.status !== 200) {
            const res2 = await request(app)
                .post('/api/sys-admin/login')
                .send({
                    username: 'sys_admin',
                    password: 'sysadmin123'
                })
                .set('x-device-hash', 'test-ceremony');
            expect(res2.status).toBe(200);
            adminToken = res2.body.token;
        } else {
            expect(res.status).toBe(200);
            adminToken = res.body.token;
        }
    });

    it('should load Shamir shares from disk', () => {
        expect(fs.existsSync(SHARES_FILE)).toBe(true);
        const sharesData = JSON.parse(fs.readFileSync(SHARES_FILE, 'utf8'));
        sharesArray = Object.values(sharesData.shares);
        expect(sharesArray.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject ceremony without shares', async () => {
        const res = await request(app)
            .post('/api/admin/ceremony/decrypt')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-device-hash', 'test-ceremony')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('At least 3 valid shares');
    });

    it('should reject ceremony with invalid shares', async () => {
        const res = await request(app)
            .post('/api/admin/ceremony/decrypt')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-device-hash', 'test-ceremony')
            .send({ shares: ['invalid1', 'invalid2', 'invalid3'] });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid shares');
    });

    it('should execute decryption ceremony and return tally successfully', async () => {
        const res = await request(app)
            .post('/api/admin/ceremony/decrypt')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('x-device-hash', 'test-ceremony')
            .send({ shares: sharesArray });

        // Depending on DB state, 200 is expected on successful recombination
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.tally).toBeDefined();
        console.log("Verified Decryption Tally Return:", res.body.tally);
    }, 10000); // 10s timeout for crypto operations
});
