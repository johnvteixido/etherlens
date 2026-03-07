# 📦 Deployment Guide

EtherLens is designed for flexibility. You can run it as a lightweight Node.js daemon, a full-scale Docker environment, or install it as a library.

## 🐳 Option A: Docker (Recommended)
The fastest way to get EtherLens running with both the API and the Scanner.

```bash
git clone https://github.com/johnvteixido/etherlens.git
cd etherlens
cp .env.example .env
docker-compose up --build
```
- **REST API**: `http://localhost:3001`
- **Dashboard**: `http://localhost:5173`

## 📦 Option B: npm
Install EtherLens globally or as a project dependency.

```bash
npm install -g @johnvteixido/etherlens
# Start the API
etherlens-api
# Start the Scanner
etherlens-daemon
```

## 🛠️ Option C: Manual Setup
For developers who want to modify the engine or UI.

### 1. Backend Server
```bash
cd server
npm install
cp ../.env.example .env
npm start
```

### 2. Scanning Daemon
```bash
cd server
node daemon.js
```

### 3. Frontend Dashboard
```bash
cd client
npm install
npm run dev
```

## ⚙️ Configuration Variables
Set these in your `.env` file:

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | `etherlens_admin` | Secret required for all documented API routes |
| `PORT` | `3001` | API Port |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed origins for web dashboard |
| `TARGET_PORTS` | `22,80,443,21` | Ports the scanner will probe |
| `CONCURRENCY_LIMIT`| `200` | Max simultaneous TCP connections |
