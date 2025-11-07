/**
 * Music View Model
 * Manages music library display, playback tracking, and rating operations.
 * Coordinates between UI and MusicManagementService.
 */

import { BaseViewModel } from './BaseViewModel.js';
import { StrategyFactory } from '../../Application/Strategies/index.js';

export class MusicViewModel extends BaseViewModel {
    /**
     * Create a music view model
     * @param {object} options - Configuration options
     * @param {MusicManagementService} options.musicManagementService - Music management service
     * @param {CommandBus} options.commandBus - Command bus for operations
     * @param {QueryBus} options.queryBus - Query bus for queries
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger
     */
    constructor(options) {
        super({
            ...options,
            name: 'Music'
        });

        this._musicManagementService = options.musicManagementService;
        this._commandBus = options.commandBus;
        this._queryBus = options.queryBus;

        if (!this._musicManagementService) {
            throw new Error('MusicManagementService is required');
        }
    }

    /**
     * Initialize the view model
     * @protected
     */
    _initialize() {
        // Initialize state
        this.set('tracks', [], true);
        this.set('selectedTrack', null, true);
        this.set('currentlyPlaying', null, true);
        this.set('filterArtist', null, true);
        this.set('filterType', null, true);
        this.set('minRating', null, true);
        this.set('sortBy', 'title', true);
        this.set('searchQuery', '', true);

        // Define computed properties
        this.defineComputed('filteredTracks', () => {
            return this._getFilteredTracks();
        });

        this.defineComputed('trackCount', () => {
            return this.get('tracks').length;
        });

        this.defineComputed('averageRating', () => {
            const tracks = this.get('tracks');
            const rated = tracks.filter(t => t.getRating() !== null);
            if (rated.length === 0) return 0;

            const sum = rated.reduce((acc, t) => acc + t.getRating(), 0);
            return sum / rated.length;
        });

        this.defineComputed('topRatedCount', () => {
            const tracks = this.get('tracks');
            return tracks.filter(t => t.getRating() >= 4).length;
        });

        this.defineComputed('isPlaying', () => {
            return this.get('currentlyPlaying') !== null;
        });
    }

    /**
     * Load all tracks
     * @returns {Promise<Music[]>} All tracks
     */
    async loadTracks() {
        return this.executeAsync(async () => {
            const tracks = await this._musicManagementService.getAllTracks();
            this.set('tracks', tracks);

            this._logger.info('Tracks loaded', { count: tracks.length });

            return tracks;
        });
    }

    /**
     * Load tracks by artist
     * @param {string} artist - Artist name
     * @returns {Promise<Music[]>} Tracks by artist
     */
    async loadTracksByArtist(artist) {
        return this.executeAsync(async () => {
            const tracks = await this._musicManagementService.getTracksByArtist(artist);
            this.set('tracks', tracks);
            this.set('filterArtist', artist);

            this._logger.info('Tracks loaded by artist', { artist, count: tracks.length });

            return tracks;
        });
    }

    /**
     * Load tracks by rating
     * @param {number} minRating - Minimum rating (0-5)
     * @returns {Promise<Music[]>} Tracks with rating >= minRating
     */
    async loadTracksByRating(minRating) {
        return this.executeAsync(async () => {
            const tracks = await this._musicManagementService.getTracksByRating(minRating);
            this.set('tracks', tracks);
            this.set('minRating', minRating);

            this._logger.info('Tracks loaded by rating', { minRating, count: tracks.length });

            return tracks;
        });
    }

    /**
     * Search tracks
     * @param {string} query - Search query
     * @returns {Promise<Music[]>} Matching tracks
     */
    async searchTracks(query) {
        return this.executeAsync(async () => {
            const tracks = await this._musicManagementService.searchTracks(query);
            this.set('tracks', tracks);
            this.set('searchQuery', query);

            this._logger.info('Tracks searched', { query, count: tracks.length });

            return tracks;
        });
    }

    /**
     * Load recently played tracks
     * @param {number} limit - Maximum number of tracks
     * @returns {Promise<Music[]>} Recently played tracks
     */
    async loadRecentlyPlayed(limit = 10) {
        return this.executeAsync(async () => {
            const tracks = await this._musicManagementService.getRecentlyPlayed(limit);
            this.set('tracks', tracks);

            this._logger.info('Recently played tracks loaded', { count: tracks.length });

            return tracks;
        });
    }

    /**
     * Load top rated tracks
     * @param {number} limit - Maximum number of tracks
     * @returns {Promise<Music[]>} Top rated tracks
     */
    async loadTopRated(limit = 10) {
        return this.executeAsync(async () => {
            const tracks = await this._musicManagementService.getTopRated(limit);
            this.set('tracks', tracks);

            this._logger.info('Top rated tracks loaded', { count: tracks.length });

            return tracks;
        });
    }

