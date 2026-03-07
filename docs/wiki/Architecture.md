# 🤖 AI Analyzer & Defender

EtherLens takes a "Security First" approach, utilizing local AI/ML for both data classification and real-time threat neutralization.

## 🧠 AI Analyzer (`aiAnalyzer.js`)
The Analyzer is responsible for making sense of the raw service banners captured by the scanning daemon.

### How it works:
1. **Natural Language Processing**: Uses the `natural` NLP library to tokenize and stem banner text.
2. **Naive Bayes Classification**: We've trained a local classifier to identify device types (e.g., "Router", "Web Server", "Database", "IoT Device") based on known fingerprint patterns.
3. **Risk Scoring**: 
   - Uses heuristic analysis to look for sensitive strings (e.g., "unauthorized", "admin", "password", "vulnerable", "CVE-").
   - Assigns a severity level: **Low**, **Medium**, **High**, or **Critical**.

## 🛡️ Active AI Defender (`aiDefender.js`)
The Defender is an Express.js middleware that acts as a "Virtual Shield" for your API.

### Threat Detection Layers:
1. **IP Quarantine**: Maintains an in-memory `Set` of historically malicious IPs. Any request from a banned IP is rejected immediately.
2. **Injection Detection**: Uses optimized regex patterns and string analysis to detect SQL Injection (SQLi) and Cross-Site Scripting (XSS) payloads in query strings and bodies.
3. **Reconnaissance Blocking**: Monitors for "directory brute-forcing" behaviour. Accessing sensitive paths like `/.env`, `/.git`, or `wp-login.php` multiple times results in an automatic, permanent IP ban.

### Why Local?
- **Speed**: No external API round-trips; threats are neutralized in sub-millisecond time.
- **Privacy**: Your scan targets and threat data NEVER leave your machine.
- **Resilience**: The security engine works even if the internet connection is disrupted.
