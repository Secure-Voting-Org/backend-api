/**
 * Database Backup & Recovery Script
 * 
 * Uses pg_dump for full database snapshots.
 * Backups are stored in /backups/ directory with a timestamp.
 * 
 * Usage:
 *   node scripts/backup.js                  - Create a new backup
 *   node scripts/backup.js --restore <file>  - Restore from a backup file
 *   node scripts/backup.js --list            - List available backups
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../backups');

const ensureBackupDir = () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
};

const getDbConfig = () => {
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL };
    }
    return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    };
};

const createBackup = () => {
    ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const config = getDbConfig();
    let pgDumpCmd;

    if (config.connectionString) {
        // Use connection string directly (Neon DB)
        pgDumpCmd = `pg_dump "${config.connectionString}" --no-owner --no-acl -F p -f "${filepath}"`;
    } else {
        const env = { ...process.env, PGPASSWORD: config.password };
        pgDumpCmd = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} --no-owner --no-acl -F p -f "${filepath}"`;
        process.env.PGPASSWORD = config.password;
    }

    try {
        execSync(pgDumpCmd, { stdio: 'pipe' });
        const stats = fs.statSync(filepath);
        console.log(`✅ Backup created: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
        return { success: true, filename, filepath, size: stats.size };
    } catch (err) {
        // If pg_dump not available, create a JSON-based data snapshot instead
        console.warn('pg_dump not available — creating JSON snapshot instead');
        return createJsonSnapshot(filepath.replace('.sql', '.json'));
    }
};

const createJsonSnapshot = async (filepath) => {
    const { pool } = require('../config/db');
    const tables = ['voters', 'admins', 'candidates', 'constituencies', 'election_config', 'electoral_roll', 'logs'];
    const snapshot = { created_at: new Date().toISOString(), tables: {} };

    for (const table of tables) {
        try {
            const { rows } = await pool.query(`SELECT * FROM ${table}`);
            snapshot.tables[table] = rows;
        } catch (e) {
            snapshot.tables[table] = { error: e.message };
        }
    }

    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
    const stats = fs.statSync(filepath);
    const filename = path.basename(filepath);
    console.log(`✅ JSON Snapshot created: ${filename}`);
    return { success: true, filename, filepath, size: stats.size, type: 'json' };
};

const listBackups = () => {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup_') && (f.endsWith('.sql') || f.endsWith('.json')))
        .map(f => {
            const filepath = path.join(BACKUP_DIR, f);
            const stats = fs.statSync(filepath);
            return {
                filename: f,
                size: stats.size,
                sizeHuman: `${(stats.size / 1024).toFixed(1)} KB`,
                createdAt: stats.mtime.toISOString(),
                type: f.endsWith('.sql') ? 'pg_dump' : 'json_snapshot',
            };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return files;
};

const restoreBackup = (filename) => {
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) {
        throw new Error(`Backup file not found: ${filename}`);
    }
    const config = getDbConfig();
    let pgRestoreCmd;
    if (config.connectionString) {
        pgRestoreCmd = `psql "${config.connectionString}" -f "${filepath}"`;
    } else {
        process.env.PGPASSWORD = config.password;
        pgRestoreCmd = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${filepath}"`;
    }
    try {
        execSync(pgRestoreCmd, { stdio: 'pipe' });
        console.log(`✅ Restored from: ${filename}`);
        return { success: true, restored: filename };
    } catch (err) {
        throw new Error(`Restore failed: ${err.message}`);
    }
};

// CLI handler
const [,, cmd, arg] = process.argv;
if (cmd === '--list') {
    const backups = listBackups();
    console.log(`Found ${backups.length} backups:`);
    backups.forEach(b => console.log(`  ${b.filename} (${b.sizeHuman}) - ${b.createdAt}`));
} else if (cmd === '--restore' && arg) {
    restoreBackup(arg);
} else if (!cmd || cmd === '--backup') {
    createBackup();
}

module.exports = { createBackup, listBackups, restoreBackup, createJsonSnapshot };
