/**
 * Tests for Strategy Pattern Implementations
 * Test suite for filter and sort strategies
 */

import {
    FilterStrategy,
    AiringShowsStrategy,
    CompletedShowsStrategy,
    DroppedShowsStrategy,
    BehindScheduleStrategy,
    RatingFilterStrategy,
    ArtistFilterStrategy,
    SortStrategy,
    TitleSortStrategy,
    RatingSortStrategy,
    PlayCountSortStrategy,
    LastPlayedSortStrategy,
    AirDaySortStrategy,
    StrategyContext,
    StrategyFactory
} from '../../Application/Strategies/index.js';
import { ShowStatus } from '../../Domain/ValueObjects/ShowStatus.js';

describe('Filter Strategies', () => {
    describe('FilterStrategy Base Class', () => {
        test('should throw error if filter not implemented', () => {
            const strategy = new FilterStrategy();
            expect(() => strategy.filter([])).toThrow('FilterStrategy.filter() must be implemented');
        });

        test('should return strategy name', () => {
            const strategy = new FilterStrategy();
            expect(strategy.getName()).toBe('FilterStrategy');
        });
    });

    describe('AiringShowsStrategy', () => {
        test('should filter watching shows', () => {
            const statusWatching = new ShowStatus('watching');
            const statusCompleted = new ShowStatus('completed');
            const statusOnHold = new ShowStatus('on_hold');

            const shows = [
                { getStatus: () => statusWatching, getStatusObject: () => statusWatching },
                { getStatus: () => statusCompleted, getStatusObject: () => statusCompleted },
                { getStatus: () => statusOnHold, getStatusObject: () => statusOnHold }
            ];

            const strategy = new AiringShowsStrategy();
            const result = strategy.filter(shows);

            expect(result).toHaveLength(2);
            expect(result[0].getStatus().getValue()).toBe('watching');
            expect(result[1].getStatus().getValue()).toBe('on_hold');
        });
    });

    describe('CompletedShowsStrategy', () => {
        test('should filter completed shows', () => {
            const statusWatching = new ShowStatus('watching');
            const statusCompleted = new ShowStatus('completed');

            const shows = [
                { getStatus: () => statusWatching, getStatusObject: () => statusWatching },
                { getStatus: () => statusCompleted, getStatusObject: () => statusCompleted },
                { getStatus: () => statusCompleted, getStatusObject: () => statusCompleted }
            ];

            const strategy = new CompletedShowsStrategy();
            const result = strategy.filter(shows);

            expect(result).toHaveLength(2);
            expect(result[0].getStatus().getValue()).toBe('completed');
        });
    });

    describe('DroppedShowsStrategy', () => {
        test('should filter dropped shows', () => {
            const shows = [
                { getStatus: () => new ShowStatus('watching') },
                { getStatus: () => new ShowStatus('dropped') },
                { getStatus: () => new ShowStatus('on_hold') }
            ];

            const strategy = new DroppedShowsStrategy();
            const result = strategy.filter(shows);

            expect(result).toHaveLength(1);
            expect(result[0].getStatus().getValue()).toBe('dropped');
        });
    });

    describe('BehindScheduleStrategy', () => {
        test('should filter shows behind schedule', () => {
            const shows = [
                { getCurrentEpisode: () => 5, getLatestEpisode: () => 10 },
                { getCurrentEpisode: () => 10, getLatestEpisode: () => 10 },
                { getCurrentEpisode: () => 8, getLatestEpisode: () => 12 }
            ];

            const strategy = new BehindScheduleStrategy();
            const result = strategy.filter(shows);

            expect(result).toHaveLength(2);
            expect(result[0].getCurrentEpisode()).toBe(5);
            expect(result[1].getCurrentEpisode()).toBe(8);
        });

        test('should not include shows caught up', () => {
            const shows = [
                { getCurrentEpisode: () => 10, getLatestEpisode: () => 10 }
            ];

            const strategy = new BehindScheduleStrategy();
            const result = strategy.filter(shows);

            expect(result).toHaveLength(0);
        });
    });

    describe('RatingFilterStrategy', () => {
        test('should filter tracks by minimum rating', () => {
            const tracks = [
                { getRating: () => 5 },
                { getRating: () => 3 },
                { getRating: () => 4 },
                { getRating: () => null }
            ];

            const strategy = new RatingFilterStrategy(4);
            const result = strategy.filter(tracks);

            expect(result).toHaveLength(2);
            expect(result[0].getRating()).toBe(5);
            expect(result[1].getRating()).toBe(4);
        });

        test('should exclude null ratings', () => {
            const tracks = [
                { getRating: () => null },
                { getRating: () => 3 }
            ];

            const strategy = new RatingFilterStrategy(4);
            const result = strategy.filter(tracks);

            expect(result).toHaveLength(0);
        });
    });

    describe('ArtistFilterStrategy', () => {
        test('should filter tracks by artist', () => {
            const tracks = [
                { getArtist: () => 'Artist One' },
                { getArtist: () => 'Artist Two' },
                { getArtist: () => 'Another Artist' }
            ];

            const strategy = new ArtistFilterStrategy('artist');
            const result = strategy.filter(tracks);

            expect(result).toHaveLength(3);
        });

        test('should be case insensitive', () => {
            const tracks = [
                { getArtist: () => 'ARTIST ONE' },
                { getArtist: () => 'artist two' }
            ];

            const strategy = new ArtistFilterStrategy('ARTIST');
            const result = strategy.filter(tracks);

            expect(result).toHaveLength(2);
        });

        test('should match partial artist names', () => {
            const tracks = [
                { getArtist: () => 'The Beatles' },
                { getArtist: () => 'Beatles Revival' },
                { getArtist: () => 'Queen' }
            ];

            const strategy = new ArtistFilterStrategy('beatles');
            const result = strategy.filter(tracks);

            expect(result).toHaveLength(2);
        });
    });
});

describe('Sort Strategies', () => {
    describe('SortStrategy Base Class', () => {
        test('should throw error if sort not implemented', () => {
            const strategy = new SortStrategy();
            expect(() => strategy.sort([])).toThrow('SortStrategy.sort() must be implemented');
        });

        test('should return strategy name', () => {
            const strategy = new SortStrategy();
            expect(strategy.getName()).toBe('SortStrategy');
        });
    });

    describe('TitleSortStrategy', () => {
        test('should sort items alphabetically by title (ascending)', () => {
            const items = [
                { getTitle: () => 'Zebra' },
                { getTitle: () => 'Apple' },
                { getTitle: () => 'Mango' }
            ];

            const strategy = new TitleSortStrategy(true);
            const result = strategy.sort(items);

            expect(result[0].getTitle()).toBe('Apple');
            expect(result[1].getTitle()).toBe('Mango');
            expect(result[2].getTitle()).toBe('Zebra');
        });

        test('should sort items alphabetically by title (descending)', () => {
            const items = [
                { getTitle: () => 'Apple' },
                { getTitle: () => 'Zebra' },
                { getTitle: () => 'Mango' }
            ];

            const strategy = new TitleSortStrategy(false);
            const result = strategy.sort(items);

            expect(result[0].getTitle()).toBe('Zebra');
            expect(result[1].getTitle()).toBe('Mango');
            expect(result[2].getTitle()).toBe('Apple');
        });

        test('should be case insensitive', () => {
            const items = [
                { getTitle: () => 'zebra' },
                { getTitle: () => 'Apple' }
            ];

            const strategy = new TitleSortStrategy(true);
            const result = strategy.sort(items);

            expect(result[0].getTitle()).toBe('Apple');
            expect(result[1].getTitle()).toBe('zebra');
        });
    });

    describe('RatingSortStrategy', () => {
        test('should sort tracks by rating (descending)', () => {
            const tracks = [
                { getRating: () => 3 },
                { getRating: () => 5 },
                { getRating: () => 4 }
            ];

            const strategy = new RatingSortStrategy(false);
            const result = strategy.sort(tracks);

            expect(result[0].getRating()).toBe(5);
            expect(result[1].getRating()).toBe(4);
            expect(result[2].getRating()).toBe(3);
        });

        test('should sort tracks by rating (ascending)', () => {
            const tracks = [
                { getRating: () => 5 },
                { getRating: () => 3 },
                { getRating: () => 4 }
            ];

            const strategy = new RatingSortStrategy(true);
            const result = strategy.sort(tracks);

            expect(result[0].getRating()).toBe(3);
            expect(result[1].getRating()).toBe(4);
            expect(result[2].getRating()).toBe(5);
        });

        test('should treat null ratings as 0', () => {
            const tracks = [
                { getRating: () => 3 },
                { getRating: () => null },
                { getRating: () => 5 }
            ];

            const strategy = new RatingSortStrategy(false);
            const result = strategy.sort(tracks);

            expect(result[2].getRating()).toBe(null);
        });
    });

    describe('PlayCountSortStrategy', () => {
        test('should sort tracks by play count (descending)', () => {
            const tracks = [
                { getPlayCount: () => 10 },
                { getPlayCount: () => 50 },
                { getPlayCount: () => 25 }
            ];

            const strategy = new PlayCountSortStrategy(false);
            const result = strategy.sort(tracks);

            expect(result[0].getPlayCount()).toBe(50);
            expect(result[1].getPlayCount()).toBe(25);
            expect(result[2].getPlayCount()).toBe(10);
        });

        test('should treat null play counts as 0', () => {
            const tracks = [
                { getPlayCount: () => 10 },
                { getPlayCount: () => null }
            ];

            const strategy = new PlayCountSortStrategy(false);
            const result = strategy.sort(tracks);

            expect(result[0].getPlayCount()).toBe(10);
            expect(result[1].getPlayCount()).toBe(null);
        });
    });

    describe('LastPlayedSortStrategy', () => {
        test('should sort tracks by last played date (most recent first)', () => {
            const tracks = [
                { getLastPlayed: () => new Date('2024-01-01') },
                { getLastPlayed: () => new Date('2024-01-15') },
                { getLastPlayed: () => new Date('2024-01-10') }
            ];

            const strategy = new LastPlayedSortStrategy(false);
            const result = strategy.sort(tracks);

            expect(result[0].getLastPlayed().getTime()).toBe(new Date('2024-01-15').getTime());
            expect(result[2].getLastPlayed().getTime()).toBe(new Date('2024-01-01').getTime());
        });

        test('should treat null dates as epoch', () => {
            const tracks = [
                { getLastPlayed: () => new Date('2024-01-01') },
                { getLastPlayed: () => null }
            ];

            const strategy = new LastPlayedSortStrategy(false);
            const result = strategy.sort(tracks);

            expect(result[0].getLastPlayed()).not.toBe(null);
            expect(result[1].getLastPlayed()).toBe(null);
        });
    });

    describe('AirDaySortStrategy', () => {
        test('should sort shows by air day (Sunday first)', () => {
            const shows = [
                { getAirDay: () => 'Wednesday' },
                { getAirDay: () => 'Sunday' },
                { getAirDay: () => 'Friday' }
            ];

            const strategy = new AirDaySortStrategy(true);
            const result = strategy.sort(shows);

            expect(result[0].getAirDay()).toBe('Sunday');
            expect(result[1].getAirDay()).toBe('Wednesday');
            expect(result[2].getAirDay()).toBe('Friday');
        });

        test('should sort shows by air day (descending)', () => {
            const shows = [
                { getAirDay: () => 'Sunday' },
                { getAirDay: () => 'Saturday' }
            ];

            const strategy = new AirDaySortStrategy(false);
            const result = strategy.sort(shows);

            expect(result[0].getAirDay()).toBe('Saturday');
            expect(result[1].getAirDay()).toBe('Sunday');
        });
    });
});

