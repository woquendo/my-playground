/**
 * SeasonTabs Component
 * Horizontal navigation for filtering future seasons
 * Displays when "Future & Unscheduled" filter is active
 */

import { BaseComponent } from './BaseComponent.js';

export class SeasonTabs extends BaseComponent {
    /**
     * Create a season tabs component
     * @param {object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {string} options.selectedSeason - Currently selected season
     * @param {object} options.schedule - Schedule data with season counts
     * @param {function} options.onSeasonChange - Callback when season is selected
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger
     */
    constructor(options) {
        super({
            ...options,
            name: 'SeasonTabs',
            props: {
                selectedSeason: options.selectedSeason,
                schedule: options.schedule || {},
                onSeasonChange: options.onSeasonChange || (() => { })
            }
        });
    }

    /**
     * Get icon for season
     * @private
     * @param {string} season - Season name (e.g., "Winter 2026")
     * @returns {string} Season icon
     */
    _getSeasonIcon(season) {
        if (season.startsWith('Winter')) return '❄️';
        if (season.startsWith('Spring')) return '🌸';
        if (season.startsWith('Summer')) return '☀️';
        if (season.startsWith('Fall')) return '🍂';
        return '📅';
    }

    /**
     * Get component template
     * @returns {string} HTML template
     * @protected
     */
    _template() {
        const schedule = this._props.schedule;
        const selectedSeason = this._props.selectedSeason;

        // Extract and sort future seasons
        const futureSeasons = Object.keys(schedule)
            .filter(key => /^(Winter|Spring|Summer|Fall) \d{4}$/.test(key))
            .sort((a, b) => {
                const [seasonA, yearA] = a.split(' ');
                const [seasonB, yearB] = b.split(' ');
                const seasonOrder = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };
                if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
                return seasonOrder[seasonA] - seasonOrder[seasonB];
            });

        // Get unscheduled shows
        const unscheduledCount = schedule['Airing Date Not Yet Scheduled']?.length || 0;
        const hasUnscheduled = unscheduledCount > 0;

        if (futureSeasons.length === 0 && !hasUnscheduled) {
            return `
                <div class="season-tabs season-tabs--empty">
                    <p class="season-tabs__empty-message">No future seasons available</p>
                </div>
            `;
        }

        return `
            <div class="season-tabs">
                <div class="season-tabs__header">
                    <h4 class="season-tabs__title">Select Season</h4>
                </div>
                <div class="season-tabs__list">
                    ${futureSeasons.map(season => {
            const count = schedule[season]?.length || 0;
            const isActive = selectedSeason === season;
            const icon = this._getSeasonIcon(season);

            return `
                            <button 
                                class="season-tab ${isActive ? 'season-tab--active' : ''}"
                                data-season="${season}"
                                aria-pressed="${isActive}"
                            >
                                <span class="season-tab__icon">${icon}</span>
                                <span class="season-tab__label">${season}</span>
                                <span class="season-tab__count">${count}</span>
                            </button>
                        `;
        }).join('')}
                    ${hasUnscheduled ? `
                        <button 
                            class="season-tab season-tab--unscheduled ${selectedSeason === 'Airing Date Not Yet Scheduled' ? 'season-tab--active' : ''}"
                            data-season="Airing Date Not Yet Scheduled"
                            aria-pressed="${selectedSeason === 'Airing Date Not Yet Scheduled'}"
                        >
                            <span class="season-tab__icon">📆</span>
                            <span class="season-tab__label">Unscheduled</span>
                            <span class="season-tab__count">${unscheduledCount}</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Initialize component
     * @protected
     */
    _initialize() {
        // Attach click handlers to season tabs
        const tabs = this._element.querySelectorAll('.season-tab');
        tabs.forEach(tab => {
            this._addEventListener(tab, 'click', () => {
                const season = tab.dataset.season;
                this._handleSeasonChange(season);
            });
        });
    }

    /**
     * Handle season change
     * @private
     * @param {string} season - Selected season
     */
    _handleSeasonChange(season) {
        // Update active state
        const tabs = this._element.querySelectorAll('.season-tab');
        tabs.forEach(tab => {
            const isActive = tab.dataset.season === season;
            tab.classList.toggle('season-tab--active', isActive);
            tab.setAttribute('aria-pressed', isActive);
        });

        // Notify parent
        this._props.onSeasonChange(season);
        this._emit('season-change', { season });

        this._logger?.debug('Season changed', { season });
    }

    /**
     * Update component with new schedule data
     * @param {object} schedule - New schedule data
     * @param {string} selectedSeason - New selected season
     */
    updateSchedule(schedule, selectedSeason) {
        // Store previous state
        const prevSelectedSeason = this._props.selectedSeason;

        // Update props
        this._props.schedule = schedule;
        this._props.selectedSeason = selectedSeason;

        // If selected season changed, update UI reactively
        if (prevSelectedSeason !== selectedSeason) {
            this._updateActiveTab(selectedSeason);
        }

        // Update counts reactively
        this._updateCounts(schedule);
    }

    /**
     * Update active tab reactively
     * @private
     * @param {string} selectedSeason - Selected season
     */
    _updateActiveTab(selectedSeason) {
        const tabs = this._element.querySelectorAll('.season-tab');
        tabs.forEach(tab => {
            const season = tab.dataset.season;
            const isActive = season === selectedSeason;

            tab.classList.toggle('season-tab--active', isActive);
            tab.setAttribute('aria-pressed', isActive);
        });
    }

    /**
     * Update show counts reactively
     * @private
     * @param {object} schedule - Schedule data
     */
    _updateCounts(schedule) {
        const tabs = this._element.querySelectorAll('.season-tab');
        tabs.forEach(tab => {
            const season = tab.dataset.season;
            const countEl = tab.querySelector('.season-tab__count');

            if (!countEl) return;

            const count = schedule[season]?.length || 0;

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

    /**
     * Get the first season with unaired shows (default selection)
     * @param {object} schedule - Schedule data
     * @returns {string|null} First season with shows or null
     */
    static getDefaultSeason(schedule) {
        // Extract and sort future seasons
        const futureSeasons = Object.keys(schedule)
            .filter(key => /^(Winter|Spring|Summer|Fall) \d{4}$/.test(key))
            .sort((a, b) => {
                const [seasonA, yearA] = a.split(' ');
                const [seasonB, yearB] = b.split(' ');
                const seasonOrder = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };
                if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
                return seasonOrder[seasonA] - seasonOrder[seasonB];
            });

        // Find first season with shows that haven't aired yet
        for (const season of futureSeasons) {
            const shows = schedule[season] || [];
            if (shows.length > 0) {
                // Check if any shows in this season haven't aired yet
                const hasUnairedShows = shows.some(item => {
                    const show = item.show || item;
                    const currentEpisode = show.getCurrentEpisode?.() || 0;
                    return currentEpisode === 0;
                });

                if (hasUnairedShows) {
                    return season;
                }
            }
        }

        // If no unaired shows found, return first season with any shows
        return futureSeasons.find(season => schedule[season]?.length > 0) || null;
    }
}
