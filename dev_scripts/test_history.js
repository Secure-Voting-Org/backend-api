const fetch = require('node-fetch');

const API = 'http://localhost:5000/api';

async function testHistoryAPI() {
    console.log("=== Testing Election History API ===");

    // 1. Get Initial History (Should be empty or existing)
    console.log("\n[1] Fetching Current History...");
    let res = await fetch(`${API}/election/history`);
    let history = await res.json();
    console.log("Current History Count:", history.length);

    // 2. Archive mock results
    console.log("\n[2] Archiving Mock Election Results...");
    const mockResults = {
        "Downtown": { "CandA": 150, "CandB": 85 },
        "Uptown": { "CandA": 200, "CandB": 210 }
    };

    res = await fetch(`${API}/admin/election/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultsJson: mockResults, totalVotes: 645 })
    });

    let archiveRes = await res.json();
    console.log("Archive Response:", archiveRes);

    // 3. Get History Again
    console.log("\n[3] Fetching History After Archive...");
    res = await fetch(`${API}/election/history`);
    history = await res.json();
    console.log("New History Count:", history.length);
    console.log("Latest Record:", history[0]);

    // 4. Test SysAdmin Reset
    console.log("\n[4] Testing SysAdmin Reset...");
    res = await fetch(`${API}/admin/election/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    let resetRes = await res.json();
    console.log("Reset Response:", resetRes);

    res = await fetch(`${API}/election/status`);
    let status = await res.json();
    console.log("New Phase Status:", status.phase);
}

testHistoryAPI().catch(console.error);