describe('StrategyContext', () => {
    describe('Adding Filters', () => {
        test('should add filter strategy', () => {
            const context = new StrategyContext();
            const strategy = new AiringShowsStrategy();

            context.addFilter(strategy);

            expect(context.filterStrategies).toHaveLength(1);
            expect(context.filterStrategies[0]).toBe(strategy);
        });

        test('should chain filter additions', () => {
            const context = new StrategyContext();

            const result = context
                .addFilter(new AiringShowsStrategy())
                .addFilter(new BehindScheduleStrategy());

            expect(result).toBe(context);
            expect(context.filterStrategies).toHaveLength(2);
        });

        test('should throw error for invalid filter', () => {
            const context = new StrategyContext();

            expect(() => context.addFilter({})).toThrow('Strategy must be an instance of FilterStrategy');
        });
    });

    describe('Setting Sort', () => {
        test('should set sort strategy', () => {
            const context = new StrategyContext();
            const strategy = new TitleSortStrategy();

            context.setSort(strategy);

            expect(context.sortStrategy).toBe(strategy);
        });

        test('should chain sort setting', () => {
            const context = new StrategyContext();

            const result = context.setSort(new TitleSortStrategy());

            expect(result).toBe(context);
        });

        test('should throw error for invalid sort', () => {
            const context = new StrategyContext();

            expect(() => context.setSort({})).toThrow('Strategy must be an instance of SortStrategy');
        });
    });

    describe('Applying Strategies', () => {
        test('should apply filter strategies in order', () => {
            const statusWatching = new ShowStatus('watching');
            const statusCompleted = new ShowStatus('completed');

            const shows = [
                { getStatus: () => statusWatching, getStatusObject: () => statusWatching, getCurrentEpisode: () => 5, getLatestEpisode: () => 10 },
                { getStatus: () => statusWatching, getStatusObject: () => statusWatching, getCurrentEpisode: () => 10, getLatestEpisode: () => 10 },
                { getStatus: () => statusCompleted, getStatusObject: () => statusCompleted, getCurrentEpisode: () => 12, getLatestEpisode: () => 12 }
            ];

            const context = new StrategyContext()
                .addFilter(new AiringShowsStrategy())
                .addFilter(new BehindScheduleStrategy());

            const result = context.apply(shows);

            expect(result).toHaveLength(1);
            expect(result[0].getCurrentEpisode()).toBe(5);
        });

        test('should apply sort strategy after filters', () => {
            const statusWatching = new ShowStatus('watching');
            const statusCompleted = new ShowStatus('completed');

            const shows = [
                { getStatus: () => statusWatching, getStatusObject: () => statusWatching, getTitle: () => 'Zebra' },
                { getStatus: () => statusWatching, getStatusObject: () => statusWatching, getTitle: () => 'Apple' },
                { getStatus: () => statusCompleted, getStatusObject: () => statusCompleted, getTitle: () => 'Banana' }
            ];

            const context = new StrategyContext()
                .addFilter(new AiringShowsStrategy())
                .setSort(new TitleSortStrategy());

            const result = context.apply(shows);

            expect(result).toHaveLength(2);
            expect(result[0].getTitle()).toBe('Apple');
            expect(result[1].getTitle()).toBe('Zebra');
        });

        test('should not modify original array', () => {
            const items = [
                { getTitle: () => 'B' },
                { getTitle: () => 'A' }
            ];

            const context = new StrategyContext().setSort(new TitleSortStrategy());
            context.apply(items);

            expect(items[0].getTitle()).toBe('B');
        });
    });

    describe('Clear', () => {
        test('should clear all strategies', () => {
            const context = new StrategyContext()
                .addFilter(new AiringShowsStrategy())
                .setSort(new TitleSortStrategy());

            context.clear();

            expect(context.filterStrategies).toHaveLength(0);
            expect(context.sortStrategy).toBe(null);
        });

        test('should chain clear', () => {
            const context = new StrategyContext();

            const result = context.clear();

            expect(result).toBe(context);
        });
    });

    describe('Get Applied Strategies', () => {
        test('should return applied strategy names', () => {
            const context = new StrategyContext()
                .addFilter(new AiringShowsStrategy())
                .setSort(new TitleSortStrategy());

            const strategies = context.getAppliedStrategies();

            expect(strategies.filters).toEqual(['AiringShowsStrategy']);
            expect(strategies.sort).toBe('TitleSortStrategy');
        });

        test('should return null sort when not set', () => {
            const context = new StrategyContext();

            const strategies = context.getAppliedStrategies();

            expect(strategies.sort).toBe(null);
        });
    });
});

