/**
 * DayNavigation Component
 * Navigation component for filtering schedule by day of the week
 * Follows Single Responsibility Principle - only handles day selection UI
 */

import { BaseComponent } from './BaseComponent.js';

export class DayNavigation extends BaseComponent {
    /**
     * Create a day navigation component
     * @param {object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {string} options.selectedDay - Currently selected day
     * @param {object} options.schedule - Schedule data with day counts
     * @param {function} options.onDayChange - Callback when day is selected
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger
     */
    constructor(options) {
        super({
            ...options,
            name: 'DayNavigation',
            props: {
                selectedDay: options.selectedDay,
                schedule: options.schedule || {},
                onDayChange: options.onDayChange || (() => { })
            }
        });
    }

    /**
     * Get component template
     * @returns {string} HTML template
     * @protected
     */
    _template() {
        const days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];

        const schedule = this._props.schedule;
        const selectedDay = this._props.selectedDay;

        // Get future seasons and special categories
        const futureSeasons = Object.keys(schedule)
            .filter(key => /^(Winter|Spring|Summer|Fall) \d{4}$/.test(key))
            .sort((a, b) => {
                const [seasonA, yearA] = a.split(' ');
                const [seasonB, yearB] = b.split(' ');
                const seasonOrder = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };
                if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
                return seasonOrder[seasonA] - seasonOrder[seasonB];
            });

        const unscheduledCount = schedule['Airing Date Not Yet Scheduled']?.length || 0;
        const futureCount = futureSeasons.reduce((sum, season) => sum + (schedule[season]?.length || 0), 0);
        const totalFutureUnscheduled = unscheduledCount + futureCount;

        // Add "All Days" option at the beginning
        const allCount = Object.values(schedule).reduce((sum, shows) => sum + shows.length, 0);

        return `
            <div class="day-navigation">
                <div class="day-navigation__header">
                    <h3 class="day-navigation__title">Filter by Day</h3>
                </div>
                <div class="day-navigation__tabs">
                    <button 
                        class="day-tab ${selectedDay === 'all' ? 'day-tab--active' : ''}"
                        data-day="all"
                        aria-pressed="${selectedDay === 'all'}"
                    >
                        <span class="day-tab__label">All Days</span>
                        <span class="day-tab__count">${allCount}</span>
                    </button>
                    ${days.map(day => {
            const count = schedule[day]?.length || 0;
            const isActive = selectedDay === day;
            const isToday = this._isToday(day);

            return `
                            <button 
                                class="day-tab ${isActive ? 'day-tab--active' : ''} ${isToday ? 'day-tab--today' : ''}"
                                data-day="${day}"
                                aria-pressed="${isActive}"
                            >
                                <span class="day-tab__label">${this._formatDayLabel(day)}</span>
                                <span class="day-tab__count">${count}</span>
                            </button>
                        `;
        }).join('')}
                    <button 
                        class="day-tab day-tab--future ${selectedDay === 'future-unscheduled' ? 'day-tab--active' : ''}"
                        data-day="future-unscheduled"
                        aria-pressed="${selectedDay === 'future-unscheduled'}"
                    >
                        <span class="day-tab__label">
                            <span class="day-tab__text">Future & Unscheduled</span>
                        </span>
                        <span class="day-tab__count">${totalFutureUnscheduled}</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Initialize component
     * @protected
     */
    _initialize() {
        // Attach click handlers to day tabs
        const tabs = this._element.querySelectorAll('.day-tab');
        tabs.forEach(tab => {
            this._addEventListener(tab, 'click', () => {
                const day = tab.dataset.day;
                this._handleDayChange(day);
            });
        });
    }

    /**
     * Handle day change
     * @private
     * @param {string} day - Selected day
     */
    _handleDayChange(day) {
        // Update active state
        const tabs = this._element.querySelectorAll('.day-tab');
        tabs.forEach(tab => {
            const isActive = tab.dataset.day === day;
            tab.classList.toggle('day-tab--active', isActive);
            tab.setAttribute('aria-pressed', isActive);
        });

        // Notify parent
        this._props.onDayChange(day);
        this._emit('day-change', { day });

        this._logger?.debug('Day changed', { day });
    }

    /**
     * Check if day is today
     * @private
     * @param {string} day - Day name
     * @returns {boolean} True if day is today
     */
    _isToday(day) {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayIndex = new Date().getDay();
        const todayName = daysOfWeek[todayIndex];

        return day === todayName;
    }

    /**
     * Format day label for display
     * @private
     * @param {string} day - Day name
     * @returns {string} Formatted label
     */
    _formatDayLabel(day) {
        // For regular days, show full name with abbreviated version for mobile
        const abbrev = {
            'Sunday': 'Sun',
            'Monday': 'Mon',
            'Tuesday': 'Tue',
            'Wednesday': 'Wed',
            'Thursday': 'Thu',
            'Friday': 'Fri',
            'Saturday': 'Sat'
        };

        return `
            <span class="day-tab__text day-tab__text--full">${day}</span>
            <span class="day-tab__text day-tab__text--abbrev">${abbrev[day] || day}</span>
        `;
    }    /**
     * Update component with new schedule data
     * @param {object} schedule - New schedule data
     * @param {string} selectedDay - New selected day
     */
    updateSchedule(schedule, selectedDay) {
        // Store previous state for comparison
        const prevSelectedDay = this._props.selectedDay;

        // Update props reactively
        this._props.schedule = schedule;
        this._props.selectedDay = selectedDay;

        // If selected day changed, update UI reactively
        if (prevSelectedDay !== selectedDay) {
            this._updateActiveTab(selectedDay);
        }

        // Update counts reactively
        this._updateCounts(schedule);
    }

    /**
     * Update active tab reactively (without full re-render)
     * @private
     * @param {string} selectedDay - Selected day
     */
    _updateActiveTab(selectedDay) {
        const tabs = this._element.querySelectorAll('.day-tab');
        tabs.forEach(tab => {
            const day = tab.dataset.day;
            const isActive = day === selectedDay;

            // Use classList for reactive UI updates
            tab.classList.toggle('day-tab--active', isActive);
            tab.setAttribute('aria-pressed', isActive);
        });
    }

    /**
     * Update show counts reactively (without full re-render)
     * @private
     * @param {object} schedule - Schedule data
     */
    _updateCounts(schedule) {
        const tabs = this._element.querySelectorAll('.day-tab');
        tabs.forEach(tab => {
            const day = tab.dataset.day;
            const countEl = tab.querySelector('.day-tab__count');

            if (!countEl) return;

            let count;
            if (day === 'all') {
                count = Object.values(schedule).reduce((sum, shows) => sum + shows.length, 0);
            } else {
                count = schedule[day]?.length || 0;
            }

            // Animate count change if different
            if (countEl.textContent !== count.toString()) {
                countEl.style.transform = 'scale(1.3)';
                setTimeout(() => {
                    countEl.textContent = count;
                    countEl.style.transform = 'scale(1)';
                }, 150);
            }
        });
    }
}
