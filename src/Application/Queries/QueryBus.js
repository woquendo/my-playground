/**
 * Query Bus
 * Handles query dispatching and execution following the CQRS pattern.
 * Supports result caching, transformation, and error handling.
 */
import { ValidationError, ApplicationError } from '../../Core/Errors/ApplicationErrors.js';

export class QueryBus {
    /**
     * Create a QueryBus
     * @param {object} options - Configuration options
     * @param {EventBus} options.eventBus - Event bus for query lifecycle events
     * @param {Logger} options.logger - Logger instance
     * @param {CacheManager} options.cache - Optional cache for query results
     */
    constructor({ eventBus = null, logger = null, cache = null } = {}) {
        this.handlers = new Map();
        this.middleware = [];
        this.eventBus = eventBus;
        this.logger = logger;
        this.cache = cache;
    }

    /**
     * Register a query handler
     * @param {string} queryName - Name of the query
     * @param {Function} handler - Handler function that executes the query
     * @param {object} options - Registration options
     * @param {Function} options.transformer - Optional result transformation function
     * @param {number} options.cacheTTL - Cache time-to-live in milliseconds (0 = no cache)
     * @throws {ValidationError} If queryName or handler is invalid
     */
    register(queryName, handler, options = {}) {
        if (!queryName || typeof queryName !== 'string') {
            throw new ValidationError('Query name must be a non-empty string', {
                context: { queryName }
            });
        }

        if (typeof handler !== 'function') {
            throw new ValidationError('Query handler must be a function', {
                context: { queryName, handlerType: typeof handler }
            });
        }

        if (this.handlers.has(queryName)) {
            throw new ValidationError(`Query handler already registered for: ${queryName}`, {
                context: { queryName }
            });
        }

        this.handlers.set(queryName, {
            handler,
            transformer: options.transformer || null,
            cacheTTL: options.cacheTTL || 0
        });

        this.logger?.debug(`Registered query handler: ${queryName}`);
    }

    /**
     * Execute a query
     * @param {string} queryName - Name of the query to execute
     * @param {object} params - Query parameters
     * @param {object} options - Execution options
     * @param {boolean} options.skipCache - Skip cache lookup and population
     * @returns {Promise<any>} Query result (possibly from cache or transformed)
     * @throws {ValidationError} If query is not registered
     * @throws {ApplicationError} If query execution fails
     */
    async execute(queryName, params = {}, options = {}) {
        if (!this.handlers.has(queryName)) {
            throw new ValidationError(`No handler registered for query: ${queryName}`, {
                context: { queryName, availableQueries: Array.from(this.handlers.keys()) }
            });
        }

        const { handler, transformer, cacheTTL } = this.handlers.get(queryName);
        const cacheKey = this._generateCacheKey(queryName, params);

        try {
            // Check cache if enabled and not skipped
            if (!options.skipCache && cacheTTL > 0 && this.cache) {
                const cached = this.cache.get(cacheKey);
                if (cached !== undefined) {
                    this.logger?.debug(`Query cache hit: ${queryName}`);
                    this.eventBus?.emit('query:cache-hit', { queryName, params });
                    return cached;
                }
            }

            // Emit query start event
            this.eventBus?.emit('query:start', { queryName, params });
            this.logger?.debug(`Executing query: ${queryName}`, params);

            // Execute middleware chain
            let processedParams = params;
            for (const middlewareFn of this.middleware) {
                processedParams = await middlewareFn(queryName, processedParams);
            }

            // Execute query handler
            let result = await handler(processedParams);

            // Transform result if transformer provided
            if (transformer) {
                result = await transformer(result, processedParams);
            }

            // Cache result if enabled
            if (cacheTTL > 0 && this.cache && !options.skipCache) {
                this.cache.set(cacheKey, result, cacheTTL);
                this.logger?.debug(`Query result cached: ${queryName}`);
            }

            // Emit query success event
            this.eventBus?.emit('query:success', { queryName, params, result });
            this.logger?.debug(`Query executed successfully: ${queryName}`);

            return result;

        } catch (error) {
            // Emit query error event
            this.eventBus?.emit('query:error', { queryName, params, error });
            this.logger?.error(`Query execution failed: ${queryName}`, error);

            // Wrap non-ApplicationErrors
            if (error instanceof ApplicationError) {
                throw error;
            }

            throw new ApplicationError(`Query execution failed: ${queryName}`, {
                context: { queryName, params },
                cause: error
            });
        }
    }

    /**
     * Add middleware to the query execution pipeline
     * Middleware functions receive (queryName, params) and must return the params (possibly modified)
     * @param {Function} middlewareFn - Middleware function
     * @throws {ValidationError} If middleware is not a function
     */
    use(middlewareFn) {
        if (typeof middlewareFn !== 'function') {
            throw new ValidationError('Middleware must be a function', {
                context: { middlewareType: typeof middlewareFn }
            });
        }

        this.middleware.push(middlewareFn);
        this.logger?.debug('Added middleware to query bus');
    }

    /**
     * Check if a query handler is registered
     * @param {string} queryName - Name of the query
     * @returns {boolean} True if handler is registered
     */
    has(queryName) {
        return this.handlers.has(queryName);
    }

    /**
     * Unregister a query handler
     * @param {string} queryName - Name of the query to unregister
     * @returns {boolean} True if handler was unregistered
     */
    unregister(queryName) {
        const result = this.handlers.delete(queryName);
        if (result) {
            this.logger?.debug(`Unregistered query handler: ${queryName}`);
        }
        return result;
    }

    /**
     * Invalidate cached query results
     * @param {string} queryName - Name of the query (or pattern)
     * @param {object} params - Optional specific parameters to invalidate
     */
    invalidateCache(queryName, params = null) {
        if (!this.cache) return;

        if (params) {
            // Invalidate specific query
            const cacheKey = this._generateCacheKey(queryName, params);
            this.cache.delete(cacheKey);
            this.logger?.debug(`Invalidated cache for: ${queryName}`, params);
        } else {
            // Invalidate all queries with this name
            const pattern = `query:${queryName}:*`;
            this.cache.deletePattern(pattern);
            this.logger?.debug(`Invalidated all cache entries for: ${queryName}`);
        }

        this.eventBus?.emit('query:cache-invalidated', { queryName, params });
    }

    /**
     * Get list of registered query names
     * @returns {string[]} Array of query names
     */
    getRegisteredQueries() {
        return Array.from(this.handlers.keys());
    }

    /**
     * Clear all registered handlers and middleware
     */
    clear() {
        this.handlers.clear();
        this.middleware = [];
        this.logger?.debug('Cleared all query handlers and middleware');
    }

    /**
     * Generate cache key for query
     * @private
     * @param {string} queryName - Query name
     * @param {object} params - Query parameters
     * @returns {string} Cache key
     */
    _generateCacheKey(queryName, params) {
        const paramsString = JSON.stringify(params, Object.keys(params).sort());
        return `query:${queryName}:${paramsString}`;
    }
}
