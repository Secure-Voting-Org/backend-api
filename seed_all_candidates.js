const { pool } = require('./config/db');
const { getAllConstituencies } = require('./models/Constituency');

// Mock Data
const parties = [
    { name: "Telugu Desam Party (TDP)", symbol: "🚲", color: "#F9D929" },
    { name: "YSRCP", symbol: "🌀", color: "#0066CC" },
    { name: "Jana Sena Party (JSP)", symbol: "🥛", color: "#FF0000" },
    { name: "Indian National Congress (INC)", symbol: "✋", color: "#00BFFF" },
    { name: "Bharatiya Janata Party (BJP)", symbol: "🪷", color: "#FF9933" },
    { name: "Independent", symbol: "🪁", color: "#808080" }
];

const firstNames = ["Ramesh", "Suresh", "Mahesh", "Naresh", "Venkatesh", "Krishna", "Rama", "Lakshmi", "Sita", "Gita", "Ravi", "Kiran", "Vijay", "Anil", "Sunil"];
const lastNames = ["Reddy", "Chowdary", "Naidu", "Rao", "Yadav", "Goud", "Mala", "Madiga", "Sharma", "Varma", "Raju", "Setty", "Gupta", "Kapu", "Kamma"];

const getRandomName = () => {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${first} ${last}`;
};

const seedCandidates = async () => {
    try {
        console.log("Starting Candidate Seeding...");

        // 1. Get All Constituencies
        const constituencies = await getAllConstituencies();
        console.log(`Found ${constituencies.length} constituencies.`);

        if (constituencies.length === 0) {
            console.log("No constituencies found. Run seed_constituencies.js first.");
            process.exit(0);
        }

        // 2. Clear Candidates (Optional - maybe we want to add to existing?)
        // Let's clear to avoid duplicates for now as logic suggests "seed"
        await pool.query('TRUNCATE TABLE candidates RESTART IDENTITY CASCADE');
        console.log("Cleared existing candidates.");

        const candidateValues = [];
        const placeholders = [];
        let paramIndex = 1;

        // 3. Generate Candidates for each constituency
        for (const constituency of constituencies) {
            // Pick 3-5 random parties for this constituency
            const numCandidates = Math.floor(Math.random() * 3) + 3; // 3 to 5
            const shuffledParties = parties.sort(() => 0.5 - Math.random()).slice(0, numCandidates);

            for (const party of shuffledParties) {
                const name = getRandomName();
                // (name, party, symbol, constituency)
                candidateValues.push(name, party.name, party.symbol, constituency.name);
                placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
                paramIndex += 4;
            }
        }

        // 4. Batch Insert
        if (candidateValues.length > 0) {
            const query = `INSERT INTO candidates (name, party, symbol, constituency) VALUES ${placeholders.join(', ')}`;
            await pool.query(query, candidateValues);
            console.log(`Successfully seeded ${candidateValues.length / 4} candidates across ${constituencies.length} constituencies.`);
        } else {
            console.log("No candidates generated.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Seeding Failed:", err);
        process.exit(1);
    }
};

seedCandidates();
