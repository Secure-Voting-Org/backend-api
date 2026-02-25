#!/bin/bash

# ==========================================
# Test Script: 4.6.3 Math Mismatch Detection
# ==========================================
echo "=========================================="
echo " Starting Module 4.6 Test"
echo " (Math Mismatch: Excess Votes vs Tokens)"
echo "=========================================="

echo "🧪 [Step 1] Running baseline test without fake votes..."
node ./scripts/verify_req_4_6.js

echo ""
echo "🧩 [Step 2] Injecting a FAKE VOTE into the database to simulate fraud..."

cat << 'EOF' > inject_fake.js
const { pool } = require('./config/db');
async function inject() {
    try {
        // Find maximum vote id and a random voter and candidate
        // Or just insert a dummy vote with fake data
        const dummyVoterId = 'FAKEBOGUSID000';
        const dummyCandidateId = 'CANDIDATE_X';
        const dummyConstituency = 'TestConstituency';
        
        // Use the proper model logic to ensure it counts as a vote
        const { castVote } = require('./models/Vote.js');
        await castVote(dummyVoterId, dummyCandidateId, dummyConstituency);
        console.log("   ✅ Successfully injected 1 fake vote.");
        process.exit(0);
    } catch (e) {
        console.error("   ❌ Failed to inject fake vote:", e);
        process.exit(1);
    }
}
inject();
EOF

node inject_fake.js

echo ""
echo "🧪 [Step 3] Running fraud verification script again..."
echo "(Expect to see 'ALARM' and 'Math Mismatch Critical Error')"
node ./scripts/verify_req_4_6.js
EXIT_CODE=$?

echo ""
echo "🧹 [Step 4] Cleaning up injected fake vote..."
cat << 'EOF' > cleanup_fake.js
const { pool } = require('./config/db');
async function cleanup() {
    try {
        await pool.query("DELETE FROM votes WHERE voter_id = 'FAKEBOGUSID000'");
        await pool.query("DELETE FROM logs WHERE details->>'fraud_type' = 'MATH_MISMATCH'");
        console.log("   ✅ Successfully removed fake vote and test logs.");
        process.exit(0);
    } catch (e) {
        console.error("   ❌ Cleanup failed:", e);
        process.exit(1);
    }
}
cleanup();
EOF

node cleanup_fake.js

echo ""
# evaluate exit code from step 3
if [ $EXIT_CODE -eq 1 ]; then
    echo "🎉 Test Passed! The verification script correctly caught the math mismatch (Exit Code 1)."
else
    echo "❌ Test Failed! The verification script did not trigger appropriately or did not exit with code 1."
fi

# Cleanup temp files
rm inject_fake.js cleanup_fake.js
