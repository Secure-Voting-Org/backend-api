const fs = require('fs');
const path = require('path');
const FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';
const TEMP = path.join(__dirname, 'temp_counts.js');

let content = fs.readFileSync(FILE, 'utf8');
content = content.replace('export const locationData =', 'module.exports =');
fs.writeFileSync(TEMP, content);

const data = require(TEMP);
let total = 0;

console.log("Counts per State:");
for (const [state, sData] of Object.entries(data)) {
    let sCount = 0;
    for (const [dist, cList] of Object.entries(sData.districts)) {
        sCount += cList.length;
    }
    console.log(`${state}: ${sCount}`);
    total += sCount;
}
console.log(`Total: ${total}`);

fs.unlinkSync(TEMP);
