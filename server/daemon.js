const net = require('net');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// --- DATABASE SETUP ---
const dbPath = path.join(__dirname, 'etherlens.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS hosts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT,
        port INTEGER,
        banner TEXT,
        country TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ip_address, port)
    );
`);

const insertHost = db.prepare(`
    INSERT INTO hosts (ip_address, port, banner, country) 
    VALUES (?, ?, ?, ?) 
    ON CONFLICT(ip_address, port) DO UPDATE SET 
        banner=excluded.banner, 
        timestamp=CURRENT_TIMESTAMP
`);

// --- CONFIGURATION ---
const TARGET_PORTS = [22, 80, 443, 21, 3389, 8080];
const CONCURRENCY_LIMIT = 50; 
const TIMEOUT_MS = 2000;

// --- MOCK GEOIP DATA (for demonstration purposes without an external API key) ---
const COUNTRIES = ['USA', 'UK', 'China', 'Germany', 'Japan', 'Brazil', 'India', 'Canada', 'France', 'Australia'];

// --- AUTONOMOUS SCANNER ---
let activeConnections = 0;

// Generates a random public IP wrapper
function generateRandomIP() {
    // Very naive random IP generation (skips proper 127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16 filtering for brevity in this mock)
    // Note: In a real commercial scanner, we would rigorously validate against bogon space.
    return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
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
            // Unlikely to grab banner instantly, so we wait or send an HTTP probe.
            if (port === 80 || port === 443 || port === 8080) {
                socket.write('HEAD / HTTP/1.0\r\nUser-Agent: EtherLens-Scanner/1.0\r\n\r\n');
            }
        });

        socket.on('data', (data) => {
            banner += data.toString().substring(0, 200); // Grab up to 200 chars
            
            // We got something! Save it and close.
            const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
            try {
                insertHost.run(ip, port, banner.trim(), randomCountry);
                console.log(`[+] Discovered: ${ip}:${port} (${randomCountry})`);
            } catch (e) {
                // Ignore db errors
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
            
            // Fire and forget, don't await so we can scale up to CONCURRENCY_LIMIT
            scanTarget(ip, port);
        } else {
            // Wait a tiny bit if we hit connection limits
            await new Promise(r => setTimeout(r, 100));
        }
        
        // Safety throttling
        await new Promise(r => setTimeout(r, 10));
    }
}

// Start immediately
daemonLoop();
