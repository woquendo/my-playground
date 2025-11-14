/**
 * Schedule Service
 * Handles weekly schedule generation, air date calculations, and update detection.
 */
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';
import { ShowDate } from '../../Domain/ValueObjects/ShowDate.js';

export class ScheduleService {
    /**
     * Create a ScheduleService
     * @param {object} dependencies - Service dependencies
     * @param {object} dependencies.showRepository - Show repository implementation
     * @param {EventBus} dependencies.eventBus - Event bus for service events
     * @param {Logger} dependencies.logger - Logger instance
     * @param {EpisodeCalculatorService} dependencies.episodeCalculator - Episode calculator service
     */
    constructor({ showRepository, eventBus = null, logger = null, episodeCalculator = null }) {
        if (!showRepository) {
            throw new ValidationError('Show repository is required', {
                context: { service: 'ScheduleService' }
            });
        }

        this.repository = showRepository;
        this.eventBus = eventBus;
        this.logger = logger;
        this.episodeCalculator = episodeCalculator;
    }

    /**
     * Helper to safely access show properties/methods
     * Handles both domain objects (with methods) and plain objects (with properties)
     * @private
     */
    _getShowProperty(show, property) {
        const methodName = 'get' + property.charAt(0).toUpperCase() + property.slice(1);
        if (typeof show[methodName] === 'function') {
            return show[methodName]();
        }
        return show[property];
    }

    /**
     * Get weekly schedule for currently airing shows
     * @param {object} options - Schedule options
     * @param {string} options.weekStart - Week start date (MM-DD-YY format), defaults to current week
     * @param {string[]} options.statuses - Filter by show statuses (defaults to ['watching'])
     * @returns {Promise<object>} Weekly schedule grouped by day
     */
    async getWeeklySchedule(options = {}) {
        try {
            const { weekStart, statuses = ['watching', 'plan_to_watch'] } = options;

            this.logger?.debug('Generating weekly schedule', options);

            // Determine week start date
            const startDate = weekStart
                ? new ShowDate(weekStart)
                : ShowDate.today().getCurrentWeekStart();

            // Get shows based on status filter
            let shows;
            if (statuses[0] === 'all') {
                // Get all shows regardless of status
                shows = await this.repository.findAll();
            } else if (statuses.length === 1 && statuses[0] !== 'all') {
                // Single status filter
                shows = await this.repository.findByStatus(statuses[0]);
            } else if (statuses.length > 1) {
                // Multiple statuses - load all and filter
                const allShows = await this.repository.findAll();
                shows = allShows.filter(show => {
                    const status = this._getShowProperty(show, 'status');
                    return statuses.includes(status);
                });
            } else {
                // Fallback to all shows
                shows = await this.repository.findAll();
            }

            // Filtering by airing status depends on the watching statuses requested:
            // - "watching" alone: only currently airing shows
            // - "plan_to_watch": shows not yet aired or currently airing
            // - "completed"/"on_hold"/"dropped": all shows regardless of airing status
            // - "all": all shows regardless of airing status
            let filteredShows;
            if (statuses[0] === 'all') {
                // Show all regardless of airing status
                filteredShows = shows;
            } else if (statuses.includes('watching') && statuses.length === 1) {
                // Only watching - filter to currently airing
                filteredShows = shows.filter(show => {
                    const airingStatus = this._getShowProperty(show, 'airingStatus');
                    return airingStatus === 'currently_airing' || airingStatus === 1;
                });
            } else if (statuses.includes('completed') || statuses.includes('on_hold') || statuses.includes('dropped')) {
                // For completed/on_hold/dropped - show all regardless of airing status
                filteredShows = shows;
            } else {
                // For any other combination (e.g., watching + plan_to_watch) - don't filter by airing status
                // Users might have shows marked as plan_to_watch that are airing, not yet aired, or finished
                filteredShows = shows;
            }

            // Group by day of week
            const schedule = this._groupShowsByDay(filteredShows, startDate);

            this.eventBus?.emit('schedule:generated', {
                weekStart: startDate.format(),
                showCount: filteredShows.length
            });

            return schedule;
        } catch (error) {
            this.logger?.error('Failed to generate weekly schedule', error);
            throw error;
        }
    }

    /**
     * Get schedule for a specific date
     * @param {string} date - Date in MM-DD-YY format
     * @returns {Promise<object[]>} Shows airing on that date
     */
    async getScheduleForDate(date) {
        try {
            this.logger?.debug(`Getting schedule for date: ${date}`);

            const targetDate = ShowDate.parse(date);
            const shows = await this.repository.getCurrentlyAiring();

            // Filter shows that air on this date
            const scheduledShows = shows.filter(show => {
                const showDate = this._getShowProperty(show, 'effectiveStartDate');
                const dayOfWeek = this._getDayOfWeek(targetDate);
                const showDayOfWeek = this._getDayOfWeek(showDate);                // Check if the show airs on this day of the week
                return showDayOfWeek === dayOfWeek;
            });

            // Enrich with episode information
            const enrichedSchedule = await Promise.all(
                scheduledShows.map(async show => ({
                    show,
                    expectedEpisode: this.episodeCalculator
                        ? await this.episodeCalculator.calculateCurrentEpisode(show)
                        : this._getShowProperty(show, 'currentEpisode'),
                    airDate: date
                }))
            ); return enrichedSchedule;
        } catch (error) {
            this.logger?.error(`Failed to get schedule for date: ${date}`, error);
            throw error;
        }
    }

