/**
 * AiringStatus Value Object
 * Handles anime airing status with validation and predicates
 * 
 * Based on MyAnimeList airing status values:
 * 0 = finished_airing, 1 = currently_airing, 2 = not_yet_aired
 */
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';

export class AiringStatus {
    // Define valid airing status constants
    static FINISHED_AIRING = 0;
    static CURRENTLY_AIRING = 1;
    static NOT_YET_AIRED = 2;

    // Status string representations
    static STATUS_STRINGS = {
        [AiringStatus.FINISHED_AIRING]: 'finished_airing',
        [AiringStatus.CURRENTLY_AIRING]: 'currently_airing',
        [AiringStatus.NOT_YET_AIRED]: 'not_yet_aired'
    };

    // Display names
    static DISPLAY_NAMES = {
        [AiringStatus.FINISHED_AIRING]: 'Finished Airing',
        [AiringStatus.CURRENTLY_AIRING]: 'Currently Airing',
        [AiringStatus.NOT_YET_AIRED]: 'Not Yet Aired'
    };

    // Valid status values
    static VALID_VALUES = [
        AiringStatus.FINISHED_AIRING,
        AiringStatus.CURRENTLY_AIRING,
        AiringStatus.NOT_YET_AIRED
    ];

    /**
     * Create an AiringStatus
     * @param {number|string} status - The airing status (number or string)
     */
    constructor(status) {
        this._status = this._parseStatus(status);

        if (!AiringStatus.VALID_VALUES.includes(this._status)) {
            throw new ValidationError(`Invalid airing status: ${status}`, {
                context: {
                    input: status,
                    validValues: AiringStatus.VALID_VALUES,
                    validStrings: Object.values(AiringStatus.STATUS_STRINGS)
                }
            });
        }

        // Make this immutable
        Object.freeze(this);
    }

    /**
     * Parse status input (number or string)
     * @private
     * @param {number|string} status - Status input
     * @returns {number} Parsed status number
     */
    _parseStatus(status) {
        // Handle null/undefined
        if (status === null || status === undefined) {
            throw new ValidationError('Airing status cannot be null or undefined');
        }

        // Handle numeric input
        if (typeof status === 'number') {
            return status;
        }

        // Handle string input
        if (typeof status === 'string') {
            const trimmed = status.toLowerCase().trim();

            // Try to find by string value
            for (const [key, value] of Object.entries(AiringStatus.STATUS_STRINGS)) {
                if (value === trimmed) {
                    return parseInt(key, 10);
                }
            }

            // Try to parse as number
            const parsed = parseInt(trimmed, 10);
            if (!isNaN(parsed)) {
                return parsed;
            }

            // Handle common variations
            const variations = {
                'finished': AiringStatus.FINISHED_AIRING,
                'completed': AiringStatus.FINISHED_AIRING,
                'ended': AiringStatus.FINISHED_AIRING,
                'done': AiringStatus.FINISHED_AIRING,
                'current': AiringStatus.CURRENTLY_AIRING,
                'airing': AiringStatus.CURRENTLY_AIRING,
                'ongoing': AiringStatus.CURRENTLY_AIRING,
                'broadcasting': AiringStatus.CURRENTLY_AIRING,
                'upcoming': AiringStatus.NOT_YET_AIRED,
                'planned': AiringStatus.NOT_YET_AIRED,
                'future': AiringStatus.NOT_YET_AIRED,
                'unreleased': AiringStatus.NOT_YET_AIRED
            };

            if (variations.hasOwnProperty(trimmed)) {
                return variations[trimmed];
            }

            throw new ValidationError(`Unable to parse airing status string: ${status}`, {
                context: {
                    input: status,
                    supportedStrings: Object.values(AiringStatus.STATUS_STRINGS),
                    supportedVariations: Object.keys(variations)
                }
            });
        }

        throw new ValidationError(`Invalid airing status type: ${typeof status}`, {
            context: { input: status, type: typeof status }
        });
    }

    /**
     * Get the numeric status value
     * @returns {number} Status value (0, 1, or 2)
     */
    getValue() {
        return this._status;
    }

    /**
     * Get the string representation
     * @returns {string} Status string (e.g., 'currently_airing')
     */
    getString() {
        return AiringStatus.STATUS_STRINGS[this._status];
    }

    /**
     * Get the display name
     * @returns {string} Human-readable status name
     */
    getDisplayName() {
        return AiringStatus.DISPLAY_NAMES[this._status];
    }

    /**
     * Check if the show is currently airing
     * @returns {boolean} True if currently airing
     */
    isCurrentlyAiring() {
        return this._status === AiringStatus.CURRENTLY_AIRING;
    }

    /**
     * Check if the show has finished airing
     * @returns {boolean} True if finished airing
     */
    isFinishedAiring() {
        return this._status === AiringStatus.FINISHED_AIRING;
    }

    /**
     * Check if the show has not yet aired
     * @returns {boolean} True if not yet aired
     */
    isNotYetAired() {
        return this._status === AiringStatus.NOT_YET_AIRED;
    }

