/**
 * HTTP Music Repository Tests (Simplified)
 */
import { jest } from '@jest/globals';
import { HttpMusicRepository } from '../../Infrastructure/Repositories/HttpMusicRepository.js';
import { Music } from '../../Domain/Models/Music.js';
import { RepositoryError } from '../../Core/Errors/ApplicationErrors.js';

describe('HttpMusicRepository', () => {
    let repository;
    let mockHttpClient;
    let mockCache;

    const mockMusicData = {
        id: 'track1',
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        rating: 5,
        playCount: 10
    };

    beforeEach(() => {
        // Mock HttpClient
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn()
        };

        // Mock CacheManager
        mockCache = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            has: jest.fn(),
            keys: jest.fn(),
            size: jest.fn()
        };

        repository = new HttpMusicRepository(mockHttpClient, mockCache, {
            cacheTTL: 60000
        });
    });

    describe('getAll', () => {
        test('should fetch and return all music tracks', async () => {
            const mockData = [mockMusicData];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const tracks = await repository.getAll();

            expect(tracks).toHaveLength(1);
            expect(tracks[0]).toBeInstanceOf(Music);
            expect(tracks[0].getTitle()).toBe('Test Song');
            expect(mockCache.set).toHaveBeenCalled();
        });

        test('should return cached tracks if available', async () => {
            const cachedTracks = [
                new Music({
                    id: 'track1',
                    title: 'Cached Song',
                    artist: 'Cached Artist',
                    album: 'Cached Album'
                })
            ];

            mockCache.get.mockReturnValue(cachedTracks);

            const tracks = await repository.getAll();

            expect(tracks).toEqual(cachedTracks);
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
        test('should fetch track by ID', async () => {
            mockCache.get.mockReturnValue(null);
            // getById calls getAll() internally, so mock must return array
            mockHttpClient.get.mockResolvedValue([mockMusicData]);

            const track = await repository.getById('track1');

            expect(track).toBeInstanceOf(Music);
            expect(track.getTitle()).toBe('Test Song');
        });

        test('should return null if track not found', async () => {
            mockCache.get.mockReturnValue(null);
            // Return empty array when track not found
            mockHttpClient.get.mockResolvedValue([]);

            const track = await repository.getById('nonexistent');

            expect(track).toBeNull();
        });
    });

    describe('Query Operations', () => {
        test('should filter by rating', async () => {
            const mockData = [
                { ...mockMusicData, id: 'track1', rating: 5 },
                { ...mockMusicData, id: 'track2', rating: 3 }
            ];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const highRated = await repository.getByRating(4);

            expect(highRated).toHaveLength(1);
            expect(highRated[0].getRating()).toBe(5);
        });

        test('should filter by artist', async () => {
            const mockData = [
                { ...mockMusicData, id: 'track1', artist: 'The Beatles' },
                { ...mockMusicData, id: 'track2', artist: 'Queen' }
            ];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const beatlesSongs = await repository.getByArtist('The Beatles');

            expect(beatlesSongs).toHaveLength(1);
            expect(beatlesSongs[0].getArtist()).toBe('The Beatles');
        });

        test('should search tracks', async () => {
            const mockData = [
                { ...mockMusicData, id: 'track1', title: 'Bohemian Rhapsody', artist: 'Queen' },
                { ...mockMusicData, id: 'track2', title: 'Yesterday', artist: 'The Beatles' }
            ];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const results = await repository.search('queen');

            expect(results.length).toBeGreaterThan(0);
        });

        test('should get recently played', async () => {
            const mockData = [
                { ...mockMusicData, id: 'track1', lastPlayed: '2025-01-10T10:00:00Z' },
                { ...mockMusicData, id: 'track2', lastPlayed: '2025-01-05T10:00:00Z' },
                { ...mockMusicData, id: 'track3', lastPlayed: null }
            ];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const recent = await repository.getRecentlyPlayed();

            // Should exclude null lastPlayed
            expect(recent).toHaveLength(2);
            // Should be sorted by most recent first
            expect(new Date(recent[0].getLastPlayed()).getTime())
                .toBeGreaterThan(new Date(recent[1].getLastPlayed()).getTime());
        });

        test('should get top rated', async () => {
            const mockData = [
                { ...mockMusicData, id: 'track1', rating: 5 },
                { ...mockMusicData, id: 'track2', rating: 4 },
                { ...mockMusicData, id: 'track3', rating: 0 }
            ];

            mockCache.get.mockReturnValue(null);
            mockHttpClient.get.mockResolvedValue(mockData);

            const topRated = await repository.getTopRated();

            // Should exclude rating = 0
            expect(topRated).toHaveLength(2);
            // Should be sorted by rating descending
            expect(topRated[0].getRating()).toBeGreaterThanOrEqual(topRated[1].getRating());
        });
    });

    describe('save', () => {
        test('should create new track', async () => {
            const track = new Music({
                id: 'new1',
                title: 'New Song',
                artist: 'New Artist',
                album: 'New Album'
            });

            const saved = await repository.save(track);

            expect(saved).toBeInstanceOf(Music);
            // Implementation only invalidates cache, doesn't make HTTP calls
            expect(mockCache.delete).toHaveBeenCalledTimes(2);
            expect(mockCache.delete).toHaveBeenCalledWith('music:all');
            expect(mockCache.delete).toHaveBeenCalledWith('music:new1');
        });

        test('should update existing track', async () => {
            const track = new Music({
                id: 'track1',
                title: 'Updated Song',
                artist: 'Updated Artist',
                album: 'Updated Album'
            });

            const saved = await repository.save(track);

            expect(saved).toBeInstanceOf(Music);
            // Implementation only invalidates cache, doesn't make HTTP calls
            expect(mockCache.delete).toHaveBeenCalledTimes(2);
            expect(mockCache.delete).toHaveBeenCalledWith('music:all');
            expect(mockCache.delete).toHaveBeenCalledWith('music:track1');
        });
    });

    describe('delete', () => {
        test('should delete track', async () => {
            await repository.delete('track1');

            // Implementation only invalidates cache, doesn't make HTTP calls
            expect(mockCache.delete).toHaveBeenCalledTimes(2);
            expect(mockCache.delete).toHaveBeenCalledWith('music:all');
            expect(mockCache.delete).toHaveBeenCalledWith('music:track1');
        });
    });

    describe('incrementPlayCount', () => {
        test('should increment play count', async () => {
            const mockTrack = {
                ...mockMusicData,
                playCount: 5,
                lastPlayed: null
            };

            // getById calls getAll() internally, so mock must return array
            mockHttpClient.get.mockResolvedValue([mockTrack]);

            const updated = await repository.incrementPlayCount('track1');

            expect(updated.getPlayCount()).toBe(6);
            // Implementation only invalidates cache for save operation
            expect(mockCache.delete).toHaveBeenCalled();
        });

        test('should throw if track not found', async () => {
            // Return empty array when track not found
            mockHttpClient.get.mockResolvedValue([]);

            await expect(repository.incrementPlayCount('nonexistent'))
                .rejects
                .toThrow(RepositoryError);
        });
    });
});
