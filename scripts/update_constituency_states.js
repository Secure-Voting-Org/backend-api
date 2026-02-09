const { pool } = require('../config/db');

// Mapping of districts to states based on the existing constituencies
const districtToState = {
    'Chittoor': 'Andhra Pradesh',
    'Tirupati': 'Andhra Pradesh',
    'Khammam': 'Telangana',
    'Adilabad': 'Telangana',
    'Telangana': 'Telangana'
};

const updateStates = async () => {
    try {
        console.log('Starting state update for constituencies...');

        // Get all constituencies
        const { rows } = await pool.query('SELECT id, name, district FROM constituencies');

        let updated = 0;

        for (const constituency of rows) {
            const state = districtToState[constituency.district];

            if (state) {
                await pool.query(
                    'UPDATE constituencies SET state = $1 WHERE id = $2',
                    [state, constituency.id]
                );
                console.log(`Updated ${constituency.name} (${constituency.district}) -> ${state}`);
                updated++;
            } else {
                console.log(`⚠️  No state mapping found for district: ${constituency.district}`);
            }
        }

        console.log(`\n✅ Successfully updated ${updated} constituencies with state values!`);

    } catch (err) {
        console.error('❌ Error updating states:', err);
    } finally {
        await pool.end();
    }
};

updateStates();
