/**
 * @jest-environment node
 */

/**
 * MySQLShowRepository Tests
 * 
 * Tests for MySQL-based show repository with user isolation
 */

import { MySQLShowRepository } from '../../Infrastructure/Repositories/MySQLShowRepository.js';
import { Show } from '../../Domain/Models/Show.js';
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

describe('MySQLShowRepository', () => {
    let repository;
    let mockConnection;
    let mockConnectionManager;
    let mockLogger;
    const testUserId = 1;

    beforeEach(() => {
        mockConnection = createMockConnection();
        mockConnectionManager = createMockConnectionManager(mockConnection);
        mockLogger = new Logger({ level: 'silent' });

        repository = new MySQLShowRepository({
            connectionManager: mockConnectionManager,
            logger: mockLogger
        });
    });

    describe('Create Show', () => {
        test('should create show for specific user', async () => {
            const showData = {
                title: 'Test Anime',
                currentEpisode: 1,
                totalEpisodes: 12,
                airingDay: 'Monday',
                status: 'Watching'
            };

            // Mock: Insert show, then user_show association
            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])  // Insert show
                .mockResolvedValueOnce([{ insertId: 1 }]);  // Insert user_show

            const show = await repository.create(showData, testUserId);

            expect(show.id).toBe(1);
            expect(show.title).toBe('Test Anime');

            // Verify user_show association was created
            const userShowInsert = mockConnection.query.mock.calls.find(
                call => call[0].includes('INSERT INTO user_shows')
            );
            expect(userShowInsert).toBeDefined();
            expect(userShowInsert[1]).toContain(testUserId);
        });

        test('should handle show with streaming sites', async () => {
            const showData = {
                title: 'Test Anime',
                currentEpisode: 1,
                streamingSites: [1, 2, 3]  // Site IDs
            };

            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])  // Insert show
                .mockResolvedValueOnce([{ insertId: 1 }])  // Insert user_show
                .mockResolvedValueOnce([{}]);  // Insert streaming sites

            await repository.create(showData, testUserId);

            // Verify streaming sites insert
            const sitesInsert = mockConnection.query.mock.calls.find(
                call => call[0].includes('show_streaming_sites')
            );
            expect(sitesInsert).toBeDefined();
        });

        test('should rollback on error', async () => {
            const showData = { title: 'Test Anime' };

            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])
                .mockRejectedValueOnce(new Error('Insert failed'));

            await expect(repository.create(showData, testUserId)).rejects.toThrow();
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });

    describe('Get Shows - User Isolation', () => {
        test('should only return shows for specific user', async () => {
            const mockShows = [
                {
                    id: 1,
                    title: 'User 1 Show',
                    current_episode: 5,
                    total_episodes: 12,
                    airing_day: 'Monday',
                    status: 'Watching',
                    user_id: testUserId
                }
            ];

            mockConnection.query.mockResolvedValueOnce([mockShows]);

            const shows = await repository.findAll(testUserId);

            expect(shows).toHaveLength(1);
            expect(shows[0].title).toBe('User 1 Show');

            // Verify query filters by user
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
            expect(queryCall[1]).toContain(testUserId);
        });

        test('should not return other users shows', async () => {
            mockConnection.query.mockResolvedValueOnce([[]]);

            const shows = await repository.findAll(testUserId);

            expect(shows).toHaveLength(0);
        });

        test('should map airing status correctly', async () => {
            const mockShows = [
                {
                    id: 1,
                    title: 'Test Show',
                    current_episode: 5,
                    total_episodes: 12,
                    airing_status: 1,  // Numeric in DB
                    user_id: testUserId
                }
            ];

            mockConnection.query.mockResolvedValueOnce([mockShows]);

            const shows = await repository.findAll(testUserId);

            expect(shows[0].airingStatus).toBe('Airing');  // String in domain
        });
    });

    describe('Get Show by ID', () => {
        test('should get show for specific user', async () => {
            const mockShow = {
                id: 1,
                title: 'Test Show',
                current_episode: 5,
                user_id: testUserId
            };

            mockConnection.query.mockResolvedValueOnce([[mockShow]]);

            const show = await repository.findById(1, testUserId);

            expect(show).toBeDefined();
            expect(show.title).toBe('Test Show');
        });

        test('should return null if show belongs to different user', async () => {
            mockConnection.query.mockResolvedValueOnce([[]]);

            const show = await repository.findById(1, testUserId);

            expect(show).toBeNull();
        });

        test('should include streaming sites', async () => {
            const mockShow = {
                id: 1,
                title: 'Test Show',
                user_id: testUserId
            };

            const mockSites = [
                { site_id: 1, site_name: 'Crunchyroll' },
                { site_id: 2, site_name: 'Funimation' }
            ];

            mockConnection.query
                .mockResolvedValueOnce([[mockShow]])
                .mockResolvedValueOnce([mockSites]);

            const show = await repository.findById(1, testUserId);

            expect(show.streamingSites).toHaveLength(2);
            expect(show.streamingSites).toContain(1);
            expect(show.streamingSites).toContain(2);
        });
    });

    describe('Update Show', () => {
        test('should update show for specific user', async () => {
            const showData = {
                id: 1,
                title: 'Updated Title',
                currentEpisode: 6
            };

            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const result = await repository.update(showData, testUserId);

            expect(result).toBe(true);

            // Verify update filters by user
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('WHERE id = ? AND user_id = ?');
            expect(queryCall[1]).toContain(testUserId);
        });

        test('should not update other users shows', async () => {
            const showData = {
                id: 1,
                title: 'Hacked Title'
            };

            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

            const result = await repository.update(showData, testUserId);

            expect(result).toBe(false);
        });

        test('should update streaming sites', async () => {
            const showData = {
                id: 1,
                title: 'Test Show',
                streamingSites: [1, 2, 3]
            };

            mockConnection.query
                .mockResolvedValueOnce([{ affectedRows: 1 }])  // Update show
                .mockResolvedValueOnce([{}])  // Delete old sites
                .mockResolvedValueOnce([{}]);  // Insert new sites

            await repository.update(showData, testUserId);

            // Verify sites were updated
            const deleteCall = mockConnection.query.mock.calls.find(
                call => call[0].includes('DELETE FROM show_streaming_sites')
            );
            expect(deleteCall).toBeDefined();
        });
    });

    describe('Delete Show', () => {
        test('should delete show for specific user', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const result = await repository.delete(1, testUserId);

            expect(result).toBe(true);

            // Verify delete filters by user
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('WHERE id = ? AND user_id = ?');
        });

        test('should not delete other users shows', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

            const result = await repository.delete(1, testUserId);

            expect(result).toBe(false);
        });

        test('should cascade delete user_show association', async () => {
            // This is handled by FK constraints, just verify delete happens
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            await repository.delete(1, testUserId);

            const deleteCall = mockConnection.query.mock.calls[0];
            expect(deleteCall[0]).toContain('DELETE FROM user_shows');
        });
    });

    describe('Filter and Search', () => {
        test('should filter by status', async () => {
            const mockShows = [];
            mockConnection.query.mockResolvedValueOnce([mockShows]);

            await repository.findByStatus('Watching', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('status = ?');
            expect(queryCall[1]).toContain('Watching');
        });

        test('should filter by airing day', async () => {
            const mockShows = [];
            mockConnection.query.mockResolvedValueOnce([mockShows]);

            await repository.findByAiringDay('Monday', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('airing_day = ?');
            expect(queryCall[1]).toContain('Monday');
        });

        test('should search by title', async () => {
            const mockShows = [];
            mockConnection.query.mockResolvedValueOnce([mockShows]);

            await repository.search('Naruto', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('LIKE');
            expect(queryCall[1][0]).toContain('%Naruto%');
        });

        test('should always filter by user in searches', async () => {
            const mockShows = [];
            mockConnection.query.mockResolvedValueOnce([mockShows]);

            await repository.search('Test', testUserId);

            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
            expect(queryCall[1]).toContain(testUserId);
        });
    });

    describe('Transaction Support', () => {
        test('should use transactions for create', async () => {
            const showData = { title: 'Test Show' };

            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            await repository.create(showData, testUserId);

            expect(mockConnection.beginTransaction).toHaveBeenCalled();
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        test('should rollback transaction on error', async () => {
            const showData = { title: 'Test Show' };

            mockConnection.query
                .mockResolvedValueOnce([{ insertId: 1 }])
                .mockRejectedValueOnce(new Error('Failed'));

            await expect(repository.create(showData, testUserId)).rejects.toThrow();

            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.commit).not.toHaveBeenCalled();
        });
    });

    describe('Batch Operations', () => {
        test('should get shows by IDs for user', async () => {
            const mockShows = [
                { id: 1, title: 'Show 1', user_id: testUserId },
                { id: 2, title: 'Show 2', user_id: testUserId }
            ];

            mockConnection.query.mockResolvedValueOnce([mockShows]);

            const shows = await repository.findByIds([1, 2], testUserId);

            expect(shows).toHaveLength(2);

            // Verify query uses IN clause
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('IN (?)');
        });

        test('should bulk update status', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 5 }]);

            const count = await repository.bulkUpdateStatus([1, 2, 3, 4, 5], 'Completed', testUserId);

            expect(count).toBe(5);

            // Verify user isolation
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
        });
    });

    describe('Statistics', () => {
        test('should count shows by status', async () => {
            const mockCounts = [
                { status: 'Watching', count: 10 },
                { status: 'Completed', count: 50 }
            ];

            mockConnection.query.mockResolvedValueOnce([mockCounts]);

            const counts = await repository.countByStatus(testUserId);

            expect(counts.Watching).toBe(10);
            expect(counts.Completed).toBe(50);

            // Verify user-specific
            const queryCall = mockConnection.query.mock.calls[0];
            expect(queryCall[0]).toContain('user_id = ?');
        });

        test('should get total show count', async () => {
            mockConnection.query.mockResolvedValueOnce([[{ total: 100 }]]);

            const total = await repository.count(testUserId);

            expect(total).toBe(100);
        });
    });
});
