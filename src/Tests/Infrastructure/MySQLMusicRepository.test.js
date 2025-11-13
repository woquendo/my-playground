/**
 * @jest-environment node
 */

/**
 * MySQLMusicRepository Tests
 * 
 * Tests for MySQL-based music repository with favorites and playlists
 */

import { MySQLMusicRepository } from '../../Infrastructure/Repositories/MySQLMusicRepository.js';
import { Song } from '../../Domain/Models/Song.js';
import { Logger } from '../../Core/Logger.js';

// Mock database connection
const createMockConnection = () => ({
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
});

// Mock connection manager
const createMockConnectionManager = (mockConnection) => ({
    initialize: jest.fn(),
    query: jest.fn(),
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    executeInTransaction: jest.fn(async (callback) => {
        const conn = mockConnection;
        await conn.beginTransaction();
        try {
            const result = await callback(conn);
            await conn.commit();
            return result;
        } catch (error) {
            await conn.rollback();
            throw error;
        }
    })
});

describe('MySQLMusicRepository', () => {
    let repository;
    let mockConnection;
    let mockConnectionManager;
    let mockLogger;
    const testUserId = 1;

    beforeEach(() => {
        mockConnection = createMockConnection();
        mockConnectionManager = createMockConnectionManager(mockConnection);
        mockLogger = new Logger({ level: 'silent' });

        repository = new MySQLMusicRepository({
            connectionManager: mockConnectionManager,
            logger: mockLogger
        });
    });

    describe('Create Song', () => {
        test('should create song for specific user', async () => {
            const songData = {
                title: 'Test Song',
                artist: 'Test Artist',
                type: 'Opening',
                showTitle: 'Test Anime',
                videoId: 'abc123'
            };

            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])  // Insert song
                .mockResolvedValueOnce([{ insertId: 1 }]);  // Insert user_song

            const song = await repository.create(songData, testUserId);

            expect(song.id).toBe(1);
            expect(song.title).toBe('Test Song');

            // Verify user_song association
            const userSongInsert = mockConnection.query.mock.calls.find(
                call => call[0].includes('INSERT INTO user_songs')
            );
            expect(userSongInsert).toBeDefined();
            expect(userSongInsert[1]).toContain(testUserId);
        });

        test('should handle playlist association', async () => {
            const songData = {
                title: 'Test Song',
                playlistId: 'playlist123'
            };

            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            const song = await repository.create(songData, testUserId);

            // Verify playlist_id was saved
            const insertCall = mockConnection.query.mock.calls[0];
            expect(insertCall[0]).toContain('playlist_id');
        });
    });

    describe('Get Songs - User Isolation', () => {
        test('should only return songs for specific user', async () => {
            const mockSongs = [
                {
                    id: 1,
                    title: 'User 1 Song',
                    artist: 'Test Artist',
                    type: 'Opening',
                    user_id: testUserId
                }
            ];

            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            const songs = await repository.findAll(testUserId);

            expect(songs).toHaveLength(1);
            expect(songs[0].title).toBe('User 1 Song');

            // Verify user filter
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
            expect(queryCall[1]).toContain(testUserId);
        });

        test('should not return other users songs', async () => {
            mockConnection.query.mockResolvedValueOnce([[]]);

            const songs = await repository.findAll(testUserId);

            expect(songs).toHaveLength(0);
        });
    });

    describe('Favorites', () => {
        test('should mark song as favorite', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const result = await repository.setFavorite(1, testUserId, true);

            expect(result).toBe(true);

            // Verify update
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('is_favorite = ?');
            expect(queryCall[1]).toContain(1);  // true -> 1
        });

        test('should unmark song as favorite', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            await repository.setFavorite(1, testUserId, false);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[1]).toContain(0);  // false -> 0
        });

        test('should only update user own favorites', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

            const result = await repository.setFavorite(1, testUserId, true);

            expect(result).toBe(false);

            // Verify user isolation
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
        });

        test('should get favorites only', async () => {
            const mockFavorites = [
                {
                    id: 1,
                    title: 'Favorite Song',
                    is_favorite: 1,
                    user_id: testUserId
                }
            ];

            mockConnection.query.mockResolvedValueOnce([mockFavorites]);

            const favorites = await repository.findFavorites(testUserId);

            expect(favorites).toHaveLength(1);

            // Verify favorites filter
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('is_favorite = 1');
        });
    });

    describe('Filter by Type', () => {
        test('should filter by opening', async () => {
            const mockSongs = [];
            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            await repository.findByType('Opening', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('type = ?');
            expect(queryCall[1]).toContain('Opening');
        });

        test('should filter by ending', async () => {
            const mockSongs = [];
            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            await repository.findByType('Ending', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[1]).toContain('Ending');
        });

        test('should always include user filter', async () => {
            const mockSongs = [];
            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            await repository.findByType('OST', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
        });
    });

    describe('Filter by Playlist', () => {
        test('should get songs from specific playlist', async () => {
            const mockSongs = [
                {
                    id: 1,
                    title: 'Playlist Song',
                    playlist_id: 'playlist123',
                    user_id: testUserId
                }
            ];

            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            const songs = await repository.findByPlaylist('playlist123', testUserId);

            expect(songs).toHaveLength(1);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('playlist_id = ?');
            expect(queryCall[1]).toContain('playlist123');
        });

        test('should respect user isolation for playlists', async () => {
            mockConnection.query.mockResolvedValueOnce([[]]);

            const songs = await repository.findByPlaylist('playlist123', testUserId);

            expect(songs).toHaveLength(0);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
        });
    });

    describe('Search', () => {
        test('should search by title', async () => {
            const mockSongs = [];
            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            await repository.search('Unravel', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('title LIKE ?');
            expect(queryCall[1][0]).toContain('%Unravel%');
        });

        test('should search by artist', async () => {
            const mockSongs = [];
            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            await repository.search('TK', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('artist LIKE ?');
        });

        test('should search by show title', async () => {
            const mockSongs = [];
            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            await repository.search('Tokyo Ghoul', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('show_title LIKE ?');
        });

        test('should always filter by user in search', async () => {
            const mockSongs = [];
            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            await repository.search('test', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
            expect(queryCall[1]).toContain(testUserId);
        });
    });

    describe('Update Song', () => {
        test('should update song for specific user', async () => {
            const songData = {
                id: 1,
                title: 'Updated Title',
                artist: 'Updated Artist'
            };

            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const result = await repository.update(songData, testUserId);

            expect(result).toBe(true);

            // Verify user isolation
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('WHERE song_id = ? AND user_id = ?');
        });

        test('should not update other users songs', async () => {
            const songData = {
                id: 1,
                title: 'Hacked Title'
            };

            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

            const result = await repository.update(songData, testUserId);

            expect(result).toBe(false);
        });
    });

    describe('Delete Song', () => {
        test('should delete song for specific user', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const result = await repository.delete(1, testUserId);

            expect(result).toBe(true);

            // Verify user isolation
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('WHERE song_id = ? AND user_id = ?');
        });

        test('should not delete other users songs', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

            const result = await repository.delete(1, testUserId);

            expect(result).toBe(false);
        });

        test('should cascade delete user_song association', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            await repository.delete(1, testUserId);

            const deleteCall = mockConnection.query.mock.calls[0];
            expect(deleteCall[0]).toContain('DELETE FROM user_songs');
        });
    });

    describe('Playlist Management', () => {
        test('should get songs grouped by playlist', async () => {
            const mockPlaylists = [
                {
                    playlist_id: 'playlist1',
                    playlist_title: 'My Playlist',
                    song_count: 5
                }
            ];

            mockConnection.query.mockResolvedValueOnce([mockPlaylists]);

            const playlists = await repository.getPlaylists(testUserId);

            expect(playlists).toHaveLength(1);
            expect(playlists[0].playlist_id).toBe('playlist1');
            expect(playlists[0].song_count).toBe(5);
        });

        test('should count songs in playlist', async () => {
            mockConnection.query.mockResolvedValueOnce([[{ count: 10 }]]);

            const count = await repository.countPlaylistSongs('playlist123', testUserId);

            expect(count).toBe(10);

            // Verify user isolation
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
        });
    });

    describe('Statistics', () => {
        test('should count songs by type', async () => {
            const mockCounts = [
                { type: 'Opening', count: 20 },
                { type: 'Ending', count: 15 },
                { type: 'OST', count: 10 }
            ];

            mockConnection.query.mockResolvedValueOnce([mockCounts]);

            const counts = await repository.countByType(testUserId);

            expect(counts.Opening).toBe(20);
            expect(counts.Ending).toBe(15);
            expect(counts.OST).toBe(10);

            // Verify user-specific
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
        });

        test('should get total song count', async () => {
            mockConnection.query.mockResolvedValueOnce([[{ total: 68 }]]);

            const total = await repository.count(testUserId);

            expect(total).toBe(68);
        });

        test('should count favorites', async () => {
            mockConnection.query.mockResolvedValueOnce([[{ total: 12 }]]);

            const total = await repository.countFavorites(testUserId);

            expect(total).toBe(12);

            // Verify favorites filter
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('is_favorite = 1');
        });
    });

    describe('Batch Operations', () => {
        test('should get songs by IDs', async () => {
            const mockSongs = [
                { id: 1, title: 'Song 1', user_id: testUserId },
                { id: 2, title: 'Song 2', user_id: testUserId }
            ];

            mockConnection.query.mockResolvedValueOnce([mockSongs]);

            const songs = await repository.findByIds([1, 2], testUserId);

            expect(songs).toHaveLength(2);

            // Verify IN clause
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('IN (?)');
        });

        test('should bulk update favorites', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 3 }]);

            const count = await repository.bulkSetFavorite([1, 2, 3], testUserId, true);

            expect(count).toBe(3);

            // Verify user isolation
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
        });
    });

    describe('Transaction Support', () => {
        test('should use transactions for create', async () => {
            const songData = { title: 'Test Song' };

            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            await repository.create(songData, testUserId);

            expect(mockConnection.beginTransaction).toHaveBeenCalled();
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        test('should rollback on error', async () => {
            const songData = { title: 'Test Song' };

            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])
                .mockRejectedValueOnce(new Error('Failed'));

            await expect(repository.create(songData, testUserId)).rejects.toThrow();

            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });
});
