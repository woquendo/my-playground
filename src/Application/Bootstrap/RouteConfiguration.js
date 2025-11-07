/**
 * RouteConfiguration.js
 * Configures all application routes
 * Maps URLs to page controllers
 */

import { SchedulePage } from '../../Presentation/Pages/SchedulePage.js';
import { ShowsPage } from '../../Presentation/Pages/ShowsPage.js';
import { MusicPage } from '../../Presentation/Pages/MusicPage.js';
import { ImportPage } from '../../Presentation/Pages/ImportPage.js';

/**
 * Register all application routes
 * @param {Router} router - The router instance
 * @param {Container} container - The DI container
 */
export function registerRoutes(router, container) {
    // Schedule page - default landing page
    router.register('/schedule', (container) => {
        return new SchedulePage({
            viewModel: container.get('scheduleViewModel'),
            eventBus: container.get('eventBus'),
            logger: container.get('logger'),
            container
        });
    });

    // Shows page - browse and manage all shows
    router.register('/shows', (container) => {
        return new ShowsPage({
            viewModel: container.get('scheduleViewModel'), // Reuse schedule ViewModel for shows
            showService: container.get('showManagementService'),
            eventBus: container.get('eventBus'),
            logger: container.get('logger'),
            container
        });
    });

    // Music page - music player and track list
    router.register('/music', (container) => {
        return new MusicPage({
            viewModel: container.get('musicViewModel'),
            eventBus: container.get('eventBus'),
            logger: container.get('logger'),
            container
        });
    });

    // Import page - import shows and music from JSON/MAL
    router.register('/import', (container) => {
        return new ImportPage({
            importService: container.get('importService'),
            eventBus: container.get('eventBus'),
            logger: container.get('logger'),
            container
        });
    });

    // Root path - redirect to schedule
    router.register('/', (container) => {
        // Immediately redirect to schedule
        router.navigate('/schedule');
        // Return a dummy controller that won't render
        return {
            render: () => document.createElement('div'),
            destroy: () => { }
        };
    });

    container.get('logger').info('Routes configured:', Array.from(router.routes.keys()));
}
