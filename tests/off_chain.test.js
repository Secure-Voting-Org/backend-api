import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import OffChainStorage from '../services/OffChainStorage.js';

describe('Module 10: Off-Chain Data Storage', () => {
    const testPyl = { voter_manifest: 'heavy_file_data_here', timestamp: Date.now() };
    const STORAGE_DIR = path.join(__dirname, '../../storage/offchain');

    beforeAll(() => {
        // Clean up mock directory before tests run
        if (fs.existsSync(STORAGE_DIR)) {
            fs.rmSync(STORAGE_DIR, { recursive: true, force: true });
        }
    });

    afterAll(() => {
        // Clean up mock directory after tests run
        if (fs.existsSync(STORAGE_DIR)) {
            fs.rmSync(STORAGE_DIR, { recursive: true, force: true });
        }
    });

    it('should save data off-chain and return a deterministic hash', () => {
        const hash1 = OffChainStorage.saveOffChainData(testPyl);
        const hash2 = OffChainStorage.saveOffChainData(testPyl);
        
        // Uses Content Addressing, hashes should be identical
        expect(hash1).toBeDefined();
        expect(hash1).toEqual(hash2);
        
        // Assert file is created
        const exists = fs.existsSync(path.join(STORAGE_DIR, `${hash1}.json`));
        expect(exists).toBe(true);
    });

    it('should retrieve saved data correctly using its hash', () => {
        const hash = OffChainStorage.saveOffChainData({ mock_image: 'base64...' });
        
        const retrieved = OffChainStorage.getOffChainData(hash);
        expect(retrieved).not.toBeNull();
        expect(retrieved.mock_image).toEqual('base64...');
    });

    it('should return null for untracked hashes', () => {
        const retrieved = OffChainStorage.getOffChainData('invalid_hash_123');
        expect(retrieved).toBeNull();
    });
});
