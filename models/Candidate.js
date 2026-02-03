const { pool } = require('../config/db');

// Create Candidates Table
const createCandidateTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS candidates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        party VARCHAR(100),
        constituency VARCHAR(100) NOT NULL,
        symbol VARCHAR(50),
        photo_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
};

// Seed Candidates
const seedCandidates = async () => {
    // Clear existing data to avoid duplicates for this demo
    await pool.query('TRUNCATE TABLE candidates RESTART IDENTITY');

    const candidates = [
        // Kuppam
        { name: "N. Chandrababu Naidu", party: "Telugu Desam Party (TDP)", symbol: "🚲", constituency: "Kuppam" },
        { name: "K. R. J. Bharath", party: "YSRCP", symbol: "🌀", constituency: "Kuppam" },
        { name: "B. A. Samad Shaheen", party: "Indian National Congress (INC)", symbol: "✋", constituency: "Kuppam" },

        // Pithapuram
        { name: "Pawan Kalyan", party: "Jana Sena Party (JSP)", symbol: "🥛", constituency: "Pithapuram" },
        { name: "Vanga Geetha", party: "YSRCP", symbol: "🌀", constituency: "Pithapuram" },
        { name: "Madepalli Satyanarayana", party: "Indian National Congress (INC)", symbol: "✋", constituency: "Pithapuram" },

        // Pulivendula
        { name: "Y. S. Jagan Mohan Reddy", party: "YSRCP", symbol: "🌀", constituency: "Pulivendula" },
        { name: "Mareddy Ravindranath Reddy", party: "Telugu Desam Party (TDP)", symbol: "🚲", constituency: "Pulivendula" },
        { name: "M. Dhruva Kumar Reddy", party: "Indian National Congress (INC)", symbol: "✋", constituency: "Pulivendula" },

        // Mangalagiri
        { name: "Nara Lokesh", party: "Telugu Desam Party (TDP)", symbol: "🚲", constituency: "Mangalagiri" },
        { name: "Murugudu Lavanya", party: "YSRCP", symbol: "🌀", constituency: "Mangalagiri" },
        { name: "Jasti Chandrasekhar Rao", party: "Indian National Congress (INC)", symbol: "✋", constituency: "Mangalagiri" },

        // Hindupur
        { name: "Nandamuri Balakrishna", party: "Telugu Desam Party (TDP)", symbol: "🚲", constituency: "Hindupur" },
        { name: "T. N. Deepika", party: "YSRCP", symbol: "🌀", constituency: "Hindupur" },
        { name: "B. A. Samad Shaheen", party: "Indian National Congress (INC)", symbol: "✋", constituency: "Hindupur" }
    ];

    // Bulk Insert Construction for Postgres
    // Postgres doesn't support 'VALUES ?' like mysql2. We need labeled parameters.
    const values = candidates.flatMap(c => [c.name, c.party, c.symbol, c.constituency]);
    const placeholders = candidates.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');

    const query = `INSERT INTO candidates (name, party, symbol, constituency) VALUES ${placeholders}`;

    await pool.query(query, values);
    console.log("Seeding completed.");
};

// Get Candidates by Constituency
const getCandidatesByConstituency = async (constituency) => {
    const query = 'SELECT * FROM candidates WHERE constituency = $1';
    const { rows } = await pool.query(query, [constituency]);
    return rows;
};

// Get Candidates by Metadata (Constituency, District)
const getCandidatesByMetadata = async (metadata) => {
    const { constituency, district } = metadata;
    let query = 'SELECT c.* FROM candidates c';
    let params = [];
    let conditions = [];

    if (constituency) {
        params.push(constituency);
        conditions.push(`c.constituency = $${params.length}`);
    }

    if (district) {
        query += ' JOIN constituencies co ON c.constituency = co.name';
        params.push(district);
        conditions.push(`co.district = $${params.length}`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    const { rows } = await pool.query(query, params);
    return rows;
};

// Create Candidate (for manual addition)
const createCandidate = async (candidate) => {
    const { name, party, constituency, symbol, photo_url } = candidate;
    const query = 'INSERT INTO candidates (name, party, constituency, symbol, photo_url) VALUES ($1, $2, $3, $4, $5)';
    await pool.query(query, [name, party, constituency, symbol, photo_url]);
};

module.exports = { createCandidateTable, getCandidatesByConstituency, getCandidatesByMetadata, createCandidate, seedCandidates };
