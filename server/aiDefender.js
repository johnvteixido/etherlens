'use strict';

// Maintain a live list of banned IPs
const bannedIPs = new Set();
// Track malicious request patterns per IP
const requestAnomalies = new Map();

// Regexes compiled once at startup for performance
const SQL_XSS_PATTERN = /UNION\s+SELECT|OR\s+1=1|<script[\s>]|onerror\s*=|onload\s*=|eval\s*\(/i;
const RECON_PATH_PATTERN = /\.(env|git|htaccess|DS_Store)|phpmyadmin|wp-login|admin|config\.yml|etc\/passwd/i;

function trackAnomaly(ip, reqPath) {
    if (!requestAnomalies.has(ip)) {
        requestAnomalies.set(ip, { count: 1, paths: [reqPath], firstSeen: Date.now() });
    } else {
        const data = requestAnomalies.get(ip);
        data.count++;
        data.paths.push(reqPath);
    }
}

/**
 * Active AI Defender Middleware
 * 
 * Runs before every other middleware.  Three layers of defence:
 *  1. Hard-banned IPs → immediate 403
 *  2. SQL-injection / XSS payload detection → ban + 403
 *  3. Recon / directory-brute-force path detection → progressive ban
 */
const activeDefender = (req, res, next) => {
    const clientIP = (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, '');

    // Layer 1 – Already banned
    if (bannedIPs.has(clientIP)) {
        return res.status(403).json({ error: 'Connection refused: IP banned by Active AI Defense.' });
    }

    // Layer 2 – Malicious payload detection (SQL Injection / XSS)
    const payload = JSON.stringify(req.query) + JSON.stringify(req.body || {});
    if (SQL_XSS_PATTERN.test(payload)) {
        bannedIPs.add(clientIP);
        console.warn(`[AI DEFENSE] 🔴 Malicious payload blocked and ${clientIP} banned.`);
        return res.status(403).json({ error: 'Malicious payload detected. Access revoked.' });
    }

    // Layer 3 – Recon / directory brute-force
    if (RECON_PATH_PATTERN.test(req.path)) {
        trackAnomaly(clientIP, req.path);
        const anomalyData = requestAnomalies.get(clientIP);

        if (anomalyData.count >= 3) {
            bannedIPs.add(clientIP);
            console.warn(`[AI DEFENSE] 🔴 Recon behaviour detected – ${clientIP} permanently banned after ${anomalyData.count} suspicious requests.`);
            return res.status(403).json({ error: 'Anomalous behaviour detected. Access revoked.' });
        }

        console.warn(`[AI DEFENSE] ⚠️  Suspicious path access from ${clientIP}: ${req.path} (${anomalyData.count}/3)`);
    }

    next();
};

/**
 * GET /api/security/status
 * Exposes (to authenticated callers) the current live threat picture.
 */
const securityStatusHandler = (_req, res) => {
    res.json({
        banned_ips: [...bannedIPs],
        total_banned: bannedIPs.size,
        anomalies: Object.fromEntries(requestAnomalies),
    });
};

module.exports = { activeDefender, securityStatusHandler, bannedIPs };
