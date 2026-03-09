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
        // Check if constituencies already seeded
        const { rows } = await pool.query('SELECT COUNT(*) as count FROM constituencies');
        const count = parseInt(rows[0].count, 10);

        if (count > 0) {
            console.log(`[Seed] Constituencies already seeded (${count} found). Skipping.`);
            return;
        }

        console.log('[Seed] Starting production seed for constituencies and candidates...');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const c of constituencies) {
                await client.query(
                    `INSERT INTO constituencies (name, district, state) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
                    [c.name, c.district, c.state]
                );

                const candidates = candidatesByConstituency[c.name] || getDefaultCandidates(c.name);
                for (const cand of candidates) {
                    await client.query(
                        `INSERT INTO candidates (name, party, symbol, constituency) VALUES ($1, $2, $3, $4)`,
                        [cand.name, cand.party, cand.symbol, c.name]
                    );
                }
            }

            await client.query('COMMIT');
            console.log(`[Seed] ✅ Seeded ${constituencies.length} constituencies and their candidates.`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[Seed] ❌ Seeding failed, rolled back:', err.message);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[Seed] Connection error during seed check:', err.message);
    }
};

module.exports = { seedProduction };
