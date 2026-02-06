const fs = require('fs');
const FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';
const content = fs.readFileSync(FILE, 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('"Maharashtra":')) console.log(`Line ${i + 1}: ${l.trim()}`);
});
