/**
 * Logger
 * Structured logging with levels and context
 */
export class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.prefix = options.prefix || 'MyPlayground';
        this.enableTimestamp = options.enableTimestamp !== false;
        this.enableColors = options.enableColors !== false && typeof window === 'undefined';

        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        this.colors = {
            debug: '\x1b[36m',    // Cyan
            info: '\x1b[32m',     // Green
            warn: '\x1b[33m',     // Yellow
            error: '\x1b[31m',    // Red
            reset: '\x1b[0m'      // Reset
        };
    }

    /**
     * Format log message with timestamp and level
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @returns {string} Formatted message
     */
    formatMessage(level, message) {
        const timestamp = this.enableTimestamp ?
            new Date().toISOString() : '';

        const levelStr = level.toUpperCase().padEnd(5);

        let formatted = '';
        if (this.enableColors && this.colors[level]) {
            formatted = `${this.colors[level]}[${levelStr}]${this.colors.reset}`;
        } else {
            formatted = `[${levelStr}]`;
        }

        if (timestamp) {
            formatted += ` ${timestamp}`;
        }

        if (this.prefix) {
            formatted += ` [${this.prefix}]`;
        }

        formatted += ` ${message}`;

        return formatted;
    }

    /**
     * Check if a log level should be output
     * @param {string} level - Log level to check
     * @returns {boolean} Whether to output this level
     */
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.level];
    }

    /**
     * Log at debug level
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message), ...args);
        }
    }

    /**
     * Log at info level
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message), ...args);
        }
    }

    /**
     * Log at warn level
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message), ...args);
        }
    }

    /**
     * Log at error level
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message), ...args);
        }
    }

    /**
     * Set log level
     * @param {string} level - New log level (debug, info, warn, error)
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        } else {
            throw new Error(`Invalid log level: ${level}. Valid levels: ${Object.keys(this.levels).join(', ')}`);
        }
    }

    /**
     * Get current log level
     * @returns {string} Current log level
     */
    getLevel() {
        return this.level;
    }
}

// Create and export a default logger instance
export const logger = new Logger();