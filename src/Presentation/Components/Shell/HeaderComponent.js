/**
 * HeaderComponent.js
 * Application header with branding and user actions
 */

import { BaseComponent } from '../BaseComponent.js';

export class HeaderComponent extends BaseComponent {
    /**
     * @param {Object} options - Component configuration
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger instance
     * @param {Container} options.container - DI container
     */
    constructor({ eventBus, logger, container }) {
        super({ eventBus, logger });
        this.container = container;
    }

    /**
     * Render the header component
     * @returns {HTMLElement} Header element
     */
    render() {
        const header = document.createElement('header');
        header.className = 'header';
        header.innerHTML = `
            <div class="header__container">
                <div class="header__branding">
                    <h1 class="header__title">Anime Tracker</h1>
                    <span class="header__subtitle">Your Personal Anime Schedule</span>
                </div>
                <div class="header__actions">
                    <button class="btn btn--ghost btn--sm" id="theme-toggle" aria-label="Toggle theme">
                        <span class="theme-icon">🌙</span>
                    </button>
                </div>
            </div>
        `;

        this.attachEventListeners(header);
        return header;
    }

    /**
     * Attach event listeners
     * @param {HTMLElement} element - Header element
     */
    attachEventListeners(element) {
        const themeToggle = element.querySelector('#theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    /**
     * Toggle theme between light and dark
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);

        // Update icon
        const icon = document.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
        }

        // Emit event
        if (this.eventBus) {
            this.eventBus.emit('theme:changed', { theme: newTheme });
        }

        // Save preference
        try {
            const appState = this.container.get('applicationState');
            appState.setProperty('theme', newTheme);
        } catch (error) {
            this.logger.warn('Failed to save theme preference:', error);
        }
    }

    /**
     * Destroy the component
     */
    destroy() {
        // Cleanup if needed
    }
}
