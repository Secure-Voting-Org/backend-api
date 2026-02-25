const paillier = require('paillier-bigint');

async function test() {
    const { publicKey, privateKey } = await paillier.generateRandomKeys(512);

    // Test 1: Addition of two ciphertexts
    const c1 = publicKey.encrypt(1n);
    const c2 = publicKey.encrypt(1n);

    // Homomorphic addition: c1 * c2 mod n^2
    let cSum;
    if (typeof publicKey.addition === 'function') {
        cSum = publicKey.addition(c1, c2);
        console.log("addition() exists");
    } else {
        cSum = (c1 * c2) % (publicKey.n * publicKey.n);
        console.log("using manual multiplication");
    }

    const sum = privateKey.decrypt(cSum);
    console.log("Decrypted sum:", sum.toString());
}
test();
