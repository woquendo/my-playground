/**
 * LoginForm Component
 * 
 * Reusable login form with validation and error handling
 */

import { BaseComponent } from '../Components/BaseComponent.js';

export class LoginForm extends BaseComponent {
    constructor(options) {
        super({
            ...options,
            name: 'LoginForm',
            props: {
                onSubmit: options.onSubmit || (() => { }),
                onSwitchToRegister: options.onSwitchToRegister || (() => { }),
                loading: options.loading || false,
                error: options.error || null
            }
        });

        this.state = {
            username: '',
            password: '',
            showPassword: false,
            validationErrors: {}
        };
    }

    /**
     * Template for the login form
     */
    _template() {
        const { loading, error } = this._props;
        const { showPassword, validationErrors } = this.state;

        return `
            <div class="auth-form login-form">
                <div class="auth-form__header">
                    <h2 class="auth-form__title">Welcome Back</h2>
                    <p class="auth-form__subtitle">Sign in to continue</p>
                </div>

                ${error ? `
                    <div class="alert alert--error">
                        <span class="alert__icon">⚠️</span>
                        <span class="alert__message">${error}</span>
                    </div>
                ` : ''}

                <form class="form" data-login-form>
                    <!-- Username Field -->
                    <div class="form-group ${validationErrors.username ? 'form-group--error' : ''}">
                        <label for="login-username" class="form-label">
                            Username
                        </label>
                        <input
                            type="text"
                            id="login-username"
                            name="username"
                            class="form-input"
                            placeholder="Enter your username"
                            value="${this.state.username}"
                            ${loading ? 'disabled' : ''}
                            required
                            autocomplete="username"
                        />
                        ${validationErrors.username ? `
                            <span class="form-error">${validationErrors.username}</span>
                        ` : ''}
                    </div>

                    <!-- Password Field -->
                    <div class="form-group ${validationErrors.password ? 'form-group--error' : ''}">
                        <label for="login-password" class="form-label">
                            Password
                        </label>
                        <div class="form-input-wrapper">
                            <input
                                type="${showPassword ? 'text' : 'password'}"
                                id="login-password"
                                name="password"
                                class="form-input"
                                placeholder="Enter your password"
                                value="${this.state.password}"
                                ${loading ? 'disabled' : ''}
                                required
                                autocomplete="current-password"
                            />
                            <button
                                type="button"
                                class="form-input-toggle"
                                data-toggle-password
                                aria-label="Toggle password visibility"
                            >
                                ${showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        ${validationErrors.password ? `
                            <span class="form-error">${validationErrors.password}</span>
                        ` : ''}
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        class="btn btn--primary btn--block"
                        ${loading ? 'disabled' : ''}
                    >
                        ${loading ? `
                            <span class="btn__spinner"></span>
                            <span>Signing in...</span>
                        ` : 'Sign In'}
                    </button>

                    <!-- Switch to Register -->
                    <div class="auth-form__footer">
                        <p>
                            Don't have an account?
                            <button
                                type="button"
                                class="link"
                                data-switch-to-register
                                ${loading ? 'disabled' : ''}
                            >
                                Create one
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Initialize event listeners
     */
    _initialize() {
        const form = this._element.querySelector('[data-login-form]');
        const togglePassword = this._element.querySelector('[data-toggle-password]');
        const switchToRegister = this._element.querySelector('[data-switch-to-register]');

        // Form submission
        this._addEventListener(form, 'submit', this._handleSubmit.bind(this));

        // Input changes
        const usernameInput = this._element.querySelector('#login-username');
        const passwordInput = this._element.querySelector('#login-password');

        this._addEventListener(usernameInput, 'input', (e) => {
            this.state.username = e.target.value;
            this._clearFieldError('username');
        });

        this._addEventListener(passwordInput, 'input', (e) => {
            this.state.password = e.target.value;
            this._clearFieldError('password');
        });

        // Toggle password visibility
        if (togglePassword) {
            this._addEventListener(togglePassword, 'click', () => {
                this.state.showPassword = !this.state.showPassword;
                this.update({ ...this._props });
            });
        }

        // Switch to register
        if (switchToRegister) {
            this._addEventListener(switchToRegister, 'click', () => {
                this._props.onSwitchToRegister();
            });
        }
    }

    /**
     * Handle form submission
     */
    async _handleSubmit(e) {
        e.preventDefault();

        // Validate form
        const errors = this._validate();
        if (Object.keys(errors).length > 0) {
            this.state.validationErrors = errors;
            this.update({ ...this._props });
            return;
        }

        // Call submit handler
        try {
            await this._props.onSubmit({
                username: this.state.username,
                password: this.state.password
            });
        } catch (error) {
            // Error handled by parent
        }
    }

    /**
     * Validate form inputs
     */
    _validate() {
        const errors = {};

        if (!this.state.username.trim()) {
            errors.username = 'Username is required';
        } else if (this.state.username.trim().length < 3) {
            errors.username = 'Username must be at least 3 characters';
        }

        if (!this.state.password) {
            errors.password = 'Password is required';
        } else if (this.state.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        return errors;
    }

    /**
     * Clear validation error for specific field
     */
    _clearFieldError(fieldName) {
        if (this.state.validationErrors[fieldName]) {
            delete this.state.validationErrors[fieldName];
            this.update({ ...this._props });
        }
    }

    /**
     * Clear all form data
     */
    clearForm() {
        this.state.username = '';
        this.state.password = '';
        this.state.showPassword = false;
        this.state.validationErrors = {};
        this.update({ ...this._props, error: null });
    }
}
