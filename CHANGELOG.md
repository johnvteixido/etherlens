# EtherLens Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-03-07

### Added
- **Autonomous scanning daemon** (`daemon.js`) — concurrent async TCP scanner targeting ports 22, 80, 443, 21, 3389, 8080
- **Bogon/RFC-1918 IP filter** — all private, loopback, and reserved address spaces are excluded from scanning
- **SQLite database** via `better-sqlite3` with WAL journal mode for high-throughput concurrent writes
- **Express REST API** (`index.js`) — endpoints: `/api/search`, `/api/stats`, `/api/ai/insights`, `/api/security/status`
- **Shodan-style search syntax** — supports `port:N`, `country:XX`, `type:Device` query tokens
- **Custom AI/ML banner classifier** (`aiAnalyzer.js`) — Naive Bayes model trained on banner heuristics; classifies into Web Server, Router, IoT, Database, Camera, Remote Access, and more
- **Risk scoring** — per-host Low / Medium / High / Critical assessment based on banner content
- **Live AI Active Defense** (`aiDefender.js`) — middleware with three layers:
  - In-memory IP ban list
  - SQL injection / XSS pattern detection
  - Recon / directory brute-force detection
- **`/api/security/status`** — authenticated endpoint exposing the live threat map
- **`helmet`** HTTP security headers
- **`express-rate-limit`** — 100 req / 15 min per IP
- **Strict CORS** allowlist (configurable via `CORS_ORIGINS` env var)
- **Request body size cap** (10 kb — prevents JSON bombs)
- **Parameterized SQL** queries only — zero string interpolation
- **LRU cache** (5-second TTL) for frequent search/stats queries
- **React 19 + Vite + TypeScript** client dashboard
- **3D globe visualization** via `react-globe.gl`
- **Live-polling dashboard** — auto-refreshes stats and AI insights every 5 seconds
- **AI category & risk badges** on every host card
- **GitHub Actions CI** pipeline (Node 18/20/22 matrix, client build verification)
- **GitHub Issue & PR templates**, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- **npm package** as `@johnvteixido/etherlens`
- **Docker** support (`Dockerfile`, `docker-compose.yml`)

---

## [Unreleased]

### Planned
- GeoIP integration (MaxMind GeoLite2) to replace mock country assignment
- SNMP, Telnet, Redis, MongoDB protocol probes
- Persistent API key management via SQLite (multi-key, revocation)
- TLS/HTTPS for the API server
- Distributed scanning node mesh
- Web-based admin panel with user authentication
- npm publishable CLI tool (`npx etherlens scan`)
