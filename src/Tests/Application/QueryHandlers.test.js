/**
 * Tests for Query Handlers
 * Test suite for CQRS query implementations
 */

import { jest } from '@jest/globals';
import {
    GetScheduleQuery,
    GetShowsByStatusQuery,
    GetMusicLibraryQuery,
    SearchTracksQuery,
    SearchShowsQuery,
    GetCurrentlyAiringQuery,
    GetShowByIdQuery,
    GetTrackByIdQuery,
    GetRecentlyPlayedQuery,
    GetTopRatedQuery,
    createShowQueryHandlers,
    createMusicQueryHandlers,
    registerShowQueries,
    registerMusicQueries
} from '../../Application/Queries/QueryHandlers.js';

describe('Query Classes', () => {
    describe('GetScheduleQuery', () => {
        test('should create query with default values', () => {
            const query = new GetScheduleQuery();
            expect(query.weekStart).toBeUndefined();
            expect(query.statuses).toEqual(['watching']);
        });

        test('should create query with custom values', () => {
            const weekStart = new Date('2024-01-01');
            const query = new GetScheduleQuery({ weekStart, statuses: ['watching', 'on-hold'] });
            expect(query.weekStart).toBe(weekStart);
            expect(query.statuses).toEqual(['watching', 'on-hold']);
        });
    });

    describe('GetShowsByStatusQuery', () => {
        test('should create query with status', () => {
            const query = new GetShowsByStatusQuery('watching');
            expect(query.status).toBe('watching');
        });
    });

    describe('GetMusicLibraryQuery', () => {
        test('should create query with default values', () => {
            const query = new GetMusicLibraryQuery();
            expect(query.sortBy).toBe('title');
            expect(query.filterByArtist).toBeUndefined();
            expect(query.minRating).toBeUndefined();
        });

        test('should create query with custom values', () => {
            const query = new GetMusicLibraryQuery({ sortBy: 'rating', filterByArtist: 'Artist', minRating: 4 });
            expect(query.sortBy).toBe('rating');
            expect(query.filterByArtist).toBe('Artist');
            expect(query.minRating).toBe(4);
        });
    });

    describe('SearchTracksQuery', () => {
        test('should create query with search term', () => {
            const query = new SearchTracksQuery('test');
            expect(query.query).toBe('test');
        });
    });

    describe('SearchShowsQuery', () => {
        test('should create query with search term', () => {
            const query = new SearchShowsQuery('test');
            expect(query.query).toBe('test');
        });
    });

    describe('GetCurrentlyAiringQuery', () => {
        test('should create query', () => {
            const query = new GetCurrentlyAiringQuery();
            expect(query).toBeInstanceOf(GetCurrentlyAiringQuery);
        });
    });

    describe('GetShowByIdQuery', () => {
        test('should create query with ID', () => {
            const query = new GetShowByIdQuery('show-123');
            expect(query.id).toBe('show-123');
        });
    });

    describe('GetTrackByIdQuery', () => {
        test('should create query with ID', () => {
            const query = new GetTrackByIdQuery('track-123');
            expect(query.id).toBe('track-123');
        });
    });

    describe('GetRecentlyPlayedQuery', () => {
        test('should create query with default limit', () => {
            const query = new GetRecentlyPlayedQuery();
            expect(query.limit).toBe(10);
        });

        test('should create query with custom limit', () => {
            const query = new GetRecentlyPlayedQuery(20);
            expect(query.limit).toBe(20);
        });
    });

    describe('GetTopRatedQuery', () => {
        test('should create query with default limit', () => {
            const query = new GetTopRatedQuery();
            expect(query.limit).toBe(10);
        });

        test('should create query with custom limit', () => {
            const query = new GetTopRatedQuery(15);
            expect(query.limit).toBe(15);
        });
    });
});

