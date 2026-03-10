const winston = require('winston');
const path = require('path');

// Custom format for clean production logs
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
    })
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports: [
        // Console logging for dev
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                customFormat
            )
        }),
        // Combined file log
        new winston.transports.File({
            filename: path.join(__dirname, 'logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Error only log
        new winston.transports.File({
            filename: path.join(__dirname, 'logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

module.exports = logger;
