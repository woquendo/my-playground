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
        this.authManager = container.get('authManager');

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
                <div class="auth-header">
                    <div class="auth-logo">📺</div>
                    <h1 class="auth-title">My Playground</h1>
                    <p class="auth-subtitle">Track your anime and music</p>
                </div>
                <div class="auth-form" data-auth-forms></div>
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

            // AuthManager handles API call, token storage, and events
            const result = await this.authManager.login(
                credentials.username,
                credentials.password
            );

            if (result.success) {
                // Navigate to schedule page
                setTimeout(() => {
                    if (this.container && this.container.has('router')) {
                        const router = this.container.get('router');
                        router.navigate('/schedule');
                    } else {
                        window.location.href = '/schedule';
                    }
                }, 500);
            }
        } catch (error) {
            this.logger.error('Login failed', { error: error.message });
            this.error = error.message || 'Invalid email or password';
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

            this.logger.info('Attempting registration', { email: userData.email, username: userData.username });

            // AuthManager handles API call, token storage, and events
            const result = await this.authManager.register(userData);

            if (result.success) {
                // Navigate to schedule page
                setTimeout(() => {
                    if (this.container && this.container.has('router')) {
                        const router = this.container.get('router');
                        router.navigate('/schedule');
                    } else {
                        window.location.href = '/schedule';
                    }
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

        if (this.container && this.container.has('router')) {
            const router = this.container.get('router');
            router.navigate('/auth');
        } else {
            window.location.href = '/auth';
        }
    }
}
