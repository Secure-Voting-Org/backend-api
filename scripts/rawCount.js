const fs = require('fs');
const FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';
const content = fs.readFileSync(FILE, 'utf8');
const matches = (content.match(/"name":/g) || []).length;
console.log(`Raw "name": occurrences: ${matches}`);
