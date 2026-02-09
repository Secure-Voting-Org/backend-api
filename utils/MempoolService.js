// Native fetch used (Node 18+)

class MempoolService {
    static async add(voteData, sourceIp) {
        console.log(`[Mempool] Received vote from ${sourceIp}. Details:`, voteData.signature.substring(0, 10) + '...');
        return true;
    }

    static async broadcastBlock(block) {
        console.log(`[P2P] Broadcasting Block #${block.id} (${block.transaction_hash}) to peers...`);
        // Simulation of peers
        const peers = [
            'http://localhost:8082',
            'http://localhost:8083' // Example inactive peers
        ];

        peers.forEach(async (peer) => {
            try {
                await fetch(`${peer}/api/p2p/block`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ block })
                });
                console.log(`   -> Sent to ${peer}`);
            } catch (err) {
                // Ignore connection errors for simulation
                // console.log(`   -> Failed to send to ${peer}`);
            }
        });
    }
}

module.exports = MempoolService;
