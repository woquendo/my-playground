/**
 * Schedule Grid Component
 * Displays weekly schedule grouped by day with show cards.
 */

import { BaseComponent } from './BaseComponent.js';
import { ShowCard } from './ShowCard.js';

export class ScheduleGrid extends BaseComponent {
    /**
     * Create a schedule grid component
     * @param {object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {object} options.schedule - Schedule grouped by day { Monday: [...], Tuesday: [...] }
     * @param {function} options.onShowProgress - Callback for show progress
     * @param {function} options.onShowStatusChange - Callback for status change
     * @param {function} options.onShowSelect - Callback for show selection
     * @param {function} options.onUpdateAirDate - Callback for air date update
     * @param {function} options.onSkipWeek - Callback for skip week
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger
     * @param {Container} options.diContainer - DI container (optional)
     */
    constructor(options) {
        super({
            ...options,
            name: 'ScheduleGrid',
            props: {
                schedule: options.schedule || {},
                onShowProgress: options.onShowProgress || (() => { }),
                onShowStatusChange: options.onShowStatusChange || (() => { }),
                onShowSelect: options.onShowSelect || (() => { }),
                onUpdateAirDate: options.onUpdateAirDate || (() => { }),
                onSkipWeek: options.onSkipWeek || (() => { })
            }
        });

        this._diContainer = options.diContainer; // Store DI container
        this._showCards = new Map();

        // Pagination settings
        this._itemsPerPage = 20; // Shows to load per batch per day
        this._globalInitialLimit = 30; // Global limit for initial load (when showing all days)
        this._visibleCountPerDay = {}; // Track how many items are visible for each day
        this._intersectionObserver = null;
        this._loadMoreSentinels = new Map(); // Track sentinel elements for each day
    }

    /**
     * Get component template
     * @returns {string} HTML template
     * @protected
     */
    _template() {
        const schedule = this._props.schedule;

        // Define order: weekdays first, then future seasons, then special categories
        const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const specialCategories = ['Ended'];

        // Extract future season categories (they follow pattern "Season YYYY")
        const futureSeasons = Object.keys(schedule)
            .filter(key => /^(Winter|Spring|Summer|Fall) \d{4}$/.test(key))
            .sort((a, b) => {
                // Sort by year first, then by season order
                const [seasonA, yearA] = a.split(' ');
                const [seasonB, yearB] = b.split(' ');
                const seasonOrder = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };

                if (yearA !== yearB) {
                    return parseInt(yearA) - parseInt(yearB);
                }
                return seasonOrder[seasonA] - seasonOrder[seasonB];
            });

        const days = [...weekDays, ...futureSeasons, 'Airing Date Not Yet Scheduled', ...specialCategories];

        // Detect if we're showing multiple days (All Days view)
        const isShowingMultipleDays = Object.keys(schedule).length > 1;

        // Initialize visible counts with smart distribution for "All Days" view
        if (isShowingMultipleDays) {
            this._initializeGlobalPagination(schedule, days);
        } else {
            // Single day view - use per-day pagination
            Object.keys(schedule).forEach(day => {
                if (!this._visibleCountPerDay[day]) {
                    this._visibleCountPerDay[day] = Math.min(this._itemsPerPage, schedule[day].length);
                }
            });
        }

        if (Object.keys(schedule).length === 0) {
            return `
                <div class="schedule-grid schedule-grid--empty">
                    <div class="schedule-grid__empty-state">
                        <p class="empty-message">No shows scheduled</p>
                    </div>
                </div>
            `;
        }

        let gridHTML = '<div class="schedule-grid">';

        days.forEach(day => {
            const allShows = schedule[day] || [];

            if (allShows.length > 0) {
                const isFutureSeason = /^(Winter|Spring|Summer|Fall) \d{4}$/.test(day);
                const isFutureUnscheduled = isFutureSeason || day === 'Airing Date Not Yet Scheduled';

                // Get visible shows (paginated)
                const visibleCount = this._visibleCountPerDay[day] || this._itemsPerPage;
                const visibleShows = allShows.slice(0, visibleCount);
                const hasMore = visibleCount < allShows.length;

                // Regular headers (no longer clickable - tabs handle season filtering)
                const headerElement = `<h2 class="schedule-grid__day-header">${day}${isFutureSeason ? ` <span class="season-count">(${allShows.length})</span>` : ''}</h2>`;

                gridHTML += `
                    <div class="schedule-grid__day ${isFutureSeason ? 'schedule-grid__day--future' : ''} ${isFutureUnscheduled ? 'schedule-grid__day--future-unscheduled' : ''}" data-day="${day}">
                        ${headerElement}
                        <div class="schedule-grid__day-content" data-day-content="${day}">
                            ${visibleShows.map(item => {
                    const show = item.show || item;
                    const showId = typeof show.getId === 'function' ? show.getId() : show.id;
                    return `<div data-show-container="${showId}" data-air-time="${item.airTime || ''}"></div>`;
                }).join('')}
                            ${hasMore ? `
                                <div class="schedule-grid__load-more" data-load-more="${day}">
                                    <div class="load-more-sentinel" data-sentinel="${day}"></div>
                                    <p class="load-more-text">Showing ${visibleCount} of ${allShows.length} shows</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        });

        gridHTML += '</div>';

        return gridHTML;
    }

