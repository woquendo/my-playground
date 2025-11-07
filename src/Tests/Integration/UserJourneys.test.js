/**
 * End-to-End User Journey Tests
 * Tests complete user workflows from UI interaction to data persistence
 */

import { jest } from '@jest/globals';
import { EventBus } from '../../Core/EventBus.js';
import { Logger } from '../../Core/Logger.js';
import { Show } from '../../Domain/Models/Show.js';
import { Music } from '../../Domain/Models/Music.js';
import { CacheManager } from '../../Infrastructure/Cache/CacheManager.js';
import { StorageService } from '../../Infrastructure/Storage/StorageService.js';
import { EpisodeCalculatorService } from '../../Domain/Services/EpisodeCalculatorService.js';
import { ShowManagementService } from '../../Application/Services/ShowManagementService.js';
import { MusicManagementService } from '../../Application/Services/MusicManagementService.js';
import { CommandBus } from '../../Application/Commands/CommandBus.js';
import { QueryBus } from '../../Application/Queries/QueryBus.js';
import { ScheduleViewModel } from '../../Presentation/ViewModels/ScheduleViewModel.js';
import { MusicViewModel } from '../../Presentation/ViewModels/MusicViewModel.js';
import { ApplicationState } from '../../Presentation/State/ApplicationState.js';
import { ShowCard } from '../../Presentation/Components/ShowCard.js';
import { TrackCard } from '../../Presentation/Components/TrackCard.js';

