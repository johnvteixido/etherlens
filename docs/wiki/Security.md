# 🛡️ Security & Compliance

EtherLens is built to be a safe, ethical, and highly-defended internet observatory. Our security model spans both internal API protection and external scanning responsibility.

## 🔒 Internal Security (API)
The EtherLens API is hardened against common web vulnerabilities.

### 1. Active AI Defense
Our unique middleware uses real-time pattern matching to detect:
- **Injection Attacks**: SQLi and XSS payloads are identified and rejected instantly.
- **Access Control Abuse**: Unauthorized requests to administrative paths or configuration files trigger a permanent IP ban after 3 attempts.

### 2. Hardening Measures
- **Helmet**: Enforces strict HTTP security headers (STS, Frame-options, Content-Security-Policy).
- **Rate Limiting**: Protects the SQLite database from exhaustion by limiting each IP to 100 requests per 15-minute window.
- **Input Sanitization**: All incoming search queries are stripped of common SQL metacharacters (`" ' ; \`) to prevent bypasses.

## ⚖️ External Responsibility (Scanning)
As an internet-wide scanner, EtherLens is programmed to be a "Good Citizen" of the web.

### 1. Mandatory Bogon Filter
The scanning engine uses the `ip-range-check` library to enforce a strict NO-SCAN policy for:
- **Private Networks**: RFC-1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- **Loopback**: 127.0.0.0/8
- **Reserved / Multicast**: 224.0.0.0/4 and others.

### 2. Service Identification (Public Banners)
EtherLens only captures "Service Banners"—unsolicited text broadcasted by open ports (e.g., SSH version strings, HTTP headers). It does not attempt to breach security or interact with private data.

### 3. Reporting Vulnerabilities
If you discover a security issue in EtherLens itself, please refer to our [SECURITY.md](https://github.com/johnvteixido/etherlens/blob/main/SECURITY.md) guidelines for private disclosure.
