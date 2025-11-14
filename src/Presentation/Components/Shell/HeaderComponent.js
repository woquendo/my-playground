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
        this.authManager = container.get('authManager');
        this.currentUser = this.authManager.getCurrentUser();
        this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        this.element = null;
        this.isPlaying = false;

        // Subscribe to playback events
        this._subscribeToPlaybackEvents();

        // Subscribe to auth events
        this._subscribeToAuthEvents();
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
     * Subscribe to authentication events
     * @private
     */
    _subscribeToAuthEvents() {
        this._eventBus.subscribe('auth:login', ({ user }) => {
            this.currentUser = user;
            this._updateAuthUI();
        });

        this._eventBus.subscribe('auth:logout', () => {
            this.currentUser = null;
            this._updateAuthUI();
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
                        <h1 class="app-header__title">Show / Music Tracker</h1>
                        <p class="app-header__subtitle">Your Personal Show and Music Tracker</p>
                    </div>
                </div>
                
                <!-- Actions Section -->
                <div class="app-header__actions">
                    <!-- Authentication -->
                    <div class="app-header__auth">
                        ${this._renderAuthUI()}
                    </div>
                    
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
     * Render authentication UI based on current state
     * @returns {string} HTML string for auth UI
     * @private
     */
    _renderAuthUI() {
        if (!this.currentUser) {
            return `
                <button 
                    class="header-action-btn auth-login-btn" 
                    id="auth-login-btn" 
                    aria-label="Login"
                    title="Login to your account"
                >
                    <span class="action-btn__icon" aria-hidden="true">👤</span>
                </button>
            `;
        }

        return `
            <div class="user-profile" id="user-profile">
                <button 
                    class="user-profile__button" 
                    aria-label="User menu"
                    title="${this.currentUser.username || this.currentUser.email}"
                >
                    <span class="user-profile__icon" aria-hidden="true">👤</span>
                </button>
                <div class="user-profile__dropdown" id="user-profile-dropdown">
                    <div class="user-profile__info">
                        <div class="user-profile__email">${this.currentUser.email || this.currentUser.username}</div>
                        ${this.currentUser.role ? `<div class="user-profile__role">${this.currentUser.role}</div>` : ''}
                    </div>
                    <div class="user-profile__menu">
                        <button class="user-profile__menu-item" id="menu-profile-btn" data-menu-profile>
                            <span class="user-profile__menu-icon" aria-hidden="true">👤</span>
                            <span>Edit Profile</span>
                        </button>
                        <button class="user-profile__menu-item" id="menu-import-btn" data-menu-import>
                            <span class="user-profile__menu-icon" aria-hidden="true">📥</span>
                            <span>Import Anime</span>
                        </button>
                        <button class="user-profile__menu-item user-profile__logout" id="auth-logout-btn">
                            <span class="user-profile__menu-icon" aria-hidden="true">🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update authentication UI reactively
     * @private
     */
    _updateAuthUI() {
        if (!this.element) return;

        const authContainer = this.element.querySelector('.app-header__auth');
        if (!authContainer) return;

        authContainer.innerHTML = this._renderAuthUI();
        this._attachAuthEventListeners(this.element);
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

        // Attach auth event listeners
        this._attachAuthEventListeners(element);
    }

    /**
     * Attach authentication event listeners
     * @param {HTMLElement} element - Container element
     * @private
     */
    _attachAuthEventListeners(element) {
        // Login button - only navigate to /auth if NOT already logged in
        const loginBtn = element.querySelector('#auth-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                // Don't navigate if user is already authenticated
                if (this.authManager && this.authManager.isAuthenticated()) {
                    console.warn('User is already logged in. Use the profile menu to log out.');
                    return;
                }

                if (this.router) {
                    this.router.navigate('/auth');
                } else {
                    window.location.href = '/auth';
                }
            });
        }

        // User profile toggle
        const profileContainer = element.querySelector('.user-profile');
        const dropdown = element.querySelector('#user-profile-dropdown');
        if (profileContainer && dropdown) {
            // Open on hover
            profileContainer.addEventListener('mouseenter', () => {
                dropdown.classList.add('user-profile__dropdown--open');
            });

            // Close when mouse leaves
            profileContainer.addEventListener('mouseleave', () => {
                dropdown.classList.remove('user-profile__dropdown--open');
            });

            // Also support click toggle for touch devices
            const profileBtn = profileContainer.querySelector('.user-profile__button');
            if (profileBtn) {
                profileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('user-profile__dropdown--open');
                });
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileContainer.contains(e.target)) {
                    dropdown.classList.remove('user-profile__dropdown--open');
                }
            });
        }

        // Edit profile button
        const profileBtn = element.querySelector('#menu-profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                // Close dropdown
                if (dropdown) {
                    dropdown.classList.remove('user-profile__dropdown--open');
                }
                // Navigate to profile page (placeholder - implement when profile page exists)
                if (this.router) {
                    this.router.navigate('/profile');
                } else {
                    window.location.href = '/profile';
                }
            });
        }

        // Import shows button
        const importBtn = element.querySelector('#menu-import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                // Close dropdown
                if (dropdown) {
                    dropdown.classList.remove('user-profile__dropdown--open');
                }
                // Navigate to import page
                if (this.router) {
                    this.router.navigate('/import');
                } else {
                    window.location.href = '/import';
                }
            });
        }

        // Logout button
        const logoutBtn = element.querySelector('#auth-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    this.authManager.logout();
                    if (this.router) {
                        this.router.navigate('/');
                    } else {
                        window.location.href = '/';
                    }
                } catch (error) {
                    this._logger?.error('Logout failed:', error);
                }
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
