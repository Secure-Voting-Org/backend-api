const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORAGE_DIR = path.join(__dirname, '../../storage/offchain');

class OffChainStorage {
    /**
     * Ensure the storage directory exists on instantiation.
     */
    static init() {
        if (!fs.existsSync(STORAGE_DIR)) {
            fs.mkdirSync(STORAGE_DIR, { recursive: true });
        }
    }

    /**
     * Save arbitrary JSON data off-chain and return a hash reference.
     * @param {Object} data - The heavy metadata to store.
     * @returns {string} - The SHA-256 hash (acting as an IPFS CID mock).
     */
    static saveOffChainData(data) {
        OffChainStorage.init();
        
        const dataString = JSON.stringify(data);
        const hash = crypto.createHash('sha256').update(dataString).digest('hex');
        
        const filePath = path.join(STORAGE_DIR, `${hash}.json`);
        
        // Only write if it doesn't exist (content addressing)
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, dataString, 'utf8');
        }
        
        return hash;
    }

    /**
     * Retrieve data from off-chain storage using its hash reference.
     * @param {string} hash - The hash reference.
     * @returns {Object|null} - The original data or null if not found.
     */
    static getOffChainData(hash) {
        const filePath = path.join(STORAGE_DIR, `${hash}.json`);
        
        if (fs.existsSync(filePath)) {
            const dataString = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(dataString);
        }
        return null;
    }
}

module.exports = OffChainStorage;
