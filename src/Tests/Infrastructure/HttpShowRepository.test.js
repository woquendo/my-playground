/**
 * HTTP Show Repository Tests (Simplified)
 */
import { jest } from '@jest/globals';
import { HttpShowRepository } from '../../Infrastructure/Repositories/HttpShowRepository.js';
import { Show } from '../../Domain/Models/Show.js';
import { RepositoryError } from '../../Core/Errors/ApplicationErrors.js';

describe('HttpShowRepository', () => {
    let repository;
    let mockHttpClient;
    let mockCache;

    const mockShowData = {
        id: 'show1',
        title: 'Test Show',
        start_date: '01-01-25',
        total_episodes: 12,
        current_episode: 5,
        status: 'watching',
        airing_status: 'currently_airing'
    };

    beforeEach(() => {
        // Mock HttpClient
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn()
        };

        // Mock CacheManager - must have all methods
        mockCache = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            has: jest.fn(),
            keys: jest.fn(),
            size: jest.fn()
        };

        repository = new HttpShowRepository(mockHttpClient, mockCache, {
            cacheTTL: 60000
        });
    });

    describe('getAll', () => {
        test('should fetch and return all shows', async () => {
            const mockData = [mockShowData];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const shows = await repository.getAll();

            expect(shows).toHaveLength(1);
            expect(shows[0]).toBeInstanceOf(Show);
            expect(shows[0].getTitle()).toBe('Test Show');
            expect(mockCache.set).toHaveBeenCalled();
        });

        test('should return cached shows if available', async () => {
            const cachedShows = [
                new Show({
                    id: 'show1',
                    title: 'Cached Show',
                    startDate: '01-01-25',
                    status: 'watching',
                    totalEpisodes: 12,
                    currentEpisode: 5
                })
            ];

            mockCache.get.mockReturnValue(cachedShows);

            const shows = await repository.getAll();

            expect(shows).toEqual(cachedShows);
            expect(mockHttpClient.get).not.toHaveBeenCalled();
        });

        test('should throw RepositoryError on fetch failure', async () => {
            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockRejectedValue(new Error('Network error'));

            await expect(repository.getAll())
                .rejects
                .toThrow(RepositoryError);
        });
    });

    describe('getById', () => {
        test('should fetch show by ID', async () => {
            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue([mockShowData]);

            const show = await repository.getById('show1');

            expect(show).toBeInstanceOf(Show);
            expect(show.getTitle()).toBe('Test Show');
        });

        test('should return null if show not found', async () => {
            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue([mockShowData]);

            const show = await repository.getById('nonexistent');

            expect(show).toBeNull();
        });
    });

    describe('save', () => {
        test('should create new show', async () => {
            const showData = {
                id: 'new1',
                title: 'New Show',
                startDate: '01-01-25',
                status: 'watching',
                totalEpisodes: 12,
                currentEpisode: 0
            };

            const show = new Show(showData);

            const saved = await repository.save(show);

            expect(saved).toBeInstanceOf(Show);
            // Implementation only invalidates cache, doesn't make HTTP calls
            expect(mockCache.delete).toHaveBeenCalledTimes(2);
            expect(mockCache.delete).toHaveBeenCalledWith('shows:all');
            expect(mockCache.delete).toHaveBeenCalledWith('show:new1');
        });

        test('should update existing show', async () => {
            const show = new Show({
                id: 'show1',
                title: 'Updated Show',
                startDate: '01-01-25',
                status: 'watching',
                totalEpisodes: 12,
                currentEpisode: 6
            });

            const saved = await repository.save(show);

            expect(saved).toBeInstanceOf(Show);
            // Implementation only invalidates cache, doesn't make HTTP calls
            expect(mockCache.delete).toHaveBeenCalledTimes(2);
            expect(mockCache.delete).toHaveBeenCalledWith('shows:all');
            expect(mockCache.delete).toHaveBeenCalledWith('show:show1');
        });
    });

    describe('delete', () => {
        test('should delete show', async () => {
            const result = await repository.delete('show1');

            expect(result).toBe(true);
            expect(mockCache.delete).toHaveBeenCalledTimes(2);
            expect(mockCache.delete).toHaveBeenCalledWith('shows:all');
            expect(mockCache.delete).toHaveBeenCalledWith('show:show1');
        });
    });

    describe('Query Operations', () => {
        test('should search by title', async () => {
            const mockData = [
                { ...mockShowData, id: 'show1', title: 'Attack on Titan' },
                { ...mockShowData, id: 'show2', title: 'My Hero Academia' }
            ];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const results = await repository.searchByTitle('attack');

            expect(results).toHaveLength(1);
            expect(results[0].getTitle()).toBe('Attack on Titan');
        });

        test('should get currently airing shows', async () => {
            const mockData = [
                { ...mockShowData, id: 'show1', airing_status: 'currently_airing' },
                { ...mockShowData, id: 'show2', airing_status: 'finished_airing' }
            ];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const results = await repository.getCurrentlyAiring();

            expect(results).toHaveLength(1);
        });
    });
});
