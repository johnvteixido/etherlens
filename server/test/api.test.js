'use strict';
/**
 * EtherLens API – Basic Integration Tests
 * Run: node test/api.test.js
 *
 * Uses only Node built-ins so no test-runner dependency is required.
 */

const http = require('http');
const assert = require('assert');
const { execSync, spawn } = require('child_process');
const path = require('path');

const API_KEY = process.env.API_KEY || 'etherlens_admin';
const PORT = process.env.PORT || 3001;

let server;

function request(route) {
    return new Promise((resolve, reject) => {
        http.get(
            { hostname: '127.0.0.1', port: PORT, path: route, headers: { 'x-api-key': API_KEY } },
            (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
            }
        ).on('error', reject);
    });
}

async function run() {
    console.log('🔬 Starting EtherLens API Tests...\n');

    // Start the server
    server = spawn('node', [path.join(__dirname, '..', 'index.js')], {
        env: { ...process.env, PORT, API_KEY },
        stdio: 'pipe',
    });
    // Wait for it to be ready
    await new Promise((r) => setTimeout(r, 1000));

    let passed = 0;
    let failed = 0;

    async function test(label, fn) {
        try {
            await fn();
            console.log(`  ✅  ${label}`);
            passed++;
        } catch (e) {
            console.error(`  ❌  ${label}: ${e.message}`);
            failed++;
        }
    }

    // ── /healthz ────────────────────────────────────────────────────────────
    await test('GET /healthz returns 200', async () => {
        const r = await new Promise((resolve, reject) => {
            http.get({ hostname: '127.0.0.1', port: PORT, path: '/healthz' }, (res) => {
                let body = '';
                res.on('data', (c) => (body += c));
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
            }).on('error', reject);
        });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.status, 'ok');
    });

    // ── Auth ─────────────────────────────────────────────────────────────────
    await test('GET /api/stats without API key returns 403', async () => {
        const r = await new Promise((resolve, reject) => {
            http.get({ hostname: '127.0.0.1', port: PORT, path: '/api/stats' }, (res) => {
                let body = '';
                res.on('data', (c) => (body += c));
                res.on('end', () => resolve({ status: res.statusCode }));
            }).on('error', reject);
        });
        assert.strictEqual(r.status, 403);
    });

    // ── Stats ────────────────────────────────────────────────────────────────
    await test('GET /api/stats returns expected shape', async () => {
        const r = await request('/api/stats');
        assert.ok('total_hosts' in r.body || 'notice' in r.body, 'missing total_hosts or notice');
    });

    // ── Search ───────────────────────────────────────────────────────────────
    await test('GET /api/search returns matches array', async () => {
        const r = await request('/api/search?q=');
        assert.ok(Array.isArray(r.body.matches), 'matches is not an array');
    });

    // ── AI Insights ──────────────────────────────────────────────────────────
    await test('GET /api/ai/insights returns categories array', async () => {
        const r = await request('/api/ai/insights');
        assert.ok(Array.isArray(r.body.categories) || 'notice' in r.body);
    });

    // ── Security Status ──────────────────────────────────────────────────────
    await test('GET /api/security/status returns banned_ips', async () => {
        const r = await request('/api/security/status');
        assert.ok(Array.isArray(r.body.banned_ips) || 'notice' in r.body);
    });

    // ── 404 ──────────────────────────────────────────────────────────────────
    await test('Unknown route returns JSON 404', async () => {
        const r = await request('/api/doesnotexist');
        assert.strictEqual(r.status, 404);
    });

    // ── AI Defender: SQLi ────────────────────────────────────────────────────
    await test('SQL injection payload is blocked (403)', async () => {
        const r = await new Promise((resolve, reject) => {
            http.get(
                {
                    hostname: '127.0.0.1',
                    port: PORT,
                    path: "/api/search?q=' UNION SELECT 1,2,3--",
                    headers: { 'x-api-key': API_KEY },
                },
                (res) => {
                    let body = '';
                    res.on('data', (c) => (body += c));
                    res.on('end', () => resolve({ status: res.statusCode }));
                }
            ).on('error', reject);
        });
        assert.strictEqual(r.status, 403);
    });

    server.kill();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
    console.error('Fatal:', e);
    if (server) server.kill();
    process.exit(1);
});
