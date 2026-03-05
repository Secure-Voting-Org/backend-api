import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { pool } from '../config/db.js';

describe('Election Phase and History API Tests', () => {

    const mockResults = {
        "District 1": { "CandA": 50, "CandB": 40 },
        "District 2": { "CandA": 30, "CandB": 60 }
    };
    const totalVotes = 180;

    describe('1. Archiving Election Results', () => {
        it('should successfully archive the final tally', async () => {
            const res = await request(app)
                .post('/api/admin/election/archive')
                .send({ resultsJson: mockResults, totalVotes })
                .set('x-device-hash', 'test-device');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should retrieve the newly archived election history', async () => {
            const res = await request(app).get('/api/election/history');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);

            // Check the most recent record
            const latest = res.body[0];
            expect(latest.total_votes).toBe(totalVotes);
            expect(latest.results_json).toStrictEqual(mockResults);
            expect(latest.election_date).toBeDefined();
        });
    });

    describe('2. Start New Election (Reset)', () => {
        it('should successfully reset the election database state', async () => {
            const res = await request(app)
                .post('/api/admin/election/reset')
                .set('x-device-hash', 'test-device');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should verify the phase is back to PRE_POLL', async () => {
            const res = await request(app).get('/api/election/status');

            expect(res.status).toBe(200);
            expect(res.body.phase).toBe('PRE_POLL');
        });

        it('should verify that all voters have has_voted = FALSE', async () => {
            const { rows } = await pool.query('SELECT COUNT(*) FROM voters WHERE has_voted = TRUE');
            expect(Number(rows[0].count)).toBe(0);
        });

        it('should verify that the votes table is empty', async () => {
            const { rows } = await pool.query('SELECT COUNT(*) FROM votes');
            expect(Number(rows[0].count)).toBe(0);
        });
    });

});