    /**
     * Check if the show is available to watch (aired or airing)
     * @returns {boolean} True if episodes are available
     */
    isAvailableToWatch() {
        return this._status === AiringStatus.CURRENTLY_AIRING ||
            this._status === AiringStatus.FINISHED_AIRING;
    }

    /**
     * Check if the show should appear in schedules
     * @returns {boolean} True if should be scheduled
     */
    shouldBeScheduled() {
        return this._status === AiringStatus.CURRENTLY_AIRING;
    }

    /**
     * Check if the show has a predictable release schedule
     * @returns {boolean} True if has regular schedule
     */
    hasPredictableSchedule() {
        return this._status === AiringStatus.CURRENTLY_AIRING;
    }

    /**
     * Check if episode count is likely final
     * @returns {boolean} True if episode count is probably final
     */
    hasCompleteEpisodeCount() {
        return this._status === AiringStatus.FINISHED_AIRING;
    }

    /**
     * Get status color for UI (CSS class or color code)
     * @returns {string} Color identifier
     */
    getStatusColor() {
        switch (this._status) {
            case AiringStatus.CURRENTLY_AIRING:
                return 'success'; // Green
            case AiringStatus.FINISHED_AIRING:
                return 'secondary'; // Gray
            case AiringStatus.NOT_YET_AIRED:
                return 'warning'; // Yellow/Orange
            default:
                return 'default';
        }
    }

    /**
     * Get priority for sorting (lower = higher priority)
     * @returns {number} Sort priority
     */
    getSortPriority() {
        switch (this._status) {
            case AiringStatus.CURRENTLY_AIRING:
                return 1; // Highest priority
            case AiringStatus.NOT_YET_AIRED:
                return 2; // Medium priority
            case AiringStatus.FINISHED_AIRING:
                return 3; // Lowest priority
            default:
                return 4;
        }
    }

    /**
     * Check equality with another AiringStatus
     * @param {AiringStatus} other - Other AiringStatus to compare
     * @returns {boolean} True if statuses are equal
     */
    equals(other) {
        if (!(other instanceof AiringStatus)) {
            return false;
        }
        return this._status === other._status;
    }

    /**
     * Compare this status with another for sorting
     * @param {AiringStatus} other - Other AiringStatus to compare
     * @returns {number} Comparison result (-1, 0, 1)
     */
    compare(other) {
        if (!(other instanceof AiringStatus)) {
            throw new ValidationError('Can only compare with another AiringStatus');
        }

        const thisPriority = this.getSortPriority();
        const otherPriority = other.getSortPriority();

        if (thisPriority < otherPriority) return -1;
        if (thisPriority > otherPriority) return 1;
        return 0;
    }

    /**
     * String representation
     * @returns {string} String representation
     */
    toString() {
        return this.getString();
    }

    /**
     * JSON representation
     * @returns {object} JSON object
     */
    toJSON() {
        return {
            value: this._status,
            string: this.getString(),
            displayName: this.getDisplayName(),
            properties: {
                isCurrentlyAiring: this.isCurrentlyAiring(),
                isFinishedAiring: this.isFinishedAiring(),
                isNotYetAired: this.isNotYetAired(),
                isAvailableToWatch: this.isAvailableToWatch(),
                shouldBeScheduled: this.shouldBeScheduled(),
                hasPredictableSchedule: this.hasPredictableSchedule(),
                hasCompleteEpisodeCount: this.hasCompleteEpisodeCount()
            },
            ui: {
                color: this.getStatusColor(),
                sortPriority: this.getSortPriority()
            }
        };
    }

    /**
     * Create AiringStatus from any input
     * @param {number|string} status - Status input
     * @returns {AiringStatus} New AiringStatus instance
     */
    static fromValue(status) {
        return new AiringStatus(status);
    }

    /**
     * Create AiringStatus for currently airing show
     * @returns {AiringStatus} Currently airing status
     */
    static currentlyAiring() {
        return new AiringStatus(AiringStatus.CURRENTLY_AIRING);
    }

    /**
     * Create AiringStatus for finished show
     * @returns {AiringStatus} Finished airing status
     */
    static finishedAiring() {
        return new AiringStatus(AiringStatus.FINISHED_AIRING);
    }

    /**
     * Create AiringStatus for upcoming show
     * @returns {AiringStatus} Not yet aired status
     */
    static notYetAired() {
        return new AiringStatus(AiringStatus.NOT_YET_AIRED);
    }

    /**
     * Get all valid status information
     * @returns {object[]} Array of status information
     */
    static getAllStatusInfo() {
        return AiringStatus.VALID_VALUES.map(value => ({
            value,
            string: AiringStatus.STATUS_STRINGS[value],
            displayName: AiringStatus.DISPLAY_NAMES[value]
        }));
    }

    /**
     * Validate if a status value is valid
     * @param {number|string} status - Status to validate
     * @returns {boolean} True if valid
     */
    static isValid(status) {
        try {
            new AiringStatus(status);
            return true;
        } catch {
            return false;
        }
    }
}