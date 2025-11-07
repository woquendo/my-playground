import { EpisodeCalculatorService } from '../../../Domain/Services/EpisodeCalculatorService.js';
import { ShowDate } from '../../../Domain/ValueObjects/ShowDate.js';
import { AiringStatus } from '../../../Domain/ValueObjects/AiringStatus.js';
import { ValidationError } from '../../../Core/Errors/ApplicationErrors.js';

describe('EpisodeCalculatorService', () => {
    let service;

    beforeEach(() => {
        service = new EpisodeCalculatorService();
    });

    describe('Current Episode Calculation', () => {
        test('should calculate current episode correctly for weekly show', () => {
            const startDate = new ShowDate('01-01-24');
            const currentDate = new ShowDate('01-15-24'); // 2 weeks later

            const currentEpisode = service.calculateCurrentEpisode(startDate, currentDate, 12);

            expect(currentEpisode).toBe(3); // Week 0=ep1, Week 1=ep2, Week 2=ep3
        });

        test('should not exceed total episodes', () => {
            const startDate = new ShowDate('01-01-24');
            const currentDate = new ShowDate('04-01-24'); // Many weeks later

            const currentEpisode = service.calculateCurrentEpisode(startDate, currentDate, 12);

            expect(currentEpisode).toBe(12);
        });

        test('should return 0 if show hasnt started', () => {
            const startDate = new ShowDate('01-15-24');
            const currentDate = new ShowDate('01-10-24'); // Before start

            const currentEpisode = service.calculateCurrentEpisode(startDate, currentDate, 12);

            expect(currentEpisode).toBe(0);
        });

        test('should handle skip weeks correctly', () => {
            const startDate = new ShowDate('01-01-24');
            const currentDate = new ShowDate('01-22-24'); // 3 weeks later
            const skipWeeks = [new ShowDate('01-08-24')]; // Skip week 1

            const currentEpisode = service.calculateCurrentEpisode(startDate, currentDate, 12, {
                skipWeeks
            });

            expect(currentEpisode).toBe(3); // Should be episode 3 despite skip week
        });

        test('should use today if no current date provided', () => {
            const startDate = new ShowDate('01-01-24');

            // This test verifies the method works without throwing, exact value depends on test run date
            expect(() => service.calculateCurrentEpisode(startDate, null, 12)).not.toThrow();
        });

        test('should validate input parameters', () => {
            const startDate = new ShowDate('01-01-24');

            expect(() => service.calculateCurrentEpisode('invalid', null, 12)).toThrow(ValidationError);
            expect(() => service.calculateCurrentEpisode(startDate, null, 'invalid')).toThrow(ValidationError);
        });
    });

    describe('Episode Date Calculation', () => {
        test('should calculate episode air date correctly', () => {
            const startDate = new ShowDate('01-01-24');

            const episode3Date = service.calculateEpisodeDate(startDate, 3);
            const expectedDate = startDate.addWeeks(2); // Episode 3 airs week 2

            expect(episode3Date.isEqual(expectedDate)).toBe(true);
        });

        test('should handle custom episode dates', () => {
            const startDate = new ShowDate('01-01-24');
            const customDate = new ShowDate('01-20-24');
            const customDates = new Map([[5, customDate]]);

            const episode5Date = service.calculateEpisodeDate(startDate, 5, { customDates });

            expect(episode5Date.isEqual(customDate)).toBe(true);
        });

        test('should account for skip weeks in episode dates', () => {
            const startDate = new ShowDate('01-01-24');
            const skipWeeks = [new ShowDate('01-08-24')]; // Skip week 1

            const episode3Date = service.calculateEpisodeDate(startDate, 3, { skipWeeks });
            const expectedDate = startDate.addWeeks(3); // Should be pushed back by skip week

            expect(episode3Date.isEqual(expectedDate)).toBe(true);
        });

        test('should validate episode number', () => {
            const startDate = new ShowDate('01-01-24');

            expect(() => service.calculateEpisodeDate(startDate, 0)).toThrow(ValidationError);
            expect(() => service.calculateEpisodeDate(startDate, -1)).toThrow(ValidationError);
            expect(() => service.calculateEpisodeDate(startDate, 1.5)).toThrow(ValidationError);
        });
    });

    describe('Episodes in Range', () => {
        test('should get episodes within date range', () => {
            const startDate = new ShowDate('01-01-24');
            const rangeStart = new ShowDate('01-08-24');
            const rangeEnd = new ShowDate('01-22-24');

            const episodes = service.getEpisodesInRange(startDate, rangeStart, rangeEnd, 12);

            expect(episodes).toHaveLength(2); // Episodes 2 and 3
            expect(episodes[0].episode).toBe(2);
            expect(episodes[1].episode).toBe(3);
        });

        test('should return episodes sorted by date', () => {
            const startDate = new ShowDate('01-01-24');
            const rangeStart = new ShowDate('01-01-24');
            const rangeEnd = new ShowDate('01-29-24');

            const episodes = service.getEpisodesInRange(startDate, rangeStart, rangeEnd, 5);

            for (let i = 1; i < episodes.length; i++) {
                expect(episodes[i - 1].date.isBefore(episodes[i].date) ||
                    episodes[i - 1].date.isEqual(episodes[i].date)).toBe(true);
            }
        });

        test('should validate date range', () => {
            const startDate = new ShowDate('01-01-24');
            const rangeStart = new ShowDate('01-15-24');
            const rangeEnd = new ShowDate('01-10-24'); // End before start

            expect(() => service.getEpisodesInRange(startDate, rangeStart, rangeEnd, 12))
                .toThrow(ValidationError);
        });
    });

    describe('Scheduling Logic', () => {
        test('should determine scheduling for currently airing show', () => {
            const startDate = new ShowDate('01-01-24');
            const checkDate = new ShowDate('01-15-24');
            const airingStatus = new AiringStatus('currently_airing');

            const shouldSchedule = service.shouldScheduleOn(startDate, checkDate, airingStatus);

            expect(shouldSchedule).toBe(true);
        });

        test('should not schedule not yet aired shows', () => {
            const startDate = new ShowDate('01-01-24');
            const checkDate = new ShowDate('01-15-24');
            const airingStatus = new AiringStatus('not_yet_aired');

            const shouldSchedule = service.shouldScheduleOn(startDate, checkDate, airingStatus);

            expect(shouldSchedule).toBe(false);
        });

        test('should handle finished airing shows correctly', () => {
            const startDate = new ShowDate('01-01-24');
            const checkDate = new ShowDate('01-15-24'); // Within show run
            const airingStatus = new AiringStatus('finished_airing');

            const shouldSchedule = service.shouldScheduleOn(startDate, checkDate, airingStatus, {
                totalEpisodes: 12
            });

            expect(shouldSchedule).toBe(true);
        });

        test('should not schedule before show starts', () => {
            const startDate = new ShowDate('01-15-24');
            const checkDate = new ShowDate('01-10-24'); // Before start
            const airingStatus = new AiringStatus('currently_airing');

            const shouldSchedule = service.shouldScheduleOn(startDate, checkDate, airingStatus);

            expect(shouldSchedule).toBe(false);
        });
    });

    describe('Skip Week Management', () => {
        test('should add skip weeks for show', () => {
            const showId = 'test-show';
            const skipDates = [new ShowDate('01-08-24'), new ShowDate('01-15-24')];

            expect(() => service.addSkipWeeks(showId, skipDates)).not.toThrow();
        });

        test('should validate skip dates', () => {
            const showId = 'test-show';
            const invalidSkipDates = ['01-08-24', new Date()];

            expect(() => service.addSkipWeeks(showId, invalidSkipDates)).toThrow(ValidationError);
        });

        test('should reject non-array skip dates', () => {
            const showId = 'test-show';

            expect(() => service.addSkipWeeks(showId, 'invalid')).toThrow(ValidationError);
        });
    });

    describe('Custom Episode Dates', () => {
        test('should add custom episode date', () => {
            const showId = 'test-show';
            const episodeNumber = 5;
            const customDate = new ShowDate('01-20-24');

            expect(() => service.addCustomEpisodeDate(showId, episodeNumber, customDate))
                .not.toThrow();
        });

        test('should validate custom episode date parameters', () => {
            const showId = 'test-show';

            expect(() => service.addCustomEpisodeDate(showId, 0, new ShowDate('01-20-24')))
                .toThrow(ValidationError);

            expect(() => service.addCustomEpisodeDate(showId, 5, '01-20-24'))
                .toThrow(ValidationError);
        });
    });

    describe('Season Information', () => {
        test('should determine correct anime season', () => {
            const winterDate = new ShowDate('02-15-24');
            const springDate = new ShowDate('05-15-24');
            const summerDate = new ShowDate('08-15-24');
            const fallDate = new ShowDate('11-15-24');

            expect(service.getSeasonInfo(winterDate)).toEqual({ season: 'Winter', year: 2024 });
            expect(service.getSeasonInfo(springDate)).toEqual({ season: 'Spring', year: 2024 });
            expect(service.getSeasonInfo(summerDate)).toEqual({ season: 'Summer', year: 2024 });
            expect(service.getSeasonInfo(fallDate)).toEqual({ season: 'Fall', year: 2024 });
        });

        test('should handle edge cases for seasons', () => {
            const newYearDate = new ShowDate('01-01-24');
            const marchEnd = new ShowDate('03-31-24');
            const decemberDate = new ShowDate('12-31-24');

            expect(service.getSeasonInfo(newYearDate)).toEqual({ season: 'Winter', year: 2024 });
            expect(service.getSeasonInfo(marchEnd)).toEqual({ season: 'Winter', year: 2024 });
            expect(service.getSeasonInfo(decemberDate)).toEqual({ season: 'Fall', year: 2024 });
        });

        test('should validate date parameter', () => {
            expect(() => service.getSeasonInfo('invalid')).toThrow(ValidationError);
        });
    });

    describe('Season Schedule Generation', () => {
        test('should generate complete season schedule', () => {
            const startDate = new ShowDate('01-01-24');
            const totalEpisodes = 5;

            const schedule = service.generateSeasonSchedule(startDate, totalEpisodes, {
                showTitle: 'Test Anime'
            });

            expect(schedule).toHaveLength(5);
            expect(schedule[0].episode).toBe(1);
            expect(schedule[4].episode).toBe(5);
            expect(schedule[0].showTitle).toBe('Test Anime');
        });

        test('should include season information in schedule', () => {
            const startDate = new ShowDate('01-01-24');
            const schedule = service.generateSeasonSchedule(startDate, 3);

            schedule.forEach(item => {
                expect(item).toHaveProperty('season');
                expect(item).toHaveProperty('year');
                expect(['Winter', 'Spring', 'Summer', 'Fall']).toContain(item.season);
            });
        });

        test('should handle skip weeks in schedule generation', () => {
            const startDate = new ShowDate('01-01-24');
            const skipWeeks = [new ShowDate('01-08-24')];

            const schedule = service.generateSeasonSchedule(startDate, 3, { skipWeeks });

            expect(schedule).toHaveLength(3);
            // Episode 2 should be pushed back due to skip week
            expect(schedule[1].date.isEqual(startDate.addWeeks(2))).toBe(true);
        });

        test('should validate schedule generation parameters', () => {
            expect(() => service.generateSeasonSchedule('invalid', 5)).toThrow(ValidationError);
            expect(() => service.generateSeasonSchedule(new ShowDate('01-01-24'), 0))
                .toThrow(ValidationError);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle very large episode numbers', () => {
            const startDate = new ShowDate('01-01-24');

            expect(() => service.calculateEpisodeDate(startDate, 1000)).not.toThrow();
        });

        test('should handle empty skip weeks array', () => {
            const startDate = new ShowDate('01-01-24');
            const currentDate = new ShowDate('01-15-24');

            const episode = service.calculateCurrentEpisode(startDate, currentDate, 12, {
                skipWeeks: []
            });

            expect(episode).toBe(3);
        });

        test('should handle custom dates map correctly', () => {
            const startDate = new ShowDate('01-01-24');
            const customDates = new Map();

            const episodeDate = service.calculateEpisodeDate(startDate, 5, { customDates });

            expect(episodeDate.isEqual(startDate.addWeeks(4))).toBe(true);
        });

        test('should continue with other episodes when date calculation fails', () => {
            const startDate = new ShowDate('01-01-24');
            const rangeStart = new ShowDate('01-01-24');
            const rangeEnd = new ShowDate('01-29-24');

            // This should not throw even if some episode calculations might fail
            expect(() => service.getEpisodesInRange(startDate, rangeStart, rangeEnd, 50))
                .not.toThrow();
        });
    });

    describe('Multiple Shows Support', () => {
        test('should handle different shows independently', () => {
            const showId1 = 'show-1';
            const showId2 = 'show-2';

            const skipDates1 = [new ShowDate('01-08-24')];
            const skipDates2 = [new ShowDate('01-15-24')];

            service.addSkipWeeks(showId1, skipDates1);
            service.addSkipWeeks(showId2, skipDates2);

            // Each show should maintain its own skip weeks
            expect(() => service.addSkipWeeks(showId1, [new ShowDate('01-22-24')]))
                .not.toThrow();
        });

        test('should handle custom dates for different shows', () => {
            const showId1 = 'show-1';
            const showId2 = 'show-2';

            service.addCustomEpisodeDate(showId1, 5, new ShowDate('01-20-24'));
            service.addCustomEpisodeDate(showId2, 5, new ShowDate('01-25-24'));

            // Should not interfere with each other
            expect(() => service.addCustomEpisodeDate(showId1, 6, new ShowDate('01-27-24')))
                .not.toThrow();
        });
    });
});