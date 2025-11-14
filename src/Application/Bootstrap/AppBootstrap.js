/**
 * AppBootstrap.js
 * Main application entry point for modern architecture
 * Initializes the application, registers services, and bootstraps the UI
 */

import { Container } from '../../Core/Container.js';
import { EventBus } from '../../Core/EventBus.js';
import { Logger } from '../../Core/Logger.js';
import { registerServices } from './ServiceRegistration.js';
import { registerRoutes } from './RouteConfiguration.js';
import { Router } from '../../Presentation/Router/Router.js';
import { HeaderComponent } from '../../Presentation/Components/Shell/HeaderComponent.js';
import { NavigationComponent } from '../../Presentation/Components/Shell/NavigationComponent.js';
import { GlobalMusicPlayer } from '../../Presentation/Components/Shell/GlobalMusicPlayer.js';
import { ToastService } from '../../Presentation/Services/ToastService.js';
import { ApplicationState } from '../../Presentation/State/ApplicationState.js';
import { LegacyAdapter } from '../../Bootstrap/LegacyAdapter.js';

/**
 * Main Application class
 * Handles initialization and lifecycle of the entire application
 */
export class Application {
    constructor() {
        this.container = null;
        this.router = null;
        this.isBootstrapped = false;
    }

    /**
     * Bootstrap the entire application
     * @returns {Promise<void>}
     */
    async bootstrap() {
        try {
            console.log('🚀 Bootstrapping application...');

            // Step 1: Initialize core services
            await this.initializeCore();
            this.logger = this.container.get('logger');
            console.log('✓ Core services initialized');

            // Step 2: Register all services
            await registerServices(this.container);
            console.log('✓ Services registered');

            // Step 2.5: Check if user is already authenticated and emit event
            const authManager = this.container.get('authManager');
            const eventBus = this.container.get('eventBus');
            if (authManager.isAuthenticated()) {
                const user = authManager.getCurrentUser();
                console.log('✓ User already authenticated:', user.username);
                eventBus.emit('auth:login', { user });
            }

            // Step 3: Initialize application state
            await this.initializeState();
            console.log('✓ Application state initialized');

            // Step 4: Render shell components
            await this.renderShell();
            console.log('✓ Shell rendered');

            // Step 5: Initialize router
            await this.initializeRouter();
            console.log('✓ Router initialized');

            // Step 6: Load initial data
            await this.loadInitialData();
            console.log('✓ Initial data loaded');

            // Step 7: Initialize legacy compatibility layer
            await this.initializeLegacyAdapter();
            console.log('✓ Legacy adapter initialized');

            // Step 8: Hide loading, show app
            this.hideLoading();
            console.log('✓ Application ready');

            // Step 9: Navigate to initial route
            const currentPath = window.location.pathname;
            const initialPath = currentPath === '/' || currentPath === '/app.html' || currentPath === '/index.html'
                ? '/schedule'
                : currentPath;

            this.logger.info(`Initial navigation to: ${initialPath}`);
            this.router.navigate(initialPath);

            this.isBootstrapped = true;
            this.container.get('eventBus').emit('app:ready');

        } catch (error) {
            console.error('❌ Bootstrap failed:', error);
            this.handleBootstrapError(error);
            throw error;
        }
    }

    /**
     * Initialize core services (Container, EventBus, Logger)
     */
    async initializeCore() {
        // Create DI container
        this.container = new Container();

        // Register core services
        this.container.singleton('eventBus', () => new EventBus());
        this.container.singleton('logger', () => new Logger('APP'));
        this.container.singleton('toastService', () => new ToastService());

        // Make container globally available for debugging
        if (import.meta.env?.MODE === 'development' || window.location.hostname === 'localhost') {
            window.__container = this.container;
        }
    }

    /**
     * Initialize application state
     */
    async initializeState() {
        const eventBus = this.container.get('eventBus');
        const logger = this.container.get('logger');
        const storage = this.container.get('storage');

        // ApplicationState automatically loads persisted state in constructor
        const appState = new ApplicationState({
            eventBus,
            logger,
            storage,
            persist: true
        });
        this.container.singleton('applicationState', () => appState);
    }

