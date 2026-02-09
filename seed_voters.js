const { checkDbConnection } = require('./config/db');
const { createVoterTable, createVoter } = require('./models/Voter');
const { pool } = require('./config/db');

// Dummy Face Descriptor (128-float array filled with 0.1)
const DUMMY_DESCRIPTOR = Array(128).fill(0.1);

const seedVoters = async () => {
    try {
        await checkDbConnection();
        console.log("Connected to DB.");

        // Clear existing voters
        await pool.query('TRUNCATE TABLE voters RESTART IDENTITY CASCADE');
        console.log("Cleared old voters.");

        // Create table just in case
        await createVoterTable();

        const voters = [
            { id: 'ABC1234567', name: 'Nara Voter', constituency: 'Kuppam' },
            { id: 'XYZ9876543', name: 'Pawan Fan', constituency: 'Pithapuram' },
            { id: 'VOTER001', name: 'YSR Supporter', constituency: 'Pulivendula' },
            { id: 'VOTER002', name: 'Mangalagiri Citizen', constituency: 'Mangalagiri' },
            { id: 'VOTER003', name: 'Hindupur Resident', constituency: 'Hindupur' }
        ];

        for (const voter of voters) {
            await createVoter({
                ...voter,
                face_descriptor: DUMMY_DESCRIPTOR // Default dummy face
            });
            console.log(`Created voter ${voter.name} (${voter.constituency})`);
        }

        console.log("Voter seeding completed.");
        process.exit(0);
    } catch (err) {
        console.error("Voter seeding failed:", err);
        process.exit(1);
    }
};

seedVoters();
