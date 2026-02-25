/**
 * Module 5.3 — Election System Metrics Collector
 * Lightweight Prometheus-style in-memory metrics engine
 *
 * Tracks: requests, votes, errors, response times, active connections
 * Provides: middleware + getMetrics() + healthCheck()
 */

const { pool } = require('../config/db');

// ─── In-Memory Metrics Store ───
const metrics = {
    startTime: Date.now(),
    totalRequests: 0,
    totalVotes: 0,
    totalErrors: 0,
    activeConnections: 0,
    // Sliding window: last 60 snapshots (one per 3s poll = ~3 minutes of history)
    voteHistory: [],       // [{ timestamp, count }]
    errorHistory: [],      // [{ timestamp, count }]
    requestHistory: [],    // [{ timestamp, count }]
    // Last errors for debugging
    recentErrors: [],      // last 10 errors
    // Response time tracking
    responseTimes: [],     // last 100 response times in ms
};

// Track votes per second: called from vote endpoint
const recordVote = () => {
    metrics.totalVotes++;
};

// Track errors
const recordError = (path, message) => {
    metrics.totalErrors++;
    metrics.recentErrors.unshift({
        timestamp: new Date().toISOString(),
        path,
        message: String(message).substring(0, 200)
    });
    if (metrics.recentErrors.length > 10) metrics.recentErrors.pop();
};

// ─── Express Middleware ───
const metricsMiddleware = (req, res, next) => {
    metrics.totalRequests++;
    metrics.activeConnections++;

    const start = Date.now();

    // Track when response finishes
    res.on('finish', () => {
        metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
        const duration = Date.now() - start;
        metrics.responseTimes.push(duration);
        if (metrics.responseTimes.length > 100) metrics.responseTimes.shift();

        // Track errors (4xx/5xx)
        if (res.statusCode >= 400) {
            recordError(req.path, `HTTP ${res.statusCode}`);
        }
    });

    next();
};

// ─── Snapshot: called every 3 seconds to build history ───
let lastVoteCount = 0;
let lastErrorCount = 0;
let lastRequestCount = 0;

setInterval(() => {
    const now = Date.now();

    // Votes in this interval
    const voteDelta = metrics.totalVotes - lastVoteCount;
    lastVoteCount = metrics.totalVotes;
    metrics.voteHistory.push({ t: now, v: voteDelta });
    if (metrics.voteHistory.length > 60) metrics.voteHistory.shift();

    // Errors in this interval
    const errorDelta = metrics.totalErrors - lastErrorCount;
    lastErrorCount = metrics.totalErrors;
    metrics.errorHistory.push({ t: now, v: errorDelta });
    if (metrics.errorHistory.length > 60) metrics.errorHistory.shift();

    // Requests in this interval
    const reqDelta = metrics.totalRequests - lastRequestCount;
    lastRequestCount = metrics.totalRequests;
    metrics.requestHistory.push({ t: now, v: reqDelta });
    if (metrics.requestHistory.length > 60) metrics.requestHistory.shift();
}, 3000);

// ─── Get All Metrics ───
const getMetrics = async () => {
    const uptimeMs = Date.now() - metrics.startTime;
    const memUsage = process.memoryUsage();

    // Election-specific: get real voter/vote counts from DB
    let totalRegisteredVoters = 0;
    let totalVotesCast = 0;
    let electionPhase = 'UNKNOWN';
    let constituencyTurnout = [];

    try {
        const voterRes = await pool.query('SELECT COUNT(*) as c FROM voters');
        totalRegisteredVoters = parseInt(voterRes.rows[0].c, 10);

        const voteRes = await pool.query('SELECT COUNT(*) as c FROM votes');
        totalVotesCast = parseInt(voteRes.rows[0].c, 10);

        const phaseRes = await pool.query('SELECT phase, is_kill_switch_active FROM election_config WHERE id = 1');
        if (phaseRes.rows[0]) {
            electionPhase = phaseRes.rows[0].phase;
        }

        // Turnout by constituency
        const turnoutRes = await pool.query(`
            SELECT v.constituency, COUNT(*) as votes,
                   (SELECT COUNT(*) FROM voters vt WHERE vt.constituency = v.constituency) as registered
            FROM votes v
            GROUP BY v.constituency
            ORDER BY COUNT(*) DESC
            LIMIT 10
        `);
        constituencyTurnout = turnoutRes.rows.map(r => ({
            constituency: r.constituency,
            votes: parseInt(r.votes, 10),
            registered: parseInt(r.registered, 10),
            turnout: r.registered > 0 ? ((parseInt(r.votes, 10) / parseInt(r.registered, 10)) * 100).toFixed(1) : '0.0'
        }));
    } catch (err) {
        // DB may be down — that's OK, health check will catch it
    }

    // Calculate rates
    const avgResponseTime = metrics.responseTimes.length > 0
        ? (metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length).toFixed(1)
        : 0;

    const votesPerSec = metrics.voteHistory.length > 0
        ? (metrics.voteHistory.slice(-10).reduce((a, b) => a + b.v, 0) / (10 * 3)).toFixed(2)
        : '0.00';

    const errorsPerMin = metrics.errorHistory.length > 0
        ? (metrics.errorHistory.slice(-20).reduce((a, b) => a + b.v, 0)).toFixed(0)
        : '0';

    return {
        // Election Metrics
        election: {
            phase: electionPhase,
            totalRegisteredVoters,
            totalVotesCast,
            turnoutPercent: totalRegisteredVoters > 0
                ? ((totalVotesCast / totalRegisteredVoters) * 100).toFixed(1)
                : '0.0',
            constituencyTurnout
        },
        // Performance Metrics
        performance: {
            totalRequests: metrics.totalRequests,
            totalErrors: metrics.totalErrors,
            activeConnections: metrics.activeConnections,
            avgResponseTimeMs: parseFloat(avgResponseTime),
            votesPerSec: parseFloat(votesPerSec),
            errorsPerMin: parseInt(errorsPerMin, 10),
        },
        // Time Series (for charts)
        timeSeries: {
            votes: metrics.voteHistory.map(h => h.v),
            errors: metrics.errorHistory.map(h => h.v),
            requests: metrics.requestHistory.map(h => h.v),
        },
        // System Resources
        system: {
            uptimeSeconds: Math.floor(uptimeMs / 1000),
            memoryUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
            memoryTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(1),
            nodeVersion: process.version,
        },
        // Recent Errors
        recentErrors: metrics.recentErrors,
        timestamp: new Date().toISOString()
    };
};

// ─── Health Check ───
const healthCheck = async () => {
    const checks = {};

    // Database
    try {
        const start = Date.now();
        await pool.query('SELECT 1');
        checks.database = { status: 'UP', latencyMs: Date.now() - start };
    } catch {
        checks.database = { status: 'DOWN', latencyMs: -1 };
    }

    // API
    checks.api = {
        status: 'UP', latencyMs: metrics.responseTimes.length > 0
            ? Math.round(metrics.responseTimes.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, metrics.responseTimes.length))
            : 0
    };

    // Blockchain (check if votes table accessible)
    try {
        const start = Date.now();
        await pool.query('SELECT COUNT(*) FROM votes LIMIT 1');
        checks.blockchain = { status: 'UP', latencyMs: Date.now() - start };
    } catch {
        checks.blockchain = { status: 'DOWN', latencyMs: -1 };
    }

    // Overall
    const allUp = Object.values(checks).every(c => c.status === 'UP');
    return { overall: allUp ? 'OPERATIONAL' : 'DEGRADED', services: checks };
};

module.exports = { metricsMiddleware, getMetrics, healthCheck, recordVote, recordError };
