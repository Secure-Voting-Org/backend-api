const fs = require('fs');
const FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';
try {
    const content = fs.readFileSync(FILE, 'utf8');
    const matches = content.match(/"name":/g);
    const count = matches ? matches.length : 0;
    console.log(`__COUNT__:${count}`);
} catch (e) {
    console.error(e);
}
