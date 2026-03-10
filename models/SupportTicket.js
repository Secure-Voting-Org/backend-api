const { pool } = require('../config/db');

const createSupportTicketTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
            id SERIAL PRIMARY KEY,
            voter_mobile VARCHAR(20),
            subject VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("Support Tickets table checked/created.");
};

const createTicket = async ({ voter_mobile, subject, message }) => {
    const { rows } = await pool.query(
        'INSERT INTO support_tickets (voter_mobile, subject, message) VALUES ($1, $2, $3) RETURNING *',
        [voter_mobile || null, subject, message]
    );
    return rows[0];
};

const getAllTickets = async (status = null) => {
    if (status) {
        const { rows } = await pool.query(
            'SELECT * FROM support_tickets WHERE status = $1 ORDER BY created_at DESC',
            [status]
        );
        return rows;
    }
    const { rows } = await pool.query('SELECT * FROM support_tickets ORDER BY created_at DESC');
    return rows;
};

const updateTicketStatus = async (id, status, admin_notes = null) => {
    const { rows } = await pool.query(
        `UPDATE support_tickets 
         SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 RETURNING *`,
        [status, admin_notes, id]
    );
    return rows[0];
};

const getTicketById = async (id) => {
    const { rows } = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
    return rows[0];
};

module.exports = { createSupportTicketTable, createTicket, getAllTickets, updateTicketStatus, getTicketById };
