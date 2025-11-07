/**
 * ShowStatus Value Object
 * Handles anime show watching status with validation and transitions
 * 
 * Valid statuses: watching, completed, plan_to_watch, on_hold, dropped
 */
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';

export class ShowStatus {
    // Define valid status constants
    static WATCHING = 'watching';
    static COMPLETED = 'completed';
    static PLAN_TO_WATCH = 'plan_to_watch';
    static ON_HOLD = 'on_hold';
    static DROPPED = 'dropped';

    // Array of all valid statuses
    static VALID_STATUSES = [
        ShowStatus.WATCHING,
        ShowStatus.COMPLETED,
        ShowStatus.PLAN_TO_WATCH,
        ShowStatus.ON_HOLD,
        ShowStatus.DROPPED
    ];

    // Status display names
    static STATUS_NAMES = {
        [ShowStatus.WATCHING]: 'Currently Watching',
        [ShowStatus.COMPLETED]: 'Completed',
        [ShowStatus.PLAN_TO_WATCH]: 'Plan to Watch',
        [ShowStatus.ON_HOLD]: 'On Hold',
        [ShowStatus.DROPPED]: 'Dropped'
    };

    // Status priorities for sorting (lower number = higher priority)
    static STATUS_PRIORITIES = {
        [ShowStatus.WATCHING]: 1,
        [ShowStatus.PLAN_TO_WATCH]: 2,
        [ShowStatus.ON_HOLD]: 3,
        [ShowStatus.COMPLETED]: 4,
        [ShowStatus.DROPPED]: 5
    };

    /**
     * Create a ShowStatus
     * @param {string} status - The status value
     */
    constructor(status) {
        if (!status || typeof status !== 'string') {
            throw new ValidationError('Show status must be a non-empty string', {
                context: { input: status, type: typeof status }
            });
        }

        const normalizedStatus = status.toLowerCase().trim();

        if (!ShowStatus.VALID_STATUSES.includes(normalizedStatus)) {
            throw new ValidationError(`Invalid show status: ${status}`, {
                context: {
                    input: status,
                    validStatuses: ShowStatus.VALID_STATUSES,
                    suggestion: ShowStatus._findClosestStatus(normalizedStatus)
                }
            });
        }

        this._status = normalizedStatus;

        // Make this immutable
        Object.freeze(this);
    }

    /**
     * Find the closest valid status for suggestions
     * @private
     * @param {string} input - Input status
     * @returns {string|null} Closest valid status or null
     */
    static _findClosestStatus(input) {
        // Simple fuzzy matching for common variations
        const variations = {
            'watch': ShowStatus.WATCHING,
            'current': ShowStatus.WATCHING,
            'viewing': ShowStatus.WATCHING,
            'done': ShowStatus.COMPLETED,
            'finished': ShowStatus.COMPLETED,
            'complete': ShowStatus.COMPLETED,
            'plan': ShowStatus.PLAN_TO_WATCH,
            'planning': ShowStatus.PLAN_TO_WATCH,
            'ptw': ShowStatus.PLAN_TO_WATCH,
            'hold': ShowStatus.ON_HOLD,
            'paused': ShowStatus.ON_HOLD,
            'drop': ShowStatus.DROPPED,
            'abandon': ShowStatus.DROPPED
        };

        for (const [key, value] of Object.entries(variations)) {
            if (input.includes(key) || key.includes(input)) {
                return value;
            }
        }

        return null;
    }

    /**
     * Get the status value
     * @returns {string} Status value
     */
    getValue() {
        return this._status;
    }

    /**
     * Get the display name for this status
     * @returns {string} Human-readable status name
     */
    getDisplayName() {
        return ShowStatus.STATUS_NAMES[this._status];
    }

    /**
     * Get the priority of this status (for sorting)
     * @returns {number} Priority number (lower = higher priority)
     */
    getPriority() {
        return ShowStatus.STATUS_PRIORITIES[this._status];
    }

    /**
     * Check if this status represents an active viewing state
     * @returns {boolean} True if actively watching
     */
    isActivelyWatching() {
        return this._status === ShowStatus.WATCHING;
    }

    /**
     * Check if this status represents a completed state
     * @returns {boolean} True if completed
     */
    isCompleted() {
        return this._status === ShowStatus.COMPLETED;
    }

    /**
     * Check if this status represents a future intent
     * @returns {boolean} True if planning to watch
     */
    isPlanned() {
        return this._status === ShowStatus.PLAN_TO_WATCH;
    }

    /**
     * Check if this status represents a paused state
     * @returns {boolean} True if on hold
     */
    isOnHold() {
        return this._status === ShowStatus.ON_HOLD;
    }

    /**
     * Check if this status represents an abandoned state
     * @returns {boolean} True if dropped
     */
    isDropped() {
        return this._status === ShowStatus.DROPPED;
    }

