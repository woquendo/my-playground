/**
 * Storage Service
 * LocalStorage abstraction for data persistence
 */
import { StorageError } from '../../Core/Errors/ApplicationErrors.js';

export class StorageService {
    /**
     * Create a storage service
     * @param {object} options - Configuration options
     * @param {string} options.prefix - Key prefix for namespacing
     * @param {Storage} options.storage - Storage implementation (defaults to localStorage)
     */
    constructor(options = {}) {
        this.prefix = options.prefix || 'myplayground_';
        this.storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);

        if (!this.storage) {
            throw new StorageError('Storage is not available in this environment');
        }
    }

    /**
     * Get a value from storage
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {any} Stored value or default
     */
    get(key, defaultValue = null) {
        try {
            const fullKey = this._getFullKey(key);
            const item = this.storage.getItem(fullKey);

            if (item === null) {
                return defaultValue;
            }

            const parsed = JSON.parse(item);

            // Check expiration
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                this.remove(key);
                return defaultValue;
            }

            return parsed.value;
        } catch (error) {
            throw new StorageError(`Failed to get item '${key}' from storage`, {
                key,
                error: error.message
            });
        }
    }

    /**
     * Set a value in storage
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @param {number} ttl - Time-to-live in milliseconds (optional)
     * @returns {boolean} True if set successfully
     */
    set(key, value, ttl) {
        try {
            const fullKey = this._getFullKey(key);
            const item = {
                value,
                expiresAt: ttl ? Date.now() + ttl : null,
                createdAt: Date.now()
            };

            this.storage.setItem(fullKey, JSON.stringify(item));
            return true;
        } catch (error) {
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                throw new StorageError('Storage quota exceeded', {
                    key,
                    error: error.message
                });
            }

            throw new StorageError(`Failed to set item '${key}' in storage`, {
                key,
                error: error.message
            });
        }
    }

    /**
     * Check if key exists in storage
     * @param {string} key - Storage key
     * @returns {boolean} True if key exists
     */
    has(key) {
        const fullKey = this._getFullKey(key);
        const item = this.storage.getItem(fullKey);

        if (item === null) {
            return false;
        }

        try {
            const parsed = JSON.parse(item);

            // Check expiration
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                this.remove(key);
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Remove a value from storage
     * @param {string} key - Storage key
     * @returns {boolean} True if removed
     */
    remove(key) {
        try {
            const fullKey = this._getFullKey(key);
            this.storage.removeItem(fullKey);
            return true;
        } catch (error) {
            throw new StorageError(`Failed to remove item '${key}' from storage`, {
                key,
                error: error.message
            });
        }
    }

    /**
     * Clear all storage for this prefix
     * @returns {number} Number of items removed
     */
    clear() {
        try {
            let removed = 0;
            const keys = this.keys();

            for (const key of keys) {
                this.remove(key);
                removed++;
            }

            return removed;
        } catch (error) {
            throw new StorageError('Failed to clear storage', {
                error: error.message
            });
        }
    }

    /**
     * Get all keys for this prefix
     * @returns {string[]} Array of keys (without prefix)
     */
    keys() {
        const keys = [];

        try {
            for (let i = 0; i < this.storage.length; i++) {
                const fullKey = this.storage.key(i);
                if (fullKey && fullKey.startsWith(this.prefix)) {
                    keys.push(fullKey.substring(this.prefix.length));
                }
            }
        } catch (error) {
            throw new StorageError('Failed to get storage keys', {
                error: error.message
            });
        }

        return keys;
    }

    /**
     * Get storage size information
     * @returns {object} Size information
     */
    getSize() {
        let totalSize = 0;
        const keys = this.keys();

        for (const key of keys) {
            const fullKey = this._getFullKey(key);
            const item = this.storage.getItem(fullKey);
            if (item) {
                totalSize += item.length;
            }
        }

        return {
            keys: keys.length,
            bytes: totalSize,
            kilobytes: (totalSize / 1024).toFixed(2),
            megabytes: (totalSize / 1024 / 1024).toFixed(2)
        };
    }

    /**
     * Get full storage key with prefix
     * @private
     * @param {string} key - Original key
     * @returns {string} Full key with prefix
     */
    _getFullKey(key) {
        return `${this.prefix}${key}`;
    }

    /**
     * Clean up expired entries
     * @returns {number} Number of entries removed
     */
    cleanup() {
        let removed = 0;
        const now = Date.now();
        const keys = this.keys();

        for (const key of keys) {
            try {
                const fullKey = this._getFullKey(key);
                const item = this.storage.getItem(fullKey);

                if (item) {
                    const parsed = JSON.parse(item);
                    if (parsed.expiresAt && now > parsed.expiresAt) {
                        this.remove(key);
                        removed++;
                    }
                }
            } catch {
                // Skip invalid entries
            }
        }

        return removed;
    }
}
