/**
 * ImportService.js
 * Service for importing show and music data from various sources
 * Supports JSON files and MyAnimeList integration
 */

export class ImportService {
    /**
     * @param {Object} dependencies - Service dependencies
     * @param {ShowRepository} dependencies.showRepository - Show repository
     * @param {MusicRepository} dependencies.musicRepository - Music repository
     * @param {EventBus} dependencies.eventBus - Event bus
     * @param {Logger} dependencies.logger - Logger instance
     */
    constructor({ showRepository, musicRepository, eventBus, logger }) {
        this.showRepository = showRepository;
        this.musicRepository = musicRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }

    /**
     * Import shows from JSON file
     * @param {File} file - JSON file containing shows
     * @returns {Promise<Object>} Import result
     */
    async importShowsFromFile(file) {
        try {
            this.logger.info('Importing shows from file:', file.name);
            this.eventBus.emit('import:started', { type: 'shows', source: file.name });

            const text = await file.text();
            const data = JSON.parse(text);

            let imported = 0;
            let errors = 0;

            for (const showData of data) {
                try {
                    await this.showRepository.create(showData);
                    imported++;
                } catch (error) {
                    this.logger.error('Failed to import show:', showData, error);
                    errors++;
                }
            }

            const result = { imported, errors, total: data.length };
            this.eventBus.emit('import:completed', { type: 'shows', result });

            return result;

        } catch (error) {
            this.logger.error('Import failed:', error);
            this.eventBus.emit('import:failed', { type: 'shows', error });
            throw error;
        }
    }

    /**
     * Import music from JSON file
     * @param {File} file - JSON file containing music tracks
     * @returns {Promise<Object>} Import result
     */
    async importMusicFromFile(file) {
        try {
            this.logger.info('Importing music from file:', file.name);
            this.eventBus.emit('import:started', { type: 'music', source: file.name });

            const text = await file.text();
            const data = JSON.parse(text);

            let imported = 0;
            let errors = 0;

            for (const trackData of data) {
                try {
                    await this.musicRepository.create(trackData);
                    imported++;
                } catch (error) {
                    this.logger.error('Failed to import track:', trackData, error);
                    errors++;
                }
            }

            const result = { imported, errors, total: data.length };
            this.eventBus.emit('import:completed', { type: 'music', result });

            return result;

        } catch (error) {
            this.logger.error('Import failed:', error);
            this.eventBus.emit('import:failed', { type: 'music', error });
            throw error;
        }
    }

    /**
     * Import shows from MyAnimeList username
     * @param {string} username - MAL username
     * @returns {Promise<Object>} Import result
     */
    async importFromMyAnimeList(username) {
        try {
            this.logger.info('Importing from MyAnimeList:', username);
            this.eventBus.emit('import:started', { type: 'mal', source: username });

            // Use the MAL proxy endpoint
            const response = await fetch(`/api/mal/animelist/${username}`);
            if (!response.ok) {
                throw new Error(`MAL API error: ${response.status}`);
            }

            const data = await response.json();

            let imported = 0;
            let errors = 0;

            for (const item of data.anime) {
                try {
                    // Transform MAL data to our show format
                    const showData = this.transformMALData(item);
                    await this.showRepository.create(showData);
                    imported++;
                } catch (error) {
                    this.logger.error('Failed to import MAL show:', item, error);
                    errors++;
                }
            }

            const result = { imported, errors, total: data.anime.length };
            this.eventBus.emit('import:completed', { type: 'mal', result });

            return result;

        } catch (error) {
            this.logger.error('MAL import failed:', error);
            this.eventBus.emit('import:failed', { type: 'mal', error });
            throw error;
        }
    }

    /**
     * Transform MAL anime data to our show format
     * @param {Object} malData - MAL anime data
     * @returns {Object} Show data in our format
     */
    transformMALData(malData) {
        return {
            malId: malData.anime_id,
            title: malData.anime_title,
            status: this.mapMALStatus(malData.status),
            watchedEpisodes: malData.num_watched_episodes || 0,
            totalEpisodes: malData.anime_num_episodes || 0,
            score: malData.score || 0,
            startDate: malData.anime_start_date_string || null,
            airingStatus: this.mapMALAiringStatus(malData.anime_airing_status),
            imageUrl: malData.anime_image_path || null
        };
    }

    /**
     * Map MAL status to our status
     * @param {number} malStatus - MAL status code
     * @returns {string} Our status string
     */
    mapMALStatus(malStatus) {
        const statusMap = {
            1: 'watching',
            2: 'completed',
            3: 'on_hold',
            4: 'dropped',
            6: 'plan_to_watch'
        };
        return statusMap[malStatus] || 'plan_to_watch';
    }

    /**
     * Map MAL airing status to our airing status
     * @param {number} malAiringStatus - MAL airing status
     * @returns {string} Our airing status string
     */
    mapMALAiringStatus(malAiringStatus) {
        const statusMap = {
            1: 'current',
            2: 'finished',
            3: 'not_yet'
        };
        return statusMap[malAiringStatus] || 'finished';
    }

    /**
     * Export shows to JSON file
     * @returns {Promise<string>} JSON string of all shows
     */
    async exportShows() {
        try {
            this.logger.info('Exporting shows');
            const shows = await this.showRepository.getAll();
            return JSON.stringify(shows, null, 2);
        } catch (error) {
            this.logger.error('Export failed:', error);
            throw error;
        }
    }

    /**
     * Export music to JSON file
     * @returns {Promise<string>} JSON string of all music
     */
    async exportMusic() {
        try {
            this.logger.info('Exporting music');
            const tracks = await this.musicRepository.getAll();
            return JSON.stringify(tracks, null, 2);
        } catch (error) {
            this.logger.error('Export failed:', error);
            throw error;
        }
    }
}