describe('Show Query Handlers', () => {
    let showService;
    let scheduleService;
    let handlers;

    beforeEach(() => {
        showService = {
            getShowsByStatus: jest.fn(),
            searchShows: jest.fn(),
            getCurrentlyAiringShows: jest.fn(),
            getShowById: jest.fn(),
            getAllShows: jest.fn()
        };

        scheduleService = {
            getWeeklySchedule: jest.fn()
        };

        handlers = createShowQueryHandlers(showService, scheduleService);
    });

    describe('schedule.weekly handler', () => {
        test('should call scheduleService.getWeeklySchedule with params', async () => {
            const schedule = { Monday: [], Tuesday: [] };
            scheduleService.getWeeklySchedule.mockResolvedValue(schedule);

            const weekStart = new Date('2024-01-01');
            const result = await handlers['schedule.weekly']({ weekStart, statuses: ['watching'] });

            expect(result).toBe(schedule);
            expect(scheduleService.getWeeklySchedule).toHaveBeenCalledWith({
                weekStart,
                statuses: ['watching']
            });
        });
    });

    describe('shows.byStatus handler', () => {
        test('should call showService.getShowsByStatus', async () => {
            const shows = [{ title: 'Show 1' }];
            showService.getShowsByStatus.mockResolvedValue(shows);

            const result = await handlers['shows.byStatus']({ status: 'watching' });

            expect(result).toBe(shows);
            expect(showService.getShowsByStatus).toHaveBeenCalledWith('watching');
        });
    });

    describe('shows.search handler', () => {
        test('should call showService.searchShows', async () => {
            const shows = [{ title: 'Test Show' }];
            showService.searchShows.mockResolvedValue(shows);

            const result = await handlers['shows.search']({ query: 'test' });

            expect(result).toBe(shows);
            expect(showService.searchShows).toHaveBeenCalledWith('test');
        });
    });

    describe('shows.currentlyAiring handler', () => {
        test('should call showService.getCurrentlyAiringShows', async () => {
            const shows = [{ title: 'Airing Show' }];
            showService.getCurrentlyAiringShows.mockResolvedValue(shows);

            const result = await handlers['shows.currentlyAiring']({});

            expect(result).toBe(shows);
            expect(showService.getCurrentlyAiringShows).toHaveBeenCalled();
        });
    });

    describe('shows.byId handler', () => {
        test('should call showService.getShowById', async () => {
            const show = { title: 'Show 1' };
            showService.getShowById.mockResolvedValue(show);

            const result = await handlers['shows.byId']({ id: 'show-123' });

            expect(result).toBe(show);
            expect(showService.getShowById).toHaveBeenCalledWith('show-123');
        });
    });

    describe('shows.all handler', () => {
        test('should call showService.getAllShows', async () => {
            const shows = [{ title: 'Show 1' }, { title: 'Show 2' }];
            showService.getAllShows.mockResolvedValue(shows);

            const result = await handlers['shows.all']({});

            expect(result).toBe(shows);
            expect(showService.getAllShows).toHaveBeenCalled();
        });
    });
});

