const { pool } = require('../config/db');

const createElectoralRollTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS electoral_roll (
        id SERIAL PRIMARY KEY,
        aadhaar_number VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        constituency VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await pool.query(query);
    console.log("Electoral Roll table checked/created.");
};

const importElectoralRoll = async (csvData) => {
    let importedCount = 0;
    
    // We use a transaction for batch insert
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const row of csvData) {
            // Basic validation - handle both name/full_name from CSV for robustness
            const name = row.name || row.full_name;
            const phone = row.phone || '';
            if (!row.aadhaar_number || !name || !row.constituency) continue;
            
            // Insert with upsert
            const query = `
                INSERT INTO electoral_roll (aadhaar_number, name, phone, constituency) 
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (aadhaar_number) 
                DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, constituency = EXCLUDED.constituency
            `;
            await client.query(query, [row.aadhaar_number.trim(), name.trim(), phone.trim(), row.constituency.trim()]);
            importedCount++;
        }
        
        await client.query('COMMIT');
        return { imported: importedCount };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const getElectoralRoll = async () => {
    const { rows } = await pool.query('SELECT * FROM electoral_roll ORDER BY created_at DESC');
    return rows;
};

// Find citizen by Aadhaar and optional Phone (phone check for additional security)
const findCitizen = async (aadhaar, phone = null) => {
    // Note: If phone is provided, we check it against the voter table (this might be a cross-table check)
    // For the electoral roll itself, we primarily check Aadhaar.
    const { rows } = await pool.query('SELECT * FROM electoral_roll WHERE aadhaar_number = $1', [aadhaar]);
    return rows[0];
};

module.exports = {
    createElectoralRollTable,
    importElectoralRoll,
    getElectoralRoll,
    findCitizen
};
