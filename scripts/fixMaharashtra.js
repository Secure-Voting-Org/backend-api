const fs = require('fs');
const FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';

let content = fs.readFileSync(FILE, 'utf8');
const lines = content.split('\n');

// Find Block 1
let start1 = -1, end1 = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s{4}"Maharashtra": {/)) {
        start1 = i;
        break;
    }
}
if (start1 === -1) { console.log("Block 1 not found"); process.exit(1); }

for (let i = start1; i < lines.length; i++) {
    if (lines[i].match(/^\s{4}},/)) {
        end1 = i;
        break;
    }
}

// Find Block 2
let start2 = -1, end2 = -1;
for (let i = end1 + 1; i < lines.length; i++) {
    if (lines[i].match(/^\s{4}"Maharashtra": {/)) {
        start2 = i;
        break;
    }
}
if (start2 === -1) { console.log("Block 2 not found"); process.exit(1); }

for (let i = start2; i < lines.length; i++) {
    if (lines[i].match(/^\s{4}},/)) {
        end2 = i;
        break;
    }
}

console.log(`Block 1: ${start1 + 1}-${end1 + 1}`);
console.log(`Block 2: ${start2 + 1}-${end2 + 1}`);

// Extract and Parse
function parseBlock(start, end) {
    let blockLines = lines.slice(start, end + 1);
    // Remove trailing comma from closing brace if present
    if (blockLines[blockLines.length - 1].trim() === '},') {
        blockLines[blockLines.length - 1] = '    }';
    }
    const jsonStr = "{" + blockLines.join('\n') + "}";
    return JSON.parse(jsonStr).Maharashtra;
}

const mh1 = parseBlock(start1, end1);
const mh2 = parseBlock(start2, end2);

// Merge: mh1 <- mh2
// Districts
const districts1 = mh1.districts;
const districts2 = mh2.districts;

for (const [dist, list] of Object.entries(districts2)) {
    if (districts1[dist]) {
        // Merge arrays
        console.log(`Merging district: ${dist}`);
        districts1[dist] = districts1[dist].concat(list);
    } else {
        // Add new
        districts1[dist] = list;
    }
}

// Re-serialize Block 1
const mergedObj = { "Maharashtra": mh1 };
// Custom stringify to match indentation?
// Or just standardized JSON, indented 4 spaces.
// We need to strip the outer {}
let newBlockStr = JSON.stringify(mergedObj, null, 4);
// Remove first { and last }
newBlockStr = newBlockStr.substring(newBlockStr.indexOf('\n') + 1, newBlockStr.lastIndexOf('\n'));
// Ensure trailing comma for the block
newBlockStr += ',';

// Apply to content
// Delete Block 2 first (to keep indices valid? No, string replace).
// Better: Reconstruct lines array.

const newLines = [
    ...lines.slice(0, start1),
    newBlockStr, // Replaces Block 1
    ...lines.slice(end1 + 1, start2),
    // Skip Block 2
    ...lines.slice(end2 + 1)
];

fs.writeFileSync(FILE, newLines.join('\n'));
console.log("Merged Maharashtra blocks successfully.");
