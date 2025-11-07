/**
 * ShowDate Value Object
 * Handles anime show date parsing, validation, and calculations
 * 
 * Format: MM-DD-YY (e.g., "10-03-25" represents October 3, 2025)
 */
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';

export class ShowDate {
    /**
     * Create a ShowDate from a date string
     * @param {string|Date} dateInput - Date string in MM-DD-YY format or Date object
     */
    constructor(dateInput) {
        if (dateInput instanceof Date) {
            this._date = new Date(dateInput);
        } else if (typeof dateInput === 'string') {
            this._date = this._parseShowDateString(dateInput);
        } else {
            throw new ValidationError('ShowDate must be created from a string or Date object', {
                context: { input: dateInput, type: typeof dateInput }
            });
        }

        // Ensure we have a valid date
        if (isNaN(this._date.getTime())) {
            throw new ValidationError('Invalid date provided to ShowDate', {
                context: { input: dateInput }
            });
        }

        // Make this immutable
        Object.freeze(this);
    }

    /**
     * Parse MM-DD-YY format date string
     * @private
     * @param {string} dateString - Date string in MM-DD-YY format
     * @returns {Date} Parsed date object
     */
    _parseShowDateString(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            throw new ValidationError('Date string is required');
        }

        // Match MM-DD-YY format
        const dateMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
        if (!dateMatch) {
            throw new ValidationError(`Invalid date format. Expected MM-DD-YY, got: ${dateString}`, {
                context: {
                    input: dateString,
                    expectedFormat: 'MM-DD-YY',
                    example: '10-03-25'
                }
            });
        }

        const [, monthStr, dayStr, yearStr] = dateMatch;
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        const year = 2000 + parseInt(yearStr, 10); // Convert YY to 20YY

        // Validate month and day ranges
        if (month < 1 || month > 12) {
            throw new ValidationError(`Invalid month: ${month}. Must be 1-12`, {
                context: { month, input: dateString }
            });
        }

        if (day < 1 || day > 31) {
            throw new ValidationError(`Invalid day: ${day}. Must be 1-31`, {
                context: { day, input: dateString }
            });
        }

        // Create date (month is 0-based in JavaScript Date)
        const date = new Date(year, month - 1, day);

        // Verify the date is valid (handles things like Feb 30th)
        if (date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day) {
            throw new ValidationError(`Invalid date: ${dateString} does not represent a valid calendar date`, {
                context: {
                    input: dateString,
                    parsed: { year, month, day },
                    result: {
                        year: date.getFullYear(),
                        month: date.getMonth() + 1,
                        day: date.getDate()
                    }
                }
            });
        }

