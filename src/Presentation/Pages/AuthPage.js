/**
 * AuthPage
 * 
 * Authentication page with login and registration forms
 */

import { LoginForm } from '../Components/LoginForm.js';
import { RegisterForm } from '../Components/RegisterForm.js';

export class AuthPage {
    constructor({ container, eventBus, logger }) {
        this.container = container;
        this.eventBus = eventBus;
        this.logger = logger;
        this.authService = container.get('authService');

        this.currentView = 'login';  // 'login' or 'register'
        this.loginForm = null;
        this.registerForm = null;
        this.loading = false;
        this.error = null;
    }

    /**
     * Render the authentication page
     */
    async render() {
        this.logger.info('Rendering AuthPage');

        const page = document.createElement('div');
        page.className = 'page page--auth';
        page.innerHTML = `
            <div class="auth-container">
                <div class="auth-container__card">
                    <div class="auth-container__logo">
                        <h1>📺 My Playground</h1>
                        <p>Track your anime and music</p>
                    </div>
                    <div class="auth-container__forms" data-auth-forms></div>
                </div>
            </div>
        `;

        // Render initial form
        this._renderCurrentForm(page);

        return page;
    }

    /**
     * Render the current form (login or register)
     */
    _renderCurrentForm(pageElement) {
        const formsContainer = pageElement.querySelector('[data-auth-forms]');
        if (!formsContainer) return;

        // Clear existing form
        if (this.loginForm) {
            this.loginForm.unmount();
            this.loginForm = null;
        }
        if (this.registerForm) {
            this.registerForm.unmount();
            this.registerForm = null;
        }

        if (this.currentView === 'login') {
            this._renderLoginForm(formsContainer);
        } else {
            this._renderRegisterForm(formsContainer);
        }
    }

    /**
     * Render login form
     */
    _renderLoginForm(container) {
        this.loginForm = new LoginForm({
            container,
            eventBus: this.eventBus,
            logger: this.logger,
            onSubmit: this._handleLogin.bind(this),
            onSwitchToRegister: () => {
                this.currentView = 'register';
                this.error = null;
                this._renderCurrentForm(container.parentElement.parentElement);
            },
            loading: this.loading,
            error: this.error
        });

        this.loginForm.mount();
    }

    /**
     * Render register form
     */
    _renderRegisterForm(container) {
        this.registerForm = new RegisterForm({
            container,
            eventBus: this.eventBus,
            logger: this.logger,
            onSubmit: this._handleRegister.bind(this),
            onSwitchToLogin: () => {
                this.currentView = 'login';
                this.error = null;
                this._renderCurrentForm(container.parentElement.parentElement);
            },
            loading: this.loading,
            error: this.error
        });

        this.registerForm.mount();
    }

    /**
     * Handle login submission
     */
    async _handleLogin(credentials) {
        try {
            this.loading = true;
            this.error = null;
            this._updateFormProps();

            this.logger.info('Attempting login', { username: credentials.username });

            const result = await this.authService.login(
                credentials.username,
                credentials.password
            );

            if (result.success) {
                this.logger.info('Login successful', { userId: result.user.id });

                // Store auth token
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('current_user', JSON.stringify(result.user));

                // Emit authentication event
                this.eventBus.emit('auth:login', result.user);

                // Show success toast
                this.eventBus.emit('toast:show', {
                    message: `Welcome back, ${result.user.username}!`,
                    type: 'success'
                });

                // Navigate to schedule page
                setTimeout(() => {
                    window.location.hash = '#/schedule';
                }, 500);
            }
        } catch (error) {
            this.logger.error('Login failed', { error: error.message });
            this.error = error.message || 'Invalid username or password';
            this.loading = false;
            this._updateFormProps();
        }
    }

    /**
     * Handle registration submission
     */
    async _handleRegister(userData) {
        try {
            this.loading = true;
            this.error = null;
            this._updateFormProps();

            this.logger.info('Attempting registration', { username: userData.username });

            const result = await this.authService.register(userData);

            if (result.success) {
                this.logger.info('Registration successful', { userId: result.user.id });

                // Store auth token
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('current_user', JSON.stringify(result.user));

                // Emit authentication event
                this.eventBus.emit('auth:register', result.user);

                // Show success toast
                this.eventBus.emit('toast:show', {
                    message: `Welcome, ${result.user.username}! Your account has been created.`,
                    type: 'success'
                });

                // Navigate to schedule page
                setTimeout(() => {
                    window.location.hash = '#/schedule';
                }, 500);
            }
        } catch (error) {
            this.logger.error('Registration failed', { error: error.message });
            this.error = error.message || 'Failed to create account. Please try again.';
            this.loading = false;
            this._updateFormProps();
        }
    }

    /**
     * Update form props (loading, error)
     */
    _updateFormProps() {
        if (this.loginForm) {
            this.loginForm.update({
                loading: this.loading,
                error: this.error,
                onSubmit: this._handleLogin.bind(this),
                onSwitchToRegister: () => {
                    this.currentView = 'register';
                    this.error = null;
                    const container = this.loginForm._element.parentElement;
                    this._renderCurrentForm(container.parentElement.parentElement);
                }
            });
        }

        if (this.registerForm) {
            this.registerForm.update({
                loading: this.loading,
                error: this.error,
                onSubmit: this._handleRegister.bind(this),
                onSwitchToLogin: () => {
                    this.currentView = 'login';
                    this.error = null;
                    const container = this.registerForm._element.parentElement;
                    this._renderCurrentForm(container.parentElement.parentElement);
                }
            });
        }
    }

    /**
     * Cleanup when page is destroyed
     */
    async destroy() {
        if (this.loginForm) {
            this.loginForm.unmount();
        }
        if (this.registerForm) {
            this.registerForm.unmount();
        }

        this.logger.info('AuthPage destroyed');
    }

    /**
     * Check if user is already authenticated
     */
    static isAuthenticated() {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('current_user');
        return !!(token && user);
    }

    /**
     * Get current user from storage
     */
    static getCurrentUser() {
        try {
            const userJson = localStorage.getItem('current_user');
            return userJson ? JSON.parse(userJson) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Logout current user
     */
    static logout(eventBus) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');

        if (eventBus) {
            eventBus.emit('auth:logout');
            eventBus.emit('toast:show', {
                message: 'You have been logged out',
                type: 'info'
            });
        }

        window.location.hash = '#/auth';
    }
}
