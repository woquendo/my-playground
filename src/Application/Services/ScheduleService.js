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
                shows = await this.repository.getAll();
            } else if (statuses.length === 1 && statuses[0] !== 'all') {
                // Single status filter
                shows = await this.repository.getByStatus(statuses[0]);
            } else if (statuses.length > 1) {
                // Multiple statuses - load all and filter
                const allShows = await this.repository.getAll();
                shows = allShows.filter(show => statuses.includes(show.getStatus()));
            } else {
                // Fallback to all shows
                shows = await this.repository.getAll();
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
                filteredShows = shows.filter(show =>
                    show.getAiringStatus() === 'currently_airing'
                );
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
                const showDate = show.getEffectiveStartDate();
                const dayOfWeek = this._getDayOfWeek(targetDate);
                const showDayOfWeek = this._getDayOfWeek(showDate);

                // Check if the show airs on this day of the week
                return showDayOfWeek === dayOfWeek;
            });

            // Enrich with episode information
            const enrichedSchedule = await Promise.all(
                scheduledShows.map(async show => ({
                    show,
                    expectedEpisode: this.episodeCalculator
                        ? await this.episodeCalculator.calculateCurrentEpisode(show)
                        : show.getCurrentEpisode(),
                    airDate: date
                }))
            );

            return enrichedSchedule;
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
                    const currentEpisode = show.getCurrentEpisode();

                    if (calculatedEpisode > currentEpisode) {
                        updates.push({
                            show,
                            currentEpisode,
                            newEpisode: calculatedEpisode,
                            episodesBehind: calculatedEpisode - currentEpisode
                        });
                    }
                } catch (error) {
                    this.logger?.warn(`Failed to calculate episode for show: ${show.getId()}`, error);
                }
            }

            if (updates.length > 0) {
                this.eventBus?.emit('schedule:updates-detected', {
                    updateCount: updates.length,
                    shows: updates.map(u => u.show.getId())
                });
            }

            return updates;
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
            const startDate = show.getStartDate();
            const currentEpisode = show.getCurrentEpisode();
            const totalEpisodes = show.getTotalEpisodes();

            // If show is complete, no next air date
            if (currentEpisode >= totalEpisodes) {
                return null;
            }

            // Calculate weeks elapsed
            const weeksElapsed = currentEpisode;
            const nextAirDate = startDate.addWeeks(weeksElapsed);

            return nextAirDate;
        } catch (error) {
            this.logger?.error(`Failed to calculate next air date for show: ${show.getId()}`, error);
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

        // Initialize each day
        daysOfWeek.forEach(day => {
            schedule[day] = [];
        });

        // Initialize special category for shows without scheduled air dates
        schedule['Airing Date Not Yet Scheduled'] = [];

        // Group shows by their air day
        shows.forEach(show => {
            const effectiveStartDate = show.getEffectiveStartDate();

            // Shows without a valid start date go to "Airing Date Not Yet Scheduled"
            if (!effectiveStartDate) {
                this.logger?.debug(`Show without valid start date: ${show.getTitle()}`);
                schedule['Airing Date Not Yet Scheduled'].push({
                    show,
                    airTime: null,
                    episode: show.getCurrentEpisode() + 1, // Next episode to watch
                    totalEpisodes: show.getTotalEpisodes()
                });
                return;
            }

            const dayOfWeek = this._getDayOfWeek(effectiveStartDate);
            const dayName = daysOfWeek[dayOfWeek];

            schedule[dayName].push({
                show,
                airTime: effectiveStartDate.format(),
                episode: show.getCurrentEpisode() + 1, // Next episode to watch
                totalEpisodes: show.getTotalEpisodes()
            });
        });

        // Sort shows within each day by title
        daysOfWeek.forEach(day => {
            schedule[day].sort((a, b) =>
                a.show.getTitle().localeCompare(b.show.getTitle())
            );
        });

        // Sort unscheduled shows by title
        schedule['Airing Date Not Yet Scheduled'].sort((a, b) =>
            a.show.getTitle().localeCompare(b.show.getTitle())
        );

        return schedule;
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
