/**
 * MySQL Show Repository
 * Implements IShowRepository interface for MySQL database storage
 */
import { RepositoryError } from '../../Core/Errors/ApplicationErrors.js';
import { Show } from '../../Domain/Models/Show.js';
import { connectionManager } from '../Database/ConnectionManager.js';
import { logger } from '../../Core/Logger.js';

export class MySQLShowRepository {
    constructor(userId = 1) {
        this.userId = userId; // Current user ID (multi-tenant support)
        this.connectionManager = connectionManager;
    }

    /**
     * Initialize repository (ensure connection)
     * @returns {Promise<void>}
     */
    async initialize() {
        if (!this.connectionManager.isConnected) {
            await this.connectionManager.initialize();
        }
    }

    /**
     * Find all shows for current user
     * @returns {Promise<Array<Show>>}
     */
    async findAll() {
        try {
            await this.initialize();

            const sql = `
                SELECT 
                    s.*,
                    us.status,
                    us.watching_status,
                    us.custom_episodes,
                    us.skipped_weeks,
                    us.custom_start_date,
                    us.rating as user_rating,
                    us.tags,
                    us.notes
                FROM shows s
                INNER JOIN user_shows us ON s.id = us.show_id
                WHERE us.user_id = ?
                ORDER BY s.title
            `;

            const rows = await this.connectionManager.query(sql, [this.userId]);

            logger.debug('Retrieved shows from MySQL', {
                count: rows.length,
                userId: this.userId
            });

            return rows.map(row => this._mapRowToShow(row));
        } catch (error) {
            logger.error('Failed to find all shows', { error: error.message });
            throw new RepositoryError('Failed to retrieve shows from database', {
                operation: 'findAll',
                cause: error
            });
        }
    }

    /**
     * Find show by ID
     * @param {string} id - Show ID
     * @returns {Promise<Show|null>}
     */
    async findById(id) {
        try {
            await this.initialize();

            const sql = `
                SELECT 
                    s.*,
                    us.status,
                    us.watching_status,
                    us.custom_episodes,
                    us.skipped_weeks,
                    us.custom_start_date,
                    us.rating as user_rating,
                    us.tags,
                    us.notes
                FROM shows s
                LEFT JOIN user_shows us ON s.id = us.show_id AND us.user_id = ?
                WHERE s.id = ?
            `;

            const rows = await this.connectionManager.query(sql, [this.userId, id]);

            if (rows.length === 0) {
                return null;
            }

            return this._mapRowToShow(rows[0]);
        } catch (error) {
            logger.error('Failed to find show by ID', {
                id,
                error: error.message
            });
            throw new RepositoryError('Failed to retrieve show from database', {
                operation: 'findById',
                entity: 'Show',
                context: { id },
                cause: error
            });
        }
    }

    /**
     * Save show (insert or update)
     * @param {Show} show - Show to save
     * @returns {Promise<Show>}
     */
    async save(show) {
        try {
            await this.initialize();

            // Use transaction for show + user_show
            return await this.connectionManager.transaction(async (connection) => {
                // Insert/update show data
                const showSql = `
                    INSERT INTO shows (
                        id, title, title_english, title_japanese, url, episodes,
                        type, image_url, start_date, end_date, airing_status,
                        score, season, studios, licensors, rating, synopsis
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        title_english = VALUES(title_english),
                        title_japanese = VALUES(title_japanese),
                        episodes = VALUES(episodes),
                        image_url = VALUES(image_url),
                        start_date = VALUES(start_date),
                        end_date = VALUES(end_date),
                        airing_status = VALUES(airing_status),
                        score = VALUES(score),
                        updated_at = CURRENT_TIMESTAMP
                `;

                // Convert airing status string to numeric value for database
                const airingStatusMap = {
                    'currently_airing': 1,
                    'finished_airing': 0,
                    'not_yet_aired': 2
                };
                const airingStatusNumeric = airingStatusMap[show.airingStatus.getValue()] || 1;


                await connection.query(showSql, [
                    show.id,
                    show.title,
                    show.titleEnglish,
                    show.titleJapanese,
                    show.url,
                    show.episodes,
                    show.type,
                    show.imageUrl,
                    show.startDate?.format(),
                    show.endDate?.format(),
                    airingStatusNumeric,
                    show.score,
                    show.season,
                    show.studios,
                    show.licensors,
                    show.rating,
                    null // synopsis
                ]);                // Insert/update user show data
                const userShowSql = `
                    INSERT INTO user_shows (
                        user_id, show_id, status, watching_status,
                        custom_episodes, skipped_weeks, custom_start_date,
                        rating, tags, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        status = VALUES(status),
                        watching_status = VALUES(watching_status),
                        custom_episodes = VALUES(custom_episodes),
                        skipped_weeks = VALUES(skipped_weeks),
                        custom_start_date = VALUES(custom_start_date),
                        rating = VALUES(rating),
                        tags = VALUES(tags),
                        notes = VALUES(notes),
                        updated_at = CURRENT_TIMESTAMP
                `;

                await connection.query(userShowSql, [
                    this.userId,
                    show.id,
                    show.status.getValue(),
                    show.watchingStatus,
                    show.customEpisodes,
                    show.skippedWeeks,
                    show.customStartDate?.format(),
                    null, // user rating (not in Show model currently)
                    JSON.stringify(show.tags || []),
                    show.notes
                ]);

                logger.info('Show saved successfully', {
                    showId: show.id,
                    title: show.title
                });

                return show;
            });
        } catch (error) {
            logger.error('Failed to save show', {
                showId: show.id,
                error: error.message
            });
            throw new RepositoryError('Failed to save show to database', {
                operation: 'save',
                entity: 'Show',
                context: { id: show.id },
                cause: error
            });
        }
    }

