/**
 * AiringStatus Value Object
 * Handles anime airing status with validation and predicates
 * 
 * Based on MyAnimeList airing status values:
 * 0 = finished_airing, 1 = currently_airing, 2 = not_yet_aired
 */
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';

export class AiringStatus {
    // Define valid airing status constants (as strings to match tests)
    static CURRENTLY_AIRING = 'currently_airing';
    static FINISHED_AIRING = 'finished_airing';
    static NOT_YET_AIRED = 'not_yet_aired';

    // Display names
    static DISPLAY_NAMES = {
        [AiringStatus.CURRENTLY_AIRING]: 'Currently Airing',
        [AiringStatus.FINISHED_AIRING]: 'Finished Airing',
        [AiringStatus.NOT_YET_AIRED]: 'Not Yet Aired'
    };

    // Valid status values
    static VALID_STATUSES = [
        AiringStatus.CURRENTLY_AIRING,
        AiringStatus.FINISHED_AIRING,
        AiringStatus.NOT_YET_AIRED
    ];

    /**
     * Create an AiringStatus
     * @param {number|string} status - The airing status (number or string)
     */
    constructor(status) {
        this._status = this._parseStatus(status);

        if (!AiringStatus.VALID_STATUSES.includes(this._status)) {
            throw new ValidationError(`Invalid airing status: ${status}`, {
                context: {
                    input: status,
                    validStatuses: AiringStatus.VALID_STATUSES
                }
            });
        }

        // Make this immutable
        Object.freeze(this);
    }

    /**
     * Parse status input (number, string, or AiringStatus instance)
     * @private
     * @param {number|string|AiringStatus} status - Status input
     * @returns {string} Parsed status string
     */
    _parseStatus(status) {
        // Handle null/undefined
        if (status === null || status === undefined) {
            throw new ValidationError('Airing status cannot be null or undefined');
        }

        // Handle AiringStatus instance
        if (status instanceof AiringStatus) {
            return status._status;
        }

        // Handle numeric input (backward compatibility with MAL API)
        if (typeof status === 'number') {
            const numericMap = {
                0: AiringStatus.FINISHED_AIRING,
                1: AiringStatus.CURRENTLY_AIRING,
                2: AiringStatus.NOT_YET_AIRED
            };

            if (numericMap[status] !== undefined) {
                return numericMap[status];
            }

            throw new ValidationError(`Invalid numeric airing status: ${status}`, {
                context: {
                    input: status,
                    validNumericValues: Object.keys(numericMap)
                }
            });
        }

        // Handle string input - STRICT validation (no trimming, no case normalization)
        if (typeof status === 'string') {
            // Check if it's already a valid status (exact match required)
            if (AiringStatus.VALID_STATUSES.includes(status)) {
                return status;
            }

            throw new ValidationError(`Invalid airing status string: ${status}`, {
                context: {
                    input: status,
                    validStatuses: AiringStatus.VALID_STATUSES,
                    note: 'Status must be an exact match (case-sensitive, no whitespace)'
                }
            });
        }

        throw new ValidationError(`Invalid airing status type: ${typeof status}`, {
            context: { input: status, type: typeof status }
        });
    }    /**
     * Get the status value
     * @returns {string} Status value (e.g., 'currently_airing')
     */
    getValue() {
        return this._status;
    }

    /**
     * Get the string representation
     * @returns {string} Status string (e.g., 'currently_airing')
     */
    getString() {
        return this._status;
    }

    /**
     * Get the display name
     * @returns {string} Human-readable status name
     */
    getDisplayName() {
        const displayNames = {
            'finished_airing': 'Finished Airing',
            'currently_airing': 'Currently Airing',
            'not_yet_aired': 'Not Yet Aired'
        };
        return displayNames[this._status];
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
        return this._status === AiringStatus.CURRENTLY_AIRING ||
            this._status === AiringStatus.FINISHED_AIRING;
    }

