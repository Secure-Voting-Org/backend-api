const { pool } = require('./config/db');

const migrate = async () => {
    try {
        console.log("Starting migration...");

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Add ip_address if not exists (handling the error reported by user)
            // We use simple ALTER TABLE commands. Postgres 9.6+ supports IF NOT EXISTS for columns, 
            // but to be safe and simple we can just run them and ignore "duplicate column" errors or check first.
            // Let's check information_schema briefly or just use DO block for idempotency.

            const queries = [
                `ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);`,
                `ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS device_hash VARCHAR(100);`,
                `ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;`,
                `ALTER TABLE voter_registrations ADD COLUMN IF NOT EXISTS risk_flags JSON;`
            ];

            for (const q of queries) {
                console.log(`Executing: ${q}`);
                await client.query(q);
            }

            await client.query('COMMIT');
            console.log("Migration completed successfully.");
        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Migration failed, rolled back.", e);
            process.exit(1);
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Migration script error:", err);
        process.exit(1);
    } finally {
        // Pool end to exit process
        await pool.end();
    }
};

migrate();
