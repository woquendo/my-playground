/**
 * ShowManagementService Tests
 */
import { jest } from '@jest/globals';
import { ShowManagementService } from '../../Application/Services/ShowManagementService.js';
import { Show } from '../../Domain/Models/Show.js';
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';

describe('ShowManagementService', () => {
    let service;
    let mockRepository;
    let mockEventBus;
    let mockLogger;
    let mockEpisodeCalculator;

    const validShowData = {
        id: 'show1',
        title: 'Test Show',
        status: 'watching',
        rating: 8,
        currentEpisode: 5,
        totalEpisodes: 12,
        startDate: '01-01-25',
        airingStatus: 'currently_airing',
        imageUrl: 'https://example.com/image.jpg'
    };

    beforeEach(() => {
        mockRepository = {
            save: jest.fn(),
            getById: jest.fn(),
            getAll: jest.fn(),
            getByStatus: jest.fn(),
            getCurrentlyAiring: jest.fn(),
            searchByTitle: jest.fn(),
            delete: jest.fn()
        };

        mockEventBus = {
            emit: jest.fn()
        };

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        };

        mockEpisodeCalculator = {
            calculateCurrentEpisode: jest.fn()
        };

        service = new ShowManagementService({
            showRepository: mockRepository,
            eventBus: mockEventBus,
            logger: mockLogger,
            episodeCalculator: mockEpisodeCalculator
        });
    });

    describe('Construction', () => {
        test('should create service with required dependencies', () => {
            expect(service).toBeInstanceOf(ShowManagementService);
            expect(service.repository).toBe(mockRepository);
        });

        test('should throw if repository is missing', () => {
            expect(() => new ShowManagementService({}))
                .toThrow(ValidationError);
        });

        test('should work without optional dependencies', () => {
            const minimalService = new ShowManagementService({
                showRepository: mockRepository
            });

            expect(minimalService).toBeInstanceOf(ShowManagementService);
        });
    });

    describe('createShow', () => {
        test('should create new show successfully', async () => {
            const show = new Show(validShowData);
            mockRepository.save.mockResolvedValue(show);

            const result = await service.createShow(validShowData);

            expect(result).toBeInstanceOf(Show);
            expect(mockRepository.save).toHaveBeenCalledWith(expect.any(Show));
            expect(mockEventBus.emit).toHaveBeenCalledWith('show:created', {
                show: expect.any(Show)
            });
        });

        test('should throw on missing required fields', async () => {
            const invalidData = { id: 'show1', title: 'Test' };

            await expect(service.createShow(invalidData))
                .rejects
                .toThrow(ValidationError);

            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('updateShow', () => {
        test('should update existing show', async () => {
            const existingShow = new Show(validShowData);
            const updatedShow = new Show({ ...validShowData, rating: 9 });

            mockRepository.getById.mockResolvedValue(existingShow);
            mockRepository.save.mockResolvedValue(updatedShow);

            const result = await service.updateShow('show1', { rating: 9 });

            expect(result.getRating()).toBe(9);
            expect(mockRepository.save).toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith('show:updated', expect.any(Object));
        });

        test('should throw if show not found', async () => {
            mockRepository.getById.mockResolvedValue(null);

            await expect(service.updateShow('nonexistent', { rating: 9 }))
                .rejects
                .toThrow(ValidationError);
        });

        test('should preserve unchanged fields', async () => {
            const existingShow = new Show(validShowData);
            mockRepository.getById.mockResolvedValue(existingShow);
            mockRepository.save.mockResolvedValue(existingShow);

            await service.updateShow('show1', { rating: 9 });

            const savedData = mockRepository.save.mock.calls[0][0];
            expect(savedData.getTitle()).toBe(validShowData.title);
            expect(savedData.getStatus()).toBe(validShowData.status);
        });
    });

    describe('deleteShow', () => {
        test('should delete existing show', async () => {
            const show = new Show(validShowData);
            mockRepository.getById.mockResolvedValue(show);
            mockRepository.delete.mockResolvedValue(true);

            const result = await service.deleteShow('show1');

            expect(result).toBe(true);
            expect(mockRepository.delete).toHaveBeenCalledWith('show1');
            expect(mockEventBus.emit).toHaveBeenCalledWith('show:deleted', expect.any(Object));
        });

        test('should throw if show not found', async () => {
            mockRepository.getById.mockResolvedValue(null);

            await expect(service.deleteShow('nonexistent'))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('progressEpisode', () => {
        test('should increment episode count', async () => {
            const show = new Show(validShowData);
            const updatedShow = new Show({ ...validShowData, currentEpisode: 6 });

            mockRepository.getById.mockResolvedValue(show);
            mockRepository.save.mockResolvedValue(updatedShow);

            const result = await service.progressEpisode('show1');

            expect(result.getCurrentEpisode()).toBe(6);
            expect(mockEventBus.emit).toHaveBeenCalledWith('show:episode-progressed', expect.any(Object));
        });

        test('should auto-complete when reaching final episode', async () => {
            const show = new Show({ ...validShowData, currentEpisode: 11, totalEpisodes: 12 });
            const progressedShow = new Show({ ...validShowData, currentEpisode: 12 });
            const completedShow = new Show({ ...validShowData, currentEpisode: 12, status: 'completed' });

            mockRepository.getById
                .mockResolvedValueOnce(show)           // First call in progressEpisode
                .mockResolvedValueOnce(progressedShow) // Second call in updateShow (progress)
                .mockResolvedValueOnce(progressedShow) // Third call in updateStatus
                .mockResolvedValueOnce(progressedShow); // Fourth call in updateShow (status change)
            mockRepository.save
                .mockResolvedValueOnce(progressedShow)  // Save after progressing episode
                .mockResolvedValueOnce(completedShow);  // Save after status change to completed

            await service.progressEpisode('show1');

            expect(mockEventBus.emit).toHaveBeenCalledWith('show:completed', expect.any(Object));
        });

        test('should throw if already at total episodes', async () => {
            const show = new Show({ ...validShowData, currentEpisode: 12 });
            mockRepository.getById.mockResolvedValue(show);

            await expect(service.progressEpisode('show1'))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('updateStatus', () => {
        test('should update show status', async () => {
            const show = new Show(validShowData);
            const updatedShow = new Show({ ...validShowData, status: 'completed' });

            mockRepository.getById.mockResolvedValue(show);
            mockRepository.save.mockResolvedValue(updatedShow);

            const result = await service.updateStatus('show1', 'completed');

            expect(result.getStatus()).toBe('completed');
            expect(mockEventBus.emit).toHaveBeenCalledWith('show:status-changed', expect.objectContaining({
                oldStatus: 'watching',
                newStatus: 'completed'
            }));
        });

        test('should throw on invalid status', async () => {
            await expect(service.updateStatus('show1', 'invalid_status'))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('Query Operations', () => {
        test('should get all shows', async () => {
            const shows = [new Show(validShowData)];
            mockRepository.getAll.mockResolvedValue(shows);

            const result = await service.getAllShows();

            expect(result).toHaveLength(1);
            expect(mockRepository.getAll).toHaveBeenCalled();
        });

        test('should get show by ID', async () => {
            const show = new Show(validShowData);
            mockRepository.getById.mockResolvedValue(show);

            const result = await service.getShowById('show1');

            expect(result).toBeInstanceOf(Show);
            expect(mockRepository.getById).toHaveBeenCalledWith('show1');
        });

        test('should get shows by status', async () => {
            const shows = [new Show(validShowData)];
            mockRepository.getByStatus.mockResolvedValue(shows);

            const result = await service.getShowsByStatus('watching');

            expect(result).toHaveLength(1);
            expect(mockRepository.getByStatus).toHaveBeenCalledWith('watching');
        });

        test('should throw on invalid status query', async () => {
            await expect(service.getShowsByStatus('invalid'))
                .rejects
                .toThrow(ValidationError);
        });

        test('should get currently airing shows', async () => {
            const shows = [new Show(validShowData)];
            mockRepository.getCurrentlyAiring.mockResolvedValue(shows);

            const result = await service.getCurrentlyAiringShows();

            expect(result).toHaveLength(1);
            expect(mockRepository.getCurrentlyAiring).toHaveBeenCalled();
        });

        test('should search shows by title', async () => {
            const shows = [new Show(validShowData)];
            mockRepository.searchByTitle.mockResolvedValue(shows);

            const result = await service.searchShows('Test');

            expect(result).toHaveLength(1);
            expect(mockRepository.searchByTitle).toHaveBeenCalledWith('Test');
        });

        test('should throw on invalid search query', async () => {
            await expect(service.searchShows(''))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('Episode Calculation', () => {
        test('should calculate current episode', async () => {
            const show = new Show(validShowData);
            mockRepository.getById.mockResolvedValue(show);
            mockEpisodeCalculator.calculateCurrentEpisode.mockResolvedValue(7);

            const result = await service.calculateCurrentEpisode('show1');

            expect(result).toBe(7);
            expect(mockEpisodeCalculator.calculateCurrentEpisode).toHaveBeenCalledWith(show);
        });

        test('should throw if calculator not available', async () => {
            const serviceWithoutCalculator = new ShowManagementService({
                showRepository: mockRepository
            });

            const show = new Show(validShowData);
            mockRepository.getById.mockResolvedValue(show);

            await expect(serviceWithoutCalculator.calculateCurrentEpisode('show1'))
                .rejects
                .toThrow('Episode calculator service not available');
        });

        test('should throw if show not found', async () => {
            mockRepository.getById.mockResolvedValue(null);

            await expect(service.calculateCurrentEpisode('nonexistent'))
                .rejects
                .toThrow(ValidationError);
        });
    });
});
