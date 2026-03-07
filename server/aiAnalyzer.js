const natural = require('natural');

const classifier = new natural.BayesClassifier();

// Train on basic heuristics
// Web Servers
classifier.addDocument('Apache/2.4.41 (Ubuntu)', 'Web Server');
classifier.addDocument('nginx/1.18.0 (Ubuntu)', 'Web Server');
classifier.addDocument('Server: Microsoft-IIS/10.0', 'Web Server');

// SSH / Remote
classifier.addDocument('SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5', 'Remote Access');
classifier.addDocument('SSH-2.0-paramiko_2.7.2', 'Remote Access');
classifier.addDocument('RFB 003.008', 'Remote Access (VNC)');

// IoT / Embedded
classifier.addDocument('lighttpd/1.4.53', 'IoT / Embedded');
classifier.addDocument('Server: RouterOS/6.47', 'Router');
classifier.addDocument('Server: webcamXP', 'Camera');

// Databases
classifier.addDocument('5.7.35-0ubuntu0.18.04.1', 'Database (MySQL)');
classifier.addDocument('PostgreSQL 12.8', 'Database (PostgreSQL)');
classifier.addDocument('Redis 6.0.9', 'Database (Redis)');

classifier.train();

function classifyBanner(banner) {
    if (!banner || banner.length === 0) {
        return {
            category: 'Unknown',
            risk: 'Unknown'
        };
    }

    const category = classifier.classify(banner);

    // Simple mock heuristic risk evaluation
    let risk = 'Low';
    const lowerBanner = banner.toLowerCase();

    // Very basic patterns indicating higher risk
    if (lowerBanner.includes('default password')) risk = 'Critical';
    else if (lowerBanner.includes('unauthorized access')) risk = 'High';
    else if (lowerBanner.includes('routeros/6.47')) risk = 'Medium'; // E.g., known outdated version
    else if (category.includes('Database') || category.includes('Remote Access') || category.includes('Camera')) {
        risk = 'Medium';
    }

    return {
        category,
        risk
    };
}

module.exports = { classifyBanner };
