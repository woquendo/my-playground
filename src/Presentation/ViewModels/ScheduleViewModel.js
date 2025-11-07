/**
 * Schedule View Model
 * Manages schedule display, filtering, and show management operations.
 * Coordinates between UI and ShowManagementService/ScheduleService.
 */

import { BaseViewModel } from './BaseViewModel.js';
import { StrategyFactory, TitleSortStrategy } from '../../Application/Strategies/index.js';

export class ScheduleViewModel extends BaseViewModel {
    /**
     * Create a schedule view model
     * @param {object} options - Configuration options
     * @param {ShowManagementService} options.showManagementService - Show management service
     * @param {ScheduleService} options.scheduleService - Schedule service
     * @param {CommandBus} options.commandBus - Command bus for operations
     * @param {QueryBus} options.queryBus - Query bus for queries
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger
     */
    constructor(options) {
        super({
            ...options,
            name: 'Schedule'
        });

        this._showManagementService = options.showManagementService;
        this._scheduleService = options.scheduleService;
        this._commandBus = options.commandBus;
        this._queryBus = options.queryBus;

        if (!this._showManagementService) {
            throw new Error('ShowManagementService is required');
        }
        if (!this._scheduleService) {
            throw new Error('ScheduleService is required');
        }
    }

    /**
     * Initialize the view model
     * @protected
     */
    _initialize() {
        // Initialize state
        this.set('schedule', {}, true);
        this.set('shows', [], true);
        this.set('selectedShow', null, true);
        this.set('filterStatus', 'watching', true);
        this.set('sortBy', 'airDay', true);
        this.set('weekStart', new Date(), true);
        this.set('behindOnly', false, true);

        // Define computed properties
        this.defineComputed('filteredShows', () => {
            return this._getFilteredShows();
        });

        this.defineComputed('showCount', () => {
            return this.get('shows').length;
        });

        this.defineComputed('behindCount', () => {
            const shows = this.get('shows');
            return shows.filter(show => show.getEpisodesBehind() > 0).length;
        });

        this.defineComputed('completedCount', () => {
            const shows = this.get('shows');
            return shows.filter(show =>
                show.getStatusObject().isCompleted()
            ).length;
        });
    }

    /**
     * Load weekly schedule
     * @param {object} options - Schedule options
     * @returns {Promise<object>} Weekly schedule grouped by day
     */
    async loadSchedule(options = {}) {
        return this.executeAsync(async () => {
            const weekStart = options.weekStart || this.get('weekStart');
            const statuses = options.statuses || [this.get('filterStatus')];

            const schedule = await this._scheduleService.getWeeklySchedule({
                weekStart,
                statuses
            });

            this.set('schedule', schedule);
            this.set('weekStart', weekStart);

            this._logger.info('Schedule loaded', {
                days: Object.keys(schedule).length,
                weekStart
            });

            return schedule;
        });
    }

    /**
     * Load all shows
     * @returns {Promise<Show[]>} All shows
     */
    async loadShows() {
        return this.executeAsync(async () => {
            const shows = await this._showManagementService.getAllShows();
            this.set('shows', shows);

            this._logger.info('Shows loaded', { count: shows.length });

            return shows;
        });
    }

    /**
     * Load shows by status
     * @param {string} status - Show status
     * @returns {Promise<Show[]>} Filtered shows
     */
    async loadShowsByStatus(status) {
        return this.executeAsync(async () => {
            const shows = await this._showManagementService.getShowsByStatus(status);
            this.set('shows', shows);
            this.set('filterStatus', status);

            this._logger.info('Shows loaded by status', { status, count: shows.length });

            return shows;
        });
    }

    /**
     * Load currently airing shows
     * @returns {Promise<Show[]>} Currently airing shows
     */
    async loadCurrentlyAiring() {
        return this.executeAsync(async () => {
            const shows = await this._showManagementService.getCurrentlyAiringShows();
            this.set('shows', shows);

            this._logger.info('Currently airing shows loaded', { count: shows.length });

            return shows;
        });
    }

    /**
     * Search shows
     * @param {string} query - Search query
     * @returns {Promise<Show[]>} Matching shows
     */
    async searchShows(query) {
        return this.executeAsync(async () => {
            const shows = await this._showManagementService.searchShows(query);
            this.set('shows', shows);

            this._logger.info('Shows searched', { query, count: shows.length });

            return shows;
        });
    }

    /**
     * Select a show
     * @param {Show|null} show - Show to select
     */
    selectShow(show) {
        this.set('selectedShow', show);
        this._logger.debug('Show selected', {
            title: show ? show.getTitle() : null
        });
    }

    /**
     * Progress episode for selected show
     * @returns {Promise<Show>} Updated show
     */
    async progressEpisode() {
        const show = this.get('selectedShow');
        if (!show) {
            throw new Error('No show selected');
        }

        return this.executeAsync(async () => {
            const updated = await this._showManagementService.progressEpisode(show.getId());

            // Update in shows list
            this._updateShowInList(updated);

            // Update selected show
            this.set('selectedShow', updated);

            this._logger.info('Episode progressed', {
                title: updated.getTitle(),
                episode: updated.getCurrentEpisode()
            });

            return updated;
        });
    }

    /**
     * Update show status
     * @param {Show} show - Show to update
     * @param {string} status - New status
     * @returns {Promise<Show>} Updated show
     */
    async updateShowStatus(show, status) {
        return this.executeAsync(async () => {
            const updated = await this._showManagementService.updateStatus(show.getId(), status);

            // Update in shows list
            this._updateShowInList(updated);

            // Update selected show if it's the same
            if (this.get('selectedShow')?.getId() === show.getId()) {
                this.set('selectedShow', updated);
            }

            this._logger.info('Show status updated', {
                title: updated.getTitle(),
                status
            });

            return updated;
        });
    }

