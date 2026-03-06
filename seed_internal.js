const { pool } = require('./config/db');
const crypto = require('crypto');

async function seedInternal() {
    const constituencies = ['Kuppam', 'Pulivendula', 'Pithapuram', 'Hindupur', 'Mangalagiri'];
    const candidates = ['CAND-001', 'CAND-002', 'CAND-003', 'CAND-004', 'CAND-005'];

    console.log('--- INTERNAL SEED STARTING ---');

    try {
        for (let i = 0; i < 5; i++) {
            const transactionHash = crypto.randomBytes(32).toString('hex');
            const constituency = constituencies[i % constituencies.length];
            const candidateId = candidates[i % candidates.length];
            const voterId = crypto.createHash('sha256').update(`VOTER-INT-${i}-${Date.now()}`).digest('hex');

            await pool.query(
                'INSERT INTO votes (voter_id, candidate_id, constituency, transaction_hash) VALUES ($1, $2, $3, $4)',
                [voterId, candidateId, constituency, transactionHash]
            );
            console.log(`Injected: ${constituency} | Hash: ${transactionHash.substring(0, 10)}`);
        }
        console.log('--- SEEDING COMPLETE ---');
    } catch (err) {
        console.error('SEEDING ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

seedInternal();
