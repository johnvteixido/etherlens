'use strict';

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { LRUCache } = require('lru-cache');
const { activeDefender, securityStatusHandler } = require('./aiDefender');

const app = express();
const PORT = process.env.PORT || 3001;

// --- SECURE MIDDLEWARE (order matters) ---

// 1. Live AI Defense – must run before everything else
app.use(activeDefender);

// 2. Security headers
app.use(helmet());

// 3. Strict CORS – only allow the local frontend (or configure via env)
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET'],
    allowedHeaders: ['x-api-key', 'Content-Type'],
}));

// 4. Body parser (limit payload size to prevent JSON bombs)
app.use(express.json({ limit: '10kb' }));

// 5. Rate limiting – per IP, per 15-min window
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests – please try again later.' },
});
app.use('/api/', apiLimiter);

// --- DATABASE (read-only API mode) ---
const dbPath = path.join(__dirname, 'etherlens.db');
let db;
try {
    db = new Database(dbPath, { readonly: true });
    db.pragma('journal_mode = WAL');
} catch (_) {
    db = null; // daemon not yet started; all DB routes will return a graceful notice
}

// --- IN-MEMORY CACHE (5-second TTL) ---
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

// --- SAFE DB HELPER ---
function safeQuery(fn, res) {
    try {
        if (!db) return res.json({ notice: 'Database initializing – daemon not started yet.' });
        return fn();
    } catch (e) {
        if (e.message.includes('no such table')) {
            return res.json({ notice: 'Database initializing.' });
        }
        console.error('[API Error]', e.message); // log internally, never leak stack to client
        return res.status(500).json({ error: 'Internal server error.' });
    }
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

    safeQuery(() => {
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
    }, res);
});

// GET /api/stats
app.get('/api/stats', requireApiKey, (req, res) => {
    if (queryCache.has('stats')) return res.json(queryCache.get('stats'));

    safeQuery(() => {
        const response = {
            total_hosts: db.prepare('SELECT COUNT(*) as count FROM hosts').get().count,
            top_ports: db.prepare('SELECT port, COUNT(*) as count FROM hosts GROUP BY port ORDER BY count DESC LIMIT 5').all(),
            top_countries: db.prepare('SELECT country, COUNT(*) as count FROM hosts GROUP BY country ORDER BY count DESC LIMIT 5').all(),
            risk_levels: db.prepare('SELECT risk_level, COUNT(*) as count FROM hosts GROUP BY risk_level ORDER BY count DESC').all(),
        };
        queryCache.set('stats', response);
        res.json(response);
    }, res);
});

// GET /api/ai/insights
app.get('/api/ai/insights', requireApiKey, (req, res) => {
    if (queryCache.has('ai_insights')) return res.json(queryCache.get('ai_insights'));

    safeQuery(() => {
        const response = {
            categories: db.prepare('SELECT device_type, COUNT(*) as count FROM hosts GROUP BY device_type ORDER BY count DESC LIMIT 10').all(),
            high_risk_hosts: db.prepare("SELECT ip_address, port, banner, device_type FROM hosts WHERE risk_level IN ('High','Critical') LIMIT 10").all(),
        };
        queryCache.set('ai_insights', response);
        res.json(response);
    }, res);
});

// GET /api/security/status  (admin view of live AI defense state)
app.get('/api/security/status', requireApiKey, securityStatusHandler);

// GET /healthz — unauthenticated, used by Docker HEALTHCHECK and load balancers
app.get('/healthz', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// --- CATCH-ALL: return JSON 404, never expose Express default HTML page ---
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

// --- GLOBAL ERROR HANDLER ---
app.use((err, _req, res, _next) => {
    console.error('[Unhandled]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`[*] Secured EtherLens API listening on 127.0.0.1:${PORT}`);
});
