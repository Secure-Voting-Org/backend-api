const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL Connection Pool
const mysqlPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check MySQL Connection
const checkMysqlConnection = async () => {
    try {
        const connection = await mysqlPool.getConnection();
        console.log('MySQL Connected Successfully');
        connection.release();
    } catch (err) {
        console.error('MySQL Connection Error:', err);
    }
};

module.exports = {
    mysqlPool,
    checkMysqlConnection
};
