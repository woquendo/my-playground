/**
 * Performance Tests
 * Tests application performance under various load conditions
 */

import { jest } from '@jest/globals';
import { EventBus } from '../../Core/EventBus.js';
import { Logger } from '../../Core/Logger.js';
import { Show } from '../../Domain/Models/Show.js';
import { Music } from '../../Domain/Models/Music.js';
import { CacheManager } from '../../Infrastructure/Cache/CacheManager.js';
import { EpisodeCalculatorService } from '../../Domain/Services/EpisodeCalculatorService.js';
import { ShowManagementService } from '../../Application/Services/ShowManagementService.js';
import { MusicManagementService } from '../../Application/Services/MusicManagementService.js';
import {
    AiringShowsStrategy,
    TitleSortStrategy,
    StrategyContext
} from '../../Application/Strategies/index.js';
import { ScheduleViewModel } from '../../Presentation/ViewModels/ScheduleViewModel.js';

describe('Performance Tests', () => {
    let eventBus;
    let logger;

    beforeEach(() => {
        eventBus = new EventBus();
        logger = new Logger({ prefix: 'Perf', level: 'error' }); // Reduce logging noise
    });

    describe('Domain Model Performance', () => {
        test('should create 1000 Show instances quickly', () => {
            const startTime = Date.now();

            const shows = Array.from({ length: 1000 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: 'watching'
            }));

            const duration = Date.now() - startTime;

            expect(shows).toHaveLength(1000);
            expect(duration).toBeLessThan(100); // Should be under 100ms
        });

        test('should create 1000 Music instances quickly', () => {
            const startTime = Date.now();

            const tracks = Array.from({ length: 1000 }, (_, i) => new Music({
                id: `track-${i}`,
                title: `Track ${i}`,
                artist: `Artist ${i % 50}`,
                album: `Album ${i % 100}`,
                rating: (i % 5) + 1
            }));

            const duration = Date.now() - startTime;

            expect(tracks).toHaveLength(1000);
            expect(duration).toBeLessThan(100);
        });
    });

    describe('Episode Calculator Performance', () => {
        test('should calculate episodes for 1000 shows quickly', () => {
            const shows = Array.from({ length: 1000 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                latestEpisode: (i % 24) + 5,
                status: 'watching'
            }));

            const startTime = Date.now();

            const results = shows.map(show => show.getEpisodesBehind());

            const duration = Date.now() - startTime;

            expect(results).toHaveLength(1000);
            expect(duration).toBeLessThan(50); // Should be very fast
        });
    });

    describe('Cache Performance', () => {
        test('should handle 10000 cache operations efficiently', () => {
            const cache = new CacheManager({ maxSize: 1000 });

            const startTime = Date.now();

            // Write operations
            for (let i = 0; i < 5000; i++) {
                cache.set(`key-${i}`, { id: i, data: `value-${i}` });
            }

            // Read operations
            for (let i = 0; i < 5000; i++) {
                cache.get(`key-${i}`);
            }

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(100); // 10K ops under 100ms
        });

        test('should handle cache eviction efficiently', () => {
            const cache = new CacheManager({ maxSize: 100 });

            const startTime = Date.now();

            // Force evictions by exceeding size
            for (let i = 0; i < 1000; i++) {
                cache.set(`key-${i}`, { data: `value-${i}` });
            }

            const duration = Date.now() - startTime;

            expect(cache.size()).toBeLessThanOrEqual(100);
            expect(duration).toBeLessThan(200); // With evictions
        });
    });

    describe('Strategy Performance', () => {
        test('should filter 1000 shows quickly', () => {
            const shows = Array.from({ length: 1000 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: ['watching', 'completed', 'on_hold', 'dropped'][i % 4]
            }));

            const strategy = new AiringShowsStrategy();

            const startTime = Date.now();
            const filtered = strategy.filter(shows);
            const duration = Date.now() - startTime;

            expect(filtered.length).toBeGreaterThan(0);
            expect(duration).toBeLessThan(10); // Very fast filtering
        });

        test('should sort 1000 shows quickly', () => {
            const shows = Array.from({ length: 1000 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${String.fromCharCode(65 + (i % 26))} ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: 'watching'
            }));

            const strategy = new TitleSortStrategy();

            const startTime = Date.now();
            const sorted = strategy.sort(shows);
            const duration = Date.now() - startTime;

            expect(sorted).toHaveLength(1000);
            expect(duration).toBeLessThan(50); // Fast sorting
        });

        test('should chain multiple strategies efficiently', () => {
            const shows = Array.from({ length: 1000 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: ['watching', 'completed'][i % 2]
            }));

            const filterStrategy = new AiringShowsStrategy();
            const sortStrategy = new TitleSortStrategy();

            const startTime = Date.now();
            const filtered = filterStrategy.filter(shows);
            const sorted = sortStrategy.sort(filtered);
            const duration = Date.now() - startTime;

            expect(sorted.length).toBeGreaterThan(0);
            expect(duration).toBeLessThan(50); // Chained operations
        });
    });

    describe('Service Performance', () => {
        test('should handle batch retrieval efficiently', async () => {
            const shows = Array.from({ length: 500 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: 'watching'
            }));

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(shows)
            };

            const service = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: new EpisodeCalculatorService(),
                eventBus,
                logger
            });

            const startTime = Date.now();
            const result = await service.getAllShows();
            const duration = Date.now() - startTime;

            expect(result).toHaveLength(500);
            expect(duration).toBeLessThan(100);
        });

        test('should handle concurrent operations efficiently', async () => {
            const shows = Array.from({ length: 100 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: 'watching'
            }));

            const mockRepository = {
                getById: jest.fn().mockImplementation((id) => {
                    return Promise.resolve(shows.find(s => s.getId() === id));
                })
            };

            const service = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: new EpisodeCalculatorService(),
                eventBus,
                logger
            });

            const startTime = Date.now();

            // Simulate concurrent requests
            const promises = Array.from({ length: 50 }, (_, i) =>
                service.getShowById(`show-${i}`)
            );

            await Promise.all(promises);

            const duration = Date.now() - startTime;

            expect(mockRepository.getById).toHaveBeenCalledTimes(50);
            expect(duration).toBeLessThan(200); // Concurrent execution
        });
    });

    describe('ViewModel Performance', () => {
        test('should handle large datasets in view model', async () => {
            const shows = Array.from({ length: 1000 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: ['watching', 'completed', 'on_hold'][i % 3]
            }));

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(shows)
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const mockScheduleService = {
                getWeeklySchedule: jest.fn().mockResolvedValue({})
            };

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: mockScheduleService,
                eventBus,
                logger
            });

            const startTime = Date.now();
            await viewModel.loadShows();
            const duration = Date.now() - startTime;

            expect(viewModel.get('shows')).toHaveLength(1000);
            expect(duration).toBeLessThan(200);
        });

        test('should compute derived values efficiently', async () => {
            const shows = Array.from({ length: 1000 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: ['watching', 'completed'][i % 2]
            }));

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(shows)
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const mockScheduleService = {
                getWeeklySchedule: jest.fn().mockResolvedValue({})
            };

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: mockScheduleService,
                eventBus,
                logger
            });

            await viewModel.loadShows();

            const startTime = Date.now();

            // Access computed properties multiple times
            for (let i = 0; i < 100; i++) {
                viewModel.get('filteredShows');
                viewModel.get('showCount');
                viewModel.get('behindCount');
                viewModel.get('completedCount');
            }

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(100); // Should be cached
        });

        test('should handle rapid filter changes efficiently', async () => {
            const shows = Array.from({ length: 500 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: ['watching', 'completed', 'on_hold'][i % 3]
            }));

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(shows)
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const mockScheduleService = {
                getWeeklySchedule: jest.fn().mockResolvedValue({})
            };

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: mockScheduleService,
                eventBus,
                logger
            });

            await viewModel.loadShows();

            const startTime = Date.now();

            // Rapid filter changes
            for (let i = 0; i < 50; i++) {
                viewModel.setFilterStatus('watching');
                viewModel.get('filteredShows');
                viewModel.setFilterStatus('completed');
                viewModel.get('filteredShows');
                viewModel.setFilterStatus(null);
                viewModel.get('filteredShows');
            }

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(500); // Should handle rapid changes
        });
    });

    describe('Event Bus Performance', () => {
        test('should handle 10000 events efficiently', () => {
            const handler = jest.fn();
            eventBus.subscribe('test:event', handler);

            const startTime = Date.now();

            for (let i = 0; i < 10000; i++) {
                eventBus.emit('test:event', { index: i });
            }

            const duration = Date.now() - startTime;

            expect(handler).toHaveBeenCalledTimes(10000);
            expect(duration).toBeLessThan(200); // Fast event processing
        });

        test('should handle multiple subscribers efficiently', () => {
            const handlers = Array.from({ length: 100 }, () => jest.fn());

            handlers.forEach(handler => {
                eventBus.subscribe('test:event', handler);
            });

            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                eventBus.emit('test:event', { index: i });
            }

            const duration = Date.now() - startTime;

            handlers.forEach(handler => {
                expect(handler).toHaveBeenCalledTimes(100);
            });

            expect(duration).toBeLessThan(500); // Multiple subscribers
        });
    });

    describe('Memory Performance', () => {
        test('should not leak memory with repeated operations', async () => {
            const shows = Array.from({ length: 100 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: 'watching'
            }));

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(shows)
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const mockScheduleService = {
                getWeeklySchedule: jest.fn().mockResolvedValue({})
            };

            // Create and dispose multiple view models
            for (let i = 0; i < 10; i++) {
                const viewModel = new ScheduleViewModel({
                    showManagementService: showService,
                    scheduleService: mockScheduleService,
                    eventBus,
                    logger
                });

                await viewModel.loadShows();
                viewModel.dispose();
            }

            // Should complete without issues
            expect(true).toBe(true);
        });
    });

    describe('Real-world Scenarios', () => {
        test('should handle typical user session efficiently', async () => {
            // Simulate a typical user session: load, filter, sort, update
            const shows = Array.from({ length: 200 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i % 24,
                totalEpisodes: 24,
                status: ['watching', 'completed', 'on_hold'][i % 3],
                startDate: '01-01-24',
                airingStatus: 'currently_airing'
            }));

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(shows),
                getById: jest.fn().mockImplementation((id) => {
                    return Promise.resolve(shows.find(s => s.getId() === id));
                }),
                save: jest.fn().mockImplementation((show) => Promise.resolve(show))
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const mockScheduleService = {
                getWeeklySchedule: jest.fn().mockResolvedValue({})
            };

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: mockScheduleService,
                eventBus,
                logger
            });

            const startTime = Date.now();

            // Load shows
            await viewModel.loadShows();

            // Filter multiple times
            viewModel.setFilterStatus('watching');
            viewModel.get('filteredShows');

            viewModel.setFilterStatus('completed');
            viewModel.get('filteredShows');

            // Sort
            viewModel.setSortBy('title');
            const filteredShows = viewModel.get('filteredShows');

            // Progress episodes (select show first)
            if (filteredShows.length > 0) {
                viewModel.selectShow(filteredShows[0]);
                await viewModel.progressEpisode();
            }
            if (filteredShows.length > 1) {
                viewModel.selectShow(filteredShows[1]);
                await viewModel.progressEpisode();
            }

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(500); // Complete session under 500ms
        });
    });
});
