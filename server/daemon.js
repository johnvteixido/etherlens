const net = require('net');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const ipRangeCheck = require('ip-range-check');
const { classifyBanner } = require('./aiAnalyzer');

// --- DATABASE SETUP ---
const dbPath = path.join(__dirname, 'etherlens.db');
const db = new Database(dbPath);

// Enable WAL for blazing fast, highly concurrent writes
db.pragma('journal_mode = WAL');

// Initialize schema - dropping old for development/upgrade
db.exec(`
    DROP TABLE IF EXISTS hosts;
    CREATE TABLE IF NOT EXISTS hosts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT,
        port INTEGER,
        banner TEXT,
        country TEXT,
        device_type TEXT,
        risk_level TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ip_address, port)
    );
`);

const insertHost = db.prepare(`
    INSERT INTO hosts (ip_address, port, banner, country, device_type, risk_level) 
    VALUES (?, ?, ?, ?, ?, ?) 
    ON CONFLICT(ip_address, port) DO UPDATE SET 
        banner=excluded.banner, 
        device_type=excluded.device_type,
        risk_level=excluded.risk_level,
        timestamp=CURRENT_TIMESTAMP
`);

// --- CONFIGURATION (override via env vars) ---
const TARGET_PORTS = process.env.TARGET_PORTS
    ? process.env.TARGET_PORTS.split(',').map(Number)
    : [22, 80, 443, 21, 3389, 8080];
const CONCURRENCY_LIMIT = parseInt(process.env.CONCURRENCY_LIMIT || '200', 10);
const TIMEOUT_MS = parseInt(process.env.SCAN_TIMEOUT_MS || '2000', 10);

// Default Bogon space
const BOGON_RANGES = [
    '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8',
    '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24',
    '192.88.99.0/24', '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24',
    '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4', '255.255.255.255/32'
];

// --- MOCK GEOIP DATA (for demonstration purposes without an external API key) ---
const COUNTRIES = ['USA', 'UK', 'China', 'Germany', 'Japan', 'Brazil', 'India', 'Canada', 'France', 'Australia'];

// --- AUTONOMOUS SCANNER ---
let activeConnections = 0;

function isBogon(ip) {
    return ipRangeCheck(ip, BOGON_RANGES);
}

// Generates a random public IP wrapper
function generateRandomIP() {
    let ip;
    do {
        ip = `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    } while (isBogon(ip));
    return ip;
}

function scanTarget(ip, port) {
    return new Promise((resolve) => {
        let resolved = false;
        activeConnections++;

        const socket = new net.Socket();
        socket.setTimeout(TIMEOUT_MS);

        let banner = '';

        const cleanup = () => {
            if (!resolved) {
                resolved = true;
                activeConnections--;
                socket.destroy();
                resolve();
            }
        };

        socket.on('connect', () => {
            if (port === 80 || port === 443 || port === 8080) {
                socket.write('HEAD / HTTP/1.0\\r\\nUser-Agent: EtherLens-Scanner/1.0\\r\\n\\r\\n');
            }
        });

        socket.on('data', (data) => {
            banner += data.toString().substring(0, 200);

            const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
            const finalBanner = banner.trim();

            // Invoke local AI for analysis
            const aiResult = classifyBanner(finalBanner);

            try {
                // Execute optimized insert using the new schema
                insertHost.run(ip, port, finalBanner, randomCountry, aiResult.category, aiResult.risk);
                console.log(`[+] Discovered: ${ip}:${port} (${randomCountry}) | Type: ${aiResult.category} | Risk: ${aiResult.risk}`);
            } catch (e) {
                // Ignore silent db constraint errors
            }
            cleanup();
        });

        socket.on('timeout', cleanup);
        socket.on('error', cleanup);
    });
}

// The Daemon Loop
async function daemonLoop() {
    console.log('[*] EtherLens Autonomous Daemon Started...');
    while (true) {
        if (activeConnections < CONCURRENCY_LIMIT) {
            const ip = generateRandomIP();
            const port = TARGET_PORTS[Math.floor(Math.random() * TARGET_PORTS.length)];

            scanTarget(ip, port);
        } else {
            await new Promise(r => setTimeout(r, 100));
        }

        await new Promise(r => setTimeout(r, 5));
    }
}

// Start immediately
daemonLoop();