    /**
     * Select a track
     * @param {Music|null} track - Track to select
     */
    selectTrack(track) {
        this.set('selectedTrack', track);
        this._logger.debug('Track selected', {
            title: track ? track.getTitle() : null
        });
    }

    /**
     * Play track
     * @param {Music} track - Track to play
     * @returns {Promise<Music>} Updated track
     */
    async playTrack(track) {
        return this.executeAsync(async () => {
            const updated = await this._musicManagementService.playTrack(track.getId());

            // Update in tracks list
            this._updateTrackInList(updated);

            // Set as currently playing
            this.set('currentlyPlaying', updated);

            // Update selected track if it's the same
            if (this.get('selectedTrack')?.getId() === track.getId()) {
                this.set('selectedTrack', updated);
            }

            this._logger.info('Track played', {
                title: updated.getTitle(),
                playCount: updated.getPlayCount()
            });

            this._emit('track:played', { track: updated });

            return updated;
        });
    }

    /**
     * Stop playback
     */
    stopPlayback() {
        this.set('currentlyPlaying', null);
        this._logger.debug('Playback stopped');
        this._emit('track:stopped');
    }

    /**
     * Rate track
     * @param {Music} track - Track to rate
     * @param {number} rating - Rating (0-5)
     * @returns {Promise<Music>} Updated track
     */
    async rateTrack(track, rating) {
        return this.executeAsync(async () => {
            const updated = await this._musicManagementService.rateTrack(track.getId(), rating);

            // Update in tracks list
            this._updateTrackInList(updated);

            // Update selected track if it's the same
            if (this.get('selectedTrack')?.getId() === track.getId()) {
                this.set('selectedTrack', updated);
            }

            this._logger.info('Track rated', {
                title: updated.getTitle(),
                rating
            });

            this._emit('track:rated', { track: updated, rating });

            return updated;
        });
    }

    /**
     * Create new track
     * @param {object} data - Track data
     * @returns {Promise<Music>} Created track
     */
    async createTrack(data) {
        return this.executeAsync(async () => {
            const track = await this._musicManagementService.createTrack(data);

            // Add to tracks list
            const tracks = this.get('tracks');
            this.set('tracks', [...tracks, track]);

            this._logger.info('Track created', { title: track.getTitle() });

            return track;
        });
    }

    /**
     * Update track
     * @param {string} id - Track ID
     * @param {object} updates - Updates to apply
     * @returns {Promise<Music>} Updated track
     */
    async updateTrack(id, updates) {
        return this.executeAsync(async () => {
            const updated = await this._musicManagementService.updateTrack(id, updates);

            // Update in tracks list
            this._updateTrackInList(updated);

            // Update selected track if it's the same
            if (this.get('selectedTrack')?.getId() === id) {
                this.set('selectedTrack', updated);
            }

            this._logger.info('Track updated', { title: updated.getTitle() });

            return updated;
        });
    }

    /**
     * Delete track
     * @param {string} id - Track ID
     * @returns {Promise<void>}
     */
    async deleteTrack(id) {
        return this.executeAsync(async () => {
            await this._musicManagementService.deleteTrack(id);

            // Remove from tracks list
            const tracks = this.get('tracks').filter(t => t.getId() !== id);
            this.set('tracks', tracks);

            // Clear selection if deleted
            if (this.get('selectedTrack')?.getId() === id) {
                this.set('selectedTrack', null);
            }

            // Stop playback if deleted
            if (this.get('currentlyPlaying')?.getId() === id) {
                this.stopPlayback();
            }

            this._logger.info('Track deleted', { id });
        });
    }

    /**
     * Set filter artist
     * @param {string|null} artist - Artist to filter by
     */
    setFilterArtist(artist) {
        this.set('filterArtist', artist);
        this._logger.debug('Filter artist changed', { artist });
    }

    /**
     * Set filter (generic filter setter for backward compatibility)
     * @param {string} filterType - Filter type (artist, rating, etc.)
     * @param {any} value - Filter value
     */
    setFilter(filterType, value) {
        if (filterType === 'artist') {
            this.setFilterArtist(value);
        } else if (filterType === 'rating') {
            this.setMinRating(value);
        } else if (filterType === 'type') {
            this.setFilterType(value);
        } else if (filterType === 'search') {
            this.setSearchQuery(value);
        } else {
            this._logger.warn(`Unknown filter type: ${filterType}`);
        }
    }

    /**
     * Set filter type
     * @param {string|null} type - Track type to filter by
     */
    setFilterType(type) {
        this.set('filterType', type);
        this._logger.debug('Filter type changed', { type });
    }

