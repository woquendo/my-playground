import { ShowDate } from '../../../Domain/ValueObjects/ShowDate.js';
import { ValidationError } from '../../../Core/Errors/ApplicationErrors.js';

describe('ShowDate Value Object', () => {
    describe('Construction and Parsing', () => {
        test('should create ShowDate from valid MM-DD-YY format', () => {
            const showDate = new ShowDate('01-15-24');
            expect(showDate.format()).toBe('01-15-24');
        });

        test('should create ShowDate from Date object', () => {
            const date = new Date(2024, 0, 15); // January 15, 2024
            const showDate = new ShowDate(date);
            expect(showDate.format()).toBe('01-15-24');
        });

        test('should create ShowDate from another ShowDate', () => {
            const original = new ShowDate('03-20-24');
            const copy = new ShowDate(original);
            expect(copy.format()).toBe('03-20-24');
            expect(copy).not.toBe(original); // Should be different instances
        });

        test('should throw ValidationError for invalid format', () => {
            expect(() => new ShowDate('2024-01-15')).toThrow(ValidationError);
            expect(() => new ShowDate('1-15-24')).toThrow(ValidationError);
            expect(() => new ShowDate('01-5-24')).toThrow(ValidationError);
            expect(() => new ShowDate('13-15-24')).toThrow(ValidationError);
            expect(() => new ShowDate('01-32-24')).toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid input types', () => {
            expect(() => new ShowDate(null)).toThrow(ValidationError);
            expect(() => new ShowDate(undefined)).toThrow(ValidationError);
            expect(() => new ShowDate(123)).toThrow(ValidationError);
            expect(() => new ShowDate({})).toThrow(ValidationError);
        });
    });

    describe('Static Factory Methods', () => {
        test('should create today\'s date', () => {
            const today = ShowDate.today();
            const now = new Date();
            const expectedFormat = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getFullYear()).slice(-2)}`;
            expect(today.format()).toBe(expectedFormat);
        });

        test('should create from components', () => {
            const showDate = ShowDate.fromComponents(3, 15, 2024);
            expect(showDate.format()).toBe('03-15-24');
        });

        test('should validate components in fromComponents', () => {
            expect(() => ShowDate.fromComponents(0, 15, 2024)).toThrow(ValidationError);
            expect(() => ShowDate.fromComponents(13, 15, 2024)).toThrow(ValidationError);
            expect(() => ShowDate.fromComponents(3, 0, 2024)).toThrow(ValidationError);
            expect(() => ShowDate.fromComponents(3, 32, 2024)).toThrow(ValidationError);
            expect(() => ShowDate.fromComponents(3, 15, 1999)).toThrow(ValidationError);
        });
    });

    describe('Date Accessors', () => {
        test('should return correct month, day, year', () => {
            const showDate = new ShowDate('03-15-24');
            expect(showDate.getMonth()).toBe(3);
            expect(showDate.getDay()).toBe(15);
            expect(showDate.getYear()).toBe(2024);
        });

        test('should return correct full year', () => {
            const showDate = new ShowDate('03-15-24');
            expect(showDate.getFullYear()).toBe(2024);
        });

        test('should handle year conversion correctly', () => {
            const showDate2099 = new ShowDate('03-15-99');
            expect(showDate2099.getYear()).toBe(2099);

            const showDate2000 = new ShowDate('03-15-00');
            expect(showDate2000.getYear()).toBe(2000);
        });
    });

    describe('Date Comparisons', () => {
        test('should compare dates correctly with isBefore', () => {
            const earlier = new ShowDate('01-15-24');
            const later = new ShowDate('01-16-24');

            expect(earlier.isBefore(later)).toBe(true);
            expect(later.isBefore(earlier)).toBe(false);
            expect(earlier.isBefore(earlier)).toBe(false);
        });

        test('should compare dates correctly with isAfter', () => {
            const earlier = new ShowDate('01-15-24');
            const later = new ShowDate('01-16-24');

            expect(later.isAfter(earlier)).toBe(true);
            expect(earlier.isAfter(later)).toBe(false);
            expect(earlier.isAfter(earlier)).toBe(false);
        });

        test('should compare dates correctly with isEqual', () => {
            const date1 = new ShowDate('01-15-24');
            const date2 = new ShowDate('01-15-24');
            const date3 = new ShowDate('01-16-24');

            expect(date1.isEqual(date2)).toBe(true);
            expect(date1.isEqual(date3)).toBe(false);
        });

        test('should handle cross-year comparisons', () => {
            const dec2023 = new ShowDate('12-31-23');
            const jan2024 = new ShowDate('01-01-24');

            expect(dec2023.isBefore(jan2024)).toBe(true);
            expect(jan2024.isAfter(dec2023)).toBe(true);
        });
    });

    describe('Week Calculations', () => {
        test('should calculate weeks difference correctly', () => {
            const start = new ShowDate('01-01-24'); // Monday
            const oneWeekLater = new ShowDate('01-08-24');
            const twoWeeksLater = new ShowDate('01-15-24');

            expect(start.getWeeksDifferenceFrom(oneWeekLater)).toBe(1);
            expect(start.getWeeksDifferenceFrom(twoWeeksLater)).toBe(2);
            expect(oneWeekLater.getWeeksDifferenceFrom(start)).toBe(-1);
        });

        test('should handle same week correctly', () => {
            const monday = new ShowDate('01-01-24');
            const friday = new ShowDate('01-05-24');

            expect(monday.getWeeksDifferenceFrom(friday)).toBe(0);
            expect(friday.getWeeksDifferenceFrom(monday)).toBe(0);
        });

        test('should check if dates are in same week', () => {
            const monday = new ShowDate('01-01-24');
            const friday = new ShowDate('01-05-24');
            const nextMonday = new ShowDate('01-08-24');

            expect(monday.isSameWeek(friday)).toBe(true);
            expect(monday.isSameWeek(nextMonday)).toBe(false);
        });
    });

    describe('Date Arithmetic', () => {
        test('should add days correctly', () => {
            const start = new ShowDate('01-15-24');
            const result = start.addDays(10);
            expect(result.format()).toBe('01-25-24');
        });

        test('should subtract days correctly', () => {
            const start = new ShowDate('01-25-24');
            const result = start.addDays(-10);
            expect(result.format()).toBe('01-15-24');
        });

        test('should add weeks correctly', () => {
            const start = new ShowDate('01-15-24');
            const result = start.addWeeks(2);
            expect(result.format()).toBe('01-29-24');
        });

        test('should handle month boundaries in arithmetic', () => {
            const end_of_jan = new ShowDate('01-31-24');
            const result = end_of_jan.addDays(1);
            expect(result.format()).toBe('02-01-24');
        });

        test('should handle year boundaries in arithmetic', () => {
            const end_of_year = new ShowDate('12-31-23');
            const result = end_of_year.addDays(1);
            expect(result.format()).toBe('01-01-24');
        });
    });

    describe('Validation and Edge Cases', () => {
        test('should handle leap year dates', () => {
            const leapDay = new ShowDate('02-29-24'); // 2024 is a leap year
            expect(leapDay.format()).toBe('02-29-24');

            // Should handle leap year arithmetic
            const beforeLeap = new ShowDate('02-28-24');
            const afterLeap = beforeLeap.addDays(1);
            expect(afterLeap.format()).toBe('02-29-24');
        });

        test('should reject invalid leap year dates', () => {
            expect(() => new ShowDate('02-29-23')).toThrow(ValidationError); // 2023 is not a leap year
        });

        test('should maintain immutability', () => {
            const original = new ShowDate('01-15-24');
            const modified = original.addDays(5);

            expect(original.format()).toBe('01-15-24');
            expect(modified.format()).toBe('01-20-24');
            expect(original).not.toBe(modified);
        });

        test('should return current week start', () => {
            const wednesday = new ShowDate('01-03-24'); // Wednesday
            const weekStart = wednesday.getCurrentWeekStart();
            // Should return the Monday of that week
            expect(weekStart.format()).toBe('01-01-24');
        });
    });

    describe('Utility Methods', () => {
        test('should convert to Date object correctly', () => {
            const showDate = new ShowDate('03-15-24');
            const dateObj = showDate.toDate();

            expect(dateObj).toBeInstanceOf(Date);
            expect(dateObj.getFullYear()).toBe(2024);
            expect(dateObj.getMonth()).toBe(2); // March is month 2 (0-indexed)
            expect(dateObj.getDate()).toBe(15);
        });

        test('should format date consistently', () => {
            const showDate = new ShowDate('03-05-24');
            expect(showDate.format()).toBe('03-05-24');
            expect(showDate.toString()).toBe('03-05-24');
        });

        test('should provide readable string representation', () => {
            const showDate = new ShowDate('03-15-24');
            expect(showDate.toString()).toBe('03-15-24');
        });
    });
});