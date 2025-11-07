/**
 * HTTP Show Repository
 * Implements IShowRepository with HTTP-based data access
 */
import { IShowRepository } from '../../Domain/Repositories/IShowRepository.js';
import { Show } from '../../Domain/Models/Show.js';
import { ShowStatus } from '../../Domain/ValueObjects/ShowStatus.js';
import { AiringStatus } from '../../Domain/ValueObjects/AiringStatus.js';
import { ShowDate } from '../../Domain/ValueObjects/ShowDate.js';
import { RepositoryError } from '../../Core/Errors/ApplicationErrors.js';

export class HttpShowRepository extends IShowRepository {
    /**
     * Create an HTTP show repository
     * @param {HttpClient} httpClient - HTTP client instance
     * @param {CacheManager} cache - Cache manager instance (optional)
     * @param {object} options - Configuration options
     */
    constructor(httpClient, cache = null, options = {}) {
        super();
        this.httpClient = httpClient;
        this.cache = cache;
        this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
        this.endpoint = options.endpoint || '/data/shows.json';
        this.titlesEndpoint = options.titlesEndpoint || '/data/titles.json';
        this.titles = null; // Cache for English titles
    }

    /**
     * Get all shows
     * @returns {Promise<Show[]>} Array of Show domain objects
     */
    async getAll() {
        try {
            const cacheKey = 'shows:all';

            // Try cache first
            if (this.cache) {
                const cached = this.cache.get(cacheKey);
                if (cached) return cached;
            }

            // Load English titles if not already loaded
            await this._loadTitles();

            // Fetch from HTTP
            const data = await this.httpClient.get(this.endpoint);
            const shows = this._transformToShows(data);

            // Cache result
            if (this.cache) {
                this.cache.set(cacheKey, shows, this.cacheTTL);
            }

            return shows;
        } catch (error) {
            throw new RepositoryError('Failed to fetch all shows', {
                operation: 'getAll',
                entity: 'Show',
                cause: error
            });
        }
    }

    /**
     * Get a show by ID
     * @param {string} id - Show identifier
     * @returns {Promise<Show|null>} Show domain object or null if not found
     */
    async getById(id) {
        try {
            const cacheKey = `show:${id}`;

            // Try cache first
            if (this.cache) {
                const cached = this.cache.get(cacheKey);
                if (cached) return cached;
            }

            // Fetch all and find by ID
            const shows = await this.getAll();
            const show = shows.find(s => s.getId() === id) || null;

            // Cache result
            if (this.cache && show) {
                this.cache.set(cacheKey, show, this.cacheTTL);
            }

            return show;
        } catch (error) {
            throw new RepositoryError(`Failed to fetch show with ID ${id}`, {
                operation: 'getById',
                entity: 'Show',
                id,
                cause: error
            });
        }
    }

    /**
     * Get shows by status
     * @param {string} status - Show status
     * @returns {Promise<Show[]>} Array of Show domain objects
     */
    async getByStatus(status) {
        try {
            const shows = await this.getAll();
            return shows.filter(show => show.getStatus() === status);
        } catch (error) {
            throw new RepositoryError(`Failed to fetch shows with status ${status}`, {
                operation: 'getByStatus',
                entity: 'Show',
                status,
                cause: error
            });
        }
    }

    /**
     * Get shows by airing status
     * @param {string} airingStatus - Airing status
     * @returns {Promise<Show[]>} Array of Show domain objects
     */
    async getByAiringStatus(airingStatus) {
        try {
            const shows = await this.getAll();
            return shows.filter(show => show.getAiringStatus() === airingStatus);
        } catch (error) {
            throw new RepositoryError(`Failed to fetch shows with airing status ${airingStatus}`, {
                operation: 'getByAiringStatus',
                entity: 'Show',
                airingStatus,
                cause: error
            });
        }
    }

    /**
     * Search shows by title
     * @param {string} query - Search query
     * @returns {Promise<Show[]>} Array of matching Show domain objects
     */
    async searchByTitle(query) {
        try {
            const shows = await this.getAll();
            const lowerQuery = query.toLowerCase();
            return shows.filter(show =>
                show.getTitle().toLowerCase().includes(lowerQuery)
            );
        } catch (error) {
            throw new RepositoryError(`Failed to search shows with query "${query}"`, {
                operation: 'searchByTitle',
                entity: 'Show',
                query,
                cause: error
            });
        }
    }

    /**
     * Save a show (create or update)
     * @param {Show} show - Show domain object to save
     * @returns {Promise<Show>} Saved Show domain object
     */
    async save(show) {
        try {
            // In a real implementation, this would POST/PUT to the API
            // For now, we'll simulate it by invalidating cache
            if (this.cache) {
                this.cache.delete('shows:all');
                this.cache.delete(`show:${show.getId()}`);
            }

            return show;
        } catch (error) {
            throw new RepositoryError(`Failed to save show ${show.getId()}`, {
                operation: 'save',
                entity: 'Show',
                id: show.getId(),
                cause: error
            });
        }
    }