    /**
     * Delete show
     * @param {string} id - Show ID
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        try {
            await this.initialize();

            // Only delete user_show entry, keep shared show data
            const sql = `
                DELETE FROM user_shows
                WHERE user_id = ? AND show_id = ?
            `;

            const result = await this.connectionManager.query(sql, [this.userId, id]);

            const deleted = result.affectedRows > 0;

            logger.info('Show deleted', {
                showId: id,
                deleted
            });

            return deleted;
        } catch (error) {
            logger.error('Failed to delete show', {
                id,
                error: error.message
            });
            throw new RepositoryError('Failed to delete show from database', {
                operation: 'delete',
                entity: 'Show',
                context: { id },
                cause: error
            });
        }
    }

    /**
     * Find shows by status
     * @param {string} status - Show status
     * @returns {Promise<Array<Show>>}
     */
    async findByStatus(status) {
        try {
            await this.initialize();

            const sql = `
                SELECT 
                    s.*,
                    us.status,
                    us.watching_status,
                    us.custom_episodes,
                    us.skipped_weeks,
                    us.custom_start_date,
                    us.rating as user_rating,
                    us.tags,
                    us.notes
                FROM shows s
                INNER JOIN user_shows us ON s.id = us.show_id
                WHERE us.user_id = ? AND us.status = ?
                ORDER BY s.title
            `;

            const rows = await this.connectionManager.query(sql, [this.userId, status]);

            logger.debug('Retrieved shows by status', {
                status,
                count: rows.length
            });

            return rows.map(row => this._mapRowToShow(row));
        } catch (error) {
            logger.error('Failed to find shows by status', {
                status,
                error: error.message
            });
            throw new RepositoryError('Failed to retrieve shows by status', {
                operation: 'findByStatus',
                context: { status },
                cause: error
            });
        }
    }

    /**
     * Find shows by airing status
     * @param {number} airingStatus - Airing status
     * @returns {Promise<Array<Show>>}
     */
    async findByAiringStatus(airingStatus) {
        try {
            await this.initialize();

            const sql = `
                SELECT 
                    s.*,
                    us.status,
                    us.watching_status,
                    us.custom_episodes,
                    us.skipped_weeks,
                    us.custom_start_date,
                    us.rating as user_rating,
                    us.tags,
                    us.notes
                FROM shows s
                LEFT JOIN user_shows us ON s.id = us.show_id AND us.user_id = ?
                WHERE s.airing_status = ?
                ORDER BY s.title
            `;

            const rows = await this.connectionManager.query(sql, [this.userId, airingStatus]);

            return rows.map(row => this._mapRowToShow(row));
        } catch (error) {
            logger.error('Failed to find shows by airing status', {
                airingStatus,
                error: error.message
            });
            throw new RepositoryError('Failed to retrieve shows by airing status', {
                operation: 'findByAiringStatus',
                context: { airingStatus },
                cause: error
            });
        }
    }

    /**
     * Count total shows
     * @returns {Promise<number>}
     */
    async count() {
        try {
            await this.initialize();

            const sql = `
                SELECT COUNT(*) as count
                FROM user_shows
                WHERE user_id = ?
            `;

            const rows = await this.connectionManager.query(sql, [this.userId]);
            return rows[0].count;
        } catch (error) {
            logger.error('Failed to count shows', { error: error.message });
            throw new RepositoryError('Failed to count shows', {
                operation: 'count',
                cause: error
            });
        }
    }

    /**
     * Map database row to Show model
     * @private
     * @param {Object} row - Database row
     * @returns {Show}
     */
    _mapRowToShow(row) {
        // Parse tags safely - handle null, empty string, arrays, and JSON arrays
        let tags = [];
        if (row.tags) {
            // If tags is already an array, use it directly
            if (Array.isArray(row.tags)) {
                tags = row.tags;
            }
            // If tags is a string, try to parse it
            else if (typeof row.tags === 'string' && row.tags !== '[]' && row.tags.trim() !== '') {
                try {
                    tags = JSON.parse(row.tags);
                    // Ensure it's an array
                    if (!Array.isArray(tags)) {
                        tags = [];
                    }
                } catch (e) {
                    // Silently default to empty array if parsing fails
                    tags = [];
                }
            }
        }

        return new Show({
            id: row.id,
            title: row.title,
            titleEnglish: row.title_english,
            titleJapanese: row.title_japanese,
            url: row.url,
            episodes: row.episodes,
            type: row.type,
            imageUrl: row.image_url,
            startDate: row.start_date,
            endDate: row.end_date,
            airingStatus: row.airing_status,
            score: parseFloat(row.score) || 0,
            season: row.season,
            studios: row.studios,
            licensors: row.licensors,
            rating: row.rating,
            // User-specific data
            status: row.status || 'plan_to_watch',
            watchingStatus: row.watching_status || 1,
            customEpisodes: row.custom_episodes,
            skippedWeeks: row.skipped_weeks || 0,
            customStartDate: row.custom_start_date,
            tags: tags,
            notes: row.notes || ''
        });
    }

    /**
     * Set current user ID
     * @param {number} userId - User ID
     */
    setUserId(userId) {
        this.userId = userId;
    }
}

export default MySQLShowRepository;