    /**
     * Create new show
     * @param {object} data - Show data
     * @returns {Promise<Show>} Created show
     */
    async createShow(data) {
        return this.executeAsync(async () => {
            const show = await this._showManagementService.createShow(data);

            // Add to shows list
            const shows = this.get('shows');
            this.set('shows', [...shows, show]);

            this._logger.info('Show created', { title: show.getTitle() });

            return show;
        });
    }

    /**
     * Update show
     * @param {string} id - Show ID
     * @param {object} updates - Updates to apply
     * @returns {Promise<Show>} Updated show
     */
    async updateShow(id, updates) {
        return this.executeAsync(async () => {
            const updated = await this._showManagementService.updateShow(id, updates);

            // Update in shows list
            this._updateShowInList(updated);

            // Update selected show if it's the same
            if (this.get('selectedShow')?.getId() === id) {
                this.set('selectedShow', updated);
            }

            this._logger.info('Show updated', { title: updated.getTitle() });

            return updated;
        });
    }

    /**
     * Delete show
     * @param {string} id - Show ID
     * @returns {Promise<void>}
     */
    async deleteShow(id) {
        return this.executeAsync(async () => {
            await this._showManagementService.deleteShow(id);

            // Remove from shows list
            const shows = this.get('shows').filter(s => s.getId() !== id);
            this.set('shows', shows);

            // Clear selection if deleted
            if (this.get('selectedShow')?.getId() === id) {
                this.set('selectedShow', null);
            }

            this._logger.info('Show deleted', { id });
        });
    }

    /**
     * Set filter status
     * @param {string} status - Status to filter by
     */
    setFilterStatus(status) {
        this.set('filterStatus', status);
        this._logger.debug('Filter status changed', { status });
    }

    /**
     * Set filter (alias for setFilterStatus for backward compatibility)
     * @param {string} status - Status to filter by
     */
    setFilter(status) {
        this.setFilterStatus(status);
    }

    /**
     * Set sort order
     * @param {string} sortBy - Sort field (airDay, title, etc.)
     */
    setSortBy(sortBy) {
        this.set('sortBy', sortBy);
        this._logger.debug('Sort order changed', { sortBy });
    }

    /**
     * Toggle behind-only filter
     */
    toggleBehindOnly() {
        const current = this.get('behindOnly');
        this.set('behindOnly', !current);
        this._logger.debug('Behind-only filter toggled', { enabled: !current });
    }

    /**
     * Get shows behind schedule
     * @returns {Promise<Show[]>} Shows behind schedule
     */
    async getShowsBehind() {
        return this.executeAsync(async () => {
            const shows = await this._scheduleService.getShowsBehind();

            this._logger.info('Shows behind schedule retrieved', {
                count: shows.length
            });

            return shows;
        });
    }

    /**
     * Detect new episodes
     * @returns {Promise<Show[]>} Shows with new episodes
     */
    async detectNewEpisodes() {
        return this.executeAsync(async () => {
            const shows = await this._scheduleService.detectNewEpisodes();

            this._logger.info('New episodes detected', { count: shows.length });

            return shows;
        });
    }

    /**
     * Get filtered shows based on current filter settings
     * @returns {Show[]} Filtered shows
     * @private
     */
    _getFilteredShows() {
        let shows = this.get('shows') || [];
        const filterStatus = this.get('filterStatus');
        const behindOnly = this.get('behindOnly');
        const sortBy = this.get('sortBy');

        // Apply status filter
        if (filterStatus && filterStatus !== 'all') {
            const context = filterStatus === 'watching'
                ? StrategyFactory.createAiringShowsContext()
                : filterStatus === 'completed'
                    ? StrategyFactory.createCompletedShowsContext()
                    : null;

            if (context) {
                shows = context.apply(shows);
            }
        }

        // Apply behind filter
        if (behindOnly) {
            const context = StrategyFactory.createBehindScheduleContext();
            shows = context.apply(shows);
        }

        // Apply sorting
        if (sortBy === 'airDay') {
            const context = StrategyFactory.createAiringShowsContext();
            shows = context.apply(shows);
        } else if (sortBy === 'title') {
            const sortStrategy = new TitleSortStrategy();
            shows = sortStrategy.sort(shows);
        }

        return shows;
    }

    /**
     * Update show in shows list
     * @param {Show} updatedShow - Updated show
     * @private
     */
    _updateShowInList(updatedShow) {
        const shows = this.get('shows');
        const index = shows.findIndex(s => s.getId() === updatedShow.getId());

        if (index > -1) {
            shows[index] = updatedShow;
            this.set('shows', [...shows]);
        }
    }

    /**
     * Validate view model state
     * @returns {boolean} True if valid
     */
    validate() {
        this.clearErrors();

        const filterStatus = this.get('filterStatus');
        const validStatuses = ['all', 'watching', 'completed', 'dropped', 'on_hold', 'plan_to_watch'];

        if (filterStatus && !validStatuses.includes(filterStatus)) {
            this.addError(`Invalid filter status: ${filterStatus}`);
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
            selectedShowId: this.get('selectedShow')?.getId() || null
        };
    }

    /**
     * Import view model state
     * @param {object} data - Exported state
     */
    async import(data) {
        super.import(data);

        // Restore selected show if ID is provided
        if (data.selectedShowId) {
            const show = await this._showManagementService.getShowById(data.selectedShowId);
            if (show) {
                this.selectShow(show);
            }
        }
    }
}
