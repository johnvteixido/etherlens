'use strict';

const natural = require('natural');
const classifier = new natural.BayesClassifier();

// --- ADVANCED TRAINING DATA (Ensemble Knowledge Base) ---
// We train the model on a wide variety of service banners to identify vendors and roles.
const trainingData = [
    // Web Servers
    { text: 'nginx/1.18.0 (Ubuntu)', label: 'Web Server (Nginx)' },
    { text: 'Apache/2.4.41 (Unix) OpenSSL/1.1.1d', label: 'Web Server (Apache)' },
    { text: 'Microsoft-IIS/10.0', label: 'Web Server (IIS)' },
    { text: 'LiteSpeed', label: 'Web Server (LiteSpeed)' },

    // Remote Admin / SSH
    { text: 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.1', label: 'Remote Access (SSH)' },
    { text: 'SSH-2.0-dropbear_2019.78', label: 'IoT Remote Access (Dropbear)' },

    // IoT / Embedded / Routers
    { text: 'micro_httpd', label: 'IoT Device (BusyBox)' },
    { text: 'RouterOS 6.47.2', label: 'Network Device (MikroTik)' },
    { text: 'Cisco IOS', label: 'Network Device (Cisco)' },
    { text: 'TP-LINK HTTPD', label: 'IoT (TP-Link)' },
    { text: 'D-Link Router', label: 'IoT (D-Link)' },
    { text: 'Hikvision IP Camera', label: 'IP Camera (Hikvision)' },

    // Databases
    { text: '5.5.5-10.4.13-MariaDB', label: 'Database (MariaDB)' },
    { text: 'MySQL 8.0.21', label: 'Database (MySQL)' },
    { text: 'PostgreSQL 12.3', label: 'Database (PostgreSQL)' },
    { text: 'Redis 6.0.5', label: 'Database (Redis)' },
    { text: 'MongoDB 4.2.8', label: 'Database (MongoDB)' },

    // Industrial Control Systems (ICS/SCADA)
    { text: 'Modbus TCP', label: 'Industrial System (Modbus)' },
    { text: 'Siemens SIMATIC', label: 'ICS (Siemens)' },

    // Vulnerability Indicators
    { text: 'Unauthorized: Default Password active', label: 'Vulnerable (Default Credentials)' },
    { text: 'Backdoor enabled', label: 'Compromised (Backdoor)' }
];

// Initialize and train
trainingData.forEach(d => classifier.addDocument(d.text, d.label));
classifier.train();

/**
 * Advanced AI Analysis Engine
 * Combines Bayes Classification with semantic pattern matching and risk heuristics.
 */
function classifyBanner(banner) {
    if (!banner || banner.length < 3) return { category: 'Unknown', risk: 'Low' };

    // Step 1: Semantic Classification (Bayes)
    const category = classifier.classify(banner);

    // Step 2: Advanced Risk Heuristics
    let risk = 'Low';

    // Pattern Matching for High-Risk Identifiers
    const criticalPatterns = [
        /unauthorized|forbidden/i,
        /default password|admin:admin|password:password/i,
        /backdoor|shell|exec/i,
        /cve-|exploit|vulnerability/i,
        /old version|deprecated|eol/i
    ];

    const highPatterns = [
        /database|mysql|postgres|redis|mongodb/i,
        /internal|private|protected/i,
        /industrial|scada|modbus|simatic/i,
        /camera|hikvision|surveillance/i
    ];

    if (criticalPatterns.some(p => p.test(banner))) {
        risk = 'Critical';
    } else if (highPatterns.some(p => p.test(banner))) {
        risk = 'High';
    } else if (banner.includes('SSH') || banner.includes('FTP')) {
        risk = 'Medium';
    }

    // Step 3: Confidence Adjustment
    // (In a production environment, we'd check classification probabilities here)

    return { category, risk };
}

module.exports = { classifyBanner };
