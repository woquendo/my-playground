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

        this._showCards = new Map();
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
            const shows = schedule[day] || [];

            if (shows.length > 0) {
                const isFutureSeason = /^(Winter|Spring|Summer|Fall) \d{4}$/.test(day);
                const isFutureUnscheduled = isFutureSeason || day === 'Airing Date Not Yet Scheduled';

                // Regular headers (no longer clickable - tabs handle season filtering)
                const headerElement = `<h2 class="schedule-grid__day-header">${day}${isFutureSeason ? ` <span class="season-count">(${shows.length})</span>` : ''}</h2>`;

                gridHTML += `
                    <div class="schedule-grid__day ${isFutureSeason ? 'schedule-grid__day--future' : ''} ${isFutureUnscheduled ? 'schedule-grid__day--future-unscheduled' : ''}" data-day="${day}">
                        ${headerElement}
                        <div class="schedule-grid__day-content" data-day-content="${day}">
                            ${shows.map(item => {
                    const show = item.show || item;
                    return `<div data-show-container="${show.getId()}" data-air-time="${item.airTime || ''}"></div>`;
                }).join('')}
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

        // Create show cards for each show
        Object.entries(schedule).forEach(([day, shows]) => {
            shows.forEach(item => {
                const show = item.show || item;
                const container = this._querySelector(`[data-show-container="${show.getId()}"]`);

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
                        logger: this._logger
                    });

                    showCard.mount();
                    this._addChild(showCard);
                    this._showCards.set(show.getId(), showCard);
                }
            });
        });
    }

    /**
     * Update schedule data
     * @param {object} schedule - New schedule
     */
    updateSchedule(schedule) {
        this.update({ schedule });
    }

    /**
     * Update specific show in schedule
     * @param {Show} updatedShow - Updated show
     */
    updateShow(updatedShow) {
        const showCard = this._showCards.get(updatedShow.getId());
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
}
