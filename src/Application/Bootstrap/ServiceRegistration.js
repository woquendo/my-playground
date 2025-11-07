/**
 * ServiceRegistration.js
 * Registers all application services in the DI container
 * Follows dependency injection and inversion of control principles
 */

import { HttpShowRepository } from '../../Infrastructure/Repositories/HttpShowRepository.js';
import { HttpMusicRepository } from '../../Infrastructure/Repositories/HttpMusicRepository.js';
import { ShowManagementService } from '../Services/ShowManagementService.js';
import { MusicManagementService } from '../Services/MusicManagementService.js';
import { ScheduleService } from '../Services/ScheduleService.js';
import { ImportService } from '../Services/ImportService.js';
import { ScheduleViewModel } from '../../Presentation/ViewModels/ScheduleViewModel.js';
import { MusicViewModel } from '../../Presentation/ViewModels/MusicViewModel.js';
import { EpisodeCalculatorService } from '../../Domain/Services/EpisodeCalculatorService.js';
import { HttpClient } from '../../Infrastructure/Http/HttpClient.js';
import { CacheManager } from '../../Infrastructure/Cache/CacheManager.js';
import { StorageService } from '../../Infrastructure/Storage/StorageService.js';

/**
 * Register all application services in the container
 * @param {Container} container - The DI container instance
 * @returns {Promise<void>}
 */
export async function registerServices(container) {
    const eventBus = container.get('eventBus');
    const logger = container.get('logger');

    logger.info('Registering services...');

    // ===========================
    // Infrastructure Layer
    // ===========================

    // HTTP Client for API requests
    container.singleton('httpClient', () => new HttpClient({
        baseUrl: window.location.origin,
        timeout: 30000,
        retries: 3
    }));

    // Cache manager for temporary data storage
    container.singleton('cache', () => new CacheManager({
        defaultTTL: 5 * 60 * 1000, // 5 minutes
        maxSize: 100,
        enableStats: true
    }));

    // Storage service for persistent data
    container.singleton('storage', () => new StorageService({
        logger,
        storageKey: 'anime-tracker-v2'
    }));

    // ===========================
    // Domain Services
    // ===========================

    // Episode calculator for show episodes
    container.singleton('episodeCalculatorService', () => new EpisodeCalculatorService({
        logger
    }));

    // ===========================
    // Repositories
    // ===========================

    // Show repository
    container.singleton('showRepository', () => new HttpShowRepository(
        container.get('httpClient'),
        container.get('cache'),
        {
            endpoint: '/data/shows.json',
            logger
        }
    ));

    // Music repository
    container.singleton('musicRepository', () => new HttpMusicRepository(
        container.get('httpClient'),
        container.get('cache'),
        {
            endpoint: '/data/songs.json',
            logger
        }
    ));

    // ===========================
    // Application Services
    // ===========================

    // Show management service
    container.singleton('showManagementService', () => new ShowManagementService({
        showRepository: container.get('showRepository'),
        episodeCalculatorService: container.get('episodeCalculatorService'),
        eventBus,
        logger
    }));

    // Music management service
    container.singleton('musicManagementService', () => new MusicManagementService({
        musicRepository: container.get('musicRepository'),
        eventBus,
        logger
    }));

    // Schedule service
    container.singleton('scheduleService', () => new ScheduleService({
        showRepository: container.get('showRepository'),
        episodeCalculatorService: container.get('episodeCalculatorService'),
        eventBus,
        logger
    }));

    // Import service
    container.singleton('importService', () => new ImportService({
        showRepository: container.get('showRepository'),
        musicRepository: container.get('musicRepository'),
        eventBus,
        logger
    }));

    // ===========================
    // ViewModels
    // ===========================

    // Schedule ViewModel
    container.singleton('scheduleViewModel', () => new ScheduleViewModel({
        scheduleService: container.get('scheduleService'),
        showManagementService: container.get('showManagementService'),
        eventBus,
        logger
    }));

    // Music ViewModel
    container.singleton('musicViewModel', () => new MusicViewModel({
        musicManagementService: container.get('musicManagementService'),
        eventBus,
        logger
    }));

    logger.info('✓ All services registered successfully');
}

/**
 * Validate that all required services are registered
 * Useful for debugging and testing
 * @param {Container} container - The DI container
 * @returns {boolean} True if all services are registered
 */
export function validateServices(container) {
    const requiredServices = [
        'eventBus',
        'logger',
        'httpClient',
        'cache',
        'storage',
        'episodeCalculatorService',
        'showRepository',
        'musicRepository',
        'showManagementService',
        'musicManagementService',
        'scheduleService',
        'importService',
        'scheduleViewModel',
        'musicViewModel'
    ];

    const missingServices = [];

    for (const serviceName of requiredServices) {
        try {
            container.get(serviceName);
        } catch (error) {
            missingServices.push(serviceName);
        }
    }

    if (missingServices.length > 0) {
        console.error('Missing services:', missingServices);
        return false;
    }

    console.log('✓ All required services are registered');
    return true;
}