    /**
     * Initialize component
     * @protected
     */
    _initialize() {
        const schedule = this._props.schedule;

        // Clear existing show cards
        this._showCards.clear();
        this._loadMoreSentinels.clear();

        // Create show cards for VISIBLE shows only (paginated)
        Object.entries(schedule).forEach(([day, allShows]) => {
            const visibleCount = this._visibleCountPerDay[day] || this._itemsPerPage;
            const visibleShows = allShows.slice(0, visibleCount);

            visibleShows.forEach(item => {
                const show = item.show || item;
                const showId = typeof show.getId === 'function' ? show.getId() : show.id;
                const container = this._querySelector(`[data-show-container="${showId}"]`);

                if (container) {
                    // Pass airTime to ShowCard for future/unscheduled shows
                    const airTime = container.dataset.airTime || null;

                    const showCard = new ShowCard({
                        container,
                        show,
                        airTime,
                        onProgress: this._props.onShowProgress,
                        onStatusChange: this._props.onShowStatusChange,
                        onSelect: this._props.onShowSelect,
                        onUpdateAirDate: this._props.onUpdateAirDate,
                        onSkipWeek: this._props.onSkipWeek,
                        eventBus: this._eventBus,
                        logger: this._logger,
                        diContainer: this._diContainer // Pass DI container separately
                    });

                    showCard.mount();
                    this._addChild(showCard);
                    const showId = typeof show.getId === 'function' ? show.getId() : show.id;
                    this._showCards.set(showId, showCard);
                }
            });            // Track sentinel element for this day if it has more items
            if (visibleCount < allShows.length) {
                const sentinel = this._querySelector(`[data-sentinel="${day}"]`);
                if (sentinel) {
                    this._loadMoreSentinels.set(day, sentinel);
                }
            }
        });

        // Set up intersection observer for infinite scroll
        this._setupIntersectionObserver();
    }

    /**
     * Initialize pagination counts with global limit for "All Days" view.
     * Distributes _globalInitialLimit across all days proportionally.
     * Ensures each day gets at least a minimum number of shows.
     * @private
     */
    _initializeGlobalPagination(schedule, days) {
        // Count days with content
        const daysWithShows = days.filter(day => schedule[day] && schedule[day].length > 0);
        const dayCount = daysWithShows.length;

        if (dayCount === 0) return;

        // Calculate items per day, ensuring minimum 5 per day
        const minPerDay = 5;
        const idealPerDay = Math.max(minPerDay, Math.floor(this._globalInitialLimit / dayCount));

        // Initialize only days that aren't already set
        daysWithShows.forEach(day => {
            if (!this._visibleCountPerDay[day]) {
                this._visibleCountPerDay[day] = Math.min(idealPerDay, schedule[day].length);
            }
        });
    }

    /**
     * Set up intersection observer for infinite scroll
     * @private
     */
    _setupIntersectionObserver() {
        // Clean up existing observer
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
        }

