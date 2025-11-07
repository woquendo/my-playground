import { AiringStatus } from '../../../Domain/ValueObjects/AiringStatus.js';
import { ValidationError } from '../../../Core/Errors/ApplicationErrors.js';

describe('AiringStatus Value Object', () => {
    describe('Construction and Validation', () => {
        test('should create AiringStatus with valid status', () => {
            const status = new AiringStatus('currently_airing');
            expect(status.getValue()).toBe('currently_airing');
        });

        test('should accept all valid statuses', () => {
            const validStatuses = [
                'currently_airing', 'finished_airing', 'not_yet_aired'
            ];

            validStatuses.forEach(status => {
                expect(() => new AiringStatus(status)).not.toThrow();
                const airingStatus = new AiringStatus(status);
                expect(airingStatus.getValue()).toBe(status);
            });
        });

        test('should throw ValidationError for invalid status', () => {
            const invalidStatuses = [
                'invalid', 'CURRENTLY_AIRING', 'finished', 'not_aired',
                '', null, undefined, 123, {}, 'airing', 'completed'
            ];

            invalidStatuses.forEach(status => {
                expect(() => new AiringStatus(status)).toThrow(ValidationError);
            });
        });

        test('should create from another AiringStatus instance', () => {
            const original = new AiringStatus('currently_airing');
            const copy = new AiringStatus(original);
            expect(copy.getValue()).toBe('currently_airing');
            expect(copy).not.toBe(original); // Should be different instances
        });
    });

    describe('Status Constants', () => {
        test('should have all expected constants', () => {
            expect(AiringStatus.CURRENTLY_AIRING).toBe('currently_airing');
            expect(AiringStatus.FINISHED_AIRING).toBe('finished_airing');
            expect(AiringStatus.NOT_YET_AIRED).toBe('not_yet_aired');
        });

        test('should create status using constants', () => {
            const status = new AiringStatus(AiringStatus.CURRENTLY_AIRING);
            expect(status.getValue()).toBe('currently_airing');
        });
    });

    describe('Status Predicates', () => {
        test('should correctly identify currently airing status', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.isCurrentlyAiring()).toBe(true);
            expect(finished.isCurrentlyAiring()).toBe(false);
            expect(notYetAired.isCurrentlyAiring()).toBe(false);
        });

        test('should correctly identify finished airing status', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(finished.isFinishedAiring()).toBe(true);
            expect(currentlyAiring.isFinishedAiring()).toBe(false);
            expect(notYetAired.isFinishedAiring()).toBe(false);
        });

        test('should correctly identify not yet aired status', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(notYetAired.isNotYetAired()).toBe(true);
            expect(currentlyAiring.isNotYetAired()).toBe(false);
            expect(finished.isNotYetAired()).toBe(false);
        });

        test('should correctly identify scheduled statuses', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.shouldBeScheduled()).toBe(true);
            expect(finished.shouldBeScheduled()).toBe(true);
            expect(notYetAired.shouldBeScheduled()).toBe(false);
        });

        test('should correctly identify if episodes are available', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.hasEpisodesAvailable()).toBe(true);
            expect(finished.hasEpisodesAvailable()).toBe(true);
            expect(notYetAired.hasEpisodesAvailable()).toBe(false);
        });
    });

    describe('MyAnimeList Integration', () => {
        test('should parse MAL status correctly', () => {
            const currentlyAiring = AiringStatus.fromMALStatus('currently_airing');
            const finished = AiringStatus.fromMALStatus('finished_airing');
            const notYetAired = AiringStatus.fromMALStatus('not_yet_aired');

            expect(currentlyAiring.getValue()).toBe('currently_airing');
            expect(finished.getValue()).toBe('finished_airing');
            expect(notYetAired.getValue()).toBe('not_yet_aired');
        });

        test('should handle MAL numeric status codes', () => {
            const currentlyAiring = AiringStatus.fromMALStatus(1);
            const finished = AiringStatus.fromMALStatus(2);
            const notYetAired = AiringStatus.fromMALStatus(3);

            expect(currentlyAiring.getValue()).toBe('currently_airing');
            expect(finished.getValue()).toBe('finished_airing');
            expect(notYetAired.getValue()).toBe('not_yet_aired');
        });

        test('should throw ValidationError for invalid MAL status', () => {
            expect(() => AiringStatus.fromMALStatus('invalid')).toThrow(ValidationError);
            expect(() => AiringStatus.fromMALStatus(0)).toThrow(ValidationError);
            expect(() => AiringStatus.fromMALStatus(4)).toThrow(ValidationError);
            expect(() => AiringStatus.fromMALStatus(null)).toThrow(ValidationError);
        });

        test('should convert to MAL format correctly', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.toMALFormat()).toBe('currently_airing');
            expect(finished.toMALFormat()).toBe('finished_airing');
            expect(notYetAired.toMALFormat()).toBe('not_yet_aired');
        });
    });

    describe('Display Names', () => {
        test('should return correct display names', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.getDisplayName()).toBe('Currently Airing');
            expect(finished.getDisplayName()).toBe('Finished Airing');
            expect(notYetAired.getDisplayName()).toBe('Not Yet Aired');
        });
    });

    describe('Status Priority', () => {
        test('should return correct priority values', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.getPriority()).toBe(1);
            expect(finished.getPriority()).toBe(2);
            expect(notYetAired.getPriority()).toBe(3);
        });

        test('should compare priorities correctly', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.hasHigherPriorityThan(finished)).toBe(true);
            expect(currentlyAiring.hasHigherPriorityThan(notYetAired)).toBe(true);
            expect(finished.hasHigherPriorityThan(notYetAired)).toBe(true);
            expect(finished.hasHigherPriorityThan(currentlyAiring)).toBe(false);
        });
    });

    describe('Equality and Comparison', () => {
        test('should compare statuses correctly', () => {
            const airing1 = new AiringStatus('currently_airing');
            const airing2 = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');

            expect(airing1.equals(airing2)).toBe(true);
            expect(airing1.equals(finished)).toBe(false);
        });

        test('should handle comparison with non-AiringStatus objects', () => {
            const airing = new AiringStatus('currently_airing');

            expect(airing.equals('currently_airing')).toBe(false);
            expect(airing.equals(null)).toBe(false);
            expect(airing.equals(undefined)).toBe(false);
            expect(airing.equals({})).toBe(false);
        });
    });

    describe('Serialization', () => {
        test('should serialize to string correctly', () => {
            const airing = new AiringStatus('currently_airing');
            expect(airing.toString()).toBe('currently_airing');
        });

        test('should serialize to JSON correctly', () => {
            const airing = new AiringStatus('currently_airing');
            expect(JSON.stringify(airing)).toBe('"currently_airing"');
        });

        test('should have valueOf return the status string', () => {
            const airing = new AiringStatus('currently_airing');
            expect(airing.valueOf()).toBe('currently_airing');
        });
    });

    describe('Static Utility Methods', () => {
        test('should get all valid statuses', () => {
            const allStatuses = AiringStatus.getAllValidStatuses();
            expect(allStatuses).toContain('currently_airing');
            expect(allStatuses).toContain('finished_airing');
            expect(allStatuses).toContain('not_yet_aired');
            expect(allStatuses).toHaveLength(3);
        });

        test('should validate status strings', () => {
            expect(AiringStatus.isValidStatus('currently_airing')).toBe(true);
            expect(AiringStatus.isValidStatus('finished_airing')).toBe(true);
            expect(AiringStatus.isValidStatus('not_yet_aired')).toBe(true);
            expect(AiringStatus.isValidStatus('invalid')).toBe(false);
            expect(AiringStatus.isValidStatus(null)).toBe(false);
            expect(AiringStatus.isValidStatus(undefined)).toBe(false);
        });
    });

    describe('Business Logic', () => {
        test('should determine if status allows new episodes', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.allowsNewEpisodes()).toBe(true);
            expect(finished.allowsNewEpisodes()).toBe(false);
            expect(notYetAired.allowsNewEpisodes()).toBe(false);
        });

        test('should determine if status requires episode tracking', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.requiresEpisodeTracking()).toBe(true);
            expect(finished.requiresEpisodeTracking()).toBe(false);
            expect(notYetAired.requiresEpisodeTracking()).toBe(false);
        });

        test('should determine scheduling frequency', () => {
            const currentlyAiring = new AiringStatus('currently_airing');
            const finished = new AiringStatus('finished_airing');
            const notYetAired = new AiringStatus('not_yet_aired');

            expect(currentlyAiring.getSchedulingFrequency()).toBe('weekly');
            expect(finished.getSchedulingFrequency()).toBe('none');
            expect(notYetAired.getSchedulingFrequency()).toBe('none');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should maintain immutability', () => {
            const original = new AiringStatus('currently_airing');
            // Since AiringStatus is immutable, this test ensures no accidental mutations
            const serialized = JSON.stringify(original);
            original.toString(); // Call methods to ensure no side effects
            original.getDisplayName();
            expect(JSON.stringify(original)).toBe(serialized);
        });

        test('should handle case sensitivity', () => {
            expect(() => new AiringStatus('CURRENTLY_AIRING')).toThrow(ValidationError);
            expect(() => new AiringStatus('Currently_Airing')).toThrow(ValidationError);
            expect(() => new AiringStatus('currently_AIRING')).toThrow(ValidationError);
        });

        test('should reject whitespace variations', () => {
            expect(() => new AiringStatus(' currently_airing ')).toThrow(ValidationError);
            expect(() => new AiringStatus('currently_airing ')).toThrow(ValidationError);
            expect(() => new AiringStatus(' currently_airing')).toThrow(ValidationError);
        });

        test('should handle underscore variations', () => {
            expect(() => new AiringStatus('currently-airing')).toThrow(ValidationError);
            expect(() => new AiringStatus('currently airing')).toThrow(ValidationError);
            expect(() => new AiringStatus('currentlyairing')).toThrow(ValidationError);
        });
    });
});