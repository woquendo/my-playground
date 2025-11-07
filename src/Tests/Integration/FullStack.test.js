/**
 * Integration Tests - Full Application Flow
 * Tests the complete application stack from presentation to data access
 */

import { jest } from '@jest/globals';
import { Container } from '../../Core/Container.js';
import { EventBus } from '../../Core/EventBus.js';
import { Logger } from '../../Core/Logger.js';
import { Show } from '../../Domain/Models/Show.js';
import { Music } from '../../Domain/Models/Music.js';
import { CacheManager } from '../../Infrastructure/Cache/CacheManager.js';
import { StorageService } from '../../Infrastructure/Storage/StorageService.js';
import { EpisodeCalculatorService } from '../../Domain/Services/EpisodeCalculatorService.js';
import { ShowManagementService } from '../../Application/Services/ShowManagementService.js';
import { MusicManagementService } from '../../Application/Services/MusicManagementService.js';
import { ScheduleService } from '../../Application/Services/ScheduleService.js';
import { CommandBus } from '../../Application/Commands/CommandBus.js';
import { QueryBus } from '../../Application/Queries/QueryBus.js';
import { ScheduleViewModel } from '../../Presentation/ViewModels/ScheduleViewModel.js';
import { MusicViewModel } from '../../Presentation/ViewModels/MusicViewModel.js';
import { ApplicationState } from '../../Presentation/State/ApplicationState.js';

