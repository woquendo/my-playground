/**
 * SchedulePage.js
 * Schedule page controller - displays anime airing schedule
 */

import { PageHeader } from '../Components/PageHeader.js';

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
        this.pageHeader = new PageHeader();
        this.searchQuery = ''; // Track search query for filtering
        this.sortBy = 'airing'; // Track sort criteria
    }

    /**
     * Render the schedule page
     * @returns {Promise<HTMLElement>} Page element
     */
    async render() {
        this.logger.info('Rendering schedule page');

        // Reset filter status to default (active = watching + plan to watch)
        this.viewModel.setFilterStatus(['watching', 'plan_to_watch']);

        const page = document.createElement('div');
        page.className = 'page page--schedule';

        // Render page header
        const headerHTML = this.pageHeader.render({
            title: 'Anime Schedule',
            subtitle: 'Your weekly anime viewing schedule',
            icon: '📅',
            actions: [
                {
                    type: 'search',
                    id: 'schedule-search',
                    placeholder: 'Search shows...'
                },
                {
                    type: 'select',
                    id: 'schedule-status-filter',
                    label: 'Status:',
                    options: [
                        { value: 'all', label: 'All Status' },
                        { value: 'active', label: 'Active (Watching + Plan to Watch)', selected: true },
                        { value: 'watching', label: 'Watching' },
                        { value: 'plan_to_watch', label: 'Plan to Watch' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'on_hold', label: 'On Hold' },
                        { value: 'dropped', label: 'Dropped' }
                    ]
                },
                {
                    type: 'select',
                    id: 'schedule-sort',
                    label: 'Sort:',
                    options: [
                        { value: 'airing', label: 'By Airing Time', selected: true },
                        { value: 'title', label: 'By Title' },
                        { value: 'progress', label: 'By Progress' }
                    ]
                }
            ]
        });

        page.innerHTML = `
            ${headerHTML}
            <div id="day-navigation-container"></div>
            <div id="season-tabs-container"></div>
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
            const dayNavContainer = this.element.querySelector('#day-navigation-container');
            const seasonTabsContainer = this.element.querySelector('#season-tabs-container');
            if (!container) return;

            // Show loading state
            container.innerHTML = '<div class="loading">Loading schedule...</div>';

            // Get schedule data from ViewModel
            const fullSchedule = await this.viewModel.loadSchedule();
            const selectedDay = this.viewModel.get('selectedDay');

            // Render day navigation (or update if exists)
            if (dayNavContainer) {
                if (!this.dayNavigation) {
                    // First time - create component
                    const { DayNavigation } = await import('../Components/DayNavigation.js');
                    const dayNav = new DayNavigation({
                        container: dayNavContainer,
                        selectedDay: selectedDay,
                        schedule: fullSchedule,
                        onDayChange: (day) => this.handleDayChange(day),
                        eventBus: this.eventBus,
                        logger: this.logger
                    });
                    dayNavContainer.innerHTML = '';
                    dayNav.mount();
                    this.dayNavigation = dayNav;
                } else {
                    // Update existing component reactively (no re-render)
                    this.dayNavigation.updateSchedule(fullSchedule, selectedDay);
                }
            }

            // Handle season tabs for future & unscheduled filter
            if (seasonTabsContainer) {
                if (selectedDay === 'future-unscheduled') {
                    // Show season tabs
                    if (!this.seasonTabs) {
                        const { SeasonTabs } = await import('../Components/SeasonTabs.js');

                        // Get default season (first with unaired shows)
                        const defaultSeason = SeasonTabs.getDefaultSeason(fullSchedule);
                        this.selectedSeason = defaultSeason;

                        this.seasonTabs = new SeasonTabs({
                            container: seasonTabsContainer,
                            selectedSeason: this.selectedSeason,
                            schedule: fullSchedule,
                            onSeasonChange: (season) => this.handleSeasonChange(season),
                            eventBus: this.eventBus,
                            logger: this.logger
                        });
                        seasonTabsContainer.innerHTML = '';
                        this.seasonTabs.mount();
                    } else {
                        // Reset to default season if not set or invalid
                        if (!this.selectedSeason) {
                            const { SeasonTabs } = await import('../Components/SeasonTabs.js');
                            this.selectedSeason = SeasonTabs.getDefaultSeason(fullSchedule);
                        }
                        // Update existing season tabs
                        this.seasonTabs.updateSchedule(fullSchedule, this.selectedSeason);
                    }
                    seasonTabsContainer.style.display = 'block';
                } else {
                    // Hide season tabs but don't reset selectedSeason yet (will reset on day change)
                    if (seasonTabsContainer) {
                        seasonTabsContainer.style.display = 'none';
                    }
                }
            }

            // Filter schedule by selected day/season
            let schedule;
            if (selectedDay === 'future-unscheduled' && this.selectedSeason) {
                // Show only the selected season
                schedule = {
                    [this.selectedSeason]: fullSchedule[this.selectedSeason] || []
                };
            } else {
                // Normal day filtering
                schedule = this.filterScheduleByDay(fullSchedule, selectedDay);
            }

            // Apply search and sort filters
            schedule = this.applySearchAndSort(schedule);

            // Check if schedule has any shows
            const showCount = Object.values(schedule).reduce((sum, day) => sum + day.length, 0);

            if (showCount === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No shows for ${selectedDay === 'all' ? 'any day' : selectedDay}.</p>
                        <p>${selectedDay === 'all' ? 'Add shows to start tracking your anime!' : 'Try selecting a different day or status filter.'}</p>
                        ${selectedDay === 'all' ? '<a href="/import" class="btn btn--primary">Import Shows</a>' : ''}
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
                onUpdateAirDate: (show, date) => this.handleUpdateAirDate(show, date),
                onSkipWeek: (show) => this.handleSkipWeek(show),
                eventBus: this.eventBus,
                logger: this.logger
            });

            container.innerHTML = '';
            scheduleGrid.mount();

            // Listen for season selection events (from clickable headers, if any)
            scheduleGrid.on('season-selected', ({ season }) => {
                this.handleSeasonClick(season);
            });

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
     * Filter schedule by selected day
     * @param {object} fullSchedule - Full schedule with all days
     * @param {string} selectedDay - Selected day filter
     * @returns {object} Filtered schedule
     */
    filterScheduleByDay(fullSchedule, selectedDay) {
        if (selectedDay === 'all') {
            return fullSchedule;
        }

        if (selectedDay === 'future-unscheduled') {
            // Include all future seasons and unscheduled shows
            const filtered = {};

            Object.keys(fullSchedule).forEach(key => {
                // Include future seasons (Winter YYYY, Spring YYYY, etc.)
                const isFutureSeason = /^(Winter|Spring|Summer|Fall) \d{4}$/.test(key);
                // Include unscheduled shows
                const isUnscheduled = key === 'Airing Date Not Yet Scheduled';

                if (isFutureSeason || isUnscheduled) {
                    filtered[key] = fullSchedule[key];
                }
            });

            return filtered;
        }

        // Check if it's a specific season (e.g., "Winter 2026")
        const isSeason = /^(Winter|Spring|Summer|Fall) \d{4}$/.test(selectedDay);
        if (isSeason && fullSchedule[selectedDay]) {
            return {
                [selectedDay]: fullSchedule[selectedDay]
            };
        }

        // Return only the selected day
        return {
            [selectedDay]: fullSchedule[selectedDay] || []
        };
    }

    /**
     * Apply search and sort filters to schedule
     * @param {object} schedule - Schedule to filter
     * @returns {object} Filtered and sorted schedule
     */
    applySearchAndSort(schedule) {
        let filteredSchedule = { ...schedule };

        // Apply search filter if query exists
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filteredSchedule = {};

            this.logger.info('🔍 Applying search filter:', { query, searchQuery: this.searchQuery });

            Object.keys(schedule).forEach(key => {
                const filteredShows = schedule[key].filter(item => {
                    // Schedule items have a 'show' property containing the Show domain object
                    const show = item.show || item;

                    // Get titles - handle both Show objects and plain objects
                    const englishTitle = show.titleEnglish ||
                        (typeof show.getPrimaryTitle === 'function' ? show.getPrimaryTitle() : null);
                    const originalTitle = show.title ||
                        (typeof show.getTitle === 'function' ? show.getTitle() : null);

                    // Debug first show to see structure
                    if (schedule[key].indexOf(item) === 0) {
                        this.logger.info('📋 Sample show structure:', {
                            hasShowProperty: !!item.show,
                            englishTitle,
                            originalTitle,
                            hasGetPrimaryTitle: typeof show.getPrimaryTitle === 'function',
                            hasGetTitle: typeof show.getTitle === 'function',
                            showId: show.id || (typeof show.getId === 'function' ? show.getId() : undefined),
                            allItemKeys: Object.keys(item).slice(0, 10),
                            allShowKeys: Object.keys(show).slice(0, 20)
                        });
                    }

                    const matchesEnglish = englishTitle && englishTitle.toLowerCase().includes(query);
                    const matchesOriginal = originalTitle && originalTitle.toLowerCase().includes(query);

                    return matchesEnglish || matchesOriginal;
                });

                if (filteredShows.length > 0) {
                    filteredSchedule[key] = filteredShows;
                }
            });

            this.logger.info('✅ Search results:', {
                originalDays: Object.keys(schedule).length,
                filteredDays: Object.keys(filteredSchedule).length,
                originalShows: Object.values(schedule).reduce((sum, arr) => sum + arr.length, 0),
                filteredShows: Object.values(filteredSchedule).reduce((sum, arr) => sum + arr.length, 0)
            });
        }

        // Apply sorting
        if (this.sortBy && this.sortBy !== 'airing') {
            Object.keys(filteredSchedule).forEach(key => {
                const items = filteredSchedule[key];

                if (this.sortBy === 'title') {
                    // Sort alphabetically by primary title (English if available)
                    filteredSchedule[key] = [...items].sort((a, b) => {
                        // Items have a 'show' property containing the Show domain object
                        const showA = a.show || a;
                        const showB = b.show || b;

                        // Handle both Show objects and plain objects
                        const titleA = (showA.titleEnglish ||
                            (typeof showA.getPrimaryTitle === 'function' ? showA.getPrimaryTitle() : showA.title) ||
                            '').toLowerCase();
                        const titleB = (showB.titleEnglish ||
                            (typeof showB.getPrimaryTitle === 'function' ? showB.getPrimaryTitle() : showB.title) ||
                            '').toLowerCase();
                        return titleA.localeCompare(titleB);
                    });
                } else if (this.sortBy === 'progress') {
                    // Sort by episodes behind (most behind first)
                    filteredSchedule[key] = [...items].sort((a, b) => {
                        try {
                            const showA = a.show || a;
                            const showB = b.show || b;

                            const behindA = typeof showA.getEpisodesBehind === 'function' ? showA.getEpisodesBehind() : 0;
                            const behindB = typeof showB.getEpisodesBehind === 'function' ? showB.getEpisodesBehind() : 0;
                            return behindB - behindA; // Descending order
                        } catch (e) {
                            return 0;
                        }
                    });
                }
            });
        }

        return filteredSchedule;
    }

    /**
     * Handle season header click
     * @param {string} season - Season to filter by (e.g., "Winter 2026")
     */
    async handleSeasonClick(season) {
        this.logger.debug('Season clicked:', season);
        this.viewModel.setSelectedDay(season);
        await this.loadSchedule();
    }

    /**
     * Handle season tab change (from SeasonTabs component)
     * @param {string} season - Selected season
     */
    async handleSeasonChange(season) {
        this.logger.debug('Season tab changed:', season);
        this.selectedSeason = season;
        await this.loadSchedule();
    }

    /**
     * Handle day change
     * @param {string} day - Selected day
     */
    async handleDayChange(day) {
        this.logger.debug('Day filter changed:', day);
        this.viewModel.setSelectedDay(day);

        // Reset selected season when changing days
        this.selectedSeason = null;

        await this.loadSchedule();
    }

    /**
     * Handle search input
     * @param {string} query - Search query
     */
    async handleSearch(query) {
        this.logger.info('🔍 Search triggered:', { query, trimmed: query.trim() });
        this.searchQuery = query.trim();
        await this.loadSchedule();
    }

    /**
     * Handle status filter change
     * @param {string} status - Status filter value
     */
    async handleStatusFilter(status) {
        this.logger.debug('Filter status:', status);

        // Map filter values to status arrays
        let statuses;
        if (status === 'all') {
            statuses = 'all'; // Special value for all statuses
            this.viewModel.setFilterStatus('all');
        } else if (status === 'active') {
            statuses = ['watching', 'plan_to_watch'];
            this.viewModel.setFilterStatus(statuses);
        } else {
            statuses = [status];
            this.viewModel.setFilterStatus(status);
        }

        // Reload the schedule with the selected statuses (this will re-render the UI)
        await this.loadSchedule();
    }

    /**
     * Handle sort change
     * @param {string} sortBy - Sort criteria
     */
    handleSort(sortBy) {
        this.logger.debug('Sort by:', sortBy);
        this.sortBy = sortBy;
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
     * Handle air date update
     * @param {Show} show - Show to update
     * @param {Date} date - New air date
     */
    async handleUpdateAirDate(show, date) {
        try {
            this.logger.info('Updating air date for:', show.getTitle(), 'to:', date);
            await this.viewModel.updateShow(show.getId(), {
                airDate: date,
                startDate: date
            });
            // Reload schedule to show updated data
            await this.loadSchedule();
        } catch (error) {
            this.logger.error('Failed to update air date:', error);
            alert('Failed to update air date: ' + error.message);
        }
    }

    /**
     * Handle skip week
     * @param {Show} show - Show to skip week for
     */
    async handleSkipWeek(show) {
        try {
            this.logger.info('Skipping week for:', show.getTitle());

            // Get current air date and add 7 days
            const currentDate = show.getStartDate?.() || show.airDate || new Date();
            const nextWeek = new Date(currentDate);
            nextWeek.setDate(nextWeek.getDate() + 7);

            await this.viewModel.updateShow(show.getId(), {
                airDate: nextWeek,
                startDate: nextWeek
            });

            // Reload schedule to show updated data
            await this.loadSchedule();

            this.logger.info('Week skipped for:', show.getTitle());
        } catch (error) {
            this.logger.error('Failed to skip week:', error);
            alert('Failed to skip week: ' + error.message);
        }
    }

    /**
     * Destroy the page
     */
    async destroy() {
        this.logger.info('Destroying schedule page');
        // Cleanup if needed
    }
}
