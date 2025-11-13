/**
 * RouteConfiguration.js
 * Configures all application routes
 * Maps URLs to page controllers
 */

import { SchedulePage } from '../../Presentation/Pages/SchedulePage.js';
import { ShowsPage } from '../../Presentation/Pages/ShowsPage.js';
import { MusicPage } from '../../Presentation/Pages/MusicPage.js';
import { ImportPage } from '../../Presentation/Pages/ImportPage.js';
import { AuthPage } from '../../Presentation/Pages/AuthPage.js';
import { AdminPage } from '../../Presentation/Pages/AdminPage.js';
import config from '../../Infrastructure/Config/index.js';

/**
 * Register all application routes
 * @param {Router} router - The router instance
 * @param {Container} container - The DI container
 */
export function registerRoutes(router, container) {
    const logger = container.get('logger');
    const useDatabaseAuth = config.database.enabled;

    // Authentication page (Phase 8 - when database is enabled)
    if (useDatabaseAuth) {
        router.register('/auth', (container) => {
            return new AuthPage({
                container,
                eventBus: container.get('eventBus'),
                logger: container.get('logger')
            });
        });
        logger.info('✓ Authentication route registered');
    }

    // Admin page - admin dashboard (protected, requires admin role)
    if (useDatabaseAuth) {
        router.register('/admin', (container) => {
            if (!isAuthenticated()) {
                router.navigate('/auth');
                return createDummyController();
            }
            if (!isAdmin()) {
                container.get('eventBus').emit('toast:show', {
                    message: 'Access denied. Admin privileges required.',
                    type: 'error'
                });
                router.navigate('/schedule');
                return createDummyController();
            }
            return new AdminPage({
                container,
                eventBus: container.get('eventBus'),
                logger: container.get('logger')
            });
        });
        logger.info('✓ Admin route registered');
    }

    // Schedule page - default landing page (protected if auth enabled)
    router.register('/schedule', (container) => {
        if (useDatabaseAuth && !isAuthenticated()) {
            router.navigate('/auth');
            return createDummyController();
        }
        return new SchedulePage({
            viewModel: container.get('scheduleViewModel'),
            eventBus: container.get('eventBus'),
            logger: container.get('logger'),
            container
        });
    });

    // Shows page - browse and manage all shows (protected if auth enabled)
    router.register('/shows', (container) => {
        if (useDatabaseAuth && !isAuthenticated()) {
            router.navigate('/auth');
            return createDummyController();
        }
        return new ShowsPage({
            viewModel: container.get('scheduleViewModel'), // Reuse schedule ViewModel for shows
            showService: container.get('showManagementService'),
            eventBus: container.get('eventBus'),
            logger: container.get('logger'),
            container
        });
    });

    // Music page - music player and track list (protected if auth enabled)
    router.register('/music', (container) => {
        if (useDatabaseAuth && !isAuthenticated()) {
            router.navigate('/auth');
            return createDummyController();
        }
        return new MusicPage({
            viewModel: container.get('musicViewModel'),
            eventBus: container.get('eventBus'),
            logger: container.get('logger'),
            container
        });
    });

    // Import page - import shows and music from JSON/MAL (protected if auth enabled)
    router.register('/import', (container) => {
        if (useDatabaseAuth && !isAuthenticated()) {
            router.navigate('/auth');
            return createDummyController();
        }
        return new ImportPage({
            importService: container.get('importService'),
            eventBus: container.get('eventBus'),
            logger: container.get('logger'),
            container
        });
    });

    // Root path - redirect to schedule or auth
    router.register('/', (container) => {
        if (useDatabaseAuth && !isAuthenticated()) {
            router.navigate('/auth');
        } else {
            router.navigate('/schedule');
        }
        return createDummyController();
    });

    logger.info('Routes configured:', Array.from(router.routes.keys()));
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('current_user');
    return !!(token && user);
}

/**
 * Check if user is admin
 * @returns {boolean}
 */
function isAdmin() {
    const userStr = localStorage.getItem('current_user');
    if (!userStr) return false;
    try {
        const user = JSON.parse(userStr);
        return user.role === 'admin';
    } catch (error) {
        return false;
    }
}

/**
 * Create a dummy controller for redirects
 * @returns {Object}
 */
function createDummyController() {
    return {
        render: () => document.createElement('div'),
        destroy: () => { }
    };
}
