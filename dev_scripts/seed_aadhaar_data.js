const { checkDbConnection } = require('./config/db');
const { createElectoralRollTable, addCitizen } = require('./models/ElectoralRoll');
const { pool } = require('./config/db');

const seedAadhaar = async () => {
    try {
        await checkDbConnection();
        console.log("Connected to DB.");

        await createElectoralRollTable();

        const citizens = [
            { aadhaar_number: '111122223333', name: 'Ramesh Gupta', phone: '9876543210', constituency: 'Kuppam' },
            { aadhaar_number: '444455556666', name: 'Sita Reddy', phone: '9123456780', constituency: 'Pithapuram' },
            { aadhaar_number: '777788889999', name: 'John Doe', phone: '9988776655', constituency: 'Pulivendula' },
            { aadhaar_number: '123412341234', name: 'Jane Smith', phone: '9000011111', constituency: 'Mangalagiri' }
        ];

        console.log("Seeding Electoral Roll...");
        for (const citizen of citizens) {
            await addCitizen(citizen);
            console.log(`Added: ${citizen.name} (${citizen.aadhaar_number})`);
        }

        console.log("Seeding completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seedAadhaar();
