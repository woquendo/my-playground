/**
 * AuthManager
 * 
 * Frontend authentication manager for handling JWT tokens and user sessions
 */

export class AuthManager {
    constructor({ eventBus, logger }) {
        this.eventBus = eventBus;
        this.logger = logger;
        this.currentUser = null;
        this.token = null;

        // Load from localStorage on init
        this._loadFromStorage();
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!(this.token && this.currentUser);
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get auth token
     */
    getToken() {
        return this.token;
    }

    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    /**
     * Check if current user has specific role
     */
    hasRole(role) {
        return this.currentUser?.role === role;
    }

    /**
     * Store authentication data
     */
    setAuth(token, user) {
        this.token = token;
        this.currentUser = user;

        // Store in localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('current_user', JSON.stringify(user));

        this.logger.info('Authentication stored', { userId: user.id, username: user.username });
        this.eventBus.emit('auth:changed', user);
    }

    /**
     * Clear authentication data
     */
    clearAuth() {
        const username = this.currentUser?.username;

        this.token = null;
        this.currentUser = null;

        // Clear from localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');

        this.logger.info('Authentication cleared', { username });
        this.eventBus.emit('auth:changed', null);
    }

    /**
     * Logout current user
     */
    logout() {
        this.clearAuth();
        this.eventBus.emit('auth:logout');
        this.eventBus.emit('toast:show', {
            message: 'You have been logged out',
            type: 'info'
        });
    }

    /**
     * Verify token is still valid (basic check - could be enhanced with API call)
     */
    async verifyToken() {
        if (!this.token) {
            return false;
        }

        try {
            // Decode JWT to check expiration (basic client-side check)
            const payload = this._decodeToken(this.token);

            if (!payload || !payload.exp) {
                return false;
            }

            // Check if token is expired
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                this.logger.warn('Token expired');
                this.clearAuth();
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error('Token verification failed', { error: error.message });
            return false;
        }
    }

    /**
     * Load authentication data from localStorage
     */
    _loadFromStorage() {
        try {
            const token = localStorage.getItem('auth_token');
            const userJson = localStorage.getItem('current_user');

            if (token && userJson) {
                this.token = token;
                this.currentUser = JSON.parse(userJson);
                this.logger.info('Authentication loaded from storage', {
                    userId: this.currentUser.id,
                    username: this.currentUser.username
                });
            }
        } catch (error) {
            this.logger.error('Failed to load authentication from storage', { error: error.message });
            this.clearAuth();
        }
    }

    /**
     * Decode JWT token (basic decode without verification)
     */
    _decodeToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }

            const payload = parts[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decoded);
        } catch (error) {
            this.logger.error('Failed to decode token', { error: error.message });
            return null;
        }
    }

    /**
     * Get user ID
     */
    getUserId() {
        return this.currentUser?.id || null;
    }

    /**
     * Get username
     */
    getUsername() {
        return this.currentUser?.username || null;
    }

    /**
     * Get user role
     */
    getUserRole() {
        return this.currentUser?.role || 'user';
    }

    /**
     * Require authentication (throw if not authenticated)
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required');
        }
    }

    /**
     * Require admin role (throw if not admin)
     */
    requireAdmin() {
        this.requireAuth();
        if (!this.isAdmin()) {
            throw new Error('Admin access required');
        }
    }
}
