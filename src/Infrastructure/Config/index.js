/**
 * Configuration Module
 * 
 * Centralized configuration management using environment variables.
 * This module loads and validates all configuration from .env file.
 * 
 * Usage:
 *   import config from '@infrastructure/Config';
 *   console.log(config.app.port);
 *   console.log(config.database.host);
 */

// Note: In Node.js, use dotenv. In browser, this will be mocked or configured differently
let dotenv = null;
if (typeof window === 'undefined') {
    // Node.js environment
    try {
        dotenv = await import('dotenv');
        dotenv.config();
    } catch (error) {
        console.warn('dotenv not available:', error.message);
    }
}

/**
 * Get environment variable with fallback
 * @param {string} key - Environment variable key
 * @param {*} defaultValue - Default value if not found
 * @returns {string}
 */
function getEnv(key, defaultValue = '') {
    if (typeof window !== 'undefined' && window.__ENV__) {
        // Browser environment with injected config
        return window.__ENV__[key] ?? defaultValue;
    }

    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] ?? defaultValue;
    }

    // Fallback for browser without injected config
    return defaultValue;
}

/**
 * Get boolean environment variable
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default value if not found
 * @returns {boolean}
 */
function getBoolEnv(key, defaultValue = false) {
    const value = getEnv(key, String(defaultValue));
    return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get number environment variable
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if not found
 * @returns {number}
 */
function getNumberEnv(key, defaultValue = 0) {
    const value = getEnv(key, String(defaultValue));
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Application Configuration
 */
const config = {
    // Application Settings
    app: {
        env: getEnv('NODE_ENV', 'development'),
        debug: getBoolEnv('DEBUG', true),
        port: getNumberEnv('PORT', 8000),
        host: getEnv('HOST', 'localhost'),
        url: getEnv('APP_URL', 'http://localhost:8000'),

        // Computed properties
        get isDevelopment() {
            return this.env === 'development';
        },
        get isProduction() {
            return this.env === 'production';
        },
        get isStaging() {
            return this.env === 'staging';
        },
        get baseUrl() {
            return this.url;
        }
    },

    // API Configuration
    api: {
        url: getEnv('API_URL', 'http://localhost:3000'),
        get baseUrl() {
            return `${this.url}/api`;
        },
        timeout: getNumberEnv('API_TIMEOUT', 30000), // 30 seconds default
    },

    // Data Configuration
    data: {
        dir: getEnv('DATA_DIR', './data'),
        sitesPath: getEnv('SITES_DATA_PATH', '/data/sites.json'),
        showsPath: getEnv('SHOWS_DATA_PATH', '/data/shows.json'),
        songsPath: getEnv('SONGS_DATA_PATH', '/data/songs.json')
    },

    // HTTP Client Configuration
    http: {
        timeout: getNumberEnv('HTTP_TIMEOUT', 30000), // 30 seconds default
        userAgent: getEnv('HTTP_USER_AGENT', 'MyPlayground/1.0'),
        retries: getNumberEnv('HTTP_RETRIES', 3)
    },

    // Database Configuration (Phase 8)
    database: {
        host: getEnv('DB_HOST', 'localhost'),
        port: getNumberEnv('DB_PORT', 3306),
        user: getEnv('DB_USER', 'root'),
        password: getEnv('DB_PASSWORD', ''),
        name: getEnv('DB_NAME', 'myplayground_dev'),
        connectionLimit: getNumberEnv('DB_CONNECTION_LIMIT', 10),
        queueLimit: getNumberEnv('DB_QUEUE_LIMIT', 0),

        get enabled() {
            return getBoolEnv('USE_DATABASE', false);
        },

        // Get connection config for mysql2
        getConnectionConfig() {
            return {
                host: this.host,
                port: this.port,
                user: this.user,
                password: this.password,
                database: this.name,
                waitForConnections: true,
                connectionLimit: this.connectionLimit,
                queueLimit: this.queueLimit
            };
        }
    },

    // External Services
    services: {
        mal: {
            apiKey: getEnv('MAL_API_KEY', ''),
            apiSecret: getEnv('MAL_API_SECRET', ''),
            get enabled() {
                return Boolean(this.apiKey && this.apiSecret);
            }
        },
        youtube: {
            apiKey: getEnv('YOUTUBE_API_KEY', ''),
            get enabled() {
                return Boolean(this.apiKey);
            }
        }
    },

    // Security Settings
    security: {
        jwt: {
            secret: getEnv('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production'),
            expiration: getEnv('JWT_EXPIRATION', '7d')
        },
        session: {
            secret: getEnv('SESSION_SECRET', 'your-super-secret-session-key-change-this-in-production')
        },
        cors: {
            origin: getEnv('CORS_ORIGIN', 'http://localhost:8000').split(',').map(o => o.trim())
        }
    },

    // Cache Configuration
    cache: {
        ttl: getNumberEnv('CACHE_TTL', 300000), // 5 minutes default
        maxSize: getNumberEnv('CACHE_MAX_SIZE', 100)
    },

    // Logging Configuration
    logging: {
        level: getEnv('LOG_LEVEL', 'debug'),
        filePath: getEnv('LOG_FILE_PATH', ''),
        get fileEnabled() {
            return Boolean(this.filePath);
        }
    },

    // Feature Flags
    features: {
        scheduleUpdates: getBoolEnv('FEATURE_SCHEDULE_UPDATES', true),
        musicPlayer: getBoolEnv('FEATURE_MUSIC_PLAYER', true),
        import: getBoolEnv('FEATURE_IMPORT', true),
        export: getBoolEnv('FEATURE_EXPORT', true)
    },

    // Storage Configuration
    storage: {
        type: getEnv('STORAGE_TYPE', 'localStorage'),
        dataDir: getEnv('DATA_DIR', './data'),

        get isLocalStorage() {
            return this.type === 'localStorage';
        },
        get isMySQL() {
            return this.type === 'mysql';
        }
    },

    // Performance Monitoring
    performance: {
        resourceMonitor: getBoolEnv('ENABLE_RESOURCE_MONITOR', true),
        maxMemoryMB: getNumberEnv('MAX_MEMORY_MB', 100),
        maxLoadTimeMS: getNumberEnv('MAX_LOAD_TIME_MS', 1000)
    },

    /**
     * Validate required configuration
     * @throws {Error} If required config is missing
     */
    validate() {
        const errors = [];

        // Validate app config
        if (!this.app.port || this.app.port < 1 || this.app.port > 65535) {
            errors.push('Invalid PORT: must be between 1 and 65535');
        }

        // Validate database config if enabled
        if (this.database.enabled) {
            if (!this.database.host) {
                errors.push('DB_HOST is required when USE_DATABASE=true');
            }
            if (!this.database.user) {
                errors.push('DB_USER is required when USE_DATABASE=true');
            }
            if (!this.database.name) {
                errors.push('DB_NAME is required when USE_DATABASE=true');
            }
        }

        // Validate JWT secret in production
        if (this.app.isProduction && this.security.jwt.secret.includes('change-this')) {
            errors.push('JWT_SECRET must be changed in production');
        }

        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }

        return true;
    },

    /**
     * Print configuration summary (for debugging)
     * Masks sensitive values
     */
    printSummary() {
        if (!this.app.debug) return;

        const maskSecret = (value) => {
            if (!value) return '(not set)';
            if (value.length <= 4) return '****';
            return value.substring(0, 2) + '****' + value.substring(value.length - 2);
        };

        console.log('='.repeat(50));
        console.log('Configuration Summary');
        console.log('='.repeat(50));
        console.log(`Environment: ${this.app.env}`);
        console.log(`Debug Mode: ${this.app.debug}`);
        console.log(`Server: ${this.app.host}:${this.app.port}`);
        console.log(`App URL: ${this.app.url}`);
        console.log(`API URL: ${this.api.url}`);
        console.log(`Data Directory: ${this.data.dir}`);
        console.log(`HTTP Timeout: ${this.http.timeout}ms`);
        console.log(`Database: ${this.database.enabled ? 'Enabled' : 'Disabled'}`);
        if (this.database.enabled) {
            console.log(`  Host: ${this.database.host}:${this.database.port}`);
            console.log(`  Database: ${this.database.name}`);
            console.log(`  User: ${this.database.user}`);
        }
        console.log(`Storage Type: ${this.storage.type}`);
        console.log(`Cache TTL: ${this.cache.ttl}ms`);
        console.log(`Log Level: ${this.logging.level}`);
        console.log(`MAL API: ${this.services.mal.enabled ? 'Enabled' : 'Disabled'}`);
        console.log(`YouTube API: ${this.services.youtube.enabled ? 'Enabled' : 'Disabled'}`);
        console.log(`Features:`);
        console.log(`  Schedule Updates: ${this.features.scheduleUpdates}`);
        console.log(`  Music Player: ${this.features.musicPlayer}`);
        console.log(`  Import: ${this.features.import}`);
        console.log(`  Export: ${this.features.export}`);
        console.log('='.repeat(50));
    }
};

// Validate config on load (in development)
if (config.app.isDevelopment && typeof window === 'undefined') {
    try {
        config.validate();
        config.printSummary();
    } catch (error) {
        console.error('Configuration Error:', error.message);
    }
}

export default config;
