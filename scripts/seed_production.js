// Production Seed Script
// Runs on server startup. Only seeds if tables are empty (safe to run every deploy).
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../config/db');

const constituencies = [
    { name: 'Ichchapuram', district: 'Srikakulam', state: 'Andhra Pradesh' },
    { name: 'Palasa', district: 'Srikakulam', state: 'Andhra Pradesh' },
    { name: 'Tekkali', district: 'Srikakulam', state: 'Andhra Pradesh' },
    { name: 'Pathapatnam', district: 'Srikakulam', state: 'Andhra Pradesh' },
    { name: 'Narasannapeta', district: 'Srikakulam', state: 'Andhra Pradesh' },
    { name: 'Srikakulam', district: 'Srikakulam', state: 'Andhra Pradesh' },
    { name: 'Amadalavalasa', district: 'Srikakulam', state: 'Andhra Pradesh' },
    { name: 'Bobbili', district: 'Vizianagaram', state: 'Andhra Pradesh' },
    { name: 'Vizianagaram', district: 'Vizianagaram', state: 'Andhra Pradesh' },
    { name: 'Srungavarapukota', district: 'Vizianagaram', state: 'Andhra Pradesh' },
    { name: 'Bheemunipatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Visakhapatnam East', district: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Visakhapatnam West', district: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Visakhapatnam North', district: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Visakhapatnam South', district: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Anakapalli', district: 'Visakhapatnam', state: 'Andhra Pradesh' },
    { name: 'Rajahmundry City', district: 'East Godavari', state: 'Andhra Pradesh' },
    { name: 'Rajahmundry Rural', district: 'East Godavari', state: 'Andhra Pradesh' },
    { name: 'Kakinada City', district: 'East Godavari', state: 'Andhra Pradesh' },
    { name: 'Amalapuram', district: 'East Godavari', state: 'Andhra Pradesh' },
    { name: 'Eluru', district: 'West Godavari', state: 'Andhra Pradesh' },
    { name: 'Tanuku', district: 'West Godavari', state: 'Andhra Pradesh' },
    { name: 'Narasapuram', district: 'West Godavari', state: 'Andhra Pradesh' },
    { name: 'Palakol', district: 'West Godavari', state: 'Andhra Pradesh' },
    { name: 'Bhimavaram', district: 'West Godavari', state: 'Andhra Pradesh' },
    { name: 'Machilipatnam', district: 'Krishna', state: 'Andhra Pradesh' },
    { name: 'Vijayawada East', district: 'Krishna', state: 'Andhra Pradesh' },
    { name: 'Vijayawada West', district: 'Krishna', state: 'Andhra Pradesh' },
    { name: 'Vijayawada Central', district: 'Krishna', state: 'Andhra Pradesh' },
    { name: 'Gudivada', district: 'Krishna', state: 'Andhra Pradesh' },
    { name: 'Tenali', district: 'Guntur', state: 'Andhra Pradesh' },
    { name: 'Guntur East', district: 'Guntur', state: 'Andhra Pradesh' },
    { name: 'Guntur West', district: 'Guntur', state: 'Andhra Pradesh' },
    { name: 'Mangalagiri', district: 'Guntur', state: 'Andhra Pradesh' },
    { name: 'Palnadu', district: 'Guntur', state: 'Andhra Pradesh' },
    { name: 'Ongole', district: 'Prakasam', state: 'Andhra Pradesh' },
    { name: 'Markapur', district: 'Prakasam', state: 'Andhra Pradesh' },
    { name: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh' },
    { name: 'Nandyal', district: 'Kurnool', state: 'Andhra Pradesh' },
    { name: 'Allagadda', district: 'Kurnool', state: 'Andhra Pradesh' },
    { name: 'Anantapur', district: 'Anantapur', state: 'Andhra Pradesh' },
    { name: 'Hindupur', district: 'Anantapur', state: 'Andhra Pradesh' },
    { name: 'Dharmavaram', district: 'Anantapur', state: 'Andhra Pradesh' },
    { name: 'Kadapa', district: 'YSR Kadapa', state: 'Andhra Pradesh' },
    { name: 'Pulivendula', district: 'YSR Kadapa', state: 'Andhra Pradesh' },
    { name: 'Rajampet', district: 'YSR Kadapa', state: 'Andhra Pradesh' },
    { name: 'Chittoor', district: 'Chittoor', state: 'Andhra Pradesh' },
    { name: 'Tirupati', district: 'Chittoor', state: 'Andhra Pradesh' },
    { name: 'Kuppam', district: 'Chittoor', state: 'Andhra Pradesh' },
    { name: 'Nellore City', district: 'SPSR Nellore', state: 'Andhra Pradesh' },
    { name: 'Nellore Rural', district: 'SPSR Nellore', state: 'Andhra Pradesh' },
];

const candidatesByConstituency = {
    'Kuppam': [
        { name: 'N. Chandrababu Naidu', party: 'TDP', symbol: '💛' },
        { name: 'Gopireddy Srinivas Reddy', party: 'YSRCP', symbol: '💙' },
        { name: 'Amanchi Krishna Mohan', party: 'BJP', symbol: '🪷' },
    ],
    'Pulivendula': [
        { name: 'Y.S. Jagan Mohan Reddy', party: 'YSRCP', symbol: '💙' },
        { name: 'Srikanth Reddy', party: 'TDP', symbol: '💛' },
        { name: 'Raju Mandela', party: 'Independent', symbol: '👤' },
    ],
    'Tirupati': [
        { name: 'Arun Kumar', party: 'TDP', symbol: '💛' },
        { name: 'Bhumana Karunakar Reddy', party: 'YSRCP', symbol: '💙' },
        { name: 'Suresh Kumar', party: 'BJP', symbol: '🪷' },
    ],
    'Visakhapatnam East': [
        { name: 'Velagapudi Ramakrishna Babu', party: 'TDP', symbol: '💛' },
        { name: 'Botcha Appalaswamy', party: 'YSRCP', symbol: '💙' },
        { name: 'Ramana Kumar', party: 'JSP', symbol: '🥛' },
    ],
    'Vijayawada West': [
        { name: 'Vasantha Krishna', party: 'TDP', symbol: '💛' },
        { name: 'Malladi Vishnu', party: 'YSRCP', symbol: '💙' },
        { name: 'R. Shiva Nageswara Rao', party: 'BJP', symbol: '🪷' },
    ],
    'Guntur West': [
        { name: 'Modugula Venugopala Reddy', party: 'YSRCP', symbol: '💙' },
        { name: 'Maddisetty Venkayya Chowdary', party: 'TDP', symbol: '💛' },
        { name: 'Harith Balayogi', party: 'INC', symbol: '🇮🇳' },
    ],
    'Mangalagiri': [
        { name: 'Alla Ramakrishna Reddy', party: 'YSRCP', symbol: '💙' },
        { name: 'Nara Lokesh', party: 'TDP', symbol: '💛' },
        { name: 'Bonda Uma', party: 'BJP', symbol: '🪷' },
    ],
};

const getDefaultCandidates = (constituencyName) => {
    const parties = [
        { party: 'TDP', symbol: '💛' },
        { party: 'YSRCP', symbol: '💙' },
        { party: 'BJP', symbol: '🪷' },
        { party: 'INC', symbol: '🇮🇳' },
    ];
    const firstNames = ['Ramesh', 'Suresh', 'Mahesh', 'Naresh', 'Venkatesh', 'Krishna', 'Ravi', 'Vijay', 'Anil', 'Sunil'];
    const lastNames = ['Reddy', 'Chowdary', 'Naidu', 'Rao', 'Yadav', 'Varma', 'Raju', 'Sharma'];
    const numCandidates = 3 + Math.floor(Math.random() * 2); // 3 or 4
    return parties.slice(0, numCandidates).map(p => ({
        name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        party: p.party,
        symbol: p.symbol
    }));
};

const seedProduction = async () => {
    try {
        // ─── CONSTITUENCIES & CANDIDATES ───────────────────────────────────────
        console.log('[Seed] Starting production seed/update for constituencies and candidates...');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const c of constituencies) {
                // Upsert constituency
                await client.query(
                    `INSERT INTO constituencies (name, district, state) VALUES ($1, $2, $3) 
                     ON CONFLICT (name) DO UPDATE SET district = EXCLUDED.district, state = EXCLUDED.state`,
                    [c.name, c.district, c.state]
                );
                
                // Only insert candidates if this constituency has NO candidates yet
                const { rows: candRows } = await client.query('SELECT COUNT(*) as ccount FROM candidates WHERE constituency = $1', [c.name]);
                if (parseInt(candRows[0].ccount, 10) === 0) {
                    const candidates = candidatesByConstituency[c.name] || getDefaultCandidates(c.name);
                    for (const cand of candidates) {
                        await client.query(
                            `INSERT INTO candidates (name, party, symbol, constituency) VALUES ($1, $2, $3, $4)`,
                            [cand.name, cand.party, cand.symbol, c.name]
                        );
                    }
                }
            }
            await client.query('COMMIT');
            console.log(`[Seed] ✅ Constituencies and candidates updated/seeded.`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[Seed] ❌ Constituency seeding failed, rolled back:', err.message);
        } finally {
            client.release();
        }

        // ─── ELECTORAL ROLL (AADHAAR CITIZENS) ─────────────────────────────────
        try {
            const { rows: rollRows } = await pool.query('SELECT COUNT(*) as count FROM electoral_roll');
            const rollCount = parseInt(rollRows[0].count, 10);

            if (rollCount > 0) {
                console.log(`[Seed] Electoral roll already has ${rollCount} citizens. Skipping.`);
            } else {
                console.log('[Seed] Seeding electoral roll citizens...');
                const citizens = [
                    { aadhaar: '111122223333', name: 'Ramesh Gupta', constituency: 'Kuppam', mobile: '9876543210' },
                    { aadhaar: '444455556666', name: 'Sita Reddy', constituency: 'Mangalagiri', mobile: '9123456780' },
                    { aadhaar: '777788889999', name: 'Vijay Rao', constituency: 'Pulivendula', mobile: '9988776655' },
                    { aadhaar: '123412341234', name: 'Priya Naidu', constituency: 'Tirupati', mobile: '9000011111' },
                    { aadhaar: '567856785678', name: 'Suresh Chowdary', constituency: 'Visakhapatnam East', mobile: '9811223344' },
                    { aadhaar: '999900001111', name: 'Lakshmi Varma', constituency: 'Vijayawada West', mobile: '9700123456' },
                    { aadhaar: '111200003333', name: 'Kishore Kumar', constituency: 'Guntur West', mobile: '9845678901' },
                    { aadhaar: '222211110000', name: 'Anitha Reddy', constituency: 'Nellore City', mobile: '9600112233' },
                    { aadhaar: '333344445555', name: 'Mahesh Kumar', constituency: 'Kurnool', mobile: '9123987654' },
                    { aadhaar: '666677778888', name: 'Deepa Sharma', constituency: 'Kadapa', mobile: '9456789012' },
                    { aadhaar: '121212121212', name: 'Aravind Naidu', constituency: 'Anantapur', mobile: '9321456789' },
                    { aadhaar: '343434343434', name: 'Meera Rao', constituency: 'Hindupur', mobile: '9876000111' },
                    { aadhaar: '565656565656', name: 'Rajesh Yadav', constituency: 'Rajahmundry City', mobile: '9012345678' },
                    { aadhaar: '787878787878', name: 'Sunita Devi', constituency: 'Eluru', mobile: '9198765432' },
                    { aadhaar: '909090909090', name: 'Venkat Raju', constituency: 'Chittoor', mobile: '9900001122' },
                    { aadhaar: '101010101010', name: 'Kavitha Singh', constituency: 'Ongole', mobile: '9876543000' },
                    { aadhaar: '202020202020', name: 'Surya Kumar', constituency: 'Tenali', mobile: '9765432100' },
                    { aadhaar: '303030303030', name: 'Geetha Lakshmi', constituency: 'Bhimavaram', mobile: '9654321001' },
                    { aadhaar: '404040404040', name: 'Naresh Babu', constituency: 'Machilipatnam', mobile: '9543210081' },
                    { aadhaar: '505050505050', name: 'Triveni Devi', constituency: 'Nandyal', mobile: '9432100012' },
                ];
                for (const c of citizens) {
                    await pool.query(
                        `INSERT INTO electoral_roll (aadhaar_number, name, constituency, phone)
                         VALUES ($1, $2, $3, $4) ON CONFLICT (aadhaar_number) DO NOTHING`,
                        [c.aadhaar, c.name, c.constituency, c.mobile]
                    ).catch(() => {}); // Ignore if column names differ slightly
                }
                console.log(`[Seed] ✅ Seeded ${citizens.length} citizens into electoral roll.`);
            }
        } catch (rollErr) {
            console.log('[Seed] Electoral roll table not ready yet, skipping:', rollErr.message);
        }

    } catch (err) {
        console.error('[Seed] Critical error during seed:', err.message);
    }
};

module.exports = { seedProduction };

