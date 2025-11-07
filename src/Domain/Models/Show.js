/**
 * Show Domain Model
 * Rich domain object representing an anime show with business logic
 */
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';
import { ShowDate } from '../ValueObjects/ShowDate.js';
import { ShowStatus } from '../ValueObjects/ShowStatus.js';
import { AiringStatus } from '../ValueObjects/AiringStatus.js';

export class Show {
    /**
     * Create a Show instance
     * @param {object} data - Show data
     */
    constructor(data) {
        this._validateRequiredFields(data);

        // Core identifiers
        this.id = data.id;
        this.url = data.url;

        // Titles
        this.title = data.title;
        this.titleEnglish = data.title_english || data.titleEnglish || null;
        this.titleJapanese = data.title_japanese || data.titleJapanese || null;

        // Episode information
        this.episodes = data.episodes;
        this.customEpisodes = data.custom_episodes || data.customEpisodes || null;
        this.skippedWeeks = data.skipped_weeks || data.skippedWeeks || 0;

        // Status information
        this.status = new ShowStatus(data.status);
        this.airingStatus = new AiringStatus(data.airing_status || data.airingStatus || 0);

        // Dates
        this.startDate = data.start_date || data.startDate ?
            new ShowDate(data.start_date || data.startDate) : null;
        this.endDate = data.end_date || data.endDate ?
            new ShowDate(data.end_date || data.endDate) : null;
        this.customStartDate = data.custom_start_date || data.customStartDate ?
            new ShowDate(data.custom_start_date || data.customStartDate) : null;

        // Additional metadata
        this.score = data.score;
        this.type = data.type || 'TV';
        this.imageUrl = data.image_url || data.imageUrl || null;
        this.watchingStatus = data.watching_status || data.watchingStatus || null;
        this.rating = data.rating || null;
        this.season = data.season || null;
        this.studios = data.studios || null;
        this.licensors = data.licensors || null;

        // Make core properties immutable (but allow updates through methods)
        Object.defineProperty(this, 'id', { writable: false, configurable: false });
        Object.defineProperty(this, 'url', { writable: false, configurable: false });
    }

    /**
     * Validate required fields
     * @private
     * @param {object} data - Input data
     */
    _validateRequiredFields(data) {
        if (!data) {
            throw new ValidationError('Show data is required');
        }

        if (!data.id) {
            throw new ValidationError('Show ID is required', {
                context: { data }
            });
        }

        if (!data.title || typeof data.title !== 'string') {
            throw new ValidationError('Show title is required and must be a string', {
                context: { title: data.title, data }
            });
        }

        if (!data.status) {
            throw new ValidationError('Show status is required', {
                context: { data }
            });
        }
    }

    /**
     * Get the effective start date (custom or original)
     * @returns {ShowDate|null} The effective start date
     */
    getEffectiveStartDate() {
        return this.customStartDate || this.startDate;
    }

    /**
     * Get the effective episode count (custom or original)
     * @returns {number|null} The effective episode count
     */
    getEffectiveEpisodes() {
        return this.customEpisodes ?? this.episodes;
    }

    /**
     * Get the primary title (English if available, otherwise original)
     * @returns {string} Primary title
     */
    getPrimaryTitle() {
        return this.titleEnglish || this.title;
    }

    /**
     * Get all titles as an array
     * @returns {string[]} Array of all available titles
     */
    getAllTitles() {
        const titles = [this.title];
        if (this.titleEnglish && this.titleEnglish !== this.title) {
            titles.push(this.titleEnglish);
        }
        if (this.titleJapanese && this.titleJapanese !== this.title) {
            titles.push(this.titleJapanese);
        }
        return titles;
    }

    /**
     * Calculate the current episode for a given date
     * @param {Date|ShowDate} targetDate - Date to calculate episode for
     * @returns {number} Current episode number
     */
    getCurrentEpisode(targetDate) {
        const startDate = this.getEffectiveStartDate();
        if (!startDate) {
            return 1; // Default to episode 1 if no start date
        }

        // Convert target date if needed
        let target = targetDate;
        if (!(targetDate instanceof ShowDate)) {
            target = new ShowDate(targetDate);
        }

        // Calculate weeks difference
        const weeksDiff = startDate.getWeeksDifferenceFrom(target.toDate());

        // Account for skipped weeks and ensure minimum episode 1
        const adjustedEpisode = Math.max(1, weeksDiff - this.skippedWeeks + 1);

        // Don't exceed total episodes if known
        const maxEpisodes = this.getEffectiveEpisodes();
        if (maxEpisodes && adjustedEpisode > maxEpisodes) {
            return maxEpisodes;
        }

        return adjustedEpisode;
    }

