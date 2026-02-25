const { pool } = require('./config/db');

async function resetVoters() {
    try {
        await pool.query('UPDATE voters SET has_voted = FALSE;');
        console.log('Successfully reset all voters to not voted.');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}

resetVoters();