    /**
     * Detect shows with new episodes available
     * @returns {Promise<object[]>} Shows that have new episodes
     */
    async detectNewEpisodes() {
        try {
            this.logger?.debug('Detecting new episodes');

            if (!this.episodeCalculator) {
                this.logger?.warn('Episode calculator not available, skipping detection');
                return [];
            }

            const shows = await this.repository.getCurrentlyAiring();
            const updates = [];

            for (const show of shows) {
                try {
                    const calculatedEpisode = await this.episodeCalculator.calculateCurrentEpisode(show);
                    const currentEpisode = this._getShowProperty(show, 'currentEpisode'); if (calculatedEpisode > currentEpisode) {
                        updates.push({
                            show,
                            currentEpisode,
                            newEpisode: calculatedEpisode,
                            episodesBehind: calculatedEpisode - currentEpisode
                        });
                    }
                } catch (error) {
                    this.logger?.warn(`Failed to calculate episode for show: ${this._getShowProperty(show, 'id')}`, error);
                }
            } if (updates.length > 0) {
                this.eventBus?.emit('schedule:updates-detected', {
                    updateCount: updates.length,
                    shows: updates.map(u => this._getShowProperty(u.show, 'id'))
                });
            } return updates;
        } catch (error) {
            this.logger?.error('Failed to detect new episodes', error);
            throw error;
        }
    }

    /**
     * Get shows that need updates (behind on episodes)
     * @returns {Promise<object[]>} Shows behind on episodes
     */
    async getShowsBehind() {
        try {
            const updates = await this.detectNewEpisodes();
            return updates.filter(update => update.episodesBehind > 0);
        } catch (error) {
            this.logger?.error('Failed to get shows behind', error);
            throw error;
        }
    }

    /**
     * Get upcoming shows for the next N days
     * @param {number} days - Number of days to look ahead
     * @returns {Promise<object>} Upcoming schedule
     */
    async getUpcomingSchedule(days = 7) {
        try {
            if (typeof days !== 'number' || days < 1) {
                throw new ValidationError('Days must be a positive number', {
                    context: { days }
                });
            }

            this.logger?.debug(`Getting upcoming schedule for ${days} days`);

            const today = ShowDate.today();
            const schedule = {};

            for (let i = 0; i < days; i++) {
                const date = today.addDays(i);
                const dateStr = date.format();
                schedule[dateStr] = await this.getScheduleForDate(dateStr);
            }

            return schedule;
        } catch (error) {
            this.logger?.error('Failed to get upcoming schedule', error);
            throw error;
        }
    }

    /**
     * Calculate next air date for a show
     * @param {Show} show - Show object
     * @returns {ShowDate} Next air date
     */
    calculateNextAirDate(show) {
        try {
            const startDate = this._getShowProperty(show, 'startDate');
            const currentEpisode = this._getShowProperty(show, 'currentEpisode');
            const totalEpisodes = this._getShowProperty(show, 'totalEpisodes');

            // If show is complete, no next air date
            if (currentEpisode >= totalEpisodes) {
                return null;
            }

            // Calculate weeks elapsed
            const weeksElapsed = currentEpisode;
            const nextAirDate = startDate.addWeeks(weeksElapsed);

            return nextAirDate;
        } catch (error) {
            this.logger?.error(`Failed to calculate next air date for show: ${this._getShowProperty(show, 'id')}`, error);
            throw error;
        }
    }

