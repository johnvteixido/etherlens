'use strict';

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { LRUCache } = require('lru-cache');
const { activeDefender, securityStatusHandler } = require('./aiDefender');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3001;

// --- SECURE MIDDLEWARE ---

// 1. Live AI Defense
app.use(activeDefender);

// 2. Security headers
app.use(helmet());

// 3. Strict CORS
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET'],
    allowedHeaders: ['x-api-key', 'Content-Type'],
}));

// 4. Body parser
app.use(express.json({ limit: '10kb' }));

// 5. Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests – please try again later.' },
});
app.use('/api/', apiLimiter);

// --- DATABASE (Self-initializing) ---
const dbPath = path.join(__dirname, 'etherlens.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Ensure schema exists and handles migrations
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT,
            port INTEGER,
            banner TEXT,
            device_type TEXT,
            risk_level TEXT,
            country TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(ip_address, port)
        )
    `);

    // Add columns if they are missing from older versions
    const tableInfo = db.prepare('PRAGMA table_info(hosts)').all();
    const columns = tableInfo.map(c => c.name);

    if (!columns.includes('device_type')) db.prepare('ALTER TABLE hosts ADD COLUMN device_type TEXT').run();
    if (!columns.includes('risk_level')) db.prepare('ALTER TABLE hosts ADD COLUMN risk_level TEXT').run();
    if (!columns.includes('country')) db.prepare('ALTER TABLE hosts ADD COLUMN country TEXT').run();

    logger.info('Database schema verified & migrated.');
} catch (e) {
    logger.error(`Database Init Error: ${e.message}`);
}

// --- IN-MEMORY CACHE ---
const queryCache = new LRUCache({ max: 50, ttl: 1000 * 5 });

// --- API KEY AUTHENTICATION ---
const API_KEY = process.env.API_KEY || 'etherlens_admin';

function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key || key !== API_KEY) {
        return res.status(403).json({ error: 'Forbidden: invalid or missing API key.' });
    }
    next();
}

// --- SANITIZE QUERY INPUT ---
function sanitize(str, maxLen = 128) {
    if (typeof str !== 'string') return '';
    return str.replace(/['"`;\\]/g, '').slice(0, maxLen);
}

// ============================================================
//  ROUTES
// ============================================================

// GET /api/search
app.get('/api/search', requireApiKey, (req, res) => {
    const raw = sanitize(req.query.q || '');
    const cacheKey = `search_${raw}`;
    if (queryCache.has(cacheKey)) return res.json(queryCache.get(cacheKey));

    try {
        let sql = 'SELECT * FROM hosts WHERE 1=1';
        const params = [];

        const portMatch = raw.match(/port:(\d{1,5})/);
        const countryMatch = raw.match(/country:([a-zA-Z]{2,32})/);
        const typeMatch = raw.match(/type:([a-zA-Z ]{1,32})/);
        const generic = raw.replace(/port:\S+/g, '').replace(/country:\S+/g, '').replace(/type:\S+/g, '').trim();

        if (portMatch) { sql += ' AND port = ?'; params.push(parseInt(portMatch[1], 10)); }
        if (countryMatch) { sql += ' AND LOWER(country) = LOWER(?)'; params.push(countryMatch[1]); }
        if (typeMatch) { sql += ' AND LOWER(device_type) LIKE ?'; params.push(`%${typeMatch[1]}%`); }
        if (generic) { sql += ' AND (banner LIKE ? OR ip_address LIKE ?)'; params.push(`%${generic}%`, `%${generic}%`); }

        sql += ' ORDER BY timestamp DESC LIMIT 50';

        const results = db.prepare(sql).all(...params);
        const response = { matches: results, total: results.length, query: raw };
        queryCache.set(cacheKey, response);
        res.json(response);
    } catch (e) {
        logger.error(`Search Error: ${e.message}`, { query: raw });
        res.status(500).json({ error: 'Search failed.', detail: e.message });
    }
});

// GET /api/stats
app.get('/api/stats', requireApiKey, (req, res) => {
    if (queryCache.has('stats')) return res.json(queryCache.get('stats'));

    try {
        const response = {
            total_hosts: db.prepare('SELECT COUNT(*) as count FROM hosts').get()?.count || 0,
            top_ports: db.prepare('SELECT port, COUNT(*) as count FROM hosts GROUP BY port ORDER BY count DESC LIMIT 5').all(),
            top_countries: db.prepare('SELECT country, COUNT(*) as count FROM hosts GROUP BY country ORDER BY count DESC LIMIT 5').all(),
            risk_levels: db.prepare('SELECT risk_level, COUNT(*) as count FROM hosts GROUP BY risk_level ORDER BY count DESC').all(),
        };
        queryCache.set('stats', response);
        res.json(response);
    } catch (e) {
        logger.error(`Stats Error: ${e.message}`);
        res.status(500).json({ error: 'Stats retrieval failed.', detail: e.message });
    }
});

// GET /api/ai/insights
app.get('/api/ai/insights', requireApiKey, (req, res) => {
    if (queryCache.has('ai_insights')) return res.json(queryCache.get('ai_insights'));

    try {
        const response = {
            categories: db.prepare('SELECT device_type, COUNT(*) as count FROM hosts GROUP BY device_type ORDER BY count DESC LIMIT 10').all(),
            high_risk_hosts: db.prepare("SELECT ip_address, port, banner, device_type FROM hosts WHERE risk_level IN ('High','Critical') LIMIT 10").all(),
        };
        queryCache.set('ai_insights', response);
        res.json(response);
    } catch (e) {
        logger.error(`AI Insights Error: ${e.message}`);
        res.status(500).json({ error: 'Insights retrieval failed.' });
    }
});

// GET /api/security/status (admin only)
app.get('/api/security/status', requireApiKey, securityStatusHandler);

// GET /healthz
app.get('/healthz', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

// Global error handler
app.use((err, _req, res, _next) => {
    logger.error(`Unhandled Error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Internal server error.' });
});

const BIND_ADDRESS = process.env.BIND_ADDRESS || '127.0.0.1';

app.listen(PORT, BIND_ADDRESS, () => {
    logger.info(`Secured EtherLens API listening on ${BIND_ADDRESS}:${PORT}`);
});