    /**
     * Check if the show is airing on a specific date
     * @param {Date|ShowDate} date - Date to check
     * @returns {boolean} True if airing on that date
     */
    isAiringOn(date) {
        const startDate = this.getEffectiveStartDate();
        if (!startDate) {
            return false;
        }

        // Convert date if needed
        let checkDate = date;
        if (!(date instanceof ShowDate)) {
            checkDate = new ShowDate(date);
        }

        // Must be currently airing
        if (!this.airingStatus.isCurrentlyAiring()) {
            return false;
        }

        // Must be after start date
        if (checkDate.isBefore(startDate.toDate())) {
            return false;
        }

        // Must be same day of week as start date
        if (!checkDate.isSameDayOfWeek(startDate.toDate())) {
            return false;
        }

        // Check if within episode count limits
        const currentEpisode = this.getCurrentEpisode(checkDate);
        const maxEpisodes = this.getEffectiveEpisodes();

        if (maxEpisodes && currentEpisode > maxEpisodes) {
            return false;
        }

        return true;
    }

    /**
     * Check if the show should appear in schedule
     * @returns {boolean} True if should be scheduled
     */
    shouldBeScheduled() {
        return this.airingStatus.shouldBeScheduled() &&
            this.status.allowsScheduling() &&
            this.getEffectiveStartDate() !== null;
    }

    /**
     * Get the air day name
     * @returns {string|null} Day name or null if no start date
     */
    getAirDay() {
        const startDate = this.getEffectiveStartDate();
        return startDate ? startDate.getDayName() : null;
    }

    /**
     * Get the short air day name
     * @returns {string|null} Short day name or null if no start date
     */
    getShortAirDay() {
        const startDate = this.getEffectiveStartDate();
        return startDate ? startDate.getShortDayName() : null;
    }

    /**
     * Calculate progress percentage
     * @param {Date|ShowDate} currentDate - Current date for calculation
     * @returns {number} Progress percentage (0-100)
     */
    getProgressPercentage(currentDate = new Date()) {
        const maxEpisodeCount = this.getEffectiveEpisodes();
        if (!maxEpisodeCount) {
            return 0;
        }

        const currentEpisode = this.getCurrentEpisode(currentDate);
        return Math.min(100, Math.max(0, (currentEpisode / maxEpisodeCount) * 100));
    }

    /**
     * Check if show is completed based on episode count and date
     * @param {Date|ShowDate} currentDate - Current date for calculation
     * @returns {boolean} True if all episodes have aired
     */
    isCompletelyAired(currentDate = new Date()) {
        const maxEpisodeCount = this.getEffectiveEpisodes();
        if (!maxEpisodeCount) {
            return false;
        }

        const currentEpisode = this.getCurrentEpisode(currentDate);
        return currentEpisode >= maxEpisodeCount;
    }

    /**
     * Get remaining episodes
     * @param {Date|ShowDate} currentDate - Current date for calculation
     * @returns {number} Number of remaining episodes
     */
    getRemainingEpisodes(currentDate = new Date()) {
        const maxEpisodeCount = this.getEffectiveEpisodes();
        if (!maxEpisodeCount) {
            return 0;
        }

        const currentEpisode = this.getCurrentEpisode(currentDate);
        return Math.max(0, maxEpisodeCount - currentEpisode);
    }

    /**
     * Update show status
     * @param {string|ShowStatus} newStatus - New status
     * @returns {Show} New Show instance with updated status
     */
    updateStatus(newStatus) {
        const currentStatus = this.status;
        const targetStatus = newStatus instanceof ShowStatus ? newStatus : new ShowStatus(newStatus);

        if (!currentStatus.canTransitionTo(targetStatus.getValue())) {
            throw new ValidationError(`Invalid status transition from ${currentStatus.getValue()} to ${targetStatus.getValue()}`, {
                context: {
                    currentStatus: currentStatus.getValue(),
                    targetStatus: targetStatus.getValue(),
                    validTransitions: currentStatus.getValidTransitions()
                }
            });
        }

        return new Show({
            ...this.toJSON(),
            status: targetStatus.getValue()
        });
    }

    /**
     * Update custom start date
     * @param {string|Date|ShowDate} newStartDate - New start date
     * @returns {Show} New Show instance with updated start date
     */
    updateCustomStartDate(newStartDate) {
        const customStartDate = newStartDate instanceof ShowDate ?
            newStartDate :
            (newStartDate ? new ShowDate(newStartDate) : null);

        return new Show({
            ...this.toJSON(),
            custom_start_date: customStartDate ? customStartDate.toString() : null
        });
    }

