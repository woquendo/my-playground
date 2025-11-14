/**
 * NavigationComponent.js
 * Modern, reactive main navigation menu for the application
 * Follows SOLID principles with clean separation of concerns
 */

import { BaseComponent } from '../BaseComponent.js';

export class NavigationComponent extends BaseComponent {
    /**
     * @param {Object} options - Component configuration
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger instance
     * @param {Router} options.router - Router instance (optional, set later)
     * @param {Container} options.container - DI Container (optional, for auth)
     */
    constructor({ eventBus, logger, router = null, container = null }) {
        super({ eventBus, logger });
        this.router = router;
        this.container = container;
        this.element = null;
        this.currentPath = '/schedule';

        // Check if authManager is available
        this._authManager = container?.get('authManager');
        this._currentUser = this._authManager?.getCurrentUser();
        this._isAdmin = this._authManager?.isAdmin() || false;

        // Navigation items configuration (Single Source of Truth)
        this.navItems = [
            { path: '/schedule', label: 'My Schedule', icon: '📅', ariaLabel: 'View your anime schedule' },
            { path: '/shows', label: 'Shows', icon: '📺', ariaLabel: 'Browse all shows' },
            { path: '/music', label: 'Music', icon: '🎵', ariaLabel: 'Music player' },
            { path: '/import', label: 'Import', icon: '📥', ariaLabel: 'Import data' }
        ];

        // Add admin link if user is admin
        if (this._isAdmin) {
            this.navItems.push({
                path: '/admin',
                label: 'Admin',
                icon: '🔐',
                ariaLabel: 'Admin dashboard'
            });
        }
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
        nav.className = 'app-nav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');

        nav.innerHTML = `
            <div class="app-nav__container">
                ${this.navItems.map(item => this._renderNavItem(item)).join('')}
                ${this._currentUser ? this._renderUserMenu() : ''}
            </div>
        `;

        this.element = nav;
        this.attachEventListeners(nav);
        this.subscribeToRouteChanges();

        return nav;
    }

    /**
     * Render a single navigation item
     * @param {Object} item - Navigation item data
     * @returns {string} HTML string for nav item
     * @private
     */
    _renderNavItem(item) {
        const isActive = this.currentPath === item.path;
        const activeClass = isActive ? 'app-nav__link--active' : '';

        return `
            <a href="${item.path}" 
               class="app-nav__link ${activeClass}" 
               data-route="${item.path}"
               aria-label="${item.ariaLabel}"
               aria-current="${isActive ? 'page' : 'false'}">
                <span class="app-nav__icon" aria-hidden="true">${item.icon}</span>
                <span class="app-nav__label">${item.label}</span>
                <span class="app-nav__indicator" aria-hidden="true"></span>
            </a>
        `;
    }

    /**
     * Render user menu
     * @returns {string} HTML string for user menu
     * @private
     */
    _renderUserMenu() {
        // User menu removed - profile now only in header
        return '';
    }    /**
     * Escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Attach event listeners
     * @param {HTMLElement} element - Navigation element
     */
    attachEventListeners(element) {
        // Add ripple effect on click for visual feedback
        const links = element.querySelectorAll('.app-nav__link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                this._createRippleEffect(e.currentTarget, e);
            });
        });

    }    /**
     * Create ripple effect on click
     * @param {HTMLElement} element - Element to add ripple to
     * @param {MouseEvent} event - Click event
     * @private
     */
    _createRippleEffect(element, event) {
        const ripple = document.createElement('span');
        ripple.className = 'app-nav__ripple';

        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        element.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => ripple.remove(), 600);
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
     * Handle logout action
     * @private
     */
    _handleLogout() {
        if (this._authManager) {
            this._authManager.logout();
            // Redirect to auth page
            if (this.router) {
                this.router.navigate('/auth');
            } else {
                window.location.href = '/auth';
            }
        }
    }

    /**
     * Update the active navigation item (Reactive Update)
     * @param {string} path - Current route path
     */
    updateActiveItem(path) {
        if (!this.element) return;

        // Only update if path actually changed
        if (this.currentPath === path) return;

        this.currentPath = path;

        // Remove active class from all items
        const items = this.element.querySelectorAll('.app-nav__link');
        items.forEach(item => {
            const itemPath = item.getAttribute('data-route');
            const isActive = itemPath === path;

            // Update classes with smooth transition
            item.classList.toggle('app-nav__link--active', isActive);
            item.setAttribute('aria-current', isActive ? 'page' : 'false');

            // Add transition class for animation
            item.classList.add('app-nav__link--transitioning');
            setTimeout(() => item.classList.remove('app-nav__link--transitioning'), 300);
        });

        this._logger?.debug('Navigation updated to:', path);
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