        // Create new observer
        this._intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Find which day this sentinel belongs to
                        const sentinel = entry.target;
                        const day = sentinel.dataset.sentinel;
                        if (day) {
                            this._loadMoreForDay(day);
                        }
                    }
                });
            },
            {
                root: null, // viewport
                rootMargin: '200px', // Load 200px before reaching sentinel
                threshold: 0.1
            }
        );

        // Observe all sentinel elements
        this._loadMoreSentinels.forEach((sentinel, day) => {
            this._intersectionObserver.observe(sentinel);
        });
    }

    /**
     * Load more shows for a specific day
     * @param {string} day - Day to load more shows for
     * @private
     */
    _loadMoreForDay(day) {
        const schedule = this._props.schedule;
        const allShows = schedule[day] || [];
        const currentVisible = this._visibleCountPerDay[day] || this._itemsPerPage;

        // Check if there are more items to load
        if (currentVisible >= allShows.length) {
            return; // Already showing all items
        }

        this._logger?.info(`Loading more shows for ${day}: ${currentVisible} -> ${currentVisible + this._itemsPerPage}`);

        // Increase visible count
        const newVisibleCount = Math.min(currentVisible + this._itemsPerPage, allShows.length);
        this._visibleCountPerDay[day] = newVisibleCount;

        // Re-render to show more items
        this._reRenderDay(day);
    }

    /**
     * Re-render a specific day to show more items
     * @param {string} day - Day to re-render
     * @private
     */
    _reRenderDay(day) {
        const schedule = this._props.schedule;
        const allShows = schedule[day] || [];
        const visibleCount = this._visibleCountPerDay[day] || this._itemsPerPage;
        const dayContent = this._querySelector(`[data-day-content="${day}"]`);

        if (!dayContent) return;

        // Get the shows that need to be added
        const previousCount = visibleCount - this._itemsPerPage;
        const newShows = allShows.slice(previousCount, visibleCount);

        // Render new show cards
        newShows.forEach(item => {
            const show = item.show || item;
            const showId = typeof show.getId === 'function' ? show.getId() : show.id;

            // Create container for new show
            const showContainer = document.createElement('div');
            showContainer.setAttribute('data-show-container', showId);
            showContainer.setAttribute('data-air-time', item.airTime || '');

            // Find the load-more element and insert before it
            const loadMoreEl = dayContent.querySelector(`[data-load-more="${day}"]`);
            if (loadMoreEl) {
                dayContent.insertBefore(showContainer, loadMoreEl);
            } else {
                dayContent.appendChild(showContainer);
            }

            // Create and mount show card
            const showCard = new ShowCard({
                container: showContainer,
                show,
                airTime: item.airTime || null,
                onProgress: this._props.onShowProgress,
                onStatusChange: this._props.onShowStatusChange,
                onSelect: this._props.onShowSelect,
                onUpdateAirDate: this._props.onUpdateAirDate,
                onSkipWeek: this._props.onSkipWeek,
                eventBus: this._eventBus,
                logger: this._logger,
                diContainer: this._diContainer // Pass DI container
            });

            showCard.mount();
            this._addChild(showCard);
            this._showCards.set(showId, showCard);
        });

        // Update or remove load-more indicator
        const loadMoreEl = dayContent.querySelector(`[data-load-more="${day}"]`);
        if (loadMoreEl) {
            const hasMore = visibleCount < allShows.length;

            if (hasMore) {
                // Update text
                const loadMoreText = loadMoreEl.querySelector('.load-more-text');
                if (loadMoreText) {
                    loadMoreText.textContent = `Showing ${visibleCount} of ${allShows.length} shows`;
                }
            } else {
                // Remove load-more element
                loadMoreEl.remove();
                this._loadMoreSentinels.delete(day);
            }
        }
    }

    /**
     * Reset pagination (useful when filters change)
     */
    resetPagination() {
        this._visibleCountPerDay = {};
        Object.keys(this._props.schedule).forEach(day => {
            this._visibleCountPerDay[day] = this._itemsPerPage;
        });
    }

    /**
     * Update schedule data
     * @param {object} schedule - New schedule
     */
    updateSchedule(schedule) {
        // Reset pagination when schedule changes
        this.resetPagination();
        this.update({ schedule });
    }

    /**
     * Update specific show in schedule
     * @param {Show} updatedShow - Updated show
     */
    updateShow(updatedShow) {
        const showId = typeof updatedShow.getId === 'function' ? updatedShow.getId() : updatedShow.id;
        const showCard = this._showCards.get(showId);
        if (showCard) {
            showCard.updateShow(updatedShow);
        }
    }

    /**
     * Get show count
     * @returns {number} Total show count
     */
    getShowCount() {
        return this._showCards.size;
    }

    /**
     * Get shows for specific day
     * @param {string} day - Day name
     * @returns {Show[]} Shows for day
     */
    getShowsForDay(day) {
        return this._props.schedule[day] || [];
    }

    /**
     * Cleanup on unmount
     * @protected
     */
    _onUnmount() {
        // Disconnect intersection observer
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
            this._intersectionObserver = null;
        }

        // Clear maps
        this._showCards.clear();
        this._loadMoreSentinels.clear();
        this._visibleCountPerDay = {};
    }
}
