/**
 * SchedulePage.js
 * Schedule page controller - displays anime airing schedule
 */

export class SchedulePage {
    /**
     * @param {Object} dependencies - Page dependencies
     * @param {ScheduleViewModel} dependencies.viewModel - Schedule ViewModel
     * @param {EventBus} dependencies.eventBus - Event bus
     * @param {Logger} dependencies.logger - Logger instance
     * @param {Container} dependencies.container - DI container
     */
    constructor({ viewModel, eventBus, logger, container }) {
        this.viewModel = viewModel;
        this.eventBus = eventBus;
        this.logger = logger;
        this.container = container;
        this.element = null;
    }

    /**
     * Render the schedule page
     * @returns {Promise<HTMLElement>} Page element
     */
    async render() {
        this.logger.info('Rendering schedule page');

        const page = document.createElement('div');
        page.className = 'page page--schedule';
        page.innerHTML = `
            <div class="page__header">
                <h2 class="page__title">Anime Schedule</h2>
                <p class="page__subtitle">Your weekly anime viewing schedule</p>
            </div>
            <div class="page__filters">
                <div class="filters">
                    <input 
                        type="text" 
                        class="input" 
                        id="schedule-search" 
                        placeholder="Search shows..."
                        aria-label="Search shows"
                    />
                    <select class="input" id="schedule-status-filter" aria-label="Filter by status">
                        <option value="all">All Status</option>
                        <option value="watching" selected>Watching</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On Hold</option>
                        <option value="dropped">Dropped</option>
                        <option value="plan_to_watch">Plan to Watch</option>
                    </select>
                    <select class="input" id="schedule-sort" aria-label="Sort by">
                        <option value="airing">By Airing Time</option>
                        <option value="title">By Title</option>
                        <option value="progress">By Progress</option>
                    </select>
                </div>
            </div>
            <div class="page__content">
                <div id="schedule-grid-container"></div>
            </div>
        `;

        this.element = page;

        // Attach event listeners
        this.attachEventListeners(page);

        // Load and render schedule
        await this.loadSchedule();

        return page;
    }

    /**
     * Attach event listeners
     * @param {HTMLElement} element - Page element
     */
    attachEventListeners(element) {
        // Search input
        const searchInput = element.querySelector('#schedule-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Status filter
        const statusFilter = element.querySelector('#schedule-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.handleStatusFilter(e.target.value);
            });
        }

        // Sort selector
        const sortSelector = element.querySelector('#schedule-sort');
        if (sortSelector) {
            sortSelector.addEventListener('change', (e) => {
                this.handleSort(e.target.value);
            });
        }
    }

    /**
     * Load and render the schedule
     */
    async loadSchedule() {
        try {
            const container = this.element.querySelector('#schedule-grid-container');
            if (!container) return;

            // Show loading state
            container.innerHTML = '<div class="loading">Loading schedule...</div>';

            // Get schedule data from ViewModel
            const schedule = await this.viewModel.loadSchedule();

            // Check if schedule has any days with shows
            const showCount = Object.values(schedule).reduce((sum, day) => sum + day.length, 0);

            if (showCount === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No shows in your schedule.</p>
                        <p>Add shows to start tracking your anime!</p>
                        <a href="/import" class="btn btn--primary">Import Shows</a>
                    </div>
                `;
                return;
            }

            // Render schedule grid
            const { ScheduleGrid } = await import('../Components/ScheduleGrid.js');
            const scheduleGrid = new ScheduleGrid({
                container,
                schedule,
                onShowProgress: (show) => this.handleProgressEpisode(show),
                onShowStatusChange: (show, status) => this.handleStatusChange(show, status),
                onShowSelect: (show) => this.handleShowSelect(show),
                eventBus: this.eventBus,
                logger: this.logger
            });

            container.innerHTML = '';
            scheduleGrid.mount();

        } catch (error) {
            this.logger.error('Failed to load schedule:', error);
            const container = this.element.querySelector('#schedule-grid-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p>Failed to load schedule.</p>
                        <button class="btn btn--primary" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Handle search input
     * @param {string} query - Search query
     */
    handleSearch(query) {
        this.logger.debug('Search:', query);
        this.viewModel.setFilter('search', query);
        this.loadSchedule();
    }

    /**
     * Handle status filter change
     * @param {string} status - Status filter value
     */
    handleStatusFilter(status) {
        this.logger.debug('Filter status:', status);
        this.viewModel.setFilter(status);
        this.loadSchedule();
    }

    /**
     * Handle sort change
     * @param {string} sortBy - Sort criteria
     */
    handleSort(sortBy) {
        this.logger.debug('Sort by:', sortBy);
        this.viewModel.setSortBy(sortBy);
        this.loadSchedule();
    }

    /**
     * Handle show progress
     * @param {Show} show - Show to progress
     */
    async handleProgressEpisode(show) {
        try {
            this.logger.info('Progressing episode for:', show.getTitle());
            this.viewModel.selectShow(show);
            await this.viewModel.progressEpisode();
            // Reload schedule to show updated data
            await this.loadSchedule();
        } catch (error) {
            this.logger.error('Failed to progress episode:', error);
        }
    }

    /**
     * Handle status change
     * @param {Show} show - Show to update
     * @param {string} status - New status
     */
    async handleStatusChange(show, status) {
        try {
            this.logger.info('Changing status for:', show.getTitle(), 'to:', status);
            await this.viewModel.updateShowStatus(show, status);
            // Reload schedule to show updated data
            await this.loadSchedule();
        } catch (error) {
            this.logger.error('Failed to change status:', error);
        }
    }

    /**
     * Handle show selection
     * @param {Show} show - Selected show
     */
    handleShowSelect(show) {
        this.logger.info('Show selected:', show.getTitle());
        this.viewModel.selectShow(show);
        this.eventBus.emit('show:selected', { show });
    }

    /**
     * Destroy the page
     */
    async destroy() {
        this.logger.info('Destroying schedule page');
        // Cleanup if needed
    }
}
