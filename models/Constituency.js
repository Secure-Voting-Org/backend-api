const { mysqlPool } = require('../config/db');

// Create Constituency Table
const createConstituencyTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS constituencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        district VARCHAR(100),
        voter_count INT DEFAULT 0
    )`;
    await mysqlPool.execute(query);
    console.log("Constituency table checked/created.");
};

// Add Constituency
const addConstituency = async (name, district) => {
    const [result] = await mysqlPool.execute(
        'INSERT INTO constituencies (name, district) VALUES (?, ?)',
        [name, district]
    );
    return result.insertId;
};

// Get All Constituencies
const getAllConstituencies = async () => {
    const [rows] = await mysqlPool.execute('SELECT * FROM constituencies');
    return rows;
};

module.exports = { createConstituencyTable, addConstituency, getAllConstituencies };
