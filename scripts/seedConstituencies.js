const fs = require('fs');
const path = require('path');
const { addConstituency, createConstituencyTable } = require('../models/Constituency');
const { pool } = require('../config/db');

const SOURCE_FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';
const TEMP_FILE = path.join(__dirname, 'temp_location_data.js');

const importData = async () => {
    try {
        // DROP TABLE TO RESET SCHEMA (Destructive but necessary for schema change)
        console.log("Dropping existing table to reset schema...");
        await pool.query('DROP TABLE IF EXISTS constituencies');

        console.log("Re-creating table with new schema (Composite Unique Key)...");
        await createConstituencyTable();

        console.log("Reading source data...");
        let content = fs.readFileSync(SOURCE_FILE, 'utf8');

        // Convert ES6 export to CommonJS
        content = content.replace('export const locationData =', 'module.exports =');

        fs.writeFileSync(TEMP_FILE, content);
        console.log("Created temp data file.");

        const locationData = require(TEMP_FILE);

        let count = 0;
        let skipped = 0;

        for (const [state, stateData] of Object.entries(locationData)) {
            const districts = stateData.districts;
            for (const [district, constituencies] of Object.entries(districts)) {
                for (const constituency of constituencies) {
                    try {
                        await addConstituency(constituency.name, district, state);
                        console.log(`Added: ${constituency.name} (${district}, ${state})`);
                        count++;
                    } catch (err) {
                        if (err.code === '23505') { // Unique violation in Postgres
                            console.log(`Skipped (Duplicate): ${constituency.name} in ${district}, ${state}`);
                            skipped++;
                        } else {
                            console.error(`Error adding ${constituency.name}:`, err.message);
                        }
                    }
                }
            }
        }

        console.log(`\nSeeding Complete! Added: ${count}, Skipped: ${skipped}`);

    } catch (err) {
        console.error("Seeding failed/crashed:", err);
    } finally {
        if (fs.existsSync(TEMP_FILE)) {
            fs.unlinkSync(TEMP_FILE);
            console.log("Cleaned up temp file.");
        }
        await pool.end();
    }
};

importData();