    /**
     * Delete a show
     * @param {string} id - Show identifier
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async delete(id) {
        try {
            // In a real implementation, this would DELETE to the API
            // For now, we'll simulate it by invalidating cache
            if (this.cache) {
                this.cache.delete('shows:all');
                this.cache.delete(`show:${id}`);
            }

            return true;
        } catch (error) {
            throw new RepositoryError(`Failed to delete show ${id}`, {
                operation: 'delete',
                entity: 'Show',
                id,
                cause: error
            });
        }
    }

    /**
     * Get currently airing shows
     * @returns {Promise<Show[]>} Array of currently airing Show domain objects
     */
    async getCurrentlyAiring() {
        try {
            return await this.getByAiringStatus('currently_airing');
        } catch (error) {
            throw new RepositoryError('Failed to fetch currently airing shows', {
                operation: 'getCurrentlyAiring',
                entity: 'Show',
                cause: error
            });
        }
    }

    /**
     * Get shows that need update (behind on episodes)
     * @returns {Promise<Show[]>} Array of Show domain objects behind schedule
     */
    async getNeedingUpdate() {
        try {
            const shows = await this.getAll();
            return shows.filter(show => {
                if (!show.isActivelyWatching()) return false;

                try {
                    const episodesBehind = show.getEpisodesBehind();
                    return episodesBehind > 0;
                } catch {
                    return false;
                }
            });
        } catch (error) {
            throw new RepositoryError('Failed to fetch shows needing update', {
                operation: 'getNeedingUpdate',
                entity: 'Show',
                cause: error
            });
        }
    }

    /**
     * Batch update multiple shows
     * @param {Show[]} shows - Array of Show domain objects to update
     * @returns {Promise<Show[]>} Array of updated Show domain objects
     */
    async batchUpdate(shows) {
        try {
            // In a real implementation, this would batch POST/PUT to the API
            // For now, we'll simulate it by invalidating cache
            if (this.cache) {
                this.cache.delete('shows:all');
                shows.forEach(show => {
                    this.cache.delete(`show:${show.getId()}`);
                });
            }

            return shows;
        } catch (error) {
            throw new RepositoryError('Failed to batch update shows', {
                operation: 'batchUpdate',
                entity: 'Show',
                count: shows.length,
                cause: error
            });
        }
    }

    /**
     * Load English titles from titles.json
     * @private
     * @returns {Promise<void>}
     */
    async _loadTitles() {
        // Only load once
        if (this.titles !== null) {
            return;
        }

        try {
            this.titles = await this.httpClient.get(this.titlesEndpoint);
        } catch (error) {
            console.warn('Failed to load English titles from titles.json:', error);
            this.titles = {}; // Set to empty object to avoid retrying
        }
    }

    /**
     * Transform raw data to Show domain objects
     * @private
     * @param {any} data - Raw data from HTTP response
     * @returns {Show[]} Array of Show domain objects
     */
    _transformToShows(data) {
        // Handle different data formats
        const showsArray = Array.isArray(data) ? data : (data.shows || []);

        return showsArray.map(rawShow => {
            try {
                // Ensure ID exists and convert to string
                const rawId = rawShow.id || rawShow.show_id || rawShow.mal_id;
                if (!rawId && rawId !== 0) {
                    console.warn(`Show missing ID:`, rawShow.title || 'unknown');
                    return null;
                }

                // Transform to domain object format
                const title = rawShow.title || rawShow.name;

                // Get English title from titles.json if available, otherwise use title_english from shows.json
                const englishTitle = this.titles?.[String(rawId)] || rawShow.title_english || rawShow.titleEnglish;

                const showData = {
                    id: String(rawId),
                    title: (typeof title === 'string' ? title.trim() : null) || `Show ${rawId}`,
                    titleEnglish: englishTitle,
                    titleJapanese: rawShow.title_japanese || rawShow.titleJapanese,
                    startDate: rawShow.start_date || rawShow.startDate,
                    episodes: rawShow.episodes || rawShow.totalEpisodes || rawShow.total_episodes,
                    totalEpisodes: rawShow.totalEpisodes || rawShow.total_episodes || rawShow.episodes,
                    status: rawShow.status || rawShow.watching_status || 'plan_to_watch',
                    airingStatus: rawShow.airing_status || rawShow.airingStatus || 'not_yet_aired',
                    currentEpisode: rawShow.current_episode || rawShow.currentEpisode || rawShow.watching_status || 0,
                    score: rawShow.score || rawShow.rating || 0,
                    imageUrl: rawShow.image_url || rawShow.imageUrl,
                    type: rawShow.type,
                    rating: rawShow.rating,
                    url: rawShow.url,
                    tags: rawShow.tags || [],
                    notes: rawShow.notes || '',
                    endDate: rawShow.end_date || rawShow.endDate,
                    customStartDate: rawShow.custom_start_date || rawShow.customStartDate,
                    customEpisodes: rawShow.custom_episodes || rawShow.customEpisodes,
                    skippedWeeks: rawShow.skipped_weeks || rawShow.skippedWeeks,
                    studios: rawShow.studios,
                    licensors: rawShow.licensors,
                    season: rawShow.season,
                    seasonYear: rawShow.season_year || rawShow.seasonYear
                };

                return new Show(showData);
            } catch (error) {
                console.warn(`Failed to transform show: ${rawShow.title || 'unknown'}`, error);
                return null;
            }
        }).filter(show => show !== null);
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        if (this.cache) {
            this.cache.deletePattern('show');
        }
    }
}
