const crypto = require('crypto');

// Simple RSA Implementation for Blind Signatures using BigInt
// In production, use a library like 'node-rsa' or 'forge', but 'crypto' module doesn't expose raw RSA math easily.
// We will use native BigInt for a basic implementation or 'paillier-bigint' if available (but that's for Paillier).
// Let's use a lightweight implementation since we need raw modular exponentiation.

// Helper: Modular Exponentiation (base^exp % mod)
const modPow = (base, exp, mod) => {
    let result = BigInt(1);
    base = base % mod;
    while (exp > 0) {
        if (exp % BigInt(2) === BigInt(1)) result = (result * base) % mod;
        base = (base * base) % mod;
        exp /= BigInt(2);
    }
    return result;
};

// Helper: GCD
const gcd = (a, b) => {
    while (b) {
        [a, b] = [b, a % b];
    }
    return a;
};

// Helper: Modular Inverse using Extended Euclidean Algorithm
const modInverse = (a, m) => {
    let [m0, x, y] = [m, BigInt(0), BigInt(1)];
    if (m === BigInt(1)) return BigInt(0);
    while (a > BigInt(1)) {
        let q = a / m;
        [m, a] = [a % m, m];
        [y, x] = [x - q * y, y];
    }
    if (x < BigInt(0)) x += m0;
    return x;
};

// Helper: Generate Random Prime (Simplified for demo - uses crypto.generatePrimeSync if available, else simple check)
// Node 10+ has generatePrimeSync
const generatePrime = (bits) => {
    return BigInt("0x" + crypto.generatePrimeSync(bits, { bigint: true }).toString(16));
};

class BlindSignature {
    constructor() {
        this.key = null;
    }

    // Generate Keys (n, e, d)
    generateKeys(bits = 512) { // 512 for speed in demo, use 2048+ in prod
        const p = generatePrime(bits / 2);
        const q = generatePrime(bits / 2);
        const n = p * q;
        const phi = (p - BigInt(1)) * (q - BigInt(1));

        let e = BigInt(65537);
        while (gcd(e, phi) !== BigInt(1)) {
            e += BigInt(2);
        }

        const d = modInverse(e, phi);

        this.key = {
            n: n.toString(),
            e: e.toString(),
            d: d.toString()
        };

        console.log("RSA Blind Singature Keys Generated");
        return this.key;
    }

    getKey() {
        return this.key;
    }

    // Sign a Blinded Message: s' = m'^d % n
    blindSign(blindedMessageStr) {
        if (!this.key) throw new Error("Keys not generated");
        const m_prime = BigInt(blindedMessageStr);
        const d = BigInt(this.key.d);
        const n = BigInt(this.key.n);

        const s_prime = modPow(m_prime, d, n);
        return s_prime.toString();
    }

    // Verify Signature: s^e % n == m
    // m = message (token), s = signature
    verify(messageStr, signatureStr) {
        if (!this.key) throw new Error("Keys not generated");
        const m = BigInt(messageStr); // hashed message usually
        const s = BigInt(signatureStr);
        const e = BigInt(this.key.e);
        const n = BigInt(this.key.n);

        const check = modPow(s, e, n);

        console.log("--- Blind Sig Verification ---");
        console.log("m (Token):", m.toString());
        console.log("s (Sig):", s.toString());
        console.log("s^e % n:", check.toString());
        console.log("Match?", check === m);

        return check === m;
    }
}

module.exports = new BlindSignature();
