import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
const P2PService = require('../utils/P2PService');

describe('User Story 3.8: P2P Peer Discovery', () => {
    
    beforeEach(() => {
        // Clear peers before each test
        P2PService.peers.clear();
        process.env.SEED_NODES = 'http://seed1:5000,http://seed2:5000';
        process.env.NODE_URL = 'http://localhost:5000';
        P2PService._updateConfig();
        
        // Mock global fetch
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('3.8.1.1: Should add unique peers to the list', () => {
        P2PService.addPeer('http://peer1:5000');
        P2PService.addPeer('http://peer1:5000'); // Duplicate
        P2PService.addPeer('http://localhost:5000'); // Self
        
        expect(P2PService.getPeers()).toHaveLength(1);
        expect(P2PService.getPeers()).toContain('http://peer1:5000');
    });

    it('3.8.2.1: Should discover peers from seed nodes on startup', async () => {
        // Mock responses for seed1
        global.fetch.mockImplementation((url) => {
            if (url === 'http://seed1:5000/api/p2p/join') {
                return Promise.resolve({ ok: true });
            }
            if (url === 'http://seed1:5000/api/p2p/peers') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ peers: ['http://peer_from_seed:5000'] })
                });
            }
            return Promise.resolve({ ok: false });
        });

        await P2PService.discoverPeers();

        const peers = P2PService.getPeers();
        expect(peers).toContain('http://seed1:5000');
        expect(peers).toContain('http://peer_from_seed:5000');
    });

    it('3.8.3.1: Should broadcast blocks to all known peers', async () => {
        P2PService.addPeer('http://peer1:5000');
        P2PService.addPeer('http://peer2:5000');

        const block = { id: 1, transaction_hash: 'hash123' };
        await P2PService.broadcastBlock(block);

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('http://peer1:5000/api/p2p/block'),
            expect.any(Object)
        );
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('http://peer2:5000/api/p2p/block'),
            expect.any(Object)
        );
    });
});
