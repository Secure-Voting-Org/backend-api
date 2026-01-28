const { mysqlPool } = require('../config/db');

// Create Candidates Table
const createCandidateTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        party VARCHAR(100),
        constituency VARCHAR(100) NOT NULL,
        symbol VARCHAR(50),
        photo_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await mysqlPool.query(query);
};

// Seed Candidates
const seedCandidates = async () => {
    // Clear existing data to avoid duplicates for this demo
    await mysqlPool.query('TRUNCATE TABLE candidates');

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

    const query = 'INSERT INTO candidates (name, party, symbol, constituency) VALUES ?';
    const values = candidates.map(c => [c.name, c.party, c.symbol, c.constituency]);

    await mysqlPool.query(query, [values]);
    console.log("Seeding completed.");
};

// Get Candidates by Constituency
const getCandidatesByConstituency = async (constituency) => {
    const query = 'SELECT * FROM candidates WHERE constituency = ?';
    const [rows] = await mysqlPool.query(query, [constituency]);
    return rows;
};

// Create Candidate (for manual addition)
const createCandidate = async (candidate) => {
    const { name, party, constituency, symbol, photo_url } = candidate;
    const query = 'INSERT INTO candidates (name, party, constituency, symbol, photo_url) VALUES (?, ?, ?, ?, ?)';
    await mysqlPool.query(query, [name, party, constituency, symbol, photo_url]);
};

module.exports = { createCandidateTable, getCandidatesByConstituency, createCandidate, seedCandidates };
