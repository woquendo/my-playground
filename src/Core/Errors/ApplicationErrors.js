/**
 * Application Error Classes
 * Structured error handling with context and metadata
 */

/**
 * Base application error class
 */
export class ApplicationError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = options.code || this.constructor.name.toUpperCase().replace('ERROR', '_ERROR');
        this.cause = options.cause;
        this.context = options.context || {};
        this.timestamp = new Date().toISOString();

        // Maintain proper stack trace for V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert error to JSON representation
     * @returns {object} JSON representation of the error
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Validation-related errors
 */
export class ValidationError extends ApplicationError {
    constructor(message, options = {}) {
        super(message, {
            code: 'VALIDATION_ERROR',
            ...options
        });
    }
}

/**
 * Network and HTTP-related errors
 */
export class NetworkError extends ApplicationError {
    constructor(message, options = {}) {
        super(message, {
            code: 'NETWORK_ERROR',
            ...options
        });

        this.status = options.status;
        this.url = options.url;
        this.method = options.method;
    }
}

/**
 * Data repository-related errors
 */
export class RepositoryError extends ApplicationError {
    constructor(message, options = {}) {
        super(message, {
            code: 'REPOSITORY_ERROR',
            ...options
        });

        this.operation = options.operation;
        this.entity = options.entity;
    }
}

/**
 * Service layer errors
 */
export class ServiceError extends ApplicationError {
    constructor(message, options = {}) {
        super(message, {
            code: 'SERVICE_ERROR',
            ...options
        });

        this.service = options.service;
        this.operation = options.operation;
    }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends ApplicationError {
    constructor(message, options = {}) {
        super(message, {
            code: 'CONFIGURATION_ERROR',
            ...options
        });

        this.configKey = options.configKey;
    }
}

/**
 * Storage-related errors (LocalStorage, SessionStorage, etc.)
 */
export class StorageError extends ApplicationError {
    constructor(message, options = {}) {
        super(message, {
            code: 'STORAGE_ERROR',
            ...options
        });

        this.key = options.key;
    }
}