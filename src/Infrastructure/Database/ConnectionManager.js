/**
 * MySQL Connection Manager
 * Manages MySQL connection pool with automatic reconnection and error handling
 */
import mysql from 'mysql2/promise';
import config from '../Config/index.js';
import { logger } from '../../Core/Logger.js';
import { ConfigurationError } from '../../Core/Errors/ApplicationErrors.js';

export class ConnectionManager {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 seconds
    }

    /**
     * Initialize connection pool
     * @returns {Promise<mysql.Pool>}
     */
    async initialize() {
        if (this.pool) {
            logger.warn('Connection pool already initialized');
            return this.pool;
        }

        try {
            const dbConfig = config.database.getConnectionConfig();

            logger.info('Initializing MySQL connection pool', {
                host: dbConfig.host,
                port: dbConfig.port,
                database: dbConfig.database
            });

            this.pool = mysql.createPool({
                host: dbConfig.host,
                port: dbConfig.port,
                user: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database,
                waitForConnections: dbConfig.waitForConnections,
                connectionLimit: dbConfig.connectionLimit,
                queueLimit: dbConfig.queueLimit,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0,
                // Additional connection options
                charset: 'utf8mb4',
                timezone: 'Z', // UTC
                dateStrings: false,
                // Handle connection errors
                acquireTimeout: 10000,
                connectTimeout: 10000
            });

            // Test the connection
            await this.testConnection();

            this.isConnected = true;
            this.reconnectAttempts = 0;

            logger.info('MySQL connection pool initialized successfully');

            // Set up event handlers
            this.setupEventHandlers();

            return this.pool;
        } catch (error) {
            logger.error('Failed to initialize MySQL connection pool', {
                error: error.message,
                stack: error.stack
            });
            throw new ConfigurationError('MySQL connection initialization failed', {
                cause: error,
                context: { database: config.database.name }
            });
        }
    }

    /**
     * Set up connection pool event handlers
     * @private
     */
    setupEventHandlers() {
        if (!this.pool) return;

        this.pool.on('acquire', (connection) => {
            logger.debug('Connection acquired from pool', {
                connectionId: connection.threadId
            });
        });

        this.pool.on('release', (connection) => {
            logger.debug('Connection released back to pool', {
                connectionId: connection.threadId
            });
        });

        this.pool.on('connection', (connection) => {
            logger.debug('New connection created in pool', {
                connectionId: connection.threadId
            });
        });

        this.pool.on('enqueue', () => {
            logger.debug('Connection request queued (pool exhausted)');
        });
    }

    /**
     * Test database connection
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        if (!this.pool) {
            throw new ConfigurationError('Connection pool not initialized');
        }

        try {
            const connection = await this.pool.getConnection();
            await connection.query('SELECT 1');
            connection.release();

            logger.info('MySQL connection test successful');
            return true;
        } catch (error) {
            logger.error('MySQL connection test failed', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get a connection from the pool
     * @returns {Promise<mysql.PoolConnection>}
     */
    async getConnection() {
        if (!this.pool) {
            throw new ConfigurationError('Connection pool not initialized. Call initialize() first.');
        }

        try {
            const connection = await this.pool.getConnection();
            return connection;
        } catch (error) {
            logger.error('Failed to get connection from pool', {
                error: error.message
            });

            // Attempt reconnection
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                logger.info('Attempting to reconnect to database', {
                    attempt: this.reconnectAttempts + 1,
                    maxAttempts: this.maxReconnectAttempts
                });

                await this.reconnect();
                return await this.pool.getConnection();
            }

            throw error;
        }
    }

    /**
     * Execute a query
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>}
     */
    async query(sql, params = []) {
        const connection = await this.getConnection();

        try {
            logger.debug('Executing query', {
                sql: sql.substring(0, 100),
                paramCount: params.length
            });

            const [rows] = await connection.query(sql, params);
            return rows;
        } catch (error) {
            logger.error('Query execution failed', {
                error: error.message,
                sql: sql.substring(0, 100)
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Execute a transaction
     * @param {Function} callback - Transaction callback function
     * @returns {Promise<*>}
     */
    async transaction(callback) {
        const connection = await this.getConnection();

        try {
            await connection.beginTransaction();
            logger.debug('Transaction started');

            const result = await callback(connection);

            await connection.commit();
            logger.debug('Transaction committed');

            return result;
        } catch (error) {
            await connection.rollback();
            logger.error('Transaction rolled back', {
                error: error.message
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Attempt to reconnect to database
     * @private
     * @returns {Promise<void>}
     */
    async reconnect() {
        this.reconnectAttempts++;

        logger.info('Attempting database reconnection', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts
        });

        // Wait before reconnecting
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

        try {
            // Close existing pool
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
            }

            // Reinitialize
            await this.initialize();

            logger.info('Database reconnection successful');
        } catch (error) {
            logger.error('Database reconnection failed', {
                error: error.message,
                attempt: this.reconnectAttempts
            });

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                throw new ConfigurationError('Max reconnection attempts reached', {
                    cause: error
                });
            }

            // Retry
            return await this.reconnect();
        }
    }

    /**
     * Close connection pool
     * @returns {Promise<void>}
     */
    async close() {
        if (!this.pool) {
            logger.warn('Connection pool already closed or not initialized');
            return;
        }

        try {
            logger.info('Closing MySQL connection pool');
            await this.pool.end();
            this.pool = null;
            this.isConnected = false;
            logger.info('MySQL connection pool closed successfully');
        } catch (error) {
            logger.error('Error closing connection pool', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get pool statistics
     * @returns {Object}
     */
    getStats() {
        if (!this.pool) {
            return {
                initialized: false,
                connected: false
            };
        }

        return {
            initialized: true,
            connected: this.isConnected,
            // Pool status (these are estimates as mysql2 doesn't expose exact counts)
            totalConnections: config.database.connectionLimit,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Check if connection is healthy
     * @returns {Promise<boolean>}
     */
    async isHealthy() {
        try {
            await this.testConnection();
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create and export singleton instance
export const connectionManager = new ConnectionManager();

// Export for testing
export default ConnectionManager;
