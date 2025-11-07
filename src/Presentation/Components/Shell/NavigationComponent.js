/**
 * NavigationComponent.js
 * Main navigation menu for the application
 */

import { BaseComponent } from '../BaseComponent.js';

export class NavigationComponent extends BaseComponent {
    /**
     * @param {Object} options - Component configuration
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger instance
     * @param {Router} options.router - Router instance (optional, set later)
     */
    constructor({ eventBus, logger, router = null }) {
        super({ eventBus, logger });
        this.router = router;
        this.element = null;
    }

    /**
     * Set the router (called after router initialization)
     * @param {Router} router - Router instance
     */
    setRouter(router) {
        this.router = router;
    }

    /**
     * Render the navigation component
     * @returns {HTMLElement} Navigation element
     */
    render() {
        const nav = document.createElement('nav');
        nav.className = 'nav';
        nav.innerHTML = `
            <ul class="nav__list">
                <li class="nav__list-item">
                    <a href="/schedule" class="nav__item nav__item--active" data-route="/schedule">
                        📅 Schedule
                    </a>
                </li>
                <li class="nav__list-item">
                    <a href="/shows" class="nav__item" data-route="/shows">
                        📺 Shows
                    </a>
                </li>
                <li class="nav__list-item">
                    <a href="/music" class="nav__item" data-route="/music">
                        🎵 Music
                    </a>
                </li>
                <li class="nav__list-item">
                    <a href="/import" class="nav__item" data-route="/import">
                        📥 Import
                    </a>
                </li>
            </ul>
        `;

        this.element = nav;
        this.attachEventListeners(nav);
        this.subscribeToRouteChanges();

        return nav;
    }

    /**
     * Attach event listeners
     * @param {HTMLElement} element - Navigation element
     */
    attachEventListeners(element) {
        // Navigation items are handled by Router's global link interceptor
        // But we can add hover effects or other UI enhancements here
    }

    /**
     * Subscribe to route change events to update active state
     */
    subscribeToRouteChanges() {
        this.unsubscribe = this._eventBus.subscribe('route:navigation-complete', (data) => {
            this.updateActiveItem(data.path);
        });
    }

    /**
     * Update the active navigation item
     * @param {string} path - Current route path
     */
    updateActiveItem(path) {
        if (!this.element) return;

        // Remove active class from all items
        const items = this.element.querySelectorAll('.nav__item');
        items.forEach(item => {
            item.classList.remove('nav__item--active');
        });

        // Add active class to matching item
        const activeItem = this.element.querySelector(`[data-route="${path}"]`);
        if (activeItem) {
            activeItem.classList.add('nav__item--active');
        }
    }

    /**
     * Destroy the component
     */
    destroy() {
        // Unsubscribe from events
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