describe('Music Query Handlers', () => {
    let musicService;
    let handlers;

    beforeEach(() => {
        musicService = {
            getAllTracks: jest.fn(),
            getTracksByArtist: jest.fn(),
            getTracksByRating: jest.fn(),
            searchTracks: jest.fn(),
            getTrackById: jest.fn(),
            getRecentlyPlayed: jest.fn(),
            getTopRated: jest.fn()
        };

        handlers = createMusicQueryHandlers(musicService);
    });

    describe('music.library handler', () => {
        test('should return all tracks with default sort', async () => {
            const tracks = [
                { getTitle: () => 'B Track', getRating: () => 4, getPlayCount: () => 10 },
                { getTitle: () => 'A Track', getRating: () => 5, getPlayCount: () => 20 }
            ];
            musicService.getAllTracks.mockResolvedValue(tracks);

            const result = await handlers['music.library']({});

            expect(result[0].getTitle()).toBe('A Track');
            expect(result[1].getTitle()).toBe('B Track');
        });

        test('should filter by artist', async () => {
            const filteredTracks = [{ getTitle: () => 'Track 1' }];
            musicService.getTracksByArtist.mockResolvedValue(filteredTracks);

            const result = await handlers['music.library']({ filterByArtist: 'Artist Name' });

            expect(result).toBe(filteredTracks);
            expect(musicService.getTracksByArtist).toHaveBeenCalledWith('Artist Name');
        });

        test('should filter by min rating', async () => {
            const filteredTracks = [{ getTitle: () => 'Track 1', getRating: () => 5 }];
            musicService.getTracksByRating.mockResolvedValue(filteredTracks);

            const result = await handlers['music.library']({ minRating: 4 });

            expect(result).toEqual(filteredTracks);
            expect(musicService.getTracksByRating).toHaveBeenCalledWith(4);
        });

        test('should sort by rating', async () => {
            const tracks = [
                { getTitle: () => 'Track 1', getRating: () => 3, getPlayCount: () => 10 },
                { getTitle: () => 'Track 2', getRating: () => 5, getPlayCount: () => 20 }
            ];
            musicService.getAllTracks.mockResolvedValue(tracks);

            const result = await handlers['music.library']({ sortBy: 'rating' });

            expect(result[0].getRating()).toBe(5);
            expect(result[1].getRating()).toBe(3);
        });

        test('should sort by play count', async () => {
            const tracks = [
                { getTitle: () => 'Track 1', getRating: () => 3, getPlayCount: () => 10 },
                { getTitle: () => 'Track 2', getRating: () => 5, getPlayCount: () => 20 }
            ];
            musicService.getAllTracks.mockResolvedValue(tracks);

            const result = await handlers['music.library']({ sortBy: 'playCount' });

            expect(result[0].getPlayCount()).toBe(20);
            expect(result[1].getPlayCount()).toBe(10);
        });
    });

    describe('music.search handler', () => {
        test('should call musicService.searchTracks', async () => {
            const tracks = [{ getTitle: () => 'Test Track' }];
            musicService.searchTracks.mockResolvedValue(tracks);

            const result = await handlers['music.search']({ query: 'test' });

            expect(result).toBe(tracks);
            expect(musicService.searchTracks).toHaveBeenCalledWith('test');
        });
    });

    describe('music.byId handler', () => {
        test('should call musicService.getTrackById', async () => {
            const track = { getTitle: () => 'Track 1' };
            musicService.getTrackById.mockResolvedValue(track);

            const result = await handlers['music.byId']({ id: 'track-123' });

            expect(result).toBe(track);
            expect(musicService.getTrackById).toHaveBeenCalledWith('track-123');
        });
    });

    describe('music.recentlyPlayed handler', () => {
        test('should call musicService.getRecentlyPlayed', async () => {
            const tracks = [{ getTitle: () => 'Recent Track' }];
            musicService.getRecentlyPlayed.mockResolvedValue(tracks);

            const result = await handlers['music.recentlyPlayed']({ limit: 15 });

            expect(result).toBe(tracks);
            expect(musicService.getRecentlyPlayed).toHaveBeenCalledWith(15);
        });
    });

    describe('music.topRated handler', () => {
        test('should call musicService.getTopRated', async () => {
            const tracks = [{ getTitle: () => 'Top Track' }];
            musicService.getTopRated.mockResolvedValue(tracks);

            const result = await handlers['music.topRated']({ limit: 10 });

            expect(result).toBe(tracks);
            expect(musicService.getTopRated).toHaveBeenCalledWith(10);
        });
    });

    describe('music.all handler', () => {
        test('should call musicService.getAllTracks', async () => {
            const tracks = [{ getTitle: () => 'Track 1' }];
            musicService.getAllTracks.mockResolvedValue(tracks);

            const result = await handlers['music.all']({});

            expect(result).toBe(tracks);
            expect(musicService.getAllTracks).toHaveBeenCalled();
        });
    });
});

describe('Query Registration', () => {
    describe('registerShowQueries', () => {
        test('should register all show queries with query bus', () => {
            const queryBus = {
                register: jest.fn()
            };
            const showService = {};
            const scheduleService = {};

            registerShowQueries(queryBus, showService, scheduleService);

            expect(queryBus.register).toHaveBeenCalledTimes(6);
            expect(queryBus.register).toHaveBeenCalledWith('schedule.weekly', expect.any(Function), { cacheTTL: 60000 });
            expect(queryBus.register).toHaveBeenCalledWith('shows.byStatus', expect.any(Function), { cacheTTL: 60000 });
            expect(queryBus.register).toHaveBeenCalledWith('shows.search', expect.any(Function), { cacheTTL: 60000 });
        });

        test('should use custom cache TTL options', () => {
            const queryBus = {
                register: jest.fn()
            };
            const showService = {};
            const scheduleService = {};

            registerShowQueries(queryBus, showService, scheduleService, {
                'schedule.weekly': 120000
            });

            expect(queryBus.register).toHaveBeenCalledWith('schedule.weekly', expect.any(Function), { cacheTTL: 120000 });
        });
    });

    describe('registerMusicQueries', () => {
        test('should register all music queries with query bus', () => {
            const queryBus = {
                register: jest.fn()
            };
            const musicService = {};

            registerMusicQueries(queryBus, musicService);

            expect(queryBus.register).toHaveBeenCalledTimes(6);
            expect(queryBus.register).toHaveBeenCalledWith('music.library', expect.any(Function), { cacheTTL: 60000 });
            expect(queryBus.register).toHaveBeenCalledWith('music.search', expect.any(Function), { cacheTTL: 60000 });
        });

        test('should use custom cache TTL options', () => {
            const queryBus = {
                register: jest.fn()
            };
            const musicService = {};

            registerMusicQueries(queryBus, musicService, {
                'music.topRated': 180000
            });

            expect(queryBus.register).toHaveBeenCalledWith('music.topRated', expect.any(Function), { cacheTTL: 180000 });
        });
    });
});
