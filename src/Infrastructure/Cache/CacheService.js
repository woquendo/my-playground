/**
 * CacheService.js
 * In-memory cache service with TTL support
 * Provides temporary storage for frequently accessed data
 */

export class CacheService {
    /**
     * @param {Object} options - Cache configuration
     * @param {Logger} options.logger - Logger instance
     * @param {number} options.maxSize - Maximum number of items to cache
     * @param {number} options.defaultTTL - Default time-to-live in milliseconds
     */
    constructor({ logger, maxSize = 100, defaultTTL = 5 * 60 * 1000 }) {
        this.logger = logger;
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
        this.cache = new Map();
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} The cached value or null if not found/expired
     */
    get(key) {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        // Check if expired
        if (item.expiresAt && Date.now() > item.expiresAt) {
            this.cache.delete(key);
            this.logger.debug(`Cache expired: ${key}`);
            return null;
        }

        this.logger.debug(`Cache hit: ${key}`);
        return item.value;
    }

    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time-to-live in milliseconds (optional)
     */
    set(key, value, ttl = this.defaultTTL) {
        // Evict oldest item if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.logger.debug(`Cache evicted: ${firstKey}`);
        }

        const expiresAt = ttl ? Date.now() + ttl : null;
        this.cache.set(key, { value, expiresAt });
        this.logger.debug(`Cache set: ${key}`);
    }

    /**
     * Check if a key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and not expired
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Delete a value from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
        this.logger.debug(`Cache deleted: ${key}`);
    }

    /**
     * Clear all cached values
     */
    clear() {
        this.cache.clear();
        this.logger.debug('Cache cleared');
    }

    /**
     * Get cache size
     * @returns {number} Number of items in cache
     */
    size() {
        return this.cache.size;
    }
}
