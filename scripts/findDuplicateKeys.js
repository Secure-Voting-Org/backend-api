const fs = require('fs');
const FILE = 'C:/Secure-Transparent-Electronic-Voting-System/project-voter-registration/src/data/locationData.js';

const content = fs.readFileSync(FILE, 'utf8');
const lines = content.split('\n');

let duplicateKeys = [];
let stateKeys = new Set();
let districtKeys = new Set(); // Reset per state

let currentState = null;
let inDistricts = false;

// Heuristic: Assume standard formatting
// State keys are at indentation 4 (or inside top level)
// District keys are inside "districts": { ... }

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Top level state detection (approximate)
    // "Andhra Pradesh": {
    if (line.match(/^\s{4}"[^"]+": {/)) {
        // Likely a state? Or district?
        // Top level properties of 'locationData' are States.
        // locationData is inside `checkDupes` structure? No, source file.
        // Indentation analysis:
        // export const locationData = {
        //     "State": {
        //         "districts": {
        //             "District": [
    }
}

// Simpler Regex approach
// Find all "KEY": {
// If indentation matches.

function findDupes() {
    const stateMatches = content.matchAll(/^\s{4}"([^"]+)":/gm);
    const seenStates = new Set();
    for (const m of stateMatches) {
        if (seenStates.has(m[1])) console.log(`Duplicate STATE: ${m[1]}`);
        seenStates.add(m[1]);
    }

    // Identify blocks for districts
    // This is hard with regex. 
    // Let's use a streaming parser logic.
}

console.log("Analyzing structure...");
// We will look for lines like: "Key": [ or {
// and check duplicates within the same block.

const stack = [new Set()]; // Stack of key sets for current object depth
let indentLevel = 0;

lines.forEach((line, idx) => {
    // Estimate indent
    const match = line.match(/^(\s*)"([^"]+)":/);
    if (!match) {
        if (line.includes('}')) {
            // Pop stack if indent decreases? Hard to track exact braces.
        }
        return;
    }

    // Naive: If we see "Key": ... 
    // and strictly assume duplicates appear adjacent or in same block?
    // If exact same indentation implies same block?
    const indent = match[1].length;
    const key = match[2];

    // We can just look for Duplicate keys at specific indentation levels known to be State/District.
    // State indent = 4 spaces.
    // District indent = 12 spaces (State=4, districts=8, District=12).

    if (indent === 4) {
        // State
        if (stateKeys.has(key)) console.log(`Duplicate STATE: ${key} (Line ${idx + 1})`);
        stateKeys.add(key);
        // Reset districts when seeing a new state? Actually we switch states.
        // But scanning linearly, if we see duplicate state, we flag it.
    }

    if (indent === 12) {
        // District? 
        // Need to reset 'districtKeys' when we exit a state. BUT simplistic:
        // Just checking GLOBAL uniqueness matches? No. Districts repeat across states.
        // Determining context is needed.
    }
});

console.log("Regex state check done. Checking districts (harder)...");
// Let's use specific logic:
// Split file by State blocks.
// For each state block, check district keys.
const stateBlocks = content.split(/^\s{4}"/m);
// This split might be messy.

// Let's just grep "District": { or [ and see if any repeats closely?
