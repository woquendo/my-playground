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
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
                gridHTML += `
                    <div class="schedule-grid__day" data-day="${day}">
                        <h2 class="schedule-grid__day-header">${day}</h2>
                        <div class="schedule-grid__day-content" data-day-content="${day}">
                            ${shows.map(item => {
                    const show = item.show || item;
                    return `<div data-show-container="${show.getId()}"></div>`;
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
                    const showCard = new ShowCard({
                        container,
                        show,
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
