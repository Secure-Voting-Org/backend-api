const { pool } = require('../config/db');
const { sendAlertEmail } = require('../services/emailService');

const checkIntegrity = async () => {
    console.log("Starting Integrity Monitor...");
    try {
        const query = 'SELECT * FROM votes ORDER BY id ASC';
        const { rows } = await pool.query(query);

        let isIntact = true;
        let errors = [];

        console.log(`Scanning ${rows.length} blocks...`);

        for (let i = 0; i < rows.length; i++) {
            const current = rows[i];
            const prevHash = i === 0
                ? '0000000000000000000000000000000000000000000000000000000000000000'
                : rows[i - 1].transaction_hash;

            // Link Verification
            if (current.prev_hash !== prevHash) {
                isIntact = false;
                const msg = `Block ${current.id}: Broken Link. Expected prev=${prevHash.substring(0, 8)}..., Got=${current.prev_hash ? current.prev_hash.substring(0, 8) : 'null'}...`;
                console.error(`[FAIL] ${msg}`);
                errors.push(msg);
            }
        }

        if (isIntact) {
            console.log("✅ Blockchain Integrity Verified. No tampering detected.");
        } else {
            const errorMsg = "❌ Blockchain Corrupted! Anomalies detected:\n" + errors.join("\n");
            console.error(errorMsg);

            // Send Alert
            await sendAlertEmail("Blockchain Integrity Failure", errorMsg.replace(/\n/g, '<br>'));
        }

    } catch (err) {
        console.error("Monitor Error:", err);
    } finally {
        pool.end();
    }
};

// Run immediately
checkIntegrity();

// Optional: Schedule if running as daemon
// setInterval(checkIntegrity, 60000);
