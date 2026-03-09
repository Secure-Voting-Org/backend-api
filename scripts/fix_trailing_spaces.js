require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../config/db');

async function fixTrailingSpaces() {
    try {
        console.log("Connecting to the database to fix trailing spaces in voter IDs...");
        
        // Find all affected voter IDs in `voters` table
        const res = await pool.query("SELECT id FROM voters WHERE id LIKE '% '");
        const affectedVoters = res.rows;
        
        console.log(`Found ${affectedVoters.length} voters with trailing spaces in their IDs.`);
        
        if (affectedVoters.length === 0) {
            console.log("No fixes needed.");
            process.exit(0);
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const row of affectedVoters) {
                const badId = row.id;
                const goodId = badId.trim();
                
                console.log(`Fixing voter ID: '${badId}' -> '${goodId}'`);
                
                // 1. Find linked registrations
                const regRes = await client.query("SELECT application_id FROM voter_registrations WHERE voter_id = $1", [badId]);
                const linkedAppIds = regRes.rows.map(r => r.application_id);
                
                // 2. Unlink temporarily to avoid foreign key errors
                if (linkedAppIds.length > 0) {
                    await client.query("UPDATE voter_registrations SET voter_id = NULL WHERE voter_id = $1", [badId]);
                }
                
                // 3. Update the voters table primary key
                await client.query("UPDATE voters SET id = $1 WHERE id = $2", [goodId, badId]);
                
                // 4. Relink the registrations to the corrected voter ID
                if (linkedAppIds.length > 0) {
                    await client.query("UPDATE voter_registrations SET voter_id = $1 WHERE application_id = ANY($2)", [goodId, linkedAppIds]);
                }
                
                // 5. Check if the vote table has this voter_id (though they couldn't vote if they couldn't login, just in case)
                // Note: The `votes` table doesn't have a direct hard FK to voters in standard setup, but we update it anyway if needed.
                await client.query("UPDATE votes SET voter_id = $1 WHERE voter_id = $2", [goodId, badId]).catch(e => {
                    // Ignore column not found errors etc 
                });
            }
            
            await client.query('COMMIT');
            console.log("Successfully fixed all trailing spaces!");
            
        } catch(e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
            process.exit(0);
        }
    } catch (e) {
        console.error("Critical Error execution script:", e);
        process.exit(1);
    }
}

fixTrailingSpaces();
