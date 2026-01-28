const { createVoter, createVoterTable } = require('./models/Voter');
const { checkMysqlConnection, mysqlPool } = require('./config/db');

const seedData = async () => {
    try {
        await checkMysqlConnection();
        await createVoterTable();

        // Sample Face Descriptor (Mock 128-float array)
        // In a real scenario, this would be a valid descriptor from a known image.
        // For testing "Match", we might need to relax the check or use a tool to get this.
        const mockDescriptor = new Array(128).fill(0.1);

        const voters = [
            {
                id: 'ABC1234567',
                name: 'Alice Johnson',
                constituency: 'Downtown-East',
                face_descriptor: mockDescriptor
            },
            {
                id: 'XYZ9876543',
                name: 'Bob Smith',
                constituency: 'Uptown-West',
                face_descriptor: mockDescriptor
            },
            {
                id: 'TEST000001',
                name: 'Test Setup User',
                constituency: 'Debug-Zone',
                face_descriptor: mockDescriptor
            }
        ];

        for (const voter of voters) {
            try {
                await createVoter(voter);
                console.log(`Added voter: ${voter.name} (${voter.id})`);
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log(`Voter ${voter.id} already exists.`);
                } else {
                    console.error(`Failed to add ${voter.name}:`, err);
                }
            }
        }

        console.log('Seeding completed.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedData();
