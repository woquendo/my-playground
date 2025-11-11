/**
 * LegacyAdapter.js
 * Bridges legacy code with modern architecture
 * Provides backward compatibility during transition period
 */

export class LegacyAdapter {
    /**
     * @param {Container} container - DI container
     * @param {EventBus} eventBus - Event bus
     * @param {Logger} logger - Logger instance
     */
    constructor(container, eventBus, logger) {
        this.container = container;
        this.eventBus = eventBus;
        this.logger = logger;

        this.logger.info('Initializing legacy adapter');
    }

    /**
     * Initialize legacy support
     * Sets up bridges between old and new code
     */
    async initialize() {
        this.logger.info('Setting up legacy compatibility layer');

        // Expose modern services via legacy global variables
        this._exposeLegacyGlobals();

        // Set up event bridges
        this._setupEventBridges();

        // Migrate localStorage data if needed
        await this._migrateStorageData();

        this.logger.info('Legacy adapter initialized');
    }

    /**
     * Expose modern services via legacy global variables
     * Allows old code to access new services
     * @private
     */
    _exposeLegacyGlobals() {
        // Expose container for debugging
        window._container = this.container;

        // Expose event bus
        window._eventBus = this.eventBus;

        // Create legacy-compatible API
        window.app = window.app || {};

        // Expose show management
        try {
            const showService = this.container.get('showManagementService');
            window.app.showService = {
                getAllShows: () => showService.getAllShows(),
                getShowById: (id) => showService.getShowById(id),
                updateShow: (show) => showService.updateShow(show),
                progressEpisode: (showId) => showService.progressEpisode(showId),
                updateShowStatus: (showId, status) => showService.updateShowStatus(showId, status)
            };
        } catch (error) {
            this.logger.warn('Could not expose show service:', error.message);
        }

        // Expose music management
        try {
            const musicService = this.container.get('musicManagementService');
            window.app.musicService = {
                getAllTracks: () => musicService.getAllTracks(),
                getTrackById: (id) => musicService.getTrackById(id),
                playTrack: (trackId) => {
                    const track = musicService.getTrackById(trackId);
                    if (track) {
                        this.eventBus.emit('music:play', track);
                    }
                }
            };
        } catch (error) {
            this.logger.warn('Could not expose music service:', error.message);
        }

        // Expose schedule service
        try {
            const scheduleService = this.container.get('scheduleService');
            window.app.scheduleService = {
                getSchedule: (options) => scheduleService.getWeeklySchedule(options)
            };
        } catch (error) {
            this.logger.warn('Could not expose schedule service:', error.message);
        }

        this.logger.info('Legacy global variables exposed');
    }

    /**
     * Set up bridges between old and new events
     * Translates legacy events to modern events and vice versa
     * @private
     */
    _setupEventBridges() {
        // Bridge legacy DOM events to EventBus

        // Example: Legacy music player events
        document.addEventListener('legacy:playTrack', (e) => {
            this.logger.debug('Legacy event: playTrack', e.detail);
            this.eventBus.emit('music:play', e.detail.track);
        });

        // Example: Legacy show update events
        document.addEventListener('legacy:showUpdated', (e) => {
            this.logger.debug('Legacy event: showUpdated', e.detail);
            this.eventBus.emit('show:updated', e.detail.show);
        });

        // Bridge modern events to legacy format
        this.eventBus.subscribe('music:play', (track) => {
            const legacyEvent = new CustomEvent('modern:trackPlaying', {
                detail: { track }
            });
            document.dispatchEvent(legacyEvent);
        });

        this.eventBus.subscribe('show:updated', (show) => {
            const legacyEvent = new CustomEvent('modern:showChanged', {
                detail: { show }
            });
            document.dispatchEvent(legacyEvent);
        });

        this.logger.info('Event bridges established');
    }

    /**
     * Migrate localStorage data from legacy format to new format
     * @private
     */
    async _migrateStorageData() {
        try {
            this.logger.info('Checking for legacy data migration needs');

            // Check if migration has already been done
            const migrationVersion = localStorage.getItem('data_migration_version');
            const currentVersion = '2.0';

            if (migrationVersion === currentVersion) {
                this.logger.info('Data already migrated to version', currentVersion);
                return;
            }

            // Perform migrations based on version
            await this._performMigrations(migrationVersion, currentVersion);

            // Mark migration as complete
            localStorage.setItem('data_migration_version', currentVersion);
            this.logger.info('Data migration completed to version', currentVersion);

        } catch (error) {
            this.logger.error('Failed to migrate storage data:', error);
            throw error;
        }
    }

    /**
     * Perform specific migrations
     * @param {string} fromVersion - Current version
     * @param {string} toVersion - Target version
     * @private
     */
    async _performMigrations(fromVersion, toVersion) {
        this.logger.info(`Migrating data from ${fromVersion || 'legacy'} to ${toVersion}`);

        // Migration 1.0 -> 2.0: No breaking changes needed
        // Legacy localStorage keys are still compatible
        // (anime_shows, anime_music, anime_site_availability, etc.)

        // Future migrations can be added here as needed

        // Example migration pattern:
        // if (!fromVersion || fromVersion < '1.5') {
        //     await this._migrateShowFormat();
        // }
        // if (!fromVersion || fromVersion < '2.0') {
        //     await this._migrateMusicFormat();
        // }
    }

    /**
     * Example: Migrate show data format
     * @private
     */
    async _migrateShowFormat() {
        try {
            const legacyShows = localStorage.getItem('anime_shows');
            if (!legacyShows) return;

            const shows = JSON.parse(legacyShows);
            this.logger.info(`Migrating ${shows.length} shows to new format`);

            // Transform data if needed
            // const migratedShows = shows.map(show => ({
            //     ...show,
            //     // Add new fields or transform existing ones
            // }));

            // Save back
            // localStorage.setItem('anime_shows', JSON.stringify(migratedShows));

            this.logger.info('Show format migration complete');
        } catch (error) {
            this.logger.error('Failed to migrate show format:', error);
        }
    }

    /**
     * Provide legacy API compatibility
     * Maps old function signatures to new services
     */
    createLegacyAPI() {
        const self = this;

        return {
            /**
             * Legacy: Load shows
             */
            async loadShows() {
                const showService = self.container.get('showManagementService');
                return await showService.getAllShows();
            },

            /**
             * Legacy: Load music
             */
            async loadMusic() {
                const musicService = self.container.get('musicManagementService');
                return await musicService.getAllTracks();
            },

            /**
             * Legacy: Update show progress
             */
            async updateShowProgress(showId) {
                const showService = self.container.get('showManagementService');
                return await showService.progressEpisode(showId);
            },

            /**
             * Legacy: Play track
             */
            playTrack(trackId) {
                const musicService = self.container.get('musicManagementService');
                const track = musicService.getTrackById(trackId);
                if (track) {
                    self.eventBus.emit('music:play', track);
                }
            },

            /**
             * Legacy: Navigate to page
             */
            navigateTo(route) {
                const router = self.container.get('router');
                router.navigate(route);
            }
        };
    }

    /**
     * Check if legacy mode is needed
     * @returns {boolean} True if running in legacy compatibility mode
     */
    isLegacyMode() {
        // Check if we're running from index.html instead of app.html
        const isLegacyPage = window.location.pathname.includes('index.html');
        return isLegacyPage;
    }

    /**
     * Cleanup legacy adapter
     */
    destroy() {
        this.logger.info('Cleaning up legacy adapter');

        // Remove global variables
        delete window._container;
        delete window._eventBus;
        delete window.app;
    }
}