describe('Integration Tests - Full Stack', () => {
    let container;
    let eventBus;
    let logger;

    beforeEach(() => {
        container = new Container();
        eventBus = new EventBus();
        logger = new Logger({ prefix: 'Integration' });

        // Register core infrastructure
        container.singleton('eventBus', () => eventBus);
        container.singleton('logger', () => logger);
    });

    afterEach(() => {
        container.clear();
    });

    describe('Dependency Injection Container Integration', () => {
        test('should wire up entire application stack', () => {
            // Register infrastructure
            container.singleton('cacheManager', () => new CacheManager({
                maxSize: 100,
                defaultTTL: 60000
            }));

            container.singleton('storage', () => new StorageService({
                namespace: 'test-app'
            }));

            // Register repositories (using mocks for testing)
            container.singleton('showRepository', () => ({
                getAll: jest.fn().mockResolvedValue([]),
                getById: jest.fn().mockResolvedValue(null),
                save: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined)
            }));

            container.singleton('musicRepository', () => ({
                getAll: jest.fn().mockResolvedValue([]),
                getById: jest.fn().mockResolvedValue(null),
                save: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined)
            }));

            // Register domain services
            container.singleton('episodeCalculator', () => new EpisodeCalculatorService());

            // Register application services
            container.singleton('showManagementService', (c) => new ShowManagementService({
                showRepository: c.get('showRepository'),
                episodeCalculatorService: c.get('episodeCalculator'),
                eventBus: c.get('eventBus'),
                logger: c.get('logger')
            }));

            container.singleton('musicManagementService', (c) => new MusicManagementService({
                musicRepository: c.get('musicRepository'),
                eventBus: c.get('eventBus'),
                logger: c.get('logger')
            }));

            container.singleton('scheduleService', (c) => new ScheduleService({
                showRepository: c.get('showRepository'),
                episodeCalculatorService: c.get('episodeCalculator'),
                eventBus: c.get('eventBus'),
                logger: c.get('logger')
            }));

            // Register CQRS buses
            container.singleton('commandBus', (c) => new CommandBus({
                eventBus: c.get('eventBus'),
                logger: c.get('logger')
            }));

            container.singleton('queryBus', (c) => new QueryBus({
                cacheManager: c.get('cacheManager'),
                eventBus: c.get('eventBus'),
                logger: c.get('logger')
            }));

            // Verify all dependencies resolve
            expect(container.get('showManagementService')).toBeInstanceOf(ShowManagementService);
            expect(container.get('musicManagementService')).toBeInstanceOf(MusicManagementService);
            expect(container.get('scheduleService')).toBeInstanceOf(ScheduleService);
            expect(container.get('commandBus')).toBeInstanceOf(CommandBus);
            expect(container.get('queryBus')).toBeInstanceOf(QueryBus);
        });

        test('should maintain singleton instances', () => {
            container.singleton('service', () => ({ id: Math.random() }));

            const instance1 = container.get('service');
            const instance2 = container.get('service');

            expect(instance1).toBe(instance2);
        });
    });

    describe('Event Bus Integration', () => {
        test('should propagate events across layers', async () => {
            const events = [];

            // Subscribe to events from different layers
            eventBus.subscribe('domain:show:created', (data) => {
                events.push({ layer: 'domain', event: 'created', data });
            });

            eventBus.subscribe('application:show:progress', (data) => {
                events.push({ layer: 'application', event: 'progress', data });
            });

            eventBus.subscribe('viewmodel:Schedule:change', (data) => {
                events.push({ layer: 'presentation', event: 'change', data });
            });

            // Emit events
            eventBus.emit('domain:show:created', { id: '1' });
            eventBus.emit('application:show:progress', { id: '1' });
            eventBus.emit('viewmodel:Schedule:change', { key: 'shows' });

            expect(events).toHaveLength(3);
            expect(events[0].layer).toBe('domain');
            expect(events[1].layer).toBe('application');
            expect(events[2].layer).toBe('presentation');
        });
    });

    describe('Repository to Service Integration', () => {
        test('should flow data from repository through service', async () => {
            const mockRepository = {
                getAll: jest.fn().mockResolvedValue([
                    new Show({
                        id: '1',
                        title: 'Test Show',
                        currentEpisode: 5,
                        totalEpisodes: 12,
                        status: 'watching'
                    })
                ])
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const service = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const shows = await service.getAllShows();

            expect(shows).toHaveLength(1);
            expect(shows[0]).toBeInstanceOf(Show);
            expect(shows[0].getTitle()).toBe('Test Show');
        });
    });

    describe('Service to ViewModel Integration', () => {
        test('should manage state through view model', async () => {
            const mockRepository = {
                getAll: jest.fn().mockResolvedValue([
                    new Show({
                        id: '1',
                        title: 'Test Show',
                        currentEpisode: 5,
                        totalEpisodes: 12,
                        status: 'watching'
                    })
                ])
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const scheduleService = new ScheduleService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: scheduleService,
                eventBus,
                logger
            });

            await viewModel.loadShows();

            expect(viewModel.get('shows')).toHaveLength(1);
            expect(viewModel.get('showCount')).toBe(1);
        });
    });

    describe('CQRS Integration', () => {
        test('should execute commands and queries through buses', async () => {
            const mockRepository = {
                save: jest.fn().mockResolvedValue(
                    new Show({
                        id: '1',
                        title: 'New Show',
                        currentEpisode: 1,
                        totalEpisodes: 12,
                        status: 'watching'
                    })
                ),
                getAll: jest.fn().mockResolvedValue([])
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const service = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const commandBus = new CommandBus({ eventBus, logger });
            const queryBus = new QueryBus({
                cacheManager: new CacheManager(),
                eventBus,
                logger
            });

            // Register command
            commandBus.register(
                'createShow',
                async (data) => service.createShow(data),
                (data) => {
                    if (!data.title) return ['Title is required'];
                    return true;
                }
            );

            // Register query
            queryBus.register(
                'getAllShows',
                async () => service.getAllShows()
            );

            // Execute command
            const show = await commandBus.dispatch('createShow', {
                id: 'test-show-1',
                title: 'New Show',
                totalEpisodes: 12,
                status: 'watching',
                startDate: '01-01-24'
            });

            expect(show).toBeInstanceOf(Show);
            expect(mockRepository.save).toHaveBeenCalled();

            // Execute query
            mockRepository.getAll.mockResolvedValue([show]);
            const shows = await queryBus.execute('getAllShows');

            expect(shows).toHaveLength(1);
        });
    });

    describe('State Management Integration', () => {
        test('should manage application state with persistence', () => {
            const storage = new StorageService({ namespace: 'test-state' });
            const appState = new ApplicationState({
                eventBus,
                logger,
                storage,
                persist: false // Disable for test
            });

            // Register mutations
            appState.registerMutation('setTheme', (state, theme) => {
                state.user.preferences.theme = theme;
            });

            appState.registerMutation('setActiveView', (state, view) => {
                state.ui.activeView = view;
            });

            // Commit mutations
            appState.commit('setTheme', 'dark');
            appState.commit('setActiveView', 'music');

            expect(appState.get('user.preferences.theme')).toBe('dark');
            expect(appState.get('ui.activeView')).toBe('music');
        });

        test('should support undo/redo', () => {
            const appState = new ApplicationState({
                eventBus,
                logger,
                persist: false
            });

            appState.registerMutation('setValue', (state, value) => {
                state.test = value;
            });

            // Make changes
            appState.commit('setValue', 'first');
            appState.commit('setValue', 'second');
            appState.commit('setValue', 'third');

            expect(appState.get('test')).toBe('third');

            // Undo (goes back to state before last mutation)
            appState.undo();
            expect(appState.get('test')).toBe('first');

            appState.undo();
            expect(appState.get('test')).toBeUndefined(); // Back to initial state

            // Redo
            appState.redo();
            expect(appState.get('test')).toBe('first');
        });
    });

    describe('Full Stack Show Management Flow', () => {
        test('should complete full CRUD cycle', async () => {
            const shows = [];
            const mockRepository = {
                save: jest.fn().mockImplementation((show) => {
                    const index = shows.findIndex(s => s.getId() === show.getId());
                    if (index > -1) {
                        shows[index] = show;
                    } else {
                        shows.push(show);
                    }
                    return Promise.resolve(show);
                }),
                getById: jest.fn().mockImplementation((id) => {
                    return Promise.resolve(shows.find(s => s.getId() === id));
                }),
                getAll: jest.fn().mockResolvedValue(shows),
                delete: jest.fn().mockImplementation((id) => {
                    const index = shows.findIndex(s => s.getId() === id);
                    if (index > -1) shows.splice(index, 1);
                    return Promise.resolve();
                })
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const service = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            // Create
            const created = await service.createShow({
                id: 'integration-test-show-1',
                title: 'Integration Test Show',
                totalEpisodes: 24,
                status: 'watching',
                startDate: '01-01-24'
            });

            expect(created).toBeInstanceOf(Show);
            expect(shows).toHaveLength(1);

            // Read
            const retrieved = await service.getShowById(created.getId());
            expect(retrieved.getTitle()).toBe('Integration Test Show');

            // Update
            const updated = await service.updateShow(created.getId(), {
                currentEpisode: 10
            });
            expect(updated.getCurrentEpisode()).toBe(10);

            // Delete
            await service.deleteShow(created.getId());
            expect(shows).toHaveLength(0);
        });
    });

    describe('Full Stack Music Management Flow', () => {
        test('should complete full music workflow', async () => {
            const tracks = [];
            const mockRepository = {
                save: jest.fn().mockImplementation((track) => {
                    tracks.push(track);
                    return Promise.resolve(track);
                }),
                getById: jest.fn().mockImplementation((id) => {
                    return Promise.resolve(tracks.find(t => t.getId() === id));
                }),
                getAll: jest.fn().mockResolvedValue(tracks),
                incrementPlayCount: jest.fn().mockImplementation(async (id) => {
                    const track = tracks.find(t => t.getId() === id);
                    if (track) {
                        track.playCount = (track.playCount || 0) + 1;
                    }
                    return track;
                })
            };

            const service = new MusicManagementService({
                musicRepository: mockRepository,
                eventBus,
                logger
            });

            // Create track
            const track = await service.createTrack({
                id: 'test-track-1',
                title: 'Test Song',
                artist: 'Test Artist',
                album: 'Test Album'
            });

            expect(track).toBeInstanceOf(Music);

            // Play track
            const played = await service.playTrack(track.getId());
            expect(played.getPlayCount()).toBe(1);

            // Rate track
            const rated = await service.rateTrack(track.getId(), 5);
            expect(rated.getRating()).toBe(5);
        });
    });

    describe('Cross-Layer Error Handling', () => {
        test('should propagate errors through layers', async () => {
            const mockRepository = {
                getAll: jest.fn().mockRejectedValue(new Error('Network error'))
            };

            const service = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: new EpisodeCalculatorService(),
                eventBus,
                logger
            });

            const mockScheduleService = {
                getWeeklySchedule: jest.fn().mockResolvedValue({})
            };

            const viewModel = new ScheduleViewModel({
                showManagementService: service,
                scheduleService: mockScheduleService,
                eventBus,
                logger
            });

            await expect(viewModel.loadShows()).rejects.toThrow('Network error');
            expect(viewModel.hasErrors()).toBe(true);
        });
    });

    describe('Performance Integration', () => {
        test('should handle batch operations efficiently', async () => {
            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(
                    Array.from({ length: 100 }, (_, i) => new Show({
                        id: `show-${i}`,
                        title: `Show ${i}`,
                        currentEpisode: i,
                        totalEpisodes: 100,
                        status: 'watching'
                    }))
                )
            };

            const service = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: new EpisodeCalculatorService(),
                eventBus,
                logger
            });

            const startTime = Date.now();
            const shows = await service.getAllShows();
            const duration = Date.now() - startTime;

            expect(shows).toHaveLength(100);
            expect(duration).toBeLessThan(100); // Should be fast
        });
    });
});

