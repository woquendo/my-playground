/**
 * Router.js
 * Client-side SPA router with history API integration
 * Handles navigation between pages without full page reloads
 */

export class Router {
    /**
     * @param {Object} options - Router configuration
     * @param {EventBus} options.eventBus - Event bus for routing events
     * @param {Logger} options.logger - Logger instance
     * @param {Container} options.container - DI container
     */
    constructor({ eventBus, logger, container }) {
        this.eventBus = eventBus;
        this.logger = logger;
        this.container = container;
        this.routes = new Map();
        this.currentRoute = null;
        this.currentController = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the router
     * Sets up history API listeners
     */
    init() {
        if (this.isInitialized) {
            this.logger.warn('Router already initialized');
            return;
        }

        // Listen for browser back/forward
        window.addEventListener('popstate', (event) => {
            this.handlePopState(event);
        });

        // Intercept link clicks for SPA navigation
        document.addEventListener('click', (event) => {
            this.handleLinkClick(event);
        });

        this.isInitialized = true;
        this.logger.info('Router initialized');
    }

    /**
     * Register a route
     * @param {string} path - The route path (e.g., '/schedule')
     * @param {Function} controllerFactory - Factory function that returns a controller instance
     * @param {Object} options - Route options
     */
    register(path, controllerFactory, options = {}) {
        this.routes.set(path, {
            factory: controllerFactory,
            options
        });
        this.logger.debug(`Route registered: ${path}`);
    }

    /**
     * Navigate to a route
     * @param {string} path - The path to navigate to
     * @param {Object} state - Optional state to pass to the route
     * @returns {Promise<void>}
     */
    async navigate(path, state = {}) {
        try {
            this.logger.info(`Navigating to: ${path}`);

            // Normalize path
            const normalizedPath = this.normalizePath(path);

            // Find matching route
            const route = this.findRoute(normalizedPath);

            if (!route) {
                this.logger.warn(`No route found for: ${normalizedPath}`);
                await this.handleNotFound(normalizedPath);
                return;
            }

            // Emit navigation start event
            this.eventBus.emit('route:navigation-start', { path: normalizedPath, state });

            // Destroy current controller if exists
            await this.destroyCurrentController();

            // Create new controller
            const controller = route.factory(this.container);
            this.currentController = controller;
            this.currentRoute = normalizedPath;

            // Update browser history
            if (window.location.pathname !== normalizedPath) {
                window.history.pushState(state, '', normalizedPath);
            }

            // Render the page
            const contentElement = document.getElementById('app-content');
            if (!contentElement) {
                throw new Error('Content container not found');
            }

            // Clear existing content
            contentElement.innerHTML = '';

            // Render new page
            const pageElement = await controller.render();
            contentElement.appendChild(pageElement);

            // Emit navigation complete event
            this.eventBus.emit('route:navigation-complete', { path: normalizedPath, state });

            // Update active navigation item
            this.updateActiveNav(normalizedPath);

            this.logger.info(`Navigation complete: ${normalizedPath}`);

        } catch (error) {
            this.logger.error('Navigation error:', error);
            this.eventBus.emit('route:navigation-error', { path, error });
            throw error;
        }
    }

    /**
     * Handle browser back/forward navigation
     * @param {PopStateEvent} event - The popstate event
     */
    async handlePopState(event) {
        const path = window.location.pathname;
        this.logger.debug('Popstate event:', path);
        await this.navigate(path, event.state || {});
    }

    /**
     * Handle link clicks for SPA navigation
     * @param {MouseEvent} event - The click event
     */
    handleLinkClick(event) {
        // Check if it's a link
        const link = event.target.closest('a');
        if (!link) return;

        // Check if it's an internal link
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) {
            return;
        }

        // Check if link has data-no-router attribute
        if (link.hasAttribute('data-no-router')) {
            return;
        }

        // Prevent default and navigate
        event.preventDefault();
        this.navigate(href);
    }

    /**
     * Find a matching route for a path
     * @param {string} path - The path to match
     * @returns {Object|null} The matching route or null
     */
    findRoute(path) {
        // Exact match first
        if (this.routes.has(path)) {
            return this.routes.get(path);
        }

        // Check for pattern matches (future enhancement for dynamic routes)
        // For now, we only support exact matches
        return null;
    }

    /**
     * Normalize a path
     * @param {string} path - The path to normalize
     * @returns {string} The normalized path
     */
    normalizePath(path) {
        // Remove trailing slash (except for root)
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        return path;
    }

    /**
     * Handle 404 - route not found
     * @param {string} path - The path that wasn't found
     */
    async handleNotFound(path) {
        this.logger.warn(`Route not found: ${path}`);

        // Try to navigate to default route
        const defaultRoute = '/schedule';
        if (path !== defaultRoute) {
            this.logger.info(`Redirecting to default route: ${defaultRoute}`);
            await this.navigate(defaultRoute);
        } else {
            // Even default route doesn't exist - show error
            const contentElement = document.getElementById('app-content');
            if (contentElement) {
                contentElement.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <h2>Page Not Found</h2>
                        <p>The page "${path}" does not exist.</p>
                        <button onclick="window.location.href='/'">Go Home</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Destroy the current controller
     */
    async destroyCurrentController() {
        if (this.currentController) {
            try {
                if (typeof this.currentController.destroy === 'function') {
                    await this.currentController.destroy();
                }
            } catch (error) {
                this.logger.error('Error destroying controller:', error);
            }
            this.currentController = null;
        }
    }

    /**
     * Update active navigation item
     * @param {string} path - The current path
     */
    updateActiveNav(path) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav__item').forEach(item => {
            item.classList.remove('nav__item--active');
        });

        // Add active class to matching nav item
        const activeLink = document.querySelector(`.nav__item[href="${path}"]`);
        if (activeLink) {
            activeLink.classList.add('nav__item--active');
        }
    }

    /**
     * Get the current route path
     * @returns {string|null} The current route path
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Get the current controller
     * @returns {Object|null} The current controller instance
     */
    getCurrentController() {
        return this.currentController;
    }

    /**
     * Destroy the router
     * Cleanup listeners and current controller
     */
    async destroy() {
        if (!this.isInitialized) {
            return;
        }

        await this.destroyCurrentController();

        // Note: We don't remove event listeners as they're on the window/document
        // This would require storing bound function references

        this.routes.clear();
        this.isInitialized = false;
        this.logger.info('Router destroyed');
    }
}
