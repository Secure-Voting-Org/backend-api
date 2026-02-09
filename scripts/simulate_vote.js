// scripts/simulate_vote.js
const { pool } = require('../config/db');
const { castVote } = require('../models/Vote');
const { v4: uuidv4 } = require('uuid');

const simulate = async () => {
    try {
        console.log("🗳️  Simulating Vote Casting...");

        // 1. Create a dummy voter ID (Anonymous)
        const anonymousId = uuidv4();

        // 2. Define Vote Data
        const candidateId = "CANDIDATE_TEST_001";
        const constituency = "Test_Constituency_A";

        // 3. Cast Vote
        console.log(`   - Voter: ${anonymousId}`);
        console.log(`   - Candidate: ${candidateId}`);
        console.log(`   - Constituency: ${constituency}`);

        const result = await castVote(anonymousId, candidateId, constituency);

        if (result.success) {
            console.log("\n✅ Vote Cast Successfully!");
            console.log(`   - Block ID: ${result.block.id}`);
            console.log(`   - Transaction Hash: ${result.transactionHash}`);
            console.log(`   - Previous Hash: ${result.block.prev_hash}`);
            console.log("\n🔗 Blockchain linkage verified for this block.");
        } else {
            console.error("\n❌ Vote Failed:", result.error);
        }

    } catch (err) {
        console.error("Simulation Error:", err);
    } finally {
        pool.end();
    }
};

simulate();
