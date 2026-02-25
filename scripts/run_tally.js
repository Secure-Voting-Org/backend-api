const { getAllVotes } = require('../models/Vote');
const electionKeys = require('../utils/encryption_keys');
const paillier = require('paillier-bigint');

async function testTally() {
    try {
        const votes = await getAllVotes(); // returns { candidate_id, constituency }
        const { publicKey, privateKey } = await electionKeys.loadOrGenerateKeys();

        let aggregatedCiphertexts = {}; // candidateId -> cSum (BigInt)
        let totalProcessed = 0;

        for (const vote of votes) {
            let voteVector;
            try {
                voteVector = JSON.parse(vote.candidate_id);
            } catch (e) {
                // Skip legacy single-string votes
                continue;
            }

            totalProcessed++;
            for (const [candidateId, ciphertextStr] of Object.entries(voteVector)) {
                const c = BigInt(ciphertextStr);
                if (!aggregatedCiphertexts[candidateId]) {
                    aggregatedCiphertexts[candidateId] = c;
                } else {
                    // Homomorphic addition: E(A) * E(B) mod n^2
                    aggregatedCiphertexts[candidateId] = publicKey.addition(aggregatedCiphertexts[candidateId], c);
                }
            }
        }

        let results = {};
        for (const [candidateId, cSum] of Object.entries(aggregatedCiphertexts)) {
            const count = privateKey.decrypt(cSum);
            results[candidateId] = Number(count);
        }

        console.log("Total Votes Processed (Vector Format):", totalProcessed);
        console.log("Results (Decrypted Tally):", results);

    } catch (err) {
        console.error("Tallying Error:", err);
    }
    process.exit(0);
}

testTally();