    /**
     * Render shell components (header, navigation)
     */
    async renderShell() {
        const eventBus = this.container.get('eventBus');
        const logger = this.container.get('logger');

        // Create and render header
        const headerComponent = new HeaderComponent({
            eventBus,
            logger,
            container: this.container
        });
        const headerElement = headerComponent.render();
        document.getElementById('app-header').appendChild(headerElement);

        // Create and render navigation
        const navigationComponent = new NavigationComponent({
            eventBus,
            logger,
            router: null, // Will be set after router initialization
            container: this.container
        });
        const navElement = navigationComponent.render();
        document.getElementById('app-header').appendChild(navElement);

        // Store components for later access
        this.container.singleton('headerComponent', () => headerComponent);
        this.container.singleton('navigationComponent', () => navigationComponent);

        // Initialize global music player (persists across navigation)
        const musicManagementService = this.container.get('musicManagementService');
        const applicationState = this.container.get('applicationState');

        const globalMusicPlayer = new GlobalMusicPlayer({
            musicService: musicManagementService,
            applicationState,
            eventBus,
            logger
        });

        await globalMusicPlayer.initialize();
        this.container.singleton('globalMusicPlayer', () => globalMusicPlayer);

        logger.info('Global music player initialized');
    }

    /**
     * Initialize router and configure routes
     */
    async initializeRouter() {
        const eventBus = this.container.get('eventBus');
        const logger = this.container.get('logger');

        // Create router
        this.router = new Router({
            eventBus,
            logger,
            container: this.container
        });

        // Register routes
        registerRoutes(this.router, this.container);

        // Initialize routing
        this.router.init();

        // Make router available
        this.container.singleton('router', () => this.router);

        // Update navigation component with router
        const navigationComponent = this.container.get('navigationComponent');
        navigationComponent.setRouter(this.router);
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        const logger = this.container.get('logger');

        try {
            // Repositories load data on-demand via getAll() methods
            // No need to call initialize() - data loads on first request
            logger.info('Initial data will load on demand');
        } catch (error) {
            logger.error('Failed to load initial data:', error);
            // Don't throw - allow app to start with empty data
            this.showToast('Warning: Some data failed to load', 'warning');
        }
    }

    /**
     * Initialize legacy compatibility layer
     * Provides backward compatibility with legacy code
     */
    async initializeLegacyAdapter() {
        const logger = this.container.get('logger');
        const eventBus = this.container.get('eventBus');

        try {
            logger.info('Initializing legacy adapter');

            const legacyAdapter = new LegacyAdapter(this.container, eventBus, logger);
            await legacyAdapter.initialize();

            // Register adapter in container
            this.container.singleton('legacyAdapter', () => legacyAdapter);

            // Expose legacy API globally (for debugging and transition period)
            window.legacyAPI = legacyAdapter.createLegacyAPI();

            logger.info('Legacy adapter ready');
        } catch (error) {
            logger.warn('Legacy adapter initialization failed:', error);
            // Don't throw - app can work without legacy compatibility
        }
    }

    /**
     * Hide loading spinner and show application content
     */
    hideLoading() {
        const loading = document.getElementById('app-loading');
        const appHeader = document.getElementById('app-header');
        const appContent = document.getElementById('app-content');
        const appFooter = document.getElementById('app-footer');

        if (loading) {
            loading.style.display = 'none';
        }

        if (appHeader) {
            appHeader.style.display = 'block';
        }

        if (appContent) {
            appContent.style.display = 'block';
        }

        if (appFooter) {
            appFooter.style.display = 'block';
        }
    }

    /**
     * Handle bootstrap errors
     * @param {Error} error - The error that occurred
     */
    handleBootstrapError(error) {
        const loading = document.getElementById('app-loading');
        const errorContainer = document.getElementById('error-container');

        if (loading) {
            loading.style.display = 'none';
        }

        if (errorContainer) {
            errorContainer.style.display = 'block';

            const errorMessage = errorContainer.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.textContent = error.message || 'An unexpected error occurred';
            }
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     */
    showToast(message, type = 'info') {
        try {
            const toastService = this.container.get('toastService');
            toastService.show(message, type);
        } catch (error) {
            console.warn('Toast service not available:', error);
        }
    }

    /**
     * Shutdown the application gracefully
     */
    async shutdown() {
        if (!this.isBootstrapped) {
            return;
        }

        console.log('🛑 Shutting down application...');

        try {
            // Application state is auto-persisted on changes, no need to save manually

            // Destroy router
            if (this.router) {
                this.router.destroy();
            }

            // Emit shutdown event
            this.container.get('eventBus').emit('app:shutdown');

            this.isBootstrapped = false;
            console.log('✓ Application shutdown complete');
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
}

// Auto-bootstrap on module load
const app = new Application();
app.bootstrap().catch(error => {
    console.error('Failed to bootstrap application:', error);
});

// Export for debugging and testing
export default app;

// Make app available globally for debugging
if (typeof window !== 'undefined') {
    window.__app = app;
}