    /**
     * Check if episodes are available to watch
     * @returns {boolean} True if episodes are available
     */
    hasEpisodesAvailable() {
        return this._status === AiringStatus.CURRENTLY_AIRING ||
            this._status === AiringStatus.FINISHED_AIRING;
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
            case AiringStatus.FINISHED_AIRING:
                return 2; // Medium priority
            case AiringStatus.NOT_YET_AIRED:
                return 3; // Lowest priority
            default:
                return 4;
        }
    }

    /**
     * Get the priority value (alias for getSortPriority for test compatibility)
     * @returns {number} Priority value
     */
    getPriority() {
        return this.getSortPriority();
    }

    /**
     * Check if this status has higher priority than another
     * @param {AiringStatus} other - Other status to compare
     * @returns {boolean} True if this has higher priority (lower number)
     */
    hasHigherPriorityThan(other) {
        if (!(other instanceof AiringStatus)) {
            throw new ValidationError('Can only compare priority with another AiringStatus');
        }
        return this.getPriority() < other.getPriority();
    }

    /**
     * Check if status allows new episodes to be added
     * @returns {boolean} True if new episodes can be added
     */
    allowsNewEpisodes() {
        return this._status === AiringStatus.CURRENTLY_AIRING;
    }

    /**
     * Check if status requires episode tracking
     * @returns {boolean} True if should track episode progress
     */
    requiresEpisodeTracking() {
        return this._status === AiringStatus.CURRENTLY_AIRING;
    }

    /**
     * Get the scheduling frequency for this status
     * @returns {string} Scheduling frequency ('weekly', 'none')
     */
    getSchedulingFrequency() {
        return this._status === AiringStatus.CURRENTLY_AIRING ? 'weekly' : 'none';
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
     * JSON representation (returns primitive string value)
     * @returns {string} Status string
     */
    toJSON() {
        return this._status;
    }

    /**
     * Value representation (returns primitive string value)
     * @returns {string} Status string
     */
    valueOf() {
        return this._status;
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
     * Create AiringStatus from MyAnimeList status
     * @param {number|string} malStatus - MAL status (string or numeric code)
     * @returns {AiringStatus} New AiringStatus instance
     */
    static fromMALStatus(malStatus) {
        // Handle null/undefined
        if (malStatus === null || malStatus === undefined) {
            throw new ValidationError('MAL status cannot be null or undefined');
        }

        // MAL numeric codes: 1 = currently_airing, 2 = finished_airing, 3 = not_yet_aired
        if (typeof malStatus === 'number') {
            const malNumericMap = {
                1: AiringStatus.CURRENTLY_AIRING,
                2: AiringStatus.FINISHED_AIRING,
                3: AiringStatus.NOT_YET_AIRED
            };

            if (malNumericMap[malStatus] === undefined) {
                throw new ValidationError(`Invalid MAL numeric status code: ${malStatus}`, {
                    context: { input: malStatus, validCodes: Object.keys(malNumericMap) }
                });
            }

            return new AiringStatus(malNumericMap[malStatus]);
        }

        // Handle string input (should already be in correct format)
        if (typeof malStatus === 'string') {
            const trimmed = malStatus.toLowerCase().trim();

            if (AiringStatus.VALID_STATUSES.includes(trimmed)) {
                return new AiringStatus(trimmed);
            }

            throw new ValidationError(`Invalid MAL status string: ${malStatus}`, {
                context: { input: malStatus, validStatuses: AiringStatus.VALID_STATUSES }
            });
        }

        throw new ValidationError(`Invalid MAL status type: ${typeof malStatus}`, {
            context: { input: malStatus, type: typeof malStatus }
        });
    }

    /**
     * Convert to MyAnimeList format
     * @returns {string} MAL-compatible status string
     */
    toMALFormat() {
        return this._status;
    }

    /**
     * Get all valid status information
     * @returns {object[]} Array of status information
     */
    static getAllStatusInfo() {
        return AiringStatus.VALID_STATUSES.map(status => ({
            value: status,
            displayName: new AiringStatus(status).getDisplayName()
        }));
    }

    /**
     * Get all valid status values
     * @returns {string[]} Array of valid status strings
     */
    static getAllValidStatuses() {
        return [...AiringStatus.VALID_STATUSES];
    }

    /**
     * Check if a value is a valid status
     * @param {any} value - Value to check
     * @returns {boolean} True if valid status
     */
    static isValidStatus(value) {
        if (typeof value !== 'string') {
            return false;
        }
        return AiringStatus.VALID_STATUSES.includes(value.toLowerCase().trim());
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