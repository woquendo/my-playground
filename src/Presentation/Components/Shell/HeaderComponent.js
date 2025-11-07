/**
 * HeaderComponent.js
 * Modern application header with branding, navigation, and theme toggle
 * Follows SOLID principles with reactive design patterns
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
        this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        this.element = null;
        this.isPlaying = false;

        // Subscribe to playback events
        this._subscribeToPlaybackEvents();
    }

    /**
     * Subscribe to playback events
     * @private
     */
    _subscribeToPlaybackEvents() {
        // Listen for track playback
        this._eventBus.subscribe('globalPlayer:trackChanged', () => {
            this.setPlayingState(true);
        });

        // Listen for playback state changes
        this._eventBus.subscribe('globalPlayer:playing', () => {
            this.setPlayingState(true);
        });

        this._eventBus.subscribe('globalPlayer:paused', () => {
            this.setPlayingState(false);
        });

        this._eventBus.subscribe('globalPlayer:stopped', () => {
            this.setPlayingState(false);
        });
    }

    /**
     * Set playing state and update icon animation
     * @param {boolean} playing - Whether music is playing
     */
    setPlayingState(playing) {
        this.isPlaying = playing;

        if (!this.element) return;

        const musicToggle = this.element.querySelector('#music-player-toggle');
        if (!musicToggle) return;

        if (playing) {
            musicToggle.classList.add('music-player-toggle--playing');
        } else {
            musicToggle.classList.remove('music-player-toggle--playing');
        }
    }

    /**
     * Render the header component
     * @returns {HTMLElement} Header element
     */
    render() {
        const header = document.createElement('div');
        header.className = 'app-header__wrapper';
        header.innerHTML = `
            <div class="app-header__container">
                <!-- Branding Section -->
                <div class="app-header__branding">
                    <div class="app-header__logo" aria-hidden="true">
                        <span class="app-header__logo-icon">📺</span>
                    </div>
                    <div class="app-header__brand-text">
                        <h1 class="app-header__title">Anime Tracker</h1>
                        <p class="app-header__subtitle">Your Personal Anime Schedule</p>
                    </div>
                </div>
                
                <!-- Actions Section -->
                <div class="app-header__actions">
                    <button 
                        class="header-action-btn music-player-toggle" 
                        id="music-player-toggle" 
                        aria-label="Toggle music player"
                        title="Open music player"
                    >
                        <span class="action-btn__icon" aria-hidden="true">🎵</span>
                    </button>
                    
                    <button 
                        class="theme-toggle" 
                        id="theme-toggle" 
                        aria-label="Toggle ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode"
                        title="Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode"
                    >
                        <span class="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">☀️</span>
                        <span class="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">🌙</span>
                        <span class="theme-toggle__track"></span>
                    </button>
                </div>
            </div>
        `;

        this.element = header;
        this.attachEventListeners(header);
        this._updateThemeToggleState();

        return header;
    }

    /**
     * Attach event listeners
     * @param {HTMLElement} element - Header element
     */
    attachEventListeners(element) {
        // Music player toggle
        const musicToggle = element.querySelector('#music-player-toggle');
        if (musicToggle) {
            musicToggle.addEventListener('click', () => {
                this._eventBus.emit('globalPlayer:toggle');
                this._createRippleEffect(musicToggle, event);
            });

            musicToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._eventBus.emit('globalPlayer:toggle');
                }
            });
        }

        // Theme toggle
        const themeToggle = element.querySelector('#theme-toggle');
        if (themeToggle) {
            // Click handler
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });

            // Keyboard handler for accessibility
            themeToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });

            // Add ripple effect
            themeToggle.addEventListener('click', (e) => {
                this._createRippleEffect(e.currentTarget, e);
            });
        }
    }

    /**
     * Toggle theme between light and dark (Reactive Update)
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.currentTheme = newTheme;

        // Update DOM
        document.documentElement.setAttribute('data-theme', newTheme);

        // Update toggle button state with animation
        this._updateThemeToggleState();

        // Emit event
        this._eventBus?.emit('theme:changed', { theme: newTheme });

        // Save preference
        this._saveThemePreference(newTheme);

        this._logger?.info('Theme changed to:', newTheme);
    }

    /**
     * Update theme toggle button state (Reactive)
     * @private
     */
    _updateThemeToggleState() {
        if (!this.element) return;

        const toggle = this.element.querySelector('#theme-toggle');
        if (!toggle) return;

        const isDark = this.currentTheme === 'dark';

        // Update ARIA label
        toggle.setAttribute('aria-label', `Toggle ${isDark ? 'light' : 'dark'} mode`);
        toggle.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);

        // Update active state with animation
        toggle.classList.toggle('theme-toggle--dark', isDark);
        toggle.classList.toggle('theme-toggle--light', !isDark);

        // Add transition class for smooth animation
        toggle.classList.add('theme-toggle--transitioning');
        setTimeout(() => toggle.classList.remove('theme-toggle--transitioning'), 300);
    }

    /**
     * Create ripple effect on click
     * @param {HTMLElement} element - Element to add ripple to
     * @param {MouseEvent} event - Click event
     * @private
     */
    _createRippleEffect(element, event) {
        const ripple = document.createElement('span');
        ripple.className = 'theme-toggle__ripple';

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
     * Save theme preference
     * @param {string} theme - Theme name
     * @private
     */
    _saveThemePreference(theme) {
        try {
            const appState = this.container.get('applicationState');
            appState.setProperty('theme', theme);

            // Also save to localStorage as backup
            localStorage.setItem('preferred-theme', theme);
        } catch (error) {
            this._logger?.warn('Failed to save theme preference:', error);
        }
    }

    /**
     * Destroy the component
     */
    destroy() {
        // Cleanup if needed
        this.element = null;
    }
}