    /**
     * Check if this status allows episode progression
     * @returns {boolean} True if episodes can be tracked
     */
    allowsEpisodeProgression() {
        return this.isActivelyWatching() || this.isOnHold();
    }

    /**
     * Check if this status allows scheduling
     * @returns {boolean} True if show can be scheduled
     */
    allowsScheduling() {
        return this.isActivelyWatching() || this.isPlanned();
    }

    /**
     * Get valid transition statuses from this status
     * @returns {string[]} Array of valid next statuses
     */
    getValidTransitions() {
        switch (this._status) {
            case ShowStatus.PLAN_TO_WATCH:
                return [ShowStatus.WATCHING, ShowStatus.DROPPED];

            case ShowStatus.WATCHING:
                return [ShowStatus.COMPLETED, ShowStatus.ON_HOLD, ShowStatus.DROPPED];

            case ShowStatus.ON_HOLD:
                return [ShowStatus.WATCHING, ShowStatus.COMPLETED, ShowStatus.DROPPED];

            case ShowStatus.COMPLETED:
                return [ShowStatus.WATCHING]; // For rewatching

            case ShowStatus.DROPPED:
                return [ShowStatus.WATCHING, ShowStatus.PLAN_TO_WATCH];

            default:
                return [];
        }
    }

    /**
     * Check if transition to another status is valid
     * @param {string|ShowStatus} targetStatus - Target status
     * @returns {boolean} True if transition is valid
     */
    canTransitionTo(targetStatus) {
        const target = targetStatus instanceof ShowStatus ?
            targetStatus.getValue() : targetStatus;

        return this.getValidTransitions().includes(target);
    }

    /**
     * Create a new ShowStatus with a different value (for transitions)
     * @param {string} newStatus - New status value
     * @returns {ShowStatus} New ShowStatus instance
     */
    transitionTo(newStatus) {
        if (!this.canTransitionTo(newStatus)) {
            throw new ValidationError(`Invalid status transition from ${this._status} to ${newStatus}`, {
                context: {
                    currentStatus: this._status,
                    targetStatus: newStatus,
                    validTransitions: this.getValidTransitions()
                }
            });
        }

        return new ShowStatus(newStatus);
    }

    /**
     * Compare this status with another for sorting
     * @param {ShowStatus} other - Other ShowStatus to compare
     * @returns {number} Comparison result (-1, 0, 1)
     */
    compare(other) {
        if (!(other instanceof ShowStatus)) {
            throw new ValidationError('Can only compare with another ShowStatus');
        }

        const thisPriority = this.getPriority();
        const otherPriority = other.getPriority();

        if (thisPriority < otherPriority) return -1;
        if (thisPriority > otherPriority) return 1;
        return 0;
    }

    /**
     * Check equality with another ShowStatus
     * @param {ShowStatus} other - Other ShowStatus to compare
     * @returns {boolean} True if statuses are equal
     */
    equals(other) {
        if (!(other instanceof ShowStatus)) {
            return false;
        }
        return this._status === other._status;
    }

    /**
     * String representation
     * @returns {string} Status value
     */
    toString() {
        return this._status;
    }

    /**
     * JSON representation
     * @returns {object} JSON object
     */
    toJSON() {
        return {
            value: this._status,
            displayName: this.getDisplayName(),
            priority: this.getPriority(),
            properties: {
                isActivelyWatching: this.isActivelyWatching(),
                isCompleted: this.isCompleted(),
                isPlanned: this.isPlanned(),
                isOnHold: this.isOnHold(),
                isDropped: this.isDropped(),
                allowsEpisodeProgression: this.allowsEpisodeProgression(),
                allowsScheduling: this.allowsScheduling()
            },
            validTransitions: this.getValidTransitions()
        };
    }

    /**
     * Create ShowStatus from any common status string
     * @param {string} statusString - Status string (flexible input)
     * @returns {ShowStatus} New ShowStatus instance
     */
    static fromString(statusString) {
        return new ShowStatus(statusString);
    }

    /**
     * Get all valid statuses
     * @returns {string[]} Array of all valid status values
     */
    static getAllValidStatuses() {
        return [...ShowStatus.VALID_STATUSES];
    }

    /**
     * Get all status information for display
     * @returns {object[]} Array of status information objects
     */
    static getAllStatusInfo() {
        return ShowStatus.VALID_STATUSES.map(status => ({
            value: status,
            displayName: ShowStatus.STATUS_NAMES[status],
            priority: ShowStatus.STATUS_PRIORITIES[status]
        }));
    }

    /**
     * Validate if a status string is valid
     * @param {string} status - Status to validate
     * @returns {boolean} True if valid
     */
    static isValid(status) {
        try {
            new ShowStatus(status);
            return true;
        } catch {
            return false;
        }
    }
}