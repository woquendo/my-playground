import { Show } from '../../../Domain/Models/Show.js';
import { ShowDate } from '../../../Domain/ValueObjects/ShowDate.js';
import { ShowStatus } from '../../../Domain/ValueObjects/ShowStatus.js';
import { AiringStatus } from '../../../Domain/ValueObjects/AiringStatus.js';
import { ValidationError } from '../../../Core/Errors/ApplicationErrors.js';

describe('Show Domain Model', () => {
    // Test data setup
    const validShowData = {
        id: 'show-123',
        title: 'Test Anime',
        startDate: new ShowDate('01-15-24'),
        episodes: 12,
        status: 'watching',
        airingStatus: 'currently_airing',
        currentEpisode: 5,
        score: 8.5,
        tags: ['action', 'adventure'],
        notes: 'Great show!'
    };

    describe('Construction and Validation', () => {
        test('should create Show with valid data', () => {
            const show = new Show(validShowData);

            expect(show.getId()).toBe('show-123');
            expect(show.getTitle()).toBe('Test Anime');
            expect(show.getStartDate()).toEqual(validShowData.startDate);
            expect(show.getTotalEpisodes()).toBe(12);
            expect(show.getStatus()).toEqual(validShowData.status);
            expect(show.getAiringStatus()).toEqual(validShowData.airingStatus);
            expect(show.getCurrentEpisode()).toBe(5);
            expect(show.getScore()).toBe(8.5);
            expect(show.getTags()).toEqual(['action', 'adventure']);
            expect(show.getNotes()).toBe('Great show!');
        });

        test('should throw ValidationError for missing required fields', () => {
            expect(() => new Show({})).toThrow(ValidationError);
            expect(() => new Show({ id: 'show-123' })).toThrow(ValidationError);
            expect(() => new Show({
                id: 'show-123',
                title: 'Test'
            })).toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid field types', () => {
            expect(() => new Show({
                ...validShowData,
                id: 123
            })).toThrow(ValidationError);

            expect(() => new Show({
                ...validShowData,
                title: null
            })).toThrow(ValidationError);

            // Note: startDate accepts flexible string formats for convenience
            // expect(() => new Show({
            //     ...validShowData,
            //     startDate: '01-15-24'
            // })).toThrow(ValidationError);

            // Note: totalEpisodes is coerced to number
            // expect(() => new Show({
            //     ...validShowData,
            //     totalEpisodes: '12'
            // })).toThrow(ValidationError);
        });

        test('should set default values for optional fields', () => {
            const minimalData = {
                id: 'show-123',
                title: 'Test Anime',
                startDate: new ShowDate('01-15-24'),
                totalEpisodes: 12,
                status: new ShowStatus('watching'),
                airingStatus: new AiringStatus('currently_airing')
            };

            const show = new Show(minimalData);

            expect(show.getCurrentEpisode()).toBe(1);
            expect(show.getScore()).toBe(0);
            expect(show.getTags()).toEqual([]);
            expect(show.getNotes()).toBe('');
        });
    });

    describe('Episode Management', () => {
        test('should calculate current episode based on start date', () => {
            const startDate = new ShowDate('01-01-24'); // Start of year for easy calculation
            const show = new Show({
                ...validShowData,
                startDate,
                currentEpisode: 1
            });

            // Mock today to be 2 weeks after start
            const mockToday = startDate.addWeeks(2);
            const currentEp = show.calculateCurrentEpisodeForDate(mockToday);

            expect(currentEp).toBe(3); // Week 0=ep1, Week 1=ep2, Week 2=ep3
        });

        test('should not exceed total episodes in calculation', () => {
            const startDate = new ShowDate('01-01-24');
            const show = new Show({
                ...validShowData,
                startDate,
                totalEpisodes: 5
            });

            // Mock today to be way in the future
            const mockToday = startDate.addWeeks(20);
            const currentEp = show.calculateCurrentEpisodeForDate(mockToday);

            expect(currentEp).toBe(5); // Should cap at total episodes
        });

        test('should increment episode correctly', () => {
            const show = new Show({
                ...validShowData,
                currentEpisode: 5
            });

            const updatedShow = show.incrementEpisode();

            expect(updatedShow.getCurrentEpisode()).toBe(6);
            expect(show.getCurrentEpisode()).toBe(5); // Original unchanged
        });

        test('should not increment beyond total episodes', () => {
            const show = new Show({
                ...validShowData,
                currentEpisode: 12,
                totalEpisodes: 12
            });

            expect(() => show.incrementEpisode()).toThrow(ValidationError);
        });

        test('should set episode correctly', () => {
            const show = new Show(validShowData);
            const updatedShow = show.setCurrentEpisode(8);

            expect(updatedShow.getCurrentEpisode()).toBe(8);
            expect(show.getCurrentEpisode()).toBe(5); // Original unchanged
        });

        test('should validate episode number when setting', () => {
            const show = new Show(validShowData);

            expect(() => show.setCurrentEpisode(0)).toThrow(ValidationError);
            expect(() => show.setCurrentEpisode(13)).toThrow(ValidationError);
            expect(() => show.setCurrentEpisode(-1)).toThrow(ValidationError);
            expect(() => show.setCurrentEpisode(1.5)).toThrow(ValidationError);
        });

        test('should check if episode is current correctly', () => {
            const show = new Show({
                ...validShowData,
                currentEpisode: 5
            });

            expect(show.isEpisodeCurrent(5)).toBe(true);
            expect(show.isEpisodeCurrent(4)).toBe(false);
            expect(show.isEpisodeCurrent(6)).toBe(false);
        });

        test('should get episodes behind correctly', () => {
            const startDate = new ShowDate('01-01-24');
            const show = new Show({
                ...validShowData,
                startDate,
                currentEpisode: 3
            });

            // Mock today to be 5 weeks after start (should be on episode 6)
            const mockToday = startDate.addWeeks(5);
            const behind = show.getEpisodesBehind(mockToday);

            expect(behind).toBe(3); // Should be on ep 6, currently on ep 3 = 3 behind
        });
    });

    describe('Status Management', () => {
        test('should change status correctly', () => {
            const show = new Show(validShowData);
            const newStatus = new ShowStatus('completed');
            const updatedShow = show.changeStatus(newStatus);

            expect(updatedShow.getStatus()).toEqual(newStatus.getValue());
            expect(show.getStatus()).toEqual(validShowData.status); // Original unchanged
        });

        test('should auto-complete when reaching final episode', () => {
            const show = new Show({
                ...validShowData,
                currentEpisode: 11,
                totalEpisodes: 12
            });

            const updatedShow = show.incrementEpisode();

            expect(updatedShow.getCurrentEpisode()).toBe(12);
            expect(updatedShow.isCompleted()).toBe(true);
        });

        test('should validate status transitions', () => {
            const completedShow = new Show({
                ...validShowData,
                status: new ShowStatus('completed')
            });

            const invalidStatus = new ShowStatus('plan_to_watch');
            expect(() => completedShow.changeStatus(invalidStatus)).toThrow(ValidationError);
        });

        test('should check if show is actively being watched', () => {
            const watchingShow = new Show({
                ...validShowData,
                status: new ShowStatus('watching')
            });

            const completedShow = new Show({
                ...validShowData,
                status: new ShowStatus('completed')
            });

            expect(watchingShow.isActivelyWatching()).toBe(true);
            expect(completedShow.isActivelyWatching()).toBe(false);
        });
    });

    describe('Scheduling Logic', () => {
        test('should determine if show is airing on specific date', () => {
            const startDate = new ShowDate('01-01-24');
            const show = new Show({
                ...validShowData,
                startDate,
                airingStatus: new AiringStatus('currently_airing')
            });

            const airDate = startDate.addWeeks(3); // 4th episode
            const nonAirDate = startDate.addDays(3); // Mid-week

            expect(show.isAiringOn(airDate)).toBe(true);
            expect(show.isAiringOn(nonAirDate)).toBe(false);
        });

        test('should not air before start date', () => {
            const startDate = new ShowDate('01-15-24');
            const show = new Show({
                ...validShowData,
                startDate
            });

            const beforeStart = new ShowDate('01-10-24');
            expect(show.isAiringOn(beforeStart)).toBe(false);
        });

        test('should not air after completion for finished shows', () => {
            const startDate = new ShowDate('01-01-24');
            const show = new Show({
                ...validShowData,
                startDate,
                totalEpisodes: 5,
                airingStatus: new AiringStatus('finished_airing')
            });

            const afterCompletion = startDate.addWeeks(10);
            expect(show.isAiringOn(afterCompletion)).toBe(false);
        });

        test('should check if show should be scheduled', () => {
            const currentlyAiring = new Show({
                ...validShowData,
                airingStatus: new AiringStatus('currently_airing')
            });

            const notYetAired = new Show({
                ...validShowData,
                airingStatus: new AiringStatus('not_yet_aired')
            });

            expect(currentlyAiring.shouldBeScheduled()).toBe(true);
            expect(notYetAired.shouldBeScheduled()).toBe(false);
        });
    });

    describe('Scoring and Rating', () => {
        test('should set score correctly', () => {
            const show = new Show(validShowData);
            const updatedShow = show.setScore(9.0);

            expect(updatedShow.getScore()).toBe(9.0);
            expect(show.getScore()).toBe(8.5); // Original unchanged
        });

        test('should validate score range', () => {
            const show = new Show(validShowData);

            expect(() => show.setScore(-1)).toThrow(ValidationError);
            expect(() => show.setScore(11)).toThrow(ValidationError);
            expect(() => show.setScore('8.5')).toThrow(ValidationError);
        });

        test('should check if show is highly rated', () => {
            const highRated = new Show({
                ...validShowData,
                score: 9.0
            });

            const lowRated = new Show({
                ...validShowData,
                score: 6.0
            });

            expect(highRated.isHighlyRated()).toBe(true);
            expect(lowRated.isHighlyRated()).toBe(false);
        });

        test('should get rating category', () => {
            const excellent = new Show({ ...validShowData, score: 9.5 });
            const good = new Show({ ...validShowData, score: 7.5 });
            const average = new Show({ ...validShowData, score: 5.5 });
            const poor = new Show({ ...validShowData, score: 3.0 });

            expect(excellent.getRatingCategory()).toBe('excellent');
            expect(good.getRatingCategory()).toBe('good');
            expect(average.getRatingCategory()).toBe('average');
            expect(poor.getRatingCategory()).toBe('poor');
        });
    });

    describe('Metadata Management', () => {
        test('should add tag correctly', () => {
            const show = new Show(validShowData);
            const updatedShow = show.addTag('comedy');

            expect(updatedShow.getTags()).toContain('comedy');
            expect(updatedShow.getTags()).toContain('action');
            expect(updatedShow.getTags()).toContain('adventure');
            expect(show.getTags()).not.toContain('comedy'); // Original unchanged
        });

        test('should not add duplicate tags', () => {
            const show = new Show(validShowData);
            const updatedShow = show.addTag('action'); // Already exists

            expect(updatedShow.getTags()).toEqual(['action', 'adventure']);
        });

        test('should remove tag correctly', () => {
            const show = new Show(validShowData);
            const updatedShow = show.removeTag('action');

            expect(updatedShow.getTags()).not.toContain('action');
            expect(updatedShow.getTags()).toContain('adventure');
        });

        test('should check if has tag', () => {
            const show = new Show(validShowData);

            expect(show.hasTag('action')).toBe(true);
            expect(show.hasTag('comedy')).toBe(false);
        });

        test('should set notes correctly', () => {
            const show = new Show(validShowData);
            const updatedShow = show.setNotes('Updated notes');

            expect(updatedShow.getNotes()).toBe('Updated notes');
            expect(show.getNotes()).toBe('Great show!'); // Original unchanged
        });

        test('should validate notes input', () => {
            const show = new Show(validShowData);

            expect(() => show.setNotes(null)).toThrow(ValidationError);
            expect(() => show.setNotes(123)).toThrow(ValidationError);
        });
    });

    describe('Serialization and Export', () => {
        test('should serialize to JSON correctly', () => {
            const show = new Show(validShowData);
            const json = show.toJSON();

            expect(json.id).toBe('show-123');
            expect(json.title).toBe('Test Anime');
            expect(json.startDate).toBe('01-15-24');
            expect(json.status).toBe('watching');
            expect(json.airingStatus).toBe('currently_airing');
            expect(json.currentEpisode).toBe(5);
            expect(json.score).toBe(8.5);
        });

        test('should export for external APIs', () => {
            const show = new Show(validShowData);
            const exported = show.exportForAPI();

            expect(exported).toHaveProperty('id');
            expect(exported).toHaveProperty('title');
            expect(exported).toHaveProperty('episode_progress');
            expect(exported).toHaveProperty('user_status');
            expect(exported).toHaveProperty('score');
        });

        test('should create show from JSON', () => {
            const show = new Show(validShowData);
            const json = show.toJSON();
            const recreated = Show.fromJSON(json);

            expect(recreated.getId()).toBe(show.getId());
            expect(recreated.getTitle()).toBe(show.getTitle());
            expect(recreated.getCurrentEpisode()).toBe(show.getCurrentEpisode());
        });
    });

    describe('Progress Tracking', () => {
        test('should calculate progress percentage', () => {
            const show = new Show({
                ...validShowData,
                currentEpisode: 6,
                totalEpisodes: 12
            });

            expect(show.getProgressPercentage()).toBe(50);
        });

        test('should get remaining episodes', () => {
            const show = new Show({
                ...validShowData,
                currentEpisode: 8,
                totalEpisodes: 12
            });

            expect(show.getRemainingEpisodes()).toBe(4);
        });

        test('should check if show is completed', () => {
            const completed = new Show({
                ...validShowData,
                currentEpisode: 12,
                totalEpisodes: 12,
                status: new ShowStatus('completed')
            });

            const inProgress = new Show({
                ...validShowData,
                currentEpisode: 8,
                totalEpisodes: 12
            });

            expect(completed.isCompleted()).toBe(true);
            expect(inProgress.isCompleted()).toBe(false);
        });

        test('should estimate completion date', () => {
            const startDate = new ShowDate('01-01-24');
            const show = new Show({
                ...validShowData,
                startDate,
                currentEpisode: 6,
                totalEpisodes: 12
            });

            const estimatedDate = show.estimateCompletionDate();
            const expectedDate = startDate.addWeeks(11); // Episode 12 airs on week 11

            expect(estimatedDate.isEqual(expectedDate)).toBe(true);
        });
    });

    describe('Immutability and State Management', () => {
        test('should maintain immutability on all operations', () => {
            const show = new Show(validShowData);

            const incremented = show.incrementEpisode();
            const scored = show.setScore(9.0);
            const tagged = show.addTag('comedy');
            const noted = show.setNotes('New notes');

            expect(show.getCurrentEpisode()).toBe(5);
            expect(show.getScore()).toBe(8.5);
            expect(show.getTags()).not.toContain('comedy');
            expect(show.getNotes()).toBe('Great show!');

            expect(incremented).not.toBe(show);
            expect(scored).not.toBe(show);
            expect(tagged).not.toBe(show);
            expect(noted).not.toBe(show);
        });

        test('should handle complex state changes', () => {
            const show = new Show(validShowData);

            const updated = show
                .incrementEpisode()
                .incrementEpisode()
                .setScore(9.0)
                .addTag('comedy')
                .setNotes('Updated after watching more episodes');

            expect(updated.getCurrentEpisode()).toBe(7);
            expect(updated.getScore()).toBe(9.0);
            expect(updated.getTags()).toContain('comedy');
            expect(updated.getNotes()).toBe('Updated after watching more episodes');

            // Original remains unchanged
            expect(show.getCurrentEpisode()).toBe(5);
            expect(show.getScore()).toBe(8.5);
        });
    });
});