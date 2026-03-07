const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize DB connection (read-only for API, or shared if daemon is same process)
const dbPath = path.join(__dirname, 'etherlens.db');
const db = new Database(dbPath, { readonly: true });

// Basic Auth/API Key mock
const API_KEY = 'etherlens_admin';

// Search Endpoint (The core of Shodan)
app.get('/api/search', (req, res) => {
    try {
        const query = req.query.q || '';
        let sql = 'SELECT * FROM hosts WHERE 1=1';
        let params = [];

        // Parse simple Shodan syntax (e.g. port:22 country:USA)
        const portMatch = query.match(/port:(\d+)/);
        const countryMatch = query.match(/country:([a-zA-Z]+)/);
        const genericTerms = query.replace(/port:\d+/, '').replace(/country:[a-zA-Z]+/, '').trim();

        if (portMatch) {
            sql += ' AND port = ?';
            params.push(parseInt(portMatch[1]));
        }

        if (countryMatch) {
            sql += ' AND LOWER(country) = LOWER(?)';
            params.push(countryMatch[1]);
        }

        if (genericTerms) {
            sql += ' AND (banner LIKE ? OR ip_address LIKE ?)';
            params.push(`%${genericTerms}%`, `%${genericTerms}%`);
        }

        sql += ' ORDER BY timestamp DESC LIMIT 50';

        const stmt = db.prepare(sql);
        const results = stmt.all(...params);

        res.json({
            matches: results,
            total: results.length, // In a real app, do a COUNT(*)
            query: query
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Stats Endpoint for the Dashboard
app.get('/api/stats', (req, res) => {
    try {
        const totalHosts = db.prepare('SELECT COUNT(*) as count FROM hosts').get().count;
        const topPorts = db.prepare('SELECT port, COUNT(*) as count FROM hosts GROUP BY port ORDER BY count DESC LIMIT 5').all();
        const topCountries = db.prepare('SELECT country, COUNT(*) as count FROM hosts GROUP BY country ORDER BY count DESC LIMIT 5').all();

        res.json({
            total_hosts: totalHosts,
            top_ports: topPorts,
            top_countries: topCountries
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`[*] EtherLens API listening on port ${PORT}`);
});
