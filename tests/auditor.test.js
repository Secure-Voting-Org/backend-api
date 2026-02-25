import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js'; // Ensure app.js exports the express app

describe('Module 5.5: Auditor Forensic Tools Export Test', () => {
    it('Should successfully export the immutable ledger as a .zip file', async () => {
        const response = await request(app)
            .get('/api/observer/export-ledger')
            .responseType('blob') // Tell supertest it's a binary file
            .expect(200);

        // Verify the response is a ZIP file attachment
        expect(response.headers['content-type']).toBe('application/zip');
        expect(response.headers['content-disposition']).toContain('attachment; filename="secure_voting_ledger_export.zip"');

        // Verify the ZIP archive is not empty (Binary Check)
        expect(response.body).toBeInstanceOf(Buffer);
        expect(response.body.length).toBeGreaterThan(100);
    });
});