    /**
     * Update skipped weeks
     * @param {number} skippedWeeks - Number of skipped weeks
     * @returns {Show} New Show instance with updated skipped weeks
     */
    updateSkippedWeeks(skippedWeeks) {
        if (typeof skippedWeeks !== 'number' || skippedWeeks < 0) {
            throw new ValidationError('Skipped weeks must be a non-negative number', {
                context: { skippedWeeks, type: typeof skippedWeeks }
            });
        }

        return new Show({
            ...this.toJSON(),
            skipped_weeks: skippedWeeks
        });
    }

    /**
     * Check equality with another Show
     * @param {Show} other - Other Show to compare
     * @returns {boolean} True if shows are equal (same ID)
     */
    equals(other) {
        if (!(other instanceof Show)) {
            return false;
        }
        return this.id === other.id;
    }

    /**
     * Compare shows for sorting (by title)
     * @param {Show} other - Other Show to compare
     * @returns {number} Comparison result
     */
    compare(other) {
        if (!(other instanceof Show)) {
            throw new ValidationError('Can only compare with another Show');
        }

        return this.getPrimaryTitle().localeCompare(other.getPrimaryTitle());
    }

    /**
     * Convert to plain object for serialization
     * @returns {object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            url: this.url,
            title: this.title,
            title_english: this.titleEnglish,
            title_japanese: this.titleJapanese,
            episodes: this.episodes,
            custom_episodes: this.customEpisodes,
            skipped_weeks: this.skippedWeeks,
            status: this.status.getValue(),
            airing_status: this.airingStatus.getValue(),
            start_date: this.startDate ? this.startDate.toString() : null,
            end_date: this.endDate ? this.endDate.toString() : null,
            custom_start_date: this.customStartDate ? this.customStartDate.toString() : null,
            score: this.score,
            type: this.type,
            image_url: this.imageUrl,
            watching_status: this.watchingStatus,
            rating: this.rating,
            season: this.season,
            studios: this.studios,
            licensors: this.licensors
        };
    }

    /**
     * Get detailed information for display
     * @param {Date|ShowDate} currentDate - Current date for calculations
     * @returns {object} Detailed show information
     */
    getDetailedInfo(currentDate = new Date()) {
        const effectiveStartDate = this.getEffectiveStartDate();
        const effectiveEpisodes = this.getEffectiveEpisodes();
        const currentEpisode = this.getCurrentEpisode(currentDate);

        return {
            basic: {
                id: this.id,
                title: this.getPrimaryTitle(),
                allTitles: this.getAllTitles(),
                type: this.type,
                score: this.score,
                rating: this.rating,
                imageUrl: this.imageUrl,
                url: this.url
            },
            status: {
                watchingStatus: this.status.getDisplayName(),
                airingStatus: this.airingStatus.getDisplayName(),
                statusColor: this.airingStatus.getStatusColor()
            },
            episodes: {
                total: effectiveEpisodes,
                current: currentEpisode,
                remaining: this.getRemainingEpisodes(currentDate),
                progress: this.getProgressPercentage(currentDate)
            },
            schedule: {
                startDate: effectiveStartDate ? effectiveStartDate.toHumanString() : null,
                airDay: this.getAirDay(),
                shortAirDay: this.getShortAirDay(),
                shouldBeScheduled: this.shouldBeScheduled(),
                isCompletelyAired: this.isCompletelyAired(currentDate)
            },
            metadata: {
                skippedWeeks: this.skippedWeeks,
                hasCustomStartDate: this.customStartDate !== null,
                hasCustomEpisodes: this.customEpisodes !== null,
                season: this.season,
                studios: this.studios,
                licensors: this.licensors
            }
        };
    }

    /**
     * Create Show from legacy data format
     * @param {object} legacyData - Legacy show data
     * @returns {Show} New Show instance
     */
    static fromLegacyData(legacyData) {
        return new Show(legacyData);
    }

    /**
     * Create Show with schedule updates applied
     * @param {object} showData - Base show data
     * @param {object} updates - Schedule updates
     * @returns {Show} New Show instance with updates applied
     */
    static withUpdates(showData, updates = {}) {
        const mergedData = { ...showData };

        if (updates.custom_start_date) {
            mergedData.custom_start_date = updates.custom_start_date;
        }

        if (updates.custom_episodes !== undefined) {
            mergedData.custom_episodes = updates.custom_episodes;
        }

        if (updates.skipped_weeks !== undefined) {
            mergedData.skipped_weeks = updates.skipped_weeks;
        }

        return new Show(mergedData);
    }
}