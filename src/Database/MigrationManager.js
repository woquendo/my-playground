/**
 * Database Migration System
 * 
 * Industry-standard migration manager with versioning, rollback support,
 * and automatic tracking of applied migrations.
 * 
 * Features:
 * - Versioned migrations (timestamp-based)
 * - Up/down migrations (forward and rollback)
 * - Automatic migration tracking
 * - Dependency ordering
 * - Dry-run support
 * - Transaction safety
 */

import { connectionManager } from '../Infrastructure/Database/ConnectionManager.js';
import { logger } from '../Core/Logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MigrationManager {
    constructor() {
        this.connectionManager = connectionManager;
        // Navigate from src/Database/ to project root /database/migrations
        this.migrationsDir = path.join(__dirname, '../../database/migrations');
        this.migrationsTable = 'schema_migrations';
    }

    /**
     * Initialize migration system (create tracking table if needed)
     */
    async initialize() {
        await this.connectionManager.initialize();

        // Create migrations tracking table
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                version VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INT,
                batch INT NOT NULL,
                INDEX idx_version (version),
                INDEX idx_batch (batch)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await this.connectionManager.query(createTableSQL);

        logger.info('Migration system initialized', {
            table: this.migrationsTable
        });
    }

    /**
     * Get all migration files sorted by version
     */
    async getMigrationFiles() {
        try {
            const files = await fs.readdir(this.migrationsDir);

            // Filter and sort migration files (format: YYYYMMDDHHMMSS_name.js)
            const migrations = files
                .filter(f => f.endsWith('.js') && /^\d{14}_/.test(f))
                .sort()
                .map(filename => {
                    const version = filename.substring(0, 14);
                    const name = filename.substring(15, filename.length - 3);
                    return { version, name, filename };
                });

            return migrations;
        } catch (error) {
            logger.error('Failed to read migration files', { error: error.message });
            throw error;
        }
    }

    /**
     * Get list of executed migrations
     */
    async getExecutedMigrations() {
        const sql = `SELECT version, name, executed_at, batch FROM ${this.migrationsTable} ORDER BY version ASC`;
        return await this.connectionManager.query(sql);
    }

    /**
     * Get pending migrations (not yet executed)
     */
    async getPendingMigrations() {
        const allMigrations = await this.getMigrationFiles();
        const executed = await this.getExecutedMigrations();
        const executedVersions = new Set(executed.map(m => m.version));

        return allMigrations.filter(m => !executedVersions.has(m.version));
    }

    /**
     * Get current batch number
     */
    async getCurrentBatch() {
        const sql = `SELECT COALESCE(MAX(batch), 0) as max_batch FROM ${this.migrationsTable}`;
        const result = await this.connectionManager.query(sql);
        return result[0].max_batch;
    }

    /**
     * Run all pending migrations
     * @param {Object} options - Migration options
     * @param {boolean} options.dryRun - If true, don't execute, just show what would run
     * @param {number} options.step - Number of migrations to run (default: all)
     */
    async migrate(options = {}) {
        const { dryRun = false, step = null } = options;

        await this.initialize();

        const pending = await this.getPendingMigrations();

        if (pending.length === 0) {
            logger.info('No pending migrations');
            return { executed: [], message: 'Already up to date' };
        }

        const toExecute = step ? pending.slice(0, step) : pending;

        if (dryRun) {
            logger.info('Dry run - would execute migrations:', {
                count: toExecute.length,
                migrations: toExecute.map(m => `${m.version}_${m.name}`)
            });
            return { executed: [], message: `Would run ${toExecute.length} migrations (dry run)` };
        }

        const batch = await this.getCurrentBatch() + 1;
        const executed = [];

        for (const migration of toExecute) {
            const startTime = Date.now();

            try {
                logger.info('Running migration', {
                    version: migration.version,
                    name: migration.name
                });

                // Import and execute migration
                const migrationModule = await import(
                    path.join(this.migrationsDir, migration.filename)
                );

                // Run migration in transaction
                await this.connectionManager.transaction(async (connection) => {
                    await migrationModule.up(connection);
                });

                const executionTime = Date.now() - startTime;

                // Record migration
                await this.connectionManager.query(
                    `INSERT INTO ${this.migrationsTable} (version, name, execution_time_ms, batch) VALUES (?, ?, ?, ?)`,
                    [migration.version, migration.name, executionTime, batch]
                );

                executed.push(migration);

                logger.info('Migration completed', {
                    version: migration.version,
                    name: migration.name,
                    executionTime: `${executionTime}ms`
                });

            } catch (error) {
                logger.error('Migration failed', {
                    version: migration.version,
                    name: migration.name,
                    error: error.message,
                    stack: error.stack
                });

                throw new Error(
                    `Migration ${migration.version}_${migration.name} failed: ${error.message}`
                );
            }
        }

        return {
            executed,
            batch,
            message: `Successfully ran ${executed.length} migration(s)`
        };
    }

    /**
     * Rollback last batch of migrations
     * @param {Object} options - Rollback options
     * @param {boolean} options.dryRun - If true, don't execute, just show what would rollback
     * @param {number} options.step - Number of migrations to rollback (default: last batch)
     */
    async rollback(options = {}) {
        const { dryRun = false, step = null } = options;

        await this.initialize();

        const executed = await this.getExecutedMigrations();

        if (executed.length === 0) {
            logger.info('No migrations to rollback');
            return { rolledBack: [], message: 'No migrations to rollback' };
        }

        // Get migrations from last batch
        const currentBatch = await this.getCurrentBatch();
        const toRollback = step
            ? executed.slice(-step).reverse()
            : executed.filter(m => m.batch === currentBatch).reverse();

        if (toRollback.length === 0) {
            logger.info('No migrations in current batch');
            return { rolledBack: [], message: 'No migrations to rollback' };
        }

        if (dryRun) {
            logger.info('Dry run - would rollback migrations:', {
                count: toRollback.length,
                migrations: toRollback.map(m => `${m.version}_${m.name}`)
            });
            return { rolledBack: [], message: `Would rollback ${toRollback.length} migrations (dry run)` };
        }

        const rolledBack = [];

        for (const migration of toRollback) {
            const startTime = Date.now();

            try {
                logger.info('Rolling back migration', {
                    version: migration.version,
                    name: migration.name
                });

                // Import and execute rollback
                const migrationModule = await import(
                    path.join(this.migrationsDir, `${migration.version}_${migration.name}.js`)
                );

                if (!migrationModule.down) {
                    throw new Error('Migration does not have a down() method');
                }

                // Run rollback in transaction
                await this.connectionManager.transaction(async (connection) => {
                    await migrationModule.down(connection);
                });

                const executionTime = Date.now() - startTime;

                // Remove migration record
                await this.connectionManager.query(
                    `DELETE FROM ${this.migrationsTable} WHERE version = ?`,
                    [migration.version]
                );

                rolledBack.push(migration);

                logger.info('Migration rolled back', {
                    version: migration.version,
                    name: migration.name,
                    executionTime: `${executionTime}ms`
                });

            } catch (error) {
                logger.error('Rollback failed', {
                    version: migration.version,
                    name: migration.name,
                    error: error.message,
                    stack: error.stack
                });

                throw new Error(
                    `Rollback ${migration.version}_${migration.name} failed: ${error.message}`
                );
            }
        }

        return {
            rolledBack,
            message: `Successfully rolled back ${rolledBack.length} migration(s)`
        };
    }

    /**
     * Get migration status
     */
    async status() {
        await this.initialize();

        const allMigrations = await this.getMigrationFiles();
        const executed = await this.getExecutedMigrations();
        const executedMap = new Map(executed.map(m => [m.version, m]));

        const status = allMigrations.map(migration => {
            const executedInfo = executedMap.get(migration.version);
            return {
                version: migration.version,
                name: migration.name,
                status: executedInfo ? 'executed' : 'pending',
                executedAt: executedInfo?.executed_at || null,
                batch: executedInfo?.batch || null
            };
        });

        return status;
    }

    /**
     * Reset database (rollback all migrations)
     */
    async reset() {
        logger.warn('Resetting database - rolling back all migrations');

        await this.initialize();

        const executed = await this.getExecutedMigrations();

        if (executed.length === 0) {
            return { message: 'Database is already empty' };
        }

        // Rollback all in reverse order
        const toRollback = executed.reverse();

        for (const migration of toRollback) {
            await this.rollback({ step: 1 });
        }

        return { message: `Reset complete - rolled back ${executed.length} migrations` };
    }

    /**
     * Fresh database (reset + migrate)
     */
    async fresh() {
        logger.info('Refreshing database - reset and migrate');

        await this.reset();
        await this.migrate();

        return { message: 'Database refreshed successfully' };
    }

    /**
     * Close connection
     */
    async close() {
        await this.connectionManager.close();
    }
}

// Export singleton instance
export const migrationManager = new MigrationManager();
