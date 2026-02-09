const paillier = require('paillier-bigint');
const fs = require('fs');
const path = require('path');

const KEY_FILE = path.join(__dirname, '../config/election_keys.json');

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
                q: (privateKey.q || privateKey._q).toString()
            }
        };

        // Ensure config dir exists
        const configDir = path.dirname(KEY_FILE);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(KEY_FILE, JSON.stringify(serializableKeys, null, 2));
        console.log("Election keys generated and saved.");
    }

    return { publicKey, privateKey };
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

module.exports = { loadOrGenerateKeys, getPublicKey, getPrivateKey, decrypt };
