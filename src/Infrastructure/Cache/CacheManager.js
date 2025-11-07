/**
 * Cache Manager
 * In-memory cache with TTL support and cache invalidation strategies
 */
export class CacheManager {
    /**
     * Create a cache manager
     * @param {object} options - Configuration options
     * @param {number} options.defaultTTL - Default time-to-live in milliseconds
     * @param {number} options.maxSize - Maximum number of entries
     * @param {boolean} options.enableStats - Enable statistics tracking
     */
    constructor(options = {}) {
        this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
        this.maxSize = options.maxSize || 1000;
        this.enableStats = options.enableStats !== false;

        this._cache = new Map();
        this._stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        const entry = this._cache.get(key);

        if (!entry) {
            if (this.enableStats) this._stats.misses++;
            return null;
        }

        // Check if expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this._cache.delete(key);
            if (this.enableStats) this._stats.misses++;
            return null;
        }

        // Update last accessed time
        entry.lastAccessed = Date.now();

        if (this.enableStats) this._stats.hits++;
        return entry.value;
    }

    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time-to-live in milliseconds (optional)
     * @returns {boolean} True if set successfully
     */
    set(key, value, ttl) {
        // Check size limit and evict if necessary
        if (this._cache.size >= this.maxSize && !this._cache.has(key)) {
            this._evictLRU();
        }

        const expiresAt = ttl || this.defaultTTL;
        const entry = {
            value,
            expiresAt: expiresAt ? Date.now() + expiresAt : null,
            lastAccessed: Date.now(),
            createdAt: Date.now()
        };

        this._cache.set(key, entry);

        if (this.enableStats) this._stats.sets++;
        return true;
    }

    /**
     * Check if key exists in cache (doesn't count as hit)
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and not expired
     */
    has(key) {
        const entry = this._cache.get(key);
        if (!entry) return false;

        // Check if expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this._cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Delete a specific key
     * @param {string} key - Cache key
     * @returns {boolean} True if deleted
     */
    delete(key) {
        const deleted = this._cache.delete(key);
        if (deleted && this.enableStats) this._stats.deletes++;
        return deleted;
    }

    /**
     * Clear all cached entries
     */
    clear() {
        this._cache.clear();
        if (this.enableStats) {
            this._stats = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                evictions: 0
            };
        }
    }

    /**
     * Delete all keys matching a pattern
     * @param {RegExp|string} pattern - Pattern to match (string prefix or regex)
     * @returns {number} Number of keys deleted
     */
    deletePattern(pattern) {
        let deleted = 0;
        const regex = pattern instanceof RegExp ? pattern : new RegExp(`^${pattern}`);

        for (const key of this._cache.keys()) {
            if (regex.test(key)) {
                this._cache.delete(key);
                deleted++;
            }
        }

        if (this.enableStats) this._stats.deletes += deleted;
        return deleted;
    }

    /**
     * Get cache statistics
     * @returns {object} Statistics object
     */
    getStats() {
        const hitRate = this._stats.hits + this._stats.misses > 0
            ? (this._stats.hits / (this._stats.hits + this._stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this._stats,
            hitRate: `${hitRate}%`,
            size: this._cache.size,
            maxSize: this.maxSize
        };
    }

    /**
     * Get all cache keys
     * @returns {string[]} Array of cache keys
     */
    keys() {
        return Array.from(this._cache.keys());
    }

    /**
     * Get cache size
     * @returns {number} Number of entries in cache
     */
    size() {
        return this._cache.size;
    }

    /**
     * Evict least recently used entry
     * @private
     */
    _evictLRU() {
        let lruKey = null;
        let lruTime = Infinity;

        for (const [key, entry] of this._cache.entries()) {
            if (entry.lastAccessed < lruTime) {
                lruTime = entry.lastAccessed;
                lruKey = key;
            }
        }

        if (lruKey) {
            this._cache.delete(lruKey);
            if (this.enableStats) this._stats.evictions++;
        }
    }

    /**
     * Clean up expired entries
     * @returns {number} Number of entries removed
     */
    cleanup() {
        let removed = 0;
        const now = Date.now();

        for (const [key, entry] of this._cache.entries()) {
            if (entry.expiresAt && now > entry.expiresAt) {
                this._cache.delete(key);
                removed++;
            }
        }

        return removed;
    }

    /**
     * Get or set pattern (cache-aside pattern)
     * @param {string} key - Cache key
     * @param {Function} factory - Function to generate value if not cached
     * @param {number} ttl - Time-to-live in milliseconds (optional)
     * @returns {Promise<any>} Cached or generated value
     */
    async getOrSet(key, factory, ttl) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        const value = await factory();
        this.set(key, value, ttl);
        return value;
    }
}
