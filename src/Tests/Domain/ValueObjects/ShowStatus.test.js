import { ShowStatus } from '../../../Domain/ValueObjects/ShowStatus.js';
import { ValidationError } from '../../../Core/Errors/ApplicationErrors.js';

describe('ShowStatus Value Object', () => {
    describe('Construction and Validation', () => {
        test('should create ShowStatus with valid status', () => {
            const status = new ShowStatus('watching');
            expect(status.getValue()).toBe('watching');
        });

        test('should accept all valid statuses', () => {
            const validStatuses = [
                'watching', 'completed', 'on_hold', 'dropped',
                'plan_to_watch', 'rewatching'
            ];

            validStatuses.forEach(status => {
                expect(() => new ShowStatus(status)).not.toThrow();
                const showStatus = new ShowStatus(status);
                expect(showStatus.getValue()).toBe(status);
            });
        });

        test('should throw ValidationError for invalid status', () => {
            const invalidStatuses = [
                'invalid', 'WATCHING', 'complete', 'planning',
                '', null, undefined, 123, {}
            ];

            invalidStatuses.forEach(status => {
                expect(() => new ShowStatus(status)).toThrow(ValidationError);
            });
        });

        test('should create from another ShowStatus instance', () => {
            const original = new ShowStatus('watching');
            const copy = new ShowStatus(original);
            expect(copy.getValue()).toBe('watching');
            expect(copy).not.toBe(original); // Should be different instances
        });
    });

    describe('Status Constants', () => {
        test('should have all expected constants', () => {
            expect(ShowStatus.WATCHING).toBe('watching');
            expect(ShowStatus.COMPLETED).toBe('completed');
            expect(ShowStatus.ON_HOLD).toBe('on_hold');
            expect(ShowStatus.DROPPED).toBe('dropped');
            expect(ShowStatus.PLAN_TO_WATCH).toBe('plan_to_watch');
            expect(ShowStatus.REWATCHING).toBe('rewatching');
        });

        test('should create status using constants', () => {
            const status = new ShowStatus(ShowStatus.WATCHING);
            expect(status.getValue()).toBe('watching');
        });
    });

    describe('Status Predicates', () => {
        test('should correctly identify watching status', () => {
            const watching = new ShowStatus('watching');
            const completed = new ShowStatus('completed');

            expect(watching.isWatching()).toBe(true);
            expect(completed.isWatching()).toBe(false);
        });

        test('should correctly identify completed status', () => {
            const completed = new ShowStatus('completed');
            const watching = new ShowStatus('watching');

            expect(completed.isCompleted()).toBe(true);
            expect(watching.isCompleted()).toBe(false);
        });

        test('should correctly identify on hold status', () => {
            const onHold = new ShowStatus('on_hold');
            const watching = new ShowStatus('watching');

            expect(onHold.isOnHold()).toBe(true);
            expect(watching.isOnHold()).toBe(false);
        });

        test('should correctly identify dropped status', () => {
            const dropped = new ShowStatus('dropped');
            const watching = new ShowStatus('watching');

            expect(dropped.isDropped()).toBe(true);
            expect(watching.isDropped()).toBe(false);
        });

        test('should correctly identify plan to watch status', () => {
            const planToWatch = new ShowStatus('plan_to_watch');
            const watching = new ShowStatus('watching');

            expect(planToWatch.isPlanToWatch()).toBe(true);
            expect(watching.isPlanToWatch()).toBe(false);
        });

        test('should correctly identify rewatching status', () => {
            const rewatching = new ShowStatus('rewatching');
            const watching = new ShowStatus('watching');

            expect(rewatching.isRewatching()).toBe(true);
            expect(watching.isRewatching()).toBe(false);
        });

        test('should correctly identify active viewing statuses', () => {
            const watching = new ShowStatus('watching');
            const rewatching = new ShowStatus('rewatching');
            const completed = new ShowStatus('completed');
            const onHold = new ShowStatus('on_hold');

            expect(watching.isActivelyViewing()).toBe(true);
            expect(rewatching.isActivelyViewing()).toBe(true);
            expect(completed.isActivelyViewing()).toBe(false);
            expect(onHold.isActivelyViewing()).toBe(false);
        });

        test('should correctly identify inactive statuses', () => {
            const completed = new ShowStatus('completed');
            const dropped = new ShowStatus('dropped');
            const onHold = new ShowStatus('on_hold');
            const watching = new ShowStatus('watching');

            expect(completed.isInactive()).toBe(true);
            expect(dropped.isInactive()).toBe(true);
            expect(onHold.isInactive()).toBe(true);
            expect(watching.isInactive()).toBe(false);
        });
    });

    describe('Status Transitions', () => {
        test('should allow valid transitions from watching', () => {
            const watching = new ShowStatus('watching');

            expect(watching.canTransitionTo('completed')).toBe(true);
            expect(watching.canTransitionTo('on_hold')).toBe(true);
            expect(watching.canTransitionTo('dropped')).toBe(true);
            expect(watching.canTransitionTo('rewatching')).toBe(true);
            expect(watching.canTransitionTo('plan_to_watch')).toBe(false);
        });

        test('should allow valid transitions from completed', () => {
            const completed = new ShowStatus('completed');

            expect(completed.canTransitionTo('rewatching')).toBe(true);
            expect(completed.canTransitionTo('watching')).toBe(false);
            expect(completed.canTransitionTo('on_hold')).toBe(false);
            expect(completed.canTransitionTo('dropped')).toBe(false);
            expect(completed.canTransitionTo('plan_to_watch')).toBe(false);
        });

        test('should allow valid transitions from on_hold', () => {
            const onHold = new ShowStatus('on_hold');

            expect(onHold.canTransitionTo('watching')).toBe(true);
            expect(onHold.canTransitionTo('dropped')).toBe(true);
            expect(onHold.canTransitionTo('completed')).toBe(false);
            expect(onHold.canTransitionTo('rewatching')).toBe(false);
            expect(onHold.canTransitionTo('plan_to_watch')).toBe(false);
        });

        test('should allow valid transitions from dropped', () => {
            const dropped = new ShowStatus('dropped');

            expect(dropped.canTransitionTo('watching')).toBe(true);
            expect(dropped.canTransitionTo('plan_to_watch')).toBe(true);
            expect(dropped.canTransitionTo('completed')).toBe(false);
            expect(dropped.canTransitionTo('on_hold')).toBe(false);
            expect(dropped.canTransitionTo('rewatching')).toBe(false);
        });

        test('should allow valid transitions from plan_to_watch', () => {
            const planToWatch = new ShowStatus('plan_to_watch');

            expect(planToWatch.canTransitionTo('watching')).toBe(true);
            expect(planToWatch.canTransitionTo('dropped')).toBe(true);
            expect(planToWatch.canTransitionTo('completed')).toBe(false);
            expect(planToWatch.canTransitionTo('on_hold')).toBe(false);
            expect(planToWatch.canTransitionTo('rewatching')).toBe(false);
        });

        test('should allow valid transitions from rewatching', () => {
            const rewatching = new ShowStatus('rewatching');

            expect(rewatching.canTransitionTo('completed')).toBe(true);
            expect(rewatching.canTransitionTo('on_hold')).toBe(true);
            expect(rewatching.canTransitionTo('dropped')).toBe(true);
            expect(rewatching.canTransitionTo('watching')).toBe(false);
            expect(rewatching.canTransitionTo('plan_to_watch')).toBe(false);
        });

        test('should execute valid transitions', () => {
            const watching = new ShowStatus('watching');
            const completed = watching.transitionTo('completed');

            expect(completed.getValue()).toBe('completed');
            expect(watching.getValue()).toBe('watching'); // Original unchanged
        });

        test('should throw ValidationError for invalid transitions', () => {
            const completed = new ShowStatus('completed');

            expect(() => completed.transitionTo('watching')).toThrow(ValidationError);
            expect(() => completed.transitionTo('invalid')).toThrow(ValidationError);
        });
    });

    describe('Display Names', () => {
        test('should return correct display names', () => {
            expect(new ShowStatus('watching').getDisplayName()).toBe('Watching');
            expect(new ShowStatus('completed').getDisplayName()).toBe('Completed');
            expect(new ShowStatus('on_hold').getDisplayName()).toBe('On Hold');
            expect(new ShowStatus('dropped').getDisplayName()).toBe('Dropped');
            expect(new ShowStatus('plan_to_watch').getDisplayName()).toBe('Plan to Watch');
            expect(new ShowStatus('rewatching').getDisplayName()).toBe('Rewatching');
        });
    });

    describe('Equality and Comparison', () => {
        test('should compare statuses correctly', () => {
            const watching1 = new ShowStatus('watching');
            const watching2 = new ShowStatus('watching');
            const completed = new ShowStatus('completed');

            expect(watching1.equals(watching2)).toBe(true);
            expect(watching1.equals(completed)).toBe(false);
        });

        test('should handle comparison with non-ShowStatus objects', () => {
            const watching = new ShowStatus('watching');

            expect(watching.equals('watching')).toBe(false);
            expect(watching.equals(null)).toBe(false);
            expect(watching.equals(undefined)).toBe(false);
            expect(watching.equals({})).toBe(false);
        });
    });

    describe('Serialization', () => {
        test('should serialize to string correctly', () => {
            const watching = new ShowStatus('watching');
            expect(watching.toString()).toBe('watching');
        });

        test('should serialize to JSON correctly', () => {
            const watching = new ShowStatus('watching');
            expect(JSON.stringify(watching)).toBe('"watching"');
        });

        test('should have valueOf return the status string', () => {
            const watching = new ShowStatus('watching');
            expect(watching.valueOf()).toBe('watching');
        });
    });

    describe('Static Utility Methods', () => {
        test('should get all valid statuses', () => {
            const allStatuses = ShowStatus.getAllValidStatuses();
            expect(allStatuses).toContain('watching');
            expect(allStatuses).toContain('completed');
            expect(allStatuses).toContain('on_hold');
            expect(allStatuses).toContain('dropped');
            expect(allStatuses).toContain('plan_to_watch');
            expect(allStatuses).toContain('rewatching');
            expect(allStatuses).toHaveLength(6);
        });

        test('should validate status strings', () => {
            expect(ShowStatus.isValidStatus('watching')).toBe(true);
            expect(ShowStatus.isValidStatus('invalid')).toBe(false);
            expect(ShowStatus.isValidStatus(null)).toBe(false);
            expect(ShowStatus.isValidStatus(undefined)).toBe(false);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should maintain immutability', () => {
            const original = new ShowStatus('watching');
            const transitioned = original.transitionTo('completed');

            expect(original.getValue()).toBe('watching');
            expect(transitioned.getValue()).toBe('completed');
            expect(original).not.toBe(transitioned);
        });

        test('should handle case sensitivity', () => {
            expect(() => new ShowStatus('WATCHING')).toThrow(ValidationError);
            expect(() => new ShowStatus('Watching')).toThrow(ValidationError);
            expect(() => new ShowStatus('WaTcHiNg')).toThrow(ValidationError);
        });

        test('should reject whitespace variations', () => {
            expect(() => new ShowStatus(' watching ')).toThrow(ValidationError);
            expect(() => new ShowStatus('watching ')).toThrow(ValidationError);
            expect(() => new ShowStatus(' watching')).toThrow(ValidationError);
        });
    });
});