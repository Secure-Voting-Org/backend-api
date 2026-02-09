const crypto = require('crypto');

/**
 * Blockchain Utilities
 * Provides Merkle Tree generation and SHA-256 block hashing.
 */
class BlockchainUtils {
    /**
     * SHA-256 Hashing
     */
    static hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Merkle Tree Root generation
     * Takes an array of transaction strings/hashes and returns the Merkle Root.
     */
    static generateMerkleRoot(transactions) {
        if (!transactions || transactions.length === 0) return '0'.repeat(64);

        let nodes = transactions.map(tx => {
            const data = typeof tx === 'string' ? tx : JSON.stringify(tx);
            return this.hash(data);
        });

        while (nodes.length > 1) {
            const tempNodes = [];
            for (let i = 0; i < nodes.length; i += 2) {
                if (i + 1 < nodes.length) {
                    tempNodes.push(this.hash(nodes[i] + nodes[i + 1]));
                } else {
                    // Duplicate last node if odd number of nodes
                    tempNodes.push(this.hash(nodes[i] + nodes[i]));
                }
            }
            nodes = tempNodes;
        }

        return nodes[0];
    }

    /**
     * Block Hashing
     * Hashes the block header to get the final block hash.
     */
    static calculateBlockHash(blockHeader) {
        const { block_number, previous_hash, timestamp, merkle_root, nonce } = blockHeader;
        const headerString = `${block_number}${previous_hash}${timestamp}${merkle_root}${nonce}`;
        return this.hash(headerString);
    }
}

module.exports = BlockchainUtils;
