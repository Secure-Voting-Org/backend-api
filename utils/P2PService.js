/**
 * P2P Service (User Story 3.8)
 * Manages peer discovery and network communication between cluster nodes.
 */
class P2PService {
    constructor() {
        this.peers = new Set();
        this._updateConfig();
    }

    _updateConfig() {
        this.nodeUrl = process.env.NODE_URL || `http://localhost:${process.env.PORT || 8081}`;
        this.seedNodes = (process.env.SEED_NODES || '').split(',').filter(url => url.trim() !== '');
    }

    /**
     * Announces this node to seed nodes and requests their peer lists.
     * Requirement 3.8.2.1
     */
    async discoverPeers() {
        this._updateConfig();
        console.log(`[P2P] Starting discovery from seed nodes: ${this.seedNodes.join(', ')}`);
        
        for (const seed of this.seedNodes) {
            if (seed === this.nodeUrl) continue;

            try {
                // 1. Join the seed node's network
                const joinResp = await fetch(`${seed}/api/p2p/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: this.nodeUrl })
                });

                if (joinResp.ok) {
                    this.peers.add(seed);
                    console.log(`[P2P] Successfully joined seed node: ${seed}`);
                }

                // 2. Fetch seed node's known peers
                const peersResp = await fetch(`${seed}/api/p2p/peers`);
                if (peersResp.ok) {
                    const { peers } = await peersResp.json();
                    peers.forEach(peer => {
                        if (peer !== this.nodeUrl) {
                            this.peers.add(peer);
                        }
                    });
                }
            } catch (err) {
                console.warn(`[P2P] Failed to connect to seed node ${seed}: ${err.message}`);
            }
        }
        
        console.log(`[P2P] Discovery complete. Connected to ${this.peers.size} peers.`);
    }

    /**
     * Broadcasts a block to all known peers.
     */
    async broadcastBlock(block) {
        console.log(`[P2P] Broadcasting block to ${this.peers.size} peers...`);
        const message = JSON.stringify({ block, peerUrl: this.nodeUrl });

        const promises = Array.from(this.peers).map(async (peer) => {
            try {
                await fetch(`${peer}/api/p2p/block`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: message
                });
            } catch (err) {
                // If a peer is unreachable, we might want to remove it in a real gossip protocol
                // For now, just log the failure.
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Adds a new peer to the local list.
     */
    addPeer(url) {
        if (url && url !== this.nodeUrl && !this.peers.has(url)) {
            this.peers.add(url);
            console.log(`[P2P] New peer added: ${url}`);
            return true;
        }
        return false;
    }

    /**
     * Returns the current peer list.
     */
    getPeers() {
        return Array.from(this.peers);
    }
}

// Singleton instance
module.exports = new P2PService();