    /**
     * Set search query
     * @param {string} query - Search query
     */
    setSearchQuery(query) {
        this.set('searchQuery', query || '');
        this._logger.debug('Search query changed', { query });
    }

    /**
     * Set minimum rating filter
     * @param {number|null} rating - Minimum rating
     */
    setMinRating(rating) {
        this.set('minRating', rating);
        this._logger.debug('Min rating filter changed', { rating });
    }

    /**
     * Set sort order
     * @param {string} sortBy - Sort field (title, rating, playCount, etc.)
     */
    setSortBy(sortBy) {
        this.set('sortBy', sortBy);
        this._logger.debug('Sort order changed', { sortBy });
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.set('filterArtist', null);
        this.set('filterType', null);
        this.set('minRating', null);
        this.set('searchQuery', '');
        this._logger.debug('Filters cleared');
    }

    /**
     * Get filtered tracks based on current filter settings
     * @returns {Music[]} Filtered tracks
     * @private
     */
    _getFilteredTracks() {
        let tracks = this.get('tracks') || [];
        const filterArtist = this.get('filterArtist');
        const filterType = this.get('filterType');
        const minRating = this.get('minRating');
        const searchQuery = this.get('searchQuery');
        const sortBy = this.get('sortBy');

        // Apply search filter
        if (searchQuery && searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim();
            tracks = tracks.filter(track => {
                const title = track.getTitle?.()?.toLowerCase() || '';
                const artist = track.getArtist?.()?.toLowerCase() || '';
                return title.includes(query) || artist.includes(query);
            });
        }

        // Apply artist filter
        if (filterArtist) {
            const context = StrategyFactory.createArtistTracksContext(filterArtist);
            tracks = context.apply(tracks);
        }

        // Apply type filter
        if (filterType && filterType !== 'all') {
            tracks = tracks.filter(track => {
                const trackType = track.getType?.() || track.type;
                return trackType === filterType;
            });
        }

        // Apply rating filter
        if (minRating !== null) {
            const context = StrategyFactory.createTopRatedTracksContext(minRating);
            tracks = context.apply(tracks);
        }

        // Apply sorting
        if (sortBy === 'rating') {
            const context = StrategyFactory.createTopRatedTracksContext(0);
            tracks = context.apply(tracks);
        } else if (sortBy === 'playCount') {
            const context = StrategyFactory.createMostPlayedContext();
            tracks = context.apply(tracks);
        } else if (sortBy === 'lastPlayed') {
            const context = StrategyFactory.createRecentlyPlayedContext();
            tracks = context.apply(tracks);
        } else {
            // Default title sort
            tracks = tracks.sort((a, b) => {
                const titleA = a.getTitle?.() || '';
                const titleB = b.getTitle?.() || '';
                return titleA.localeCompare(titleB);
            });
        }

        return tracks;
    }

    /**
     * Update track in tracks list
     * @param {Music} updatedTrack - Updated track
     * @private
     */
    _updateTrackInList(updatedTrack) {
        const tracks = this.get('tracks');
        const index = tracks.findIndex(t => t.getId() === updatedTrack.getId());

        if (index > -1) {
            tracks[index] = updatedTrack;
            this.set('tracks', [...tracks]);
        }
    }

    /**
     * Validate view model state
     * @returns {boolean} True if valid
     */
    validate() {
        this.clearErrors();

        const minRating = this.get('minRating');
        if (minRating !== null && (minRating < 0 || minRating > 5)) {
            this.addError(`Invalid rating: ${minRating}. Must be 0-5.`);
            return false;
        }

        const sortBy = this.get('sortBy');
        const validSorts = ['title', 'rating', 'playCount', 'lastPlayed'];
        if (sortBy && !validSorts.includes(sortBy)) {
            this.addError(`Invalid sort field: ${sortBy}`);
            return false;
        }

        return true;
    }

    /**
     * Export view model state
     * @returns {object} Serializable state
     */
    export() {
        const baseExport = super.export();

        return {
            ...baseExport,
            selectedTrackId: this.get('selectedTrack')?.getId() || null,
            currentlyPlayingId: this.get('currentlyPlaying')?.getId() || null
        };
    }

    /**
     * Import view model state
     * @param {object} data - Exported state
     */
    async import(data) {
        super.import(data);

        // Restore selected track if ID is provided
        if (data.selectedTrackId) {
            const track = await this._musicManagementService.getTrackById(data.selectedTrackId);
            if (track) {
                this.selectTrack(track);
            }
        }

        // Restore currently playing if ID is provided
        if (data.currentlyPlayingId) {
            const track = await this._musicManagementService.getTrackById(data.currentlyPlayingId);
            if (track) {
                this.set('currentlyPlaying', track);
            }
        }
    }
}
