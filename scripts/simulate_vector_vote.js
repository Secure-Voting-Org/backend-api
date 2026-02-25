const { pool } = require('../config/db');
const { castVote } = require('../models/Vote');
const crypto = require('crypto');
const electionKeys = require('../utils/encryption_keys');
const paillier = require('paillier-bigint');

const simulateVector = async () => {
    try {
        console.log("🗳️  Simulating Vector Vote Casting...");

        // Start Keys
        const { publicKey } = await electionKeys.loadOrGenerateKeys();

        // 1. Create a dummy voter ID (Anonymous)
        const anonymousId1 = crypto.randomUUID();
        const anonymousId2 = crypto.randomUUID();

        // 2. Define Vote Data
        const candidates = ["CANDIDATE_A", "CANDIDATE_B", "CANDIDATE_C"];
        const constituency = "Test_Constituency_A";

        // Vote 1 for A
        const vector1 = {};
        for (const c of candidates) {
            vector1[c] = publicKey.encrypt(c === "CANDIDATE_A" ? 1n : 0n).toString();
        }

        // Vote 2 for A
        const vector2 = {};
        for (const c of candidates) {
            vector2[c] = publicKey.encrypt(c === "CANDIDATE_A" ? 1n : 0n).toString();
        }

        // Vote 3 for B
        const vector3 = {};
        const anonymousId3 = crypto.randomUUID();
        for (const c of candidates) {
            vector3[c] = publicKey.encrypt(c === "CANDIDATE_B" ? 1n : 0n).toString();
        }

        // 3. Cast Votes
        console.log(`   - Casting 3 test votes...`);
        await castVote(anonymousId1, JSON.stringify(vector1), constituency);
        await castVote(anonymousId2, JSON.stringify(vector2), constituency);
        await castVote(anonymousId3, JSON.stringify(vector3), constituency);

        console.log("\n✅ Votes Cast Successfully!");

    } catch (err) {
        console.error("Simulation Error:", err);
    } finally {
        pool.end();
    }
};

simulateVector();
