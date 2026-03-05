const paillier = require('paillier-bigint');
const fs = require('fs');
const path = require('path');
const secrets = require('secrets.js-grempe');

const KEY_FILE = path.join(__dirname, '../config/election_keys.json');
const SHARES_FILE = path.join(__dirname, '../config/election_key_shares.json');

let publicKey;
let privateKey;

const loadOrGenerateKeys = async () => {
    if (publicKey && privateKey) return { publicKey, privateKey };

    if (fs.existsSync(KEY_FILE)) {
        console.log("Loading existing election keys...");
        const keys = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
        publicKey = new paillier.PublicKey(BigInt(keys.publicKey.n), BigInt(keys.publicKey.g));
        privateKey = new paillier.PrivateKey(
            BigInt(keys.privateKey.lambda),
            BigInt(keys.privateKey.mu),
            publicKey,
            BigInt(keys.privateKey.p),
            BigInt(keys.privateKey.q)
        );
    } else {
        console.log("Generating new election keys (3072-bit)... This might take a moment.");
        // Generate keys
        const keyPair = await paillier.generateRandomKeys(3072);
        publicKey = keyPair.publicKey;
        privateKey = keyPair.privateKey;

        // Save keys (serialize BigInts)
        const serializableKeys = {
            publicKey: {
                n: publicKey.n.toString(),
                g: publicKey.g.toString()
            },
            privateKey: {
                lambda: (privateKey.lambda || privateKey._lambda).toString(),
                mu: (privateKey.mu || privateKey._mu).toString(),
                p: (privateKey.p || privateKey._p).toString(),
                q: (privateKey.q || privateKey._q).toString(),
                publicKey: {
                    n: publicKey.n.toString(),
                    g: publicKey.g.toString()
                }
            }
        };

        // Ensure config dir exists
        const configDir = path.dirname(KEY_FILE);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(KEY_FILE, JSON.stringify(serializableKeys, null, 2));

        // Generate Shamir Shares (3-of-3)
        // Convert the private key object into a hex string for splitting
        const privateKeyString = JSON.stringify(serializableKeys.privateKey);
        const privateKeyHex = secrets.str2hex(privateKeyString);

        // Create 3 shares with a threshold of 3
        const shares = secrets.share(privateKeyHex, 3, 3);

        const sharesObject = {
            threshold: 3,
            total_shares: 3,
            shares: {
                "Official A": shares[0],
                "Official B": shares[1],
                "Official C": shares[2]
            }
        };
        fs.writeFileSync(SHARES_FILE, JSON.stringify(sharesObject, null, 2));

        console.log("Election keys and Shamir shares generated and saved.");
    }

    return { publicKey, privateKey };
};

const getShares = () => {
    if (fs.existsSync(SHARES_FILE)) {
        return JSON.parse(fs.readFileSync(SHARES_FILE, 'utf8'));
    }
    return null;
};

const getPublicKey = async () => {
    if (!publicKey) await loadOrGenerateKeys();
    return {
        n: publicKey.n.toString(),
        g: publicKey.g.toString()
    };
};

const getPrivateKey = async () => {
    if (!privateKey) await loadOrGenerateKeys();
    return {
        lambda: (privateKey.lambda || privateKey._lambda).toString(),
        mu: (privateKey.mu || privateKey._mu).toString(),
        p: (privateKey.p || privateKey._p).toString(),
        q: (privateKey.q || privateKey._q).toString(),
        publicKey: {
            n: publicKey.n.toString(),
            g: publicKey.g.toString()
        }
    };
};

// For tallying later (not exposed to public API)
const decrypt = async (encryptedSum) => {
    if (!privateKey) await loadOrGenerateKeys();
    return privateKey.decrypt(encryptedSum);
};

module.exports = { loadOrGenerateKeys, getPublicKey, getPrivateKey, decrypt, getShares };