    /**
     * Group shows by day of the week
     * @private
     * @param {Show[]} shows - Shows to group
     * @param {ShowDate} weekStart - Week start date
     * @returns {object} Shows grouped by day
     */
    _groupShowsByDay(shows, weekStart) {
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const schedule = {};
        const today = ShowDate.today();

        // Initialize each day
        daysOfWeek.forEach(day => {
            schedule[day] = [];
        });

        // Initialize special categories
        schedule['Airing Date Not Yet Scheduled'] = [];
        schedule['Ended'] = [];

        // Initialize future seasons categories
        const futureSeasons = this._getFutureSeasonCategories();
        futureSeasons.forEach(season => {
            schedule[season] = [];
        });

        // Group shows by their air day
        shows.forEach(show => {
            const airingStatus = this._getShowProperty(show, 'airingStatus');

            // Shows that have ended go to "Ended" category (2 = finished_airing)
            if (airingStatus === 'finished_airing' || airingStatus === 2) {
                schedule['Ended'].push({
                    show,
                    airTime: null,
                    episode: this._getShowProperty(show, 'currentEpisode') + 1,
                    totalEpisodes: this._getShowProperty(show, 'totalEpisodes')
                });
                return;
            }

            const effectiveStartDate = this._getShowProperty(show, 'effectiveStartDate');

            // Shows without a valid start date go to "Airing Date Not Yet Scheduled"
            if (!effectiveStartDate) {
                this.logger?.debug(`Show without valid start date: ${this._getShowProperty(show, 'title')}`);
                schedule['Airing Date Not Yet Scheduled'].push({
                    show,
                    airTime: null,
                    episode: this._getShowProperty(show, 'currentEpisode') + 1,
                    totalEpisodes: this._getShowProperty(show, 'totalEpisodes')
                });
                return;
            }

            // Check if show starts in the future
            if (effectiveStartDate.isAfter(today)) {
                const seasonCategory = this._getSeasonCategory(effectiveStartDate);
                if (schedule[seasonCategory]) {
                    schedule[seasonCategory].push({
                        show,
                        airTime: effectiveStartDate.format(),
                        episode: this._getShowProperty(show, 'currentEpisode') + 1,
                        totalEpisodes: this._getShowProperty(show, 'totalEpisodes')
                    });
                    return;
                }
            }

            const dayOfWeek = this._getDayOfWeek(effectiveStartDate);
            const dayName = daysOfWeek[dayOfWeek];

            schedule[dayName].push({
                show,
                airTime: effectiveStartDate.format(),
                episode: this._getShowProperty(show, 'currentEpisode') + 1,
                totalEpisodes: this._getShowProperty(show, 'totalEpisodes')
            });
        });

        // Sort shows within each day by title
        daysOfWeek.forEach(day => {
            schedule[day].sort((a, b) => {
                const titleA = this._getShowProperty(a.show, 'title');
                const titleB = this._getShowProperty(b.show, 'title');
                return titleA.localeCompare(titleB);
            });
        });

        // Sort unscheduled shows by title
        schedule['Airing Date Not Yet Scheduled'].sort((a, b) => {
            const titleA = this._getShowProperty(a.show, 'title');
            const titleB = this._getShowProperty(b.show, 'title');
            return titleA.localeCompare(titleB);
        });

        // Sort future season shows by air date, then title
        futureSeasons.forEach(season => {
            schedule[season].sort((a, b) => {
                if (a.airTime && b.airTime) {
                    return a.airTime.localeCompare(b.airTime);
                }
                const titleA = this._getShowProperty(a.show, 'title');
                const titleB = this._getShowProperty(b.show, 'title');
                return titleA.localeCompare(titleB);
            });
        });

        return schedule;
    }

    /**
     * Get future season categories
     * @private
     * @returns {string[]} Array of season category names
     */
    _getFutureSeasonCategories() {
        const today = ShowDate.today();
        const currentYear = today.toDate().getFullYear();
        const currentMonth = today.toDate().getMonth() + 1; // 1-12

        const seasons = [];
        const currentSeason = this._getSeasonFromMonth(currentMonth);

        // Generate next 4 seasons (1 year ahead)
        const seasonOrder = ['Winter', 'Spring', 'Summer', 'Fall'];
        const currentSeasonIndex = seasonOrder.indexOf(currentSeason);

        for (let i = 0; i < 4; i++) {
            const seasonIndex = (currentSeasonIndex + i) % 4;
            const season = seasonOrder[seasonIndex];
            const yearOffset = Math.floor((currentSeasonIndex + i) / 4);
            const year = currentYear + yearOffset;

            seasons.push(`${season} ${year}`);
        }

        return seasons;
    }

    /**
     * Get season category for a date
     * @private
     * @param {ShowDate} date - Date to categorize
     * @returns {string} Season category name
     */
    _getSeasonCategory(date) {
        const jsDate = date.toDate();
        const month = jsDate.getMonth() + 1; // 1-12
        const year = jsDate.getFullYear();
        const season = this._getSeasonFromMonth(month);

        return `${season} ${year}`;
    }

    /**
     * Get anime season from month
     * @private
     * @param {number} month - Month (1-12)
     * @returns {string} Season name
     */
    _getSeasonFromMonth(month) {
        // Anime seasons:
        // Winter: January (1), February (2), March (3)
        // Spring: April (4), May (5), June (6)
        // Summer: July (7), August (8), September (9)
        // Fall: October (10), November (11), December (12)

        if (month >= 1 && month <= 3) return 'Winter';
        if (month >= 4 && month <= 6) return 'Spring';
        if (month >= 7 && month <= 9) return 'Summer';
        return 'Fall';
    }

    /**
     * Get day of week (0 = Sunday, 6 = Saturday)
     * @private
     * @param {ShowDate} date - Date object
     * @returns {number} Day of week
     */
    _getDayOfWeek(date) {
        const jsDate = date.toDate();
        return jsDate.getDay();
    }
}
