const fs = require('fs');
const path = require('path');

const SOURCE_FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';
const TEMP_FILE = path.join(__dirname, 'temp_exact_dupes.js');

try {
    let content = fs.readFileSync(SOURCE_FILE, 'utf8');
    content = content.replace('export const locationData =', 'module.exports =');
    fs.writeFileSync(TEMP_FILE, content);

    const locationData = require(TEMP_FILE);
    const seen = new Set();
    const dupes = [];
    let total = 0;

    console.log("Checking for exact duplicates (Name + District + State)...");

    for (const [state, stateData] of Object.entries(locationData)) {
        for (const [district, constituencies] of Object.entries(stateData.districts)) {
            for (const c of constituencies) {
                total++;
                const key = `${c.name}|${district}|${state}`;
                if (seen.has(key)) {
                    dupes.push({ name: c.name, district, state });
                } else {
                    seen.add(key);
                }
            }
        }
    }

    console.log(`Total Records in File: ${total}`);
    console.log(`Total Unique Records: ${seen.size}`);
    console.log(`Exact Duplicates Found: ${dupes.length}`);

    dupes.forEach(d => {
        console.log(`- ${d.name} (District: ${d.district}, State: ${d.state})`);
    });

} catch (e) {
    console.error(e);
} finally {
    if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE);
}
