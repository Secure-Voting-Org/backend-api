const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function seedAll() {
    try {
        console.log("Reading locationData.js from frontend...");
        const filePath = path.join(__dirname, '..', 'project-voter-registration', 'src', 'data', 'locationData.js');
        let content = fs.readFileSync(filePath, 'utf8');

        // Convert 'export const locationData =' to 'const locationData ='
        content = content.replace('export const locationData =', 'const locationData =');
        // Add module.exports at the end
        content += '\nmodule.exports = { locationData };';

        // Write a temporary commonjs file
        const tempPath = path.join(__dirname, 'temp_locationData.js');
        fs.writeFileSync(tempPath, content);

        const { locationData } = require('./temp_locationData.js');

        console.log("Starting full location seeding...");

        // Clear existing constituencies to avoid duplicates or mess
        // WARNING: This clears the table. If you want to keep existing, remove this.
        // Given the current state (broken/empty states), clearing is better.
        // await pool.query('DELETE FROM constituencies'); 

        let total = 0;
        for (const [state, stateObj] of Object.entries(locationData)) {
            for (const [district, acList] of Object.entries(stateObj.districts)) {
                for (const ac of acList) {
                    await pool.query(
                        'INSERT INTO constituencies (name, district, state) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                        [ac.name, district, state]
                    );
                    total++;
                }
            }
        }

        console.log(`\n✅ Successfully processed ${total} constituencies!`);

        // Clean up temp file
        fs.unlinkSync(tempPath);
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

seedAll();
