# 🔌 API Reference

The EtherLens REST API allows programmatic access to your scanned data and security insights. All `/api/` routes require authentication.

## Authentication
Pass your `API_KEY` (configured in `.env`) in the `x-api-key` header.

## Endpoints

### 1. `GET /api/search`
Search the database using Shodan-style query syntax.
- **Parameter**: `q` (Query string)
- **Syntax Examples**:
  - `port:22`
  - `country:USA`
  - `type:Router`
  - `nginx` (Full-text search)
- **Response**:
```json
{
  "matches": [...],
  "total": 42,
  "query": "port:22"
}
```

### 2. `GET /api/stats`
Global statistics for your observable internet space.
- **Response**:
```json
{
  "total_hosts": 1500,
  "top_ports": [{"port": 80, "count": 500}, ...],
  "top_countries": [{"country": "USA", "count": 800}, ...],
  "risk_levels": [{"risk_level": "High", "count": 12}, ...]
}
```

### 3. `GET /api/ai/insights`
AI-powered categorization and high-risk host highlighting.
- **Response**:
```json
{
  "categories": [{"device_type": "IoT", "count": 300}, ...],
  "high_risk_hosts": [...]
}
```

### 4. `GET /api/security/status`
Real-time view of the Active AI Defense engine status.
- **Response**:
```json
{
  "banned_ips": ["192.168.1.100"],
  "total_banned": 1,
  "anomalies": {...}
}
```

### 5. `GET /healthz`
Public health status (unauthenticated).
```json
{ "status": "ok", "ts": 123456789 }
```
