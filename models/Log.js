const { mysqlPool } = require('../config/db');

// Create Logs Table
const createLogTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event VARCHAR(50) NOT NULL,
        user_id VARCHAR(50),
        details JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
    await mysqlPool.query(query);
};

// Insert a log entry
const createLog = async (logData) => {
    const { event, user_id, details, ip_address } = logData;
    const query = 'INSERT INTO logs (event, user_id, details, ip_address) VALUES (?, ?, ?, ?)';
    await mysqlPool.query(query, [event, user_id, JSON.stringify(details), ip_address]);
};

module.exports = { createLogTable, createLog };