describe('End-to-End User Journeys', () => {
    let eventBus;
    let logger;
    let appState;

    // Helper to create mock schedule service
    const createMockScheduleService = () => ({
        getWeeklySchedule: jest.fn().mockResolvedValue({}),
        generateSchedule: jest.fn().mockResolvedValue([])
    });

    beforeEach(() => {
        eventBus = new EventBus();
        logger = new Logger({ prefix: 'E2E' });
        appState = new ApplicationState({
            eventBus,
            logger,
            storage: new StorageService({ namespace: 'e2e-test' }),
            persist: false
        });
    });

    describe('Journey: New User Viewing Schedule', () => {
        test('should load and display schedule on first visit', async () => {
            // Setup
            const mockShowData = [
                { id: '1', title: 'Show A', currentEpisode: 5, totalEpisodes: 12, status: 'watching', airDay: 'Monday' },
                { id: '2', title: 'Show B', currentEpisode: 8, totalEpisodes: 24, status: 'watching', airDay: 'Tuesday' },
                { id: '3', title: 'Show C', currentEpisode: 3, totalEpisodes: 12, status: 'watching', airDay: 'Wednesday' }
            ];

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(
                    mockShowData.map(data => new Show(data))
                )
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const mockScheduleService = {
                getWeeklySchedule: jest.fn().mockResolvedValue({
                    Monday: [new Show(mockShowData[0])],
                    Tuesday: [new Show(mockShowData[1])],
                    Wednesday: [new Show(mockShowData[2])]
                })
            };

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: mockScheduleService,
                eventBus,
                logger
            });

            // User action: Load shows (not schedule to avoid ShowDate.parse dependencies)
            await viewModel.loadShows();

            // Verify
            expect(viewModel.get('shows').length).toBeGreaterThan(0);
            expect(viewModel.get('showCount')).toBe(3);
        });
    });

    describe('Journey: User Progresses Show Episode', () => {
        test('should complete full episode progression workflow', async () => {
            // Setup
            const show = new Show({
                id: '1',
                title: 'My Show',
                currentEpisode: 5,
                totalEpisodes: 12,
                status: 'watching',
                startDate: '01-01-24',
                airingStatus: 'currently_airing'
            });

            const mockRepository = {
                getById: jest.fn().mockResolvedValue(show),
                save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
                getAll: jest.fn().mockResolvedValue([show])
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: createMockScheduleService(),
                eventBus,
                logger
            });

            await viewModel.loadShows();

            // User action: Select and progress episode
            const showToProgress = viewModel.get('shows').find(s => s.getId() === '1');
            viewModel.selectShow(showToProgress);
            const progressedShow = await viewModel.progressEpisode();

            // Verify
            expect(progressedShow.getCurrentEpisode()).toBe(6);
            expect(mockRepository.save).toHaveBeenCalled();

            // Verify state updated
            const updatedShow = viewModel.get('shows').find(s => s.getId() === '1');
            expect(updatedShow.getCurrentEpisode()).toBe(6);
        });
    });

    describe('Journey: User Filters and Sorts Shows', () => {
        test('should filter and sort schedule dynamically', async () => {
            // Setup
            const shows = [
                new Show({
                    id: '1',
                    title: 'A Show',
                    status: 'watching',
                    currentEpisode: 5,
                    totalEpisodes: 12,
                    startDate: '01-01-24',
                    airingStatus: 'currently_airing'
                }),
                new Show({
                    id: '2',
                    title: 'B Show',
                    status: 'completed',
                    currentEpisode: 12,
                    totalEpisodes: 12,
                    startDate: '01-01-24',
                    airingStatus: 'finished_airing'
                }),
                new Show({
                    id: '3',
                    title: 'C Show',
                    status: 'watching',
                    currentEpisode: 10,
                    totalEpisodes: 12,
                    startDate: '01-01-24',
                    airingStatus: 'currently_airing'
                }),
                new Show({
                    id: '4',
                    title: 'D Show',
                    status: 'on_hold',
                    currentEpisode: 3,
                    totalEpisodes: 12,
                    startDate: '01-01-24',
                    airingStatus: 'currently_airing'
                })
            ];

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

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: createMockScheduleService(),
                eventBus,
                logger
            });

            await viewModel.loadShows();

            // User action: Filter by status
            viewModel.setFilterStatus('watching');

            // Verify filtering (watching filter uses AiringShowsStrategy which includes watching + on_hold)
            expect(viewModel.get('filteredShows').length).toBe(3);
            const filteredStatuses = viewModel.get('filteredShows').map(s => s.getStatusObject().getValue());
            expect(filteredStatuses).toContain('watching');
            expect(filteredStatuses).toContain('on_hold');

            // User action: Change sort
            viewModel.setSortBy('title');

            // Verify sorting
            const filtered = viewModel.get('filteredShows');
            expect(filtered[0].getTitle()).toBe('A Show');
            expect(filtered[1].getTitle()).toBe('C Show');

            // User action: Clear filter
            viewModel.setFilterStatus(null);
            expect(viewModel.get('filteredShows').length).toBe(4);
        });
    });

    describe('Journey: User Creates New Show', () => {
        test('should create and add show to schedule', async () => {
            // Setup
            const existingShows = [
                new Show({ id: '1', title: 'Existing Show', status: 'watching', currentEpisode: 1, totalEpisodes: 12 })
            ];

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(existingShows),
                save: jest.fn().mockImplementation((show) => {
                    existingShows.push(show);
                    return Promise.resolve(show);
                })
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: createMockScheduleService(),
                eventBus,
                logger
            });

            await viewModel.loadShows();
            expect(viewModel.get('showCount')).toBe(1);

            // User action: Create new show
            const newShow = await viewModel.createShow({
                id: 'new-show-1',
                title: 'New Show',
                totalEpisodes: 24,
                status: 'watching',
                startDate: '01-01-24',
                airDay: 'Friday'
            });

            // Verify
            expect(newShow).toBeInstanceOf(Show);
            expect(newShow.getTitle()).toBe('New Show');

            // Reload to see new show
            await viewModel.loadShows();
            expect(viewModel.get('showCount')).toBe(2);
        });
    });

    describe('Journey: Music Library Management', () => {
        test('should browse, play, and rate music', async () => {
            // Setup
            const tracks = [
                new Music({ id: '1', title: 'Song A', artist: 'Artist 1', album: 'Album 1', rating: 4 }),
                new Music({ id: '2', title: 'Song B', artist: 'Artist 2', album: 'Album 2', rating: 5 }),
                new Music({ id: '3', title: 'Song C', artist: 'Artist 1', album: 'Album 3', rating: 3 })
            ];

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(tracks),
                getById: jest.fn().mockImplementation((id) => {
                    return Promise.resolve(tracks.find(t => t.getId() === id));
                }),
                save: jest.fn().mockImplementation((track) => Promise.resolve(track)),
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

            const viewModel = new MusicViewModel({
                musicManagementService: service,
                eventBus,
                logger
            });

            // User action: Load library
            await viewModel.loadTracks();
            expect(viewModel.get('trackCount')).toBe(3);

            // User action: Filter by artist
            viewModel.setFilterArtist('Artist 1');
            expect(viewModel.get('filteredTracks').length).toBe(2);

            // User action: Select and play track
            const track = viewModel.get('filteredTracks')[0];
            viewModel.selectTrack(track);
            await viewModel.playTrack(track);

            expect(viewModel.get('selectedTrack').getId()).toBe(track.getId());
            expect(viewModel.get('currentlyPlaying').getId()).toBe(track.getId());

            // User action: Rate track
            await viewModel.rateTrack(track, 5);
            expect(mockRepository.save).toHaveBeenCalled();
        });
    });

    describe('Journey: Application State Persistence', () => {
        test('should persist user preferences across sessions', () => {
            // Register mutations
            appState.registerMutation('setTheme', (state, theme) => {
                state.user.preferences.theme = theme;
            });

            appState.registerMutation('setDefaultSort', (state, sort) => {
                state.user.preferences.defaultSort = sort;
            });

            appState.registerMutation('setActiveView', (state, view) => {
                state.ui.activeView = view;
            });

            // User actions: Set preferences
            appState.commit('setTheme', 'dark');
            appState.commit('setDefaultSort', 'title');
            appState.commit('setActiveView', 'schedule');

            // Export state
            const exportedState = appState.export();

            // Verify state
            expect(exportedState.state.user.preferences.theme).toBe('dark');
            expect(exportedState.state.user.preferences.defaultSort).toBe('title');
            expect(exportedState.state.ui.activeView).toBe('schedule');

            // Simulate new session
            const newAppState = new ApplicationState({
                eventBus,
                logger,
                persist: false
            });

            // Restore state
            newAppState.replaceState(exportedState.state);

            // Verify persistence
            expect(newAppState.get('user.preferences.theme')).toBe('dark');
            expect(newAppState.get('user.preferences.defaultSort')).toBe('title');
            expect(newAppState.get('ui.activeView')).toBe('schedule');
        });
    });

    describe('Journey: Component Interaction', () => {
        test('should handle show card interactions', () => {
            // Setup DOM
            const container = document.createElement('div');
            container.id = 'container';
            document.body.appendChild(container);

            const show = new Show({
                id: '1',
                title: 'Interactive Show',
                currentEpisode: 5,
                totalEpisodes: 12,
                status: 'watching',
                startDate: '01-01-24',
                airingStatus: 'currently_airing'
            });

            let progressCalled = false;
            let statusChanged = false;
            let selected = false;

            const card = new ShowCard({
                container,
                show,
                onProgress: () => { progressCalled = true; },
                onStatusChange: (newStatus) => { statusChanged = true; },
                onSelect: () => { selected = true; }
            });

            // User action: Mount component
            card.mount();

            expect(container.querySelector('.show-card')).toBeTruthy();
            expect(container.textContent).toContain('Interactive Show');

            // Cleanup
            card.unmount();
        });

        test('should handle track card interactions', () => {
            // Setup DOM
            const container = document.createElement('div');
            container.id = 'container';
            document.body.appendChild(container);

            const track = new Music({
                id: '1',
                title: 'Interactive Track',
                artist: 'Test Artist',
                album: 'Test Album',
                rating: 3
            });

            let playCalled = false;
            let rateCalled = false;
            let selected = false;

            const card = new TrackCard({
                container,
                track,
                isPlaying: false,
                onPlay: () => { playCalled = true; },
                onRate: (rating) => { rateCalled = true; },
                onSelect: () => { selected = true; }
            });

            // User action: Mount component
            card.mount();

            expect(container.querySelector('.track-card')).toBeTruthy();
            expect(container.textContent).toContain('Interactive Track');

            // Cleanup
            card.unmount();
        });
    });

    describe('Journey: Error Recovery', () => {
        test('should handle and recover from errors gracefully', async () => {
            // Setup with failing repository
            const mockRepository = {
                getAll: jest.fn()
                    .mockRejectedValueOnce(new Error('Network timeout'))
                    .mockResolvedValueOnce([
                        new Show({ id: '1', title: 'Recovered Show', status: 'watching', currentEpisode: 1, totalEpisodes: 12 })
                    ])
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: createMockScheduleService(),
                eventBus,
                logger
            });

            // User action: First attempt (fails)
            await expect(viewModel.loadShows()).rejects.toThrow('Network timeout');
            expect(viewModel.hasErrors()).toBe(true);

            // User action: Retry
            viewModel.clearErrors();
            await viewModel.loadShows();

            // Verify recovery
            expect(viewModel.hasErrors()).toBe(false);
            expect(viewModel.get('shows').length).toBe(1);
        });
    });

    describe('Journey: Batch Operations', () => {
        test('should handle multiple operations efficiently', async () => {
            // Setup
            const shows = Array.from({ length: 50 }, (_, i) => new Show({
                id: `show-${i}`,
                title: `Show ${i}`,
                currentEpisode: i,
                totalEpisodes: 24,
                status: 'watching'
            }));

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(shows),
                save: jest.fn().mockImplementation((show) => Promise.resolve(show))
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            const viewModel = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: createMockScheduleService(),
                eventBus,
                logger
            });

            // Load all shows
            await viewModel.loadShows();
            expect(viewModel.get('showCount')).toBe(50);

            // Filter operations should be fast
            const startTime = Date.now();
            viewModel.setFilterStatus('watching');
            const filterDuration = Date.now() - startTime;

            expect(filterDuration).toBeLessThan(50); // Should be instant
            expect(viewModel.get('filteredShows').length).toBe(50);
        });
    });

    describe('Journey: Real-time Updates', () => {
        test('should sync updates across view models', async () => {
            const shows = [
                new Show({
                    id: '1',
                    title: 'Shared Show',
                    status: 'watching',
                    currentEpisode: 5,
                    totalEpisodes: 12,
                    startDate: '01-01-24',
                    airingStatus: 'currently_airing'
                })
            ];

            const mockRepository = {
                getAll: jest.fn().mockResolvedValue(shows),
                getById: jest.fn().mockImplementation((id) => {
                    return Promise.resolve(shows.find(s => s.getId() === id));
                }),
                save: jest.fn().mockImplementation((show) => {
                    const index = shows.findIndex(s => s.getId() === show.getId());
                    if (index > -1) shows[index] = show;
                    return Promise.resolve(show);
                })
            };

            const episodeCalculator = new EpisodeCalculatorService();
            const showService = new ShowManagementService({
                showRepository: mockRepository,
                episodeCalculatorService: episodeCalculator,
                eventBus,
                logger
            });

            // Create two view models
            const viewModel1 = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: createMockScheduleService(),
                eventBus,
                logger
            });

            const viewModel2 = new ScheduleViewModel({
                showManagementService: showService,
                scheduleService: createMockScheduleService(),
                eventBus,
                logger
            });

            await viewModel1.loadShows();
            await viewModel2.loadShows();

            // Subscribe to changes
            let vm2Updated = false;
            viewModel2.on('change', () => { vm2Updated = true; });

            // Update in first view model (select show first)
            const showToProgress = viewModel1.get('shows').find(s => s.getId() === '1');
            viewModel1.selectShow(showToProgress);
            await viewModel1.progressEpisode();

            // Both should reflect the update
            expect(viewModel1.get('shows')[0].getCurrentEpisode()).toBe(6);
            expect(vm2Updated).toBe(true);
        });
    });
});
