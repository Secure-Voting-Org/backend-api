const secrets = require('secrets.js-grempe');
const { loadOrGenerateKeys, getShares } = require('./utils/encryption_keys');

async function run() {
    console.log("Loading/Generating keys...");
    const { privateKey } = await loadOrGenerateKeys();

    console.log("Fetching shares...");
    const sharesObj = getShares();
    if (!sharesObj || !sharesObj.shares) {
        console.error("No shares found.");
        return;
    }

    const { 'Official A': shareA, 'Official B': shareB, 'Official C': shareC } = sharesObj.shares;

    console.log("Attempting combine with 2 parts (should not produce valid JSON):");
    try {
        const combHex2 = secrets.combine([shareA, shareB]);
        const combStr2 = secrets.hex2str(combHex2);
        JSON.parse(combStr2);
        console.log("❌ 2 parts unexpectedly produced valid JSON!");
    } catch (e) {
        console.log("✅ 2 parts correctly failed to produce valid JSON.");
    }

    console.log("Attempting combine with 3 parts (should produce valid JSON):");
    try {
        const combHex3 = secrets.combine([shareA, shareB, shareC]);
        const combStr3 = secrets.hex2str(combHex3);
        const parsedKey = JSON.parse(combStr3);
        if (parsedKey.lambda && parsedKey.mu) {
            console.log("✅ 3 parts correctly reconstructed the private key JSON.");
        } else {
            console.log("❌ JSON parsed but missing key structure.");
        }
    } catch (e) {
        console.log("❌ 3 parts unexpectedly failed:", e.message);
    }
}

run();
