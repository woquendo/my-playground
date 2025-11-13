/**
 * ServiceRegistration.js
 * Registers all application services in the DI container
 * Follows dependency injection and inversion of control principles
 */

import { HttpShowRepository } from '../../Infrastructure/Repositories/HttpShowRepository.js';
import { HttpMusicRepository } from '../../Infrastructure/Repositories/HttpMusicRepository.js';
import { APIShowRepository } from '../../Infrastructure/Repositories/APIShowRepository.js';
import { APIMusicRepository } from '../../Infrastructure/Repositories/APIMusicRepository.js';
import { ShowManagementService } from '../Services/ShowManagementService.js';
import { MusicManagementService } from '../Services/MusicManagementService.js';
import { ScheduleService } from '../Services/ScheduleService.js';
import { ImportService } from '../Services/ImportService.js';
import { SitesService } from '../Services/SitesService.js';
import { ScheduleViewModel } from '../../Presentation/ViewModels/ScheduleViewModel.js';
import { MusicViewModel } from '../../Presentation/ViewModels/MusicViewModel.js';
import { EpisodeCalculatorService } from '../../Domain/Services/EpisodeCalculatorService.js';
import { HttpClient } from '../../Infrastructure/Http/HttpClient.js';
import { CacheManager } from '../../Infrastructure/Cache/CacheManager.js';
import { StorageService } from '../../Infrastructure/Storage/StorageService.js';
import { AuthManager } from '../../Infrastructure/Auth/AuthManager.js';
import config from '../../Infrastructure/Config/index.js';

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

    // Authentication manager for frontend (Phase 8)
    container.singleton('authManager', () => new AuthManager({
        eventBus,
        logger
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

    // Determine which repositories to use based on configuration
    const useDatabase = config.database.enabled;

    if (useDatabase) {
        logger.info('Registering API repositories (database mode)...');

        // API Show repository (calls backend REST API)
        container.singleton('showRepository', () => new APIShowRepository({
            httpClient: container.get('httpClient'),
            logger,
            authManager: container.get('authManager')
        }));

        // API Music repository (calls backend REST API)
        container.singleton('musicRepository', () => new APIMusicRepository({
            httpClient: container.get('httpClient'),
            logger,
            authManager: container.get('authManager')
        }));

        logger.info('✓ API repositories registered (calls backend at http://localhost:3000)');
    } else {
        logger.info('Registering HTTP (JSON file) repositories...');

        // Show repository (HTTP/JSON)
        container.singleton('showRepository', () => new HttpShowRepository(
            container.get('httpClient'),
            container.get('cache'),
            {
                endpoint: '/data/shows.json',
                logger
            }
        ));

        // Music repository (HTTP/JSON)
        container.singleton('musicRepository', () => new HttpMusicRepository(
            container.get('httpClient'),
            container.get('cache'),
            {
                endpoint: '/data/songs.json',
                logger
            }
        ));

        logger.info('✓ HTTP repositories registered');
    }

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

    // Sites service
    container.singleton('sitesService', () => new SitesService({
        storage: container.get('storage'),
        httpClient: container.get('httpClient'),
        logger
    }));

    // Authentication service (Phase 8)
    // NOTE: Database authentication requires backend API
    // Skipping auth service registration in browser environment
    if (useDatabase) {
        logger.warn('AuthService skipped - requires backend API for database operations');
    }

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
        'sitesService',
        'scheduleViewModel',
        'musicViewModel',
        'authManager'
    ];

    // NOTE: Database services (connectionManager, authService) are not available in browser
    // They require a backend API server

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