        return date;
    }

    /**
     * Get the underlying Date object (returns a copy for immutability)
     * @returns {Date} Copy of the internal date
     */
    toDate() {
        return new Date(this._date);
    }

    /**
     * Get the day of the week (0 = Sunday, 1 = Monday, etc.)
     * @returns {number} Day of week
     */
    getDayOfWeek() {
        return this._date.getDay();
    }

    /**
     * Get the day name
     * @returns {string} Day name (e.g., 'Sunday', 'Monday')
     */
    getDayName() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[this.getDayOfWeek()];
    }

    /**
     * Get the short day name
     * @returns {string} Short day name (e.g., 'Sun', 'Mon')
     */
    getShortDayName() {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[this.getDayOfWeek()];
    }

    /**
     * Calculate weeks difference from this date to another date
     * @param {Date|ShowDate} targetDate - Target date for comparison
     * @returns {number} Number of weeks difference (can be negative if target is before this date)
     */
    getWeeksDifferenceFrom(targetDate) {
        let target;
        if (targetDate instanceof ShowDate) {
            target = targetDate.toDate();
        } else if (targetDate instanceof Date) {
            target = targetDate;
        } else {
            throw new ValidationError('Target date must be a Date or ShowDate object');
        }

        const timeDiff = target.getTime() - this._date.getTime();
        return Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000));
    }

    /**
     * Calculate weeks difference to this date from another date
     * @param {Date|ShowDate} fromDate - Date to calculate from
     * @returns {number} Number of weeks from the given date to this date
     */
    getWeeksDifferenceTO(fromDate) {
        let from;
        if (fromDate instanceof ShowDate) {
            from = fromDate.toDate();
        } else if (fromDate instanceof Date) {
            from = fromDate;
        } else {
            throw new ValidationError('From date must be a Date or ShowDate object');
        }

        const timeDiff = this._date.getTime() - from.getTime();
        return Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000));
    }

    /**
     * Check if this date is before another date
     * @param {Date|ShowDate} otherDate - Date to compare against
     * @returns {boolean} True if this date is before the other date
     */
    isBefore(otherDate) {
        let other;
        if (otherDate instanceof ShowDate) {
            other = otherDate.toDate();
        } else if (otherDate instanceof Date) {
            other = otherDate;
        } else {
            throw new ValidationError('Other date must be a Date or ShowDate object');
        }

        return this._date.getTime() < other.getTime();
    }

    /**
     * Check if this date is after another date
     * @param {Date|ShowDate} otherDate - Date to compare against
     * @returns {boolean} True if this date is after the other date
     */
    isAfter(otherDate) {
        let other;
        if (otherDate instanceof ShowDate) {
            other = otherDate.toDate();
        } else if (otherDate instanceof Date) {
            other = otherDate;
        } else {
            throw new ValidationError('Other date must be a Date or ShowDate object');
        }

        return this._date.getTime() > other.getTime();
    }

    /**
     * Check if this date is on the same day as another date
     * @param {Date|ShowDate} otherDate - Date to compare against
     * @returns {boolean} True if both dates are on the same day
     */
    isSameDay(otherDate) {
        let other;
        if (otherDate instanceof ShowDate) {
            other = otherDate.toDate();
        } else if (otherDate instanceof Date) {
            other = otherDate;
        } else {
            throw new ValidationError('Other date must be a Date or ShowDate object');
        }

        return this._date.getFullYear() === other.getFullYear() &&
            this._date.getMonth() === other.getMonth() &&
            this._date.getDate() === other.getDate();
    }

    /**
     * Check if this date is on the same day of the week as another date
     * @param {Date|ShowDate} otherDate - Date to compare against
     * @returns {boolean} True if both dates are on the same day of the week
     */
    isSameDayOfWeek(otherDate) {
        let other;
        if (otherDate instanceof ShowDate) {
            other = otherDate.toDate();
        } else if (otherDate instanceof Date) {
            other = otherDate;
        } else {
            throw new ValidationError('Other date must be a Date or ShowDate object');
        }

        return this._date.getDay() === other.getDay();
    }

    /**
     * Convert back to MM-DD-YY format string
     * @returns {string} Date string in MM-DD-YY format
     */
    toString() {
        const month = (this._date.getMonth() + 1).toString().padStart(2, '0');
        const day = this._date.getDate().toString().padStart(2, '0');
        const year = this._date.getFullYear().toString().slice(-2);
        return `${month}-${day}-${year}`;
    }

    /**
     * Convert to a human-readable format
     * @returns {string} Human-readable date string
     */
    toHumanString() {
        return this._date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Convert to JSON representation
     * @returns {object} JSON representation
     */
    toJSON() {
        return {
            value: this.toString(),
            date: this._date.toISOString(),
            dayOfWeek: this.getDayOfWeek(),
            dayName: this.getDayName()
        };
    }

    /**
     * Create ShowDate from current date
     * @returns {ShowDate} ShowDate representing now
     */
    static now() {
        return new ShowDate(new Date());
    }

    /**
     * Create ShowDate representing today (alias for now())
     * @returns {ShowDate} ShowDate representing today
     */
    static today() {
        return new ShowDate(new Date());
    }

    /**
     * Add weeks to this date
     * @param {number} weeks - Number of weeks to add (can be negative)
     * @returns {ShowDate} New ShowDate with weeks added
     */
    addWeeks(weeks) {
        const newDate = new Date(this._date);
        newDate.setDate(newDate.getDate() + (weeks * 7));
        return new ShowDate(newDate);
    }

    /**
     * Add days to this date  
     * @param {number} days - Number of days to add (can be negative)
     * @returns {ShowDate} New ShowDate with days added
     */
    addDays(days) {
        const newDate = new Date(this._date);
        newDate.setDate(newDate.getDate() + days);
        return new ShowDate(newDate);
    }

    /**
     * Check if this date equals another date
     * @param {ShowDate|Date} otherDate - Date to compare against
     * @returns {boolean} True if dates are equal
     */
    isEqual(otherDate) {
        let other;
        if (otherDate instanceof ShowDate) {
            other = otherDate.toDate();
        } else if (otherDate instanceof Date) {
            other = otherDate;
        } else {
            throw new ValidationError('Other date must be a Date or ShowDate object');
        }

        return this._date.getTime() === other.getTime();
    }

    /**
     * Get the month (1-12)
     * @returns {number} Month number (1-based)
     */
    getMonth() {
        return this._date.getMonth() + 1;
    }

    /**
     * Get the day of month
     * @returns {number} Day of month
     */
    getDay() {
        return this._date.getDate();
    }

    /**
     * Get the full year
     * @returns {number} Full year (e.g., 2024)
     */
    getYear() {
        return this._date.getFullYear();
    }

    /**
     * Get the full year (alias for getYear)
     * @returns {number} Full year
     */
    getFullYear() {
        return this._date.getFullYear();
    }

    /**
     * Check if this date is in the same week as another date
     * @param {ShowDate} otherDate - Date to compare against
     * @returns {boolean} True if in same week
     */
    isSameWeek(otherDate) {
        if (!(otherDate instanceof ShowDate)) {
            throw new ValidationError('Other date must be a ShowDate instance');
        }

        return Math.abs(this.getWeeksDifferenceFrom(otherDate)) === 0;
    }

    /**
     * Get the start of the current week (Monday)
     * @returns {ShowDate} ShowDate representing Monday of this week
     */
    getCurrentWeekStart() {
        const dayOfWeek = this._date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so 6 days back
        return this.addDays(-daysToMonday);
    }

    /**
     * Format the date as MM-DD-YY string
     * @returns {string} Formatted date string
     */
    format() {
        return this.toString();
    }

    /**
     * Create ShowDate from components
     * @param {number} month - Month (1-12)
     * @param {number} day - Day of month
     * @param {number} year - Full year
     * @returns {ShowDate} New ShowDate instance
     */
    static fromComponents(month, day, year) {
        if (month < 1 || month > 12) {
            throw new ValidationError('Month must be between 1 and 12');
        }
        if (day < 1 || day > 31) {
            throw new ValidationError('Day must be between 1 and 31');
        }
        if (year < 2000 || year > 2099) {
            throw new ValidationError('Year must be between 2000 and 2099');
        }

        const date = new Date(year, month - 1, day);
        return new ShowDate(date);
    }

    /**
     * Create ShowDate from ISO string
     * @param {string} isoString - ISO date string
     * @returns {ShowDate} ShowDate from ISO string
     */
    static fromISO(isoString) {
        return new ShowDate(new Date(isoString));
    }

    /**
     * Validate a date string format
     * @param {string} dateString - Date string to validate
     * @returns {boolean} True if valid MM-DD-YY format
     */
    static isValidFormat(dateString) {
        try {
            new ShowDate(dateString);
            return true;
        } catch {
            return false;
        }
    }
}