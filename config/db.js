const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Check PostgreSQL Connection
const checkDbConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('PostgreSQL Connected Successfully');
        client.release();
    } catch (err) {
        console.error('PostgreSQL Connection Error:', err);
    }
};

// Export as mysqlPool to maintain backward compatibility with existing code imports,
// or we can update imports. Let's update imports in next steps but keep the export name clear.
// Actually, it is better to export 'pool' generally, but if I want to minimize churn I could alias it,
// but the methods are different (execute vs query). PG uses query() mostly. 
// MySQL2 uses execute(). I will export 'pool' and alias it as 'mysqlPool' to prevent import errors 
// strictly for the variable name, but I MUST update the method calls anyway.
// So I will just export 'pool'.

module.exports = {
    pool,
    checkDbConnection
};
