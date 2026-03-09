const { getAllVotes } = require('../models/Vote');
const electionKeys = require('../utils/encryption_keys');
const paillier = require('paillier-bigint');
const secrets = require('secrets.js-grempe');
const fs = require('fs');
const path = require('path');

const SHARES_FILE = path.join(__dirname, '../config/election_key_shares.json');

async function testCeremony() {
    try {
        console.log("1. Fetching Shamir Secret Shares...");
        const sharesData = JSON.parse(fs.readFileSync(SHARES_FILE, 'utf8'));
        const sharesArray = Object.values(sharesData.shares);
        console.log(`✅ Loaded ${sharesArray.length} shares from disk.`);

        console.log("\n2. Reconstructing Private Key...");
        const combinedHex = secrets.combine(sharesArray);
        const reconstructedKeyString = secrets.hex2str(combinedHex);
        const parsedKey = JSON.parse(reconstructedKeyString);

        const { publicKey: globalPub } = await electionKeys.loadOrGenerateKeys();

        const reconstructedPrivateKey = new paillier.PrivateKey(
            BigInt(parsedKey.lambda),
            BigInt(parsedKey.mu),
            globalPub,
            BigInt(parsedKey.p),
            BigInt(parsedKey.q)
        );
        console.log("✅ Private Key reconstructed successfully from shares!");

        console.log("\n3. Fetching and Aggregating Votes...");
        const votes = await getAllVotes();
        let aggregatedCiphertexts = {};
        let totalProcessed = 0;

        for (const vote of votes) {
            let voteVector;
            try {
                voteVector = JSON.parse(vote.candidate_id);
            } catch (e) {
                continue;
            }

            totalProcessed++;
            for (const [candidateId, ciphertextStr] of Object.entries(voteVector)) {
                const c = BigInt(ciphertextStr);
                if (!aggregatedCiphertexts[candidateId]) {
                    aggregatedCiphertexts[candidateId] = c;
                } else {
                    aggregatedCiphertexts[candidateId] = globalPub.addition(aggregatedCiphertexts[candidateId], c);
                }
            }
        }
        console.log(`✅ Aggregated ${totalProcessed} valid encrypted votes.`);

        console.log("\n4. Decrypting Final Totals...");
        let results = {};
        for (const [candidateId, cSum] of Object.entries(aggregatedCiphertexts)) {
            const count = reconstructedPrivateKey.decrypt(cSum);
            results[candidateId] = Number(count);
        }

        console.log("✅ Final Decrypted Tally:");
        console.log(JSON.stringify(results, null, 2));

    } catch (err) {
        console.error("❌ Ceremony Script Error:", err);
    }
    process.exit(0);
}

testCeremony();
