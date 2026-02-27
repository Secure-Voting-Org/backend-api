const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

// Paths to data files
const CANDIDATES_FILE_PATH = path.join(__dirname, '../candidatesData (1).js');
const LOCATIONS_FILE_PATH = path.join(__dirname, '../project-voter-registration/src/data/locationData.js');

// Emoji Mappings
const PARTY_LOGOS = {
    'TDP': '💛',
    'YSRCP': '💙',
    'INC': '🇮🇳',
    'BJP': '🪷',
    'JSP': '🥛',
    'BSP': '🐘',
    'CPI': '☭',
    'CPM': '☭',
    'CPI(M)': '☭',
    'IND': '👤',
    'Independent': '👤',
    'NOTA': '🚫'
};

const DEFAULT_LOGO = '👤';

const getPartyLogo = (partyName) => {
    if (!partyName) return DEFAULT_LOGO;
    if (PARTY_LOGOS[partyName]) return PARTY_LOGOS[partyName];
    for (const [key, logo] of Object.entries(PARTY_LOGOS)) {
        if (partyName.includes(key)) return logo;
    }
    return DEFAULT_LOGO;
};

// Helper: Parse the JS file exporting an object
const parseJsFile = (filePath, exportName) => {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        // Remove export statement
        const regex = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*`);
        content = content.replace(regex, '');
        // Remove trailing semicolon
        content = content.trim().replace(/;$/, '');
        // Evaluate safely-ish
        return eval(`(${content})`);
    } catch (err) {
        console.error(`Error parsing ${filePath}:`, err);
        process.exit(1);
    }
};

const seedDatabase = async () => {
    const client = await pool.connect();
    try {
        console.log("Starting full election data seed...");

        const candidateData = parseJsFile(CANDIDATES_FILE_PATH, 'candidatesData');
        const locationData = parseJsFile(LOCATIONS_FILE_PATH, 'locationData');

        console.log("Data files parsed successfully.");

        await client.query('BEGIN');

        console.log("Truncating tables...");
        await client.query('TRUNCATE TABLE candidates, constituencies RESTART IDENTITY CASCADE');

        let constituencyCount = 0;
        let candidateCount = 0;

        // 1. Seed Constituencies from locationData (Source of Truth)
        console.log("Seeding Constituencies from locationData...");

        // Map to quickly find candidates later: State -> District -> Constituency -> CandidateList
        // Note: The candidateData structure might differ slightly or have different District names
        // We will try to match strictly first, then maybe fuzzy if needed.

        for (const [stateName, stateData] of Object.entries(locationData)) {
            const districts = stateData.districts;

            for (const [districtName, constituencies] of Object.entries(districts)) {

                // locationData constituencies is an Array of Objects { name, number }
                for (const constObj of constituencies) {
                    const constituencyName = constObj.name;
                    const constituencyNumber = constObj.number; // Might be useful later

                    try {
                        const insertConstituencyQuery = `
                            INSERT INTO constituencies (name, district, state, voter_count)
                            VALUES ($1, $2, $3, $4)
                            ON CONFLICT (name) DO UPDATE SET 
                                district = EXCLUDED.district, 
                                state = EXCLUDED.state
                            RETURNING id
                        `;
                        await client.query(insertConstituencyQuery, [constituencyName, districtName, stateName, 0]);
                        constituencyCount++;

                        // 2. Find and Seed Candidates for this Constituency
                        // Look up in candidateData
                        let candidatesList = [];

                        // Access path: candidateData[stateName][districts][districtName][constituencyName] is array?
                        // Analyzing `candidatesData (1).js`:
                        // "Andhra Pradesh": { "districts": { "Srikakulam": { "Ichchapuram": [...] } } }

                        try {
                            // Check State
                            if (candidateData[stateName]) {
                                // Check District level. 
                                // candidateData has "districts" key inside state usually?
                                // Let's check if there's a direct map or nested 'districts'
                                let stateNode = candidateData[stateName];
                                let districtNode = stateNode.districts ? stateNode.districts[districtName] : stateNode[districtName];

                                if (districtNode) {
                                    // District found. Check Constituency.
                                    // candidateData[State][District] is an object where keys are constituencies?
                                    // Yes: "Ichchapuram": [...]
                                    if (districtNode[constituencyName]) {
                                        candidatesList = districtNode[constituencyName];
                                    } else {
                                        // Some constituency names might differ slightly?
                                        // For now, only exact match.
                                        // console.warn(`No candidates found for ${constituencyName} in candidatesData`);
                                    }
                                } else {
                                    // Try to find if the constituency is misplaced in another district or top level?
                                    // Too complex for now. Assume structure matches mostly.
                                }
                            }
                        } catch (lookupErr) {
                            // ignore lookup errors
                        }

                        // Insert Candidates found
                        if (candidatesList && candidatesList.length > 0) {
                            for (const candidate of candidatesList) {
                                const partyLogo = getPartyLogo(candidate.party);
                                const insertCandidateQuery = `
                                    INSERT INTO candidates (name, party, symbol, constituency)
                                    VALUES ($1, $2, $3, $4)
                                `;
                                await client.query(insertCandidateQuery, [
                                    candidate.name,
                                    candidate.party,
                                    partyLogo,
                                    constituencyName
                                ]);
                                candidateCount++;
                            }
                        }

                    } catch (err) {
                        console.error(`Error processing constituency '${constituencyName}' in district '${districtName}':`, err.message);
                        throw err;
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log(`Seeding complete!`);
        console.log(`Inserted ${constituencyCount} constituencies.`);
        console.log(`Inserted ${candidateCount} candidates.`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Seeding failed (Rolled Back):", err);
    } finally {
        client.release();
        process.exit();
    }
};

seedDatabase();
