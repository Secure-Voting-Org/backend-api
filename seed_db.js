const { checkMysqlConnection } = require('./config/db');
const { createCandidateTable, seedCandidates } = require('./models/Candidate');
const { mysqlPool } = require('./config/db');

const runSeed = async () => {
    try {
        await checkMysqlConnection();
        console.log("Connected to DB.");

        // Drop table to ensure schema update (adding symbol column)
        await mysqlPool.query('DROP TABLE IF EXISTS candidates');
        console.log("Dropped old candidates table.");

        await createCandidateTable();
        console.log("Created new candidates table.");

        await seedCandidates();
        console.log("Seeding successful.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

runSeed();
