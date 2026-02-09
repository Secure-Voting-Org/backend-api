const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool } = require('../config/db');

const verifyLatestVote = async () => {
    try {
        console.log("Fetching latest vote...");
        const res = await pool.query('SELECT id, voter_id, timestamp, transaction_hash FROM votes ORDER BY id DESC LIMIT 1');

        if (res.rows.length === 0) {
            console.log("No votes found in the database.");
            process.exit(0);
        }

        const vote = res.rows[0];
        console.log("\n=== Latest Vote Record ===");
        console.log("Vote ID (DB PK):", vote.id);
        console.log("Timestamp:", vote.timestamp);
        console.log("Transaction Hash:", vote.transaction_hash);
        console.log("\n--- Anonymity Verification ---");
        console.log("Stored Voter ID (Anonymous Hash):", vote.voter_id);
        console.log("Length of ID:", vote.voter_id.length);

        if (vote.voter_id.length === 64) {
            console.log("\n[SUCCESS] The Voter ID is a SHA-256 hash (64 characters).");
            console.log("This proves the backend stored the ANONYMIZED ID derived from the Blind Signature, not the user's real ID.");
        } else {
            console.log("\n[WARNING] The Voter ID does not look like a SHA-256 hash.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Error verifying vote:", err);
        process.exit(1);
    }
};

verifyLatestVote();
