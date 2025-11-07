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
            const { weekStart, statuses = ['watching'] } = options;

            this.logger?.debug('Generating weekly schedule', options);

            // Determine week start date
            const startDate = weekStart
                ? new ShowDate(weekStart)
                : ShowDate.today().getCurrentWeekStart();

            // Get shows based on status filter
            let shows;
            if (statuses.length === 1) {
                shows = await this.repository.getByStatus(statuses[0]);
            } else {
                const allShows = await this.repository.getAll();
                shows = allShows.filter(show => statuses.includes(show.getStatus()));
            }

            // Filter to only currently airing shows
            const airingShows = shows.filter(show =>
                show.getAiringStatus() === 'currently_airing'
            );

            // Group by day of week
            const schedule = this._groupShowsByDay(airingShows, startDate);

            this.eventBus?.emit('schedule:generated', {
                weekStart: startDate.format(),
                showCount: airingShows.length
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

        // Group shows by their air day
        shows.forEach(show => {
            const dayOfWeek = this._getDayOfWeek(show.getEffectiveStartDate());
            const dayName = daysOfWeek[dayOfWeek];

            schedule[dayName].push({
                show,
                airTime: show.getEffectiveStartDate().format(),
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