describe('StrategyFactory', () => {
    test('should create context for airing shows', () => {
        const context = StrategyFactory.createAiringShowsContext();

        const strategies = context.getAppliedStrategies();
        expect(strategies.filters).toContain('AiringShowsStrategy');
        expect(strategies.sort).toBe('AirDaySortStrategy');
    });

    test('should create context for behind schedule shows', () => {
        const context = StrategyFactory.createBehindScheduleContext();

        const strategies = context.getAppliedStrategies();
        expect(strategies.filters).toContain('AiringShowsStrategy');
        expect(strategies.filters).toContain('BehindScheduleStrategy');
        expect(strategies.sort).toBe('TitleSortStrategy');
    });

    test('should create context for completed shows', () => {
        const context = StrategyFactory.createCompletedShowsContext();

        const strategies = context.getAppliedStrategies();
        expect(strategies.filters).toContain('CompletedShowsStrategy');
        expect(strategies.sort).toBe('TitleSortStrategy');
    });

    test('should create context for top rated tracks', () => {
        const context = StrategyFactory.createTopRatedTracksContext(4);

        const strategies = context.getAppliedStrategies();
        expect(strategies.filters).toContain('RatingFilterStrategy');
        expect(strategies.sort).toBe('RatingSortStrategy');
    });

    test('should create context for artist tracks', () => {
        const context = StrategyFactory.createArtistTracksContext('Beatles');

        const strategies = context.getAppliedStrategies();
        expect(strategies.filters).toContain('ArtistFilterStrategy');
        expect(strategies.sort).toBe('TitleSortStrategy');
    });

    test('should create context for recently played', () => {
        const context = StrategyFactory.createRecentlyPlayedContext();

        const strategies = context.getAppliedStrategies();
        expect(strategies.sort).toBe('LastPlayedSortStrategy');
    });

    test('should create context for most played', () => {
        const context = StrategyFactory.createMostPlayedContext();

        const strategies = context.getAppliedStrategies();
        expect(strategies.sort).toBe('PlayCountSortStrategy');
    });
});
