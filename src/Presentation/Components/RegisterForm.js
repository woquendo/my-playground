/**
 * RegisterForm Component
 * 
 * Reusable registration form with validation and password strength indicator
 */

import { BaseComponent } from '../Components/BaseComponent.js';

export class RegisterForm extends BaseComponent {
    constructor(options) {
        super({
            ...options,
            name: 'RegisterForm',
            props: {
                onSubmit: options.onSubmit || (() => { }),
                onSwitchToLogin: options.onSwitchToLogin || (() => { }),
                loading: options.loading || false,
                error: options.error || null
            }
        });

        this.state = {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            showPassword: false,
            showConfirmPassword: false,
            validationErrors: {}
        };
    }

    /**
     * Template for the registration form
     */
    _template() {
        const { loading, error } = this._props;
        const { showPassword, showConfirmPassword, validationErrors } = this.state;
        const passwordStrength = this._getPasswordStrength();

        return `
            <div class="register-form">
                ${error ? `
                    <div class="alert alert--error">
                        ${error}
                    </div>
                ` : ''}

                <form class="form" data-register-form>
                    <!-- Username Field -->
                    <div class="form-group ${validationErrors.username ? 'form-group--error' : ''}">
                        <label for="register-username" class="form-label">
                            Username
                        </label>
                        <input
                            type="text"
                            id="register-username"
                            name="username"
                            class="form-input"
                            placeholder="Choose a username"
                            value="${this.state.username}"
                            ${loading ? 'disabled' : ''}
                            required
                            autocomplete="username"
                        />
                        ${validationErrors.username ? `
                            <span class="form-error">${validationErrors.username}</span>
                        ` : ''}
                        <span class="form-hint">At least 3 characters, letters and numbers only</span>
                    </div>

                    <!-- Email Field (Optional) -->
                    <div class="form-group ${validationErrors.email ? 'form-group--error' : ''}">
                        <label for="register-email" class="form-label">
                            Email <span class="form-label-optional">(optional)</span>
                        </label>
                        <input
                            type="email"
                            id="register-email"
                            name="email"
                            class="form-input"
                            placeholder="your.email@example.com"
                            value="${this.state.email}"
                            ${loading ? 'disabled' : ''}
                            autocomplete="email"
                        />
                        ${validationErrors.email ? `
                            <span class="form-error">${validationErrors.email}</span>
                        ` : ''}
                    </div>

                    <!-- Password Field -->
                    <div class="form-group ${validationErrors.password ? 'form-group--error' : ''}">
                        <label for="register-password" class="form-label form-label--required">
                            Password
                        </label>
                        <div class="password-wrapper">
                            <input
                                type="${showPassword ? 'text' : 'password'}"
                                id="register-password"
                                name="password"
                                class="form-input"
                                placeholder="Create a password"
                                value="${this.state.password}"
                                ${loading ? 'disabled' : ''}
                                required
                                autocomplete="new-password"
                            />
                            <button
                                type="button"
                                class="password-toggle"
                                data-toggle-password
                                aria-label="Toggle password visibility"
                            >
                                ${showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        ${validationErrors.password ? `
                            <span class="form-error">${validationErrors.password}</span>
                        ` : ''}
                        
                        <!-- Password Strength Indicator -->
                        ${this.state.password ? `
                            <div class="password-strength">
                                <div class="password-strength__label">
                                    <span>Password Strength</span>
                                    <span class="password-strength__value password-strength__value--${passwordStrength.level}">
                                        ${passwordStrength.label}
                                    </span>
                                </div>
                                <div class="password-strength__bar">
                                    <div 
                                        class="password-strength__fill password-strength__fill--${passwordStrength.level}"
                                        style="width: ${passwordStrength.percentage}%"
                                    ></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Confirm Password Field -->
                    <div class="form-group ${validationErrors.confirmPassword ? 'form-group--error' : ''}">
                        <label for="register-confirm-password" class="form-label form-label--required">
                            Confirm Password
                        </label>
                        <div class="password-wrapper">
                            <input
                                type="${showConfirmPassword ? 'text' : 'password'}"
                                id="register-confirm-password"
                                name="confirmPassword"
                                class="form-input"
                                placeholder="Confirm your password"
                                value="${this.state.confirmPassword}"
                                ${loading ? 'disabled' : ''}
                                required
                                autocomplete="new-password"
                            />
                            <button
                                type="button"
                                class="password-toggle"
                                data-toggle-confirm-password
                                aria-label="Toggle confirm password visibility"
                            >
                                ${showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        ${validationErrors.confirmPassword ? `
                            <span class="form-error">${validationErrors.confirmPassword}</span>
                        ` : ''}
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        class="btn btn--primary btn--block ${loading ? 'btn--loading' : ''}"
                        ${loading ? 'disabled' : ''}
                    >
                        ${loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <!-- Switch to Login -->
                    <div class="form-footer">
                        <span class="form-switch-text">Already have an account?</span>
                        <a href="#" class="form-switch-link" data-switch-to-login>
                            Sign in
                        </a>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Initialize event listeners
     */
    _initialize() {
        const form = this._element.querySelector('[data-register-form]');
        const togglePassword = this._element.querySelector('[data-toggle-password]');
        const toggleConfirmPassword = this._element.querySelector('[data-toggle-confirm-password]');
        const switchToLogin = this._element.querySelector('[data-switch-to-login]');

        // Form submission
        this._addEventListener(form, 'submit', this._handleSubmit.bind(this));

        // Input changes
        const usernameInput = this._element.querySelector('#register-username');
        const emailInput = this._element.querySelector('#register-email');
        const passwordInput = this._element.querySelector('#register-password');
        const confirmPasswordInput = this._element.querySelector('#register-confirm-password');

        this._addEventListener(usernameInput, 'input', (e) => {
            this.state.username = e.target.value;
            this._clearFieldError('username');
        });

        this._addEventListener(emailInput, 'input', (e) => {
            this.state.email = e.target.value;
            this._clearFieldError('email');
        });

        this._addEventListener(passwordInput, 'input', (e) => {
            this.state.password = e.target.value;
            this._clearFieldError('password');
            // Update password strength indicator without full re-render to preserve focus
            this._updatePasswordStrengthIndicator();
        });

        this._addEventListener(confirmPasswordInput, 'input', (e) => {
            this.state.confirmPassword = e.target.value;
            this._clearFieldError('confirmPassword');
        });

        // Toggle password visibility
        if (togglePassword) {
            this._addEventListener(togglePassword, 'click', () => {
                this.state.showPassword = !this.state.showPassword;
                this.update({ ...this._props });
            });
        }

        if (toggleConfirmPassword) {
            this._addEventListener(toggleConfirmPassword, 'click', () => {
                this.state.showConfirmPassword = !this.state.showConfirmPassword;
                this.update({ ...this._props });
            });
        }

        // Switch to login
        if (switchToLogin) {
            this._addEventListener(switchToLogin, 'click', (e) => {
                e.preventDefault();
                this._props.onSwitchToLogin();
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
            const emailValue = this.state.email.trim();
            await this._props.onSubmit({
                username: this.state.username,
                email: emailValue || undefined,  // Optional - only include if not empty
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

        // Username validation
        if (!this.state.username.trim()) {
            errors.username = 'Username is required';
        } else if (this.state.username.trim().length < 3) {
            errors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(this.state.username)) {
            errors.username = 'Username can only contain letters, numbers, and underscores';
        }

        // Email validation (optional but must be valid if provided)
        const emailValue = this.state.email.trim();
        if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            errors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!this.state.password) {
            errors.password = 'Password is required';
        } else if (this.state.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        } else if (!/[A-Z]/.test(this.state.password)) {
            errors.password = 'Password must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(this.state.password)) {
            errors.password = 'Password must contain at least one lowercase letter';
        } else if (!/[0-9]/.test(this.state.password)) {
            errors.password = 'Password must contain at least one number';
        }

        // Confirm password validation
        if (!this.state.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (this.state.password !== this.state.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        return errors;
    }

    /**
     * Calculate password strength
     */
    _getPasswordStrength() {
        const password = this.state.password;
        let strength = 0;

        if (!password) {
            return { level: 'weak', label: '', percentage: 0 };
        }

        // Length
        if (password.length >= 8) strength += 20;
        if (password.length >= 12) strength += 10;

        // Complexity
        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 25;  // Special chars

        // Determine level
        let level, label;
        if (strength < 40) {
            level = 'weak';
            label = 'Weak';
        } else if (strength < 60) {
            level = 'fair';
            label = 'Fair';
        } else if (strength < 80) {
            level = 'good';
            label = 'Good';
        } else {
            level = 'strong';
            label = 'Strong';
        }

        return { level, label, percentage: Math.min(strength, 100) };
    }

    /**
     * Update password strength indicator without full re-render
     * This prevents focus loss on the password input
     * @private
     */
    _updatePasswordStrengthIndicator() {
        if (!this._element) return;

        const strengthContainer = this._element.querySelector('.password-strength');
        const passwordGroup = this._element.querySelector('#register-password').closest('.form-group');

        if (!this.state.password) {
            // Remove strength indicator if password is empty
            if (strengthContainer) {
                strengthContainer.remove();
            }
            return;
        }

        const passwordStrength = this._getPasswordStrength();

        // If strength indicator doesn't exist, create it
        if (!strengthContainer) {
            const strengthHTML = `
                <div class="password-strength">
                    <div class="password-strength__label">
                        <span>Password Strength</span>
                        <span class="password-strength__value password-strength__value--${passwordStrength.level}">
                            ${passwordStrength.label}
                        </span>
                    </div>
                    <div class="password-strength__bar">
                        <div 
                            class="password-strength__fill password-strength__fill--${passwordStrength.level}"
                            style="width: ${passwordStrength.percentage}%"
                        ></div>
                    </div>
                </div>
            `;

            const errorSpan = passwordGroup.querySelector('.form-error');
            const passwordWrapper = passwordGroup.querySelector('.password-wrapper');

            if (errorSpan) {
                errorSpan.insertAdjacentHTML('beforebegin', strengthHTML);
            } else if (passwordWrapper) {
                passwordWrapper.insertAdjacentHTML('afterend', strengthHTML);
            }
        } else {
            // Update existing strength indicator
            const valueSpan = strengthContainer.querySelector('.password-strength__value');
            const fillBar = strengthContainer.querySelector('.password-strength__fill');

            if (valueSpan) {
                valueSpan.className = `password-strength__value password-strength__value--${passwordStrength.level}`;
                valueSpan.textContent = passwordStrength.label;
            }

            if (fillBar) {
                fillBar.className = `password-strength__fill password-strength__fill--${passwordStrength.level}`;
                fillBar.style.width = `${passwordStrength.percentage}%`;
            }
        }
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
        this.state.email = '';
        this.state.password = '';
        this.state.confirmPassword = '';
        this.state.showPassword = false;
        this.state.showConfirmPassword = false;
        this.state.validationErrors = {};
        this.update({ ...this._props, error: null });
    }
}
