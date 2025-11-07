/**
 * Error Handler
 * Centralized error handling and logging
 */
import { ApplicationError } from './ApplicationErrors.js';

export class ErrorHandler {
    constructor(logger = console) {
        this.logger = logger;
        this.errorCount = 0;
        this.errorHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Handle an error with appropriate logging and notifications
     * @param {Error} error - The error to handle
     * @param {object} context - Additional context information
     */
    handle(error, context = {}) {
        this.errorCount++;

        const errorInfo = {
            error: error instanceof ApplicationError ? error.toJSON() : {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context,
            timestamp: new Date().toISOString(),
            id: this.errorCount
        };

        // Add to history
        this.errorHistory.push(errorInfo);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }

        // Log the error
        this.logError(errorInfo);

        // Notify if handler is available
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('application-error', {
                detail: errorInfo
            }));
        }
    }

    /**
     * Log error with appropriate level
     * @param {object} errorInfo - Error information object
     */
    logError(errorInfo) {
        const { error, context } = errorInfo;

        if (error.name === 'ValidationError') {
            this.logger.warn(`[VALIDATION] ${error.message}`, context);
        } else if (error.name === 'NetworkError') {
            this.logger.error(`[NETWORK] ${error.message}`, context);
        } else {
            this.logger.error(`[ERROR] ${error.message}`, error, context);
        }
    }

    /**
     * Get error statistics
     * @returns {object} Error statistics
     */
    getStats() {
        const errorTypes = {};
        this.errorHistory.forEach(({ error }) => {
            errorTypes[error.name] = (errorTypes[error.name] || 0) + 1;
        });

        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorHistory.length,
            errorTypes,
            lastError: this.errorHistory[this.errorHistory.length - 1] || null
        };
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
    }

    /**
     * Set maximum history size
     * @param {number} size - Maximum number of errors to keep in history
     */
    setMaxHistorySize(size) {
        this.maxHistorySize = Math.max(0, size);
        while (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }
}