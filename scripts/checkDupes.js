const fs = require('fs');
const path = require('path');

const SOURCE_FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';
const TEMP_FILE = path.join(__dirname, 'temp_check_dupes.js');

try {
    let content = fs.readFileSync(SOURCE_FILE, 'utf8');
    content = content.replace('export const locationData =', 'module.exports =');
    fs.writeFileSync(TEMP_FILE, content);

    const locationData = require(TEMP_FILE);
    const names = {};
    let total = 0;

    for (const state in locationData) {
        for (const district in locationData[state].districts) {
            for (const c of locationData[state].districts[district]) {
                total++;
                if (names[c.name]) {
                    names[c.name].push(`${district}, ${state}`);
                } else {
                    names[c.name] = [`${district}, ${state}`];
                }
            }
        }
    }

    console.log(`Total Constituencies in File: ${total}`);

    let dupeCount = 0;
    console.log("\nDuplicate Names found:");
    for (const name in names) {
        if (names[name].length > 1) {
            console.log(`${name}: ${names[name].length} times (${names[name].join(' | ')})`);
            dupeCount += (names[name].length - 1);
        }
    }

    console.log(`\nPotential skipped records due to UNIQUE(name): ${dupeCount}`);

} catch (e) {
    console.error(e);
} finally {
    if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE);
}
