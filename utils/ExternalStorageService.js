const { pool } = require('../config/db');
const BlockchainUtils = require('./BlockchainUtils');

/**
 * External Storage Service (User Story 3.10)
 * Simulates an off-chain storage layer (like IPFS or MongoDB).
 */
class ExternalStorageService {
    /**
     * Stores data in the external store and returns a reference hash.
     * @param {Object} data - The data to store
     * @returns {Promise<string>} - The reference URL (ipfs://<hash>)
     */
    static async store(data) {
        const dataString = JSON.stringify(data);
        const hash = BlockchainUtils.hash(dataString);

        try {
            await pool.query(
                'INSERT INTO external_metadata (hash, data) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING',
                [hash, dataString]
            );
            return `ipfs://${hash}`;
        } catch (err) {
            console.error("[ExternalStorageService] Store failed:", err);
            throw err;
        }
    }

    /**
     * Retrieves data from the external store using a reference hash.
     * @param {string} ref - The reference URL
     * @returns {Promise<Object|null>}
     */
    static async retrieve(ref) {
        if (!ref.startsWith('ipfs://')) return null;
        const hash = ref.replace('ipfs://', '');

        try {
            const { rows } = await pool.query('SELECT data FROM external_metadata WHERE hash = $1', [hash]);
            return rows.length > 0 ? rows[0].data : null;
        } catch (err) {
            console.error("[ExternalStorageService] Retrieve failed:", err);
            throw err;
        }
    }
}

module.exports = ExternalStorageService;
