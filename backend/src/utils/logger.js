// backend/src/utils/logger.js
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

const logger = {
    info: (message) => {
        const log = `[INFO] ${new Date().toISOString()} - ${message}\n`;
        console.log(log);
        fs.appendFileSync(logFile, log);
    },
    error: (message) => {
        const log = `[ERROR] ${new Date().toISOString()} - ${message}\n`;
        console.error(log);
        fs.appendFileSync(logFile, log);
    },
    warn: (message) => {
        const log = `[WARN] ${new Date().toISOString()} - ${message}\n`;
        console.warn(log);
        fs.appendFileSync(logFile, log);
    }
};

module.exports = logger;