import { ShowDate } from '../ValueObjects/ShowDate.js';
import { AiringStatus } from '../ValueObjects/AiringStatus.js';
import { ValidationError, ApplicationError } from '../../Core/Errors/ApplicationErrors.js';

/**
 * Domain service for calculating episode scheduling, handling skip weeks,
 * and managing custom date-based episode calculations
 */
export class EpisodeCalculatorService {
    constructor() {
        this.skipWeeks = new Map();
        this.customEpisodeDates = new Map();
        this.seasonRanges = new Map();
    }

    /**
     * Calculate current episode based on start date and current date
     * @param {ShowDate} startDate - Show start date
     * @param {ShowDate} currentDate - Current date (optional, defaults to today)
     * @param {number} totalEpisodes - Total number of episodes
     * @param {Object} options - Additional options
     * @returns {number} Current episode number
     */
    calculateCurrentEpisode(startDate, currentDate = null, totalEpisodes = null, options = {}) {
        if (!(startDate instanceof ShowDate)) {
            throw new ValidationError('Start date must be a ShowDate instance');
        }

        if (totalEpisodes !== null && (!Number.isInteger(totalEpisodes) || totalEpisodes < 1)) {
            throw new ValidationError('Total episodes must be a positive integer or null');
        }

        const now = currentDate || ShowDate.now();
        const {
            skipWeeks = [],
            customDates = new Map(),
            weeklySchedule = true,
            episodeLength = 1 // episodes per week
        } = options;

        // If show hasn't started yet
        if (now.isBefore(startDate)) {
            return 0;
        }

        // Calculate base weeks difference
        const weeksDiff = startDate.getWeeksDifferenceFrom(now);

        // Account for skip weeks
        const effectiveWeeks = this._calculateEffectiveWeeks(
            startDate,
            now,
            skipWeeks,
            customDates
        );

        // Calculate episode based on effective weeks
        let currentEpisode = Math.floor(effectiveWeeks * episodeLength) + 1;

        // Cap at total episodes if specified
        if (totalEpisodes && currentEpisode > totalEpisodes) {
            currentEpisode = totalEpisodes;
        }

        return Math.max(1, currentEpisode);
    }

    /**
     * Calculate the date when a specific episode will air
     * @param {ShowDate} startDate - Show start date
     * @param {number} episodeNumber - Episode number to calculate date for
     * @param {Object} options - Additional options
     * @returns {ShowDate} Date when episode will air
     */
    calculateEpisodeDate(startDate, episodeNumber, options = {}) {
        if (!(startDate instanceof ShowDate)) {
            throw new ValidationError('Start date must be a ShowDate instance');
        }

        if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
            throw new ValidationError('Episode number must be a positive integer');
        }

        const {
            skipWeeks = [],
            customDates = new Map(),
            weeklySchedule = true,
            episodeLength = 1
        } = options;

        // Check if there's a custom date for this episode
        if (customDates.has(episodeNumber)) {
            return customDates.get(episodeNumber);
        }

        // Calculate target week (0-based)
        const targetWeek = Math.floor((episodeNumber - 1) / episodeLength);

        // Add skip weeks to get actual calendar week
        const actualWeek = this._addSkipWeeksToTarget(
            startDate,
            targetWeek,
            skipWeeks
        );

        // Create a new date and add weeks manually since addWeeks doesn't exist
        const resultDate = new Date(startDate.toDate());
        resultDate.setDate(resultDate.getDate() + (actualWeek * 7));
        return new ShowDate(resultDate);
    }

    /**
     * Get all episodes scheduled within a date range
     * @param {ShowDate} startDate - Show start date
     * @param {ShowDate} rangeStart - Range start date
     * @param {ShowDate} rangeEnd - Range end date
     * @param {number} totalEpisodes - Total episodes
     * @param {Object} options - Additional options
     * @returns {Array} Array of episode info within range
     */
    getEpisodesInRange(startDate, rangeStart, rangeEnd, totalEpisodes, options = {}) {
        if (!(startDate instanceof ShowDate) ||
            !(rangeStart instanceof ShowDate) ||
            !(rangeEnd instanceof ShowDate)) {
            throw new ValidationError('All dates must be ShowDate instances');
        }

        if (rangeEnd.isBefore(rangeStart)) {
            throw new ValidationError('Range end must be after range start');
        }

        const episodes = [];

        for (let ep = 1; ep <= totalEpisodes; ep++) {
            try {
                const episodeDate = this.calculateEpisodeDate(startDate, ep, options);

                if (!episodeDate.isBefore(rangeStart) && episodeDate.isBefore(rangeEnd)) {
                    episodes.push({
                        episode: ep,
                        date: episodeDate,
                        dateString: episodeDate.format()
                    });
                }
            } catch (error) {
                // Skip episodes we can't calculate dates for
                continue;
            }
        }

        return episodes.sort((a, b) => {
            if (a.date.isBefore(b.date)) return -1;
            if (a.date.isAfter(b.date)) return 1;
            return 0;
        });
    }

    /**
     * Determine if a show should be scheduled on a given date
     * @param {ShowDate} startDate - Show start date
     * @param {ShowDate} checkDate - Date to check
     * @param {AiringStatus} airingStatus - Show's airing status
     * @param {Object} options - Additional options
     * @returns {boolean} True if show should be scheduled
     */
    shouldScheduleOn(startDate, checkDate, airingStatus, options = {}) {
        if (!(startDate instanceof ShowDate) || !(checkDate instanceof ShowDate)) {
            throw new ValidationError('Dates must be ShowDate instances');
        }

        if (!(airingStatus instanceof AiringStatus)) {
            throw new ValidationError('Airing status must be an AiringStatus instance');
        }

        // Not yet aired shows are never scheduled
        if (airingStatus.isNotYetAired()) {
            return false;
        }

        // Finished shows are only scheduled if check date is during their run
        if (airingStatus.isFinishedAiring()) {
            const { totalEpisodes = 12, skipWeeks = [] } = options;
            const lastEpisodeDate = this.calculateEpisodeDate(
                startDate,
                totalEpisodes,
                { skipWeeks }
            );
            return !checkDate.isAfter(lastEpisodeDate);
        }

        // Currently airing shows are scheduled if they've started
        return !checkDate.isBefore(startDate);
    }

    /**
     * Add skip weeks for a specific show
     * @param {string} showId - Unique show identifier
     * @param {Array<ShowDate>} skipDates - Array of dates to skip
     */
    addSkipWeeks(showId, skipDates) {
        if (!Array.isArray(skipDates)) {
            throw new ValidationError('Skip dates must be an array');
        }

        const validSkipDates = skipDates.filter(date => date instanceof ShowDate);
        if (validSkipDates.length !== skipDates.length) {
            throw new ValidationError('All skip dates must be ShowDate instances');
        }

        if (!this.skipWeeks.has(showId)) {
            this.skipWeeks.set(showId, new Set());
        }

        validSkipDates.forEach(date => {
            this.skipWeeks.get(showId).add(date.format());
        });
    }

    /**
     * Add custom episode date
     * @param {string} showId - Unique show identifier
     * @param {number} episodeNumber - Episode number
     * @param {ShowDate} customDate - Custom air date
     */
    addCustomEpisodeDate(showId, episodeNumber, customDate) {
        if (!(customDate instanceof ShowDate)) {
            throw new ValidationError('Custom date must be a ShowDate instance');
        }

        if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
            throw new ValidationError('Episode number must be a positive integer');
        }

        if (!this.customEpisodeDates.has(showId)) {
            this.customEpisodeDates.set(showId, new Map());
        }

        this.customEpisodeDates.get(showId).set(episodeNumber, customDate);
    }

    /**
     * Get season information for episode scheduling
     * @param {ShowDate} date - Date to check season for
     * @returns {Object} Season information
     */
    getSeasonInfo(date) {
        if (!(date instanceof ShowDate)) {
            throw new ValidationError('Date must be a ShowDate instance');
        }

        const month = date.toDate().getMonth() + 1; // Convert to 1-based month

        // Anime seasons: Winter (Jan-Mar), Spring (Apr-Jun), Summer (Jul-Sep), Fall (Oct-Dec)
        if (month >= 1 && month <= 3) {
            return { season: 'Winter', year: date.toDate().getFullYear() };
        } else if (month >= 4 && month <= 6) {
            return { season: 'Spring', year: date.toDate().getFullYear() };
        } else if (month >= 7 && month <= 9) {
            return { season: 'Summer', year: date.toDate().getFullYear() };
        } else {
            return { season: 'Fall', year: date.toDate().getFullYear() };
        }
    }

    /**
     * Calculate effective weeks accounting for skip weeks and custom dates
     * @private
     */
    _calculateEffectiveWeeks(startDate, endDate, skipWeeks, customDates) {
        const totalWeeks = startDate.getWeeksDifferenceFrom(endDate);
        let effectiveWeeks = totalWeeks;

        // Subtract skip weeks that fall within the range
        skipWeeks.forEach(skipDate => {
            if (skipDate instanceof ShowDate) {
                if (!skipDate.isBefore(startDate) && !skipDate.isAfter(endDate)) {
                    effectiveWeeks -= 1;
                }
            }
        });

        return Math.max(0, effectiveWeeks);
    }

    /**
     * Add skip weeks to target week to get actual calendar week
     * @private
     */
    _addSkipWeeksToTarget(startDate, targetWeek, skipWeeks) {
        let actualWeek = targetWeek;
        let currentWeek = 0;

        // Count how many skip weeks occur before our target
        skipWeeks.forEach(skipDate => {
            if (skipDate instanceof ShowDate) {
                const skipWeekNumber = startDate.getWeeksDifferenceFrom(skipDate);
                if (skipWeekNumber <= actualWeek) {
                    actualWeek += 1;
                }
            }
        });

        return actualWeek;
    }

    /**
     * Generate episode schedule for entire season
     * @param {ShowDate} startDate - Season start date
     * @param {number} totalEpisodes - Total episodes in season
     * @param {Object} options - Scheduling options
     * @returns {Array} Complete episode schedule
     */
    generateSeasonSchedule(startDate, totalEpisodes, options = {}) {
        if (!(startDate instanceof ShowDate)) {
            throw new ValidationError('Start date must be a ShowDate instance');
        }

        if (!Number.isInteger(totalEpisodes) || totalEpisodes < 1) {
            throw new ValidationError('Total episodes must be a positive integer');
        }

        const schedule = [];
        const {
            skipWeeks = [],
            customDates = new Map(),
            episodeLength = 1,
            showTitle = 'Unknown Show'
        } = options;

        for (let ep = 1; ep <= totalEpisodes; ep++) {
            try {
                const episodeDate = this.calculateEpisodeDate(startDate, ep, {
                    skipWeeks,
                    customDates,
                    episodeLength
                });

                const seasonInfo = this.getSeasonInfo(episodeDate);

                schedule.push({
                    episode: ep,
                    date: episodeDate,
                    dateString: episodeDate.format(),
                    season: seasonInfo.season,
                    year: seasonInfo.year,
                    showTitle,
                    isSkipWeek: this._isSkipWeek(episodeDate, skipWeeks),
                    isCustomDate: customDates.has(ep)
                });
            } catch (error) {
                // Log error but continue with other episodes
                console.warn(`Could not calculate date for episode ${ep}: ${error.message}`);
            }
        }

        return schedule;
    }

    /**
     * Check if a date falls on a skip week
     * @private
     */
    _isSkipWeek(date, skipWeeks) {
        return skipWeeks.some(skipDate => {
            if (skipDate instanceof ShowDate) {
                return skipDate.isSameWeek(date);
            }
            return false;
        });
    }

    /**
     * Validate episode calculation parameters
     * @private
     */
    _validateCalculationParams(startDate, totalEpisodes, options) {
        if (!(startDate instanceof ShowDate)) {
            throw new ValidationError('Start date must be a ShowDate instance');
        }

        if (totalEpisodes !== null && (!Number.isInteger(totalEpisodes) || totalEpisodes < 1)) {
            throw new ValidationError('Total episodes must be a positive integer or null');
        }

        if (options.episodeLength && (!Number.isInteger(options.episodeLength) || options.episodeLength < 1)) {
            throw new ValidationError('Episode length must be a positive integer');
        }
    }
}