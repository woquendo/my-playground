/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ValidationError, AuthenticationError } from '../../Core/Errors/ApplicationErrors.js';
import { connectionManager } from '../../Infrastructure/Database/ConnectionManager.js';
import { logger } from '../../Core/Logger.js';
import config from '../../Infrastructure/Config/index.js';

export class AuthService {
    constructor() {
        this.connectionManager = connectionManager;
        this.saltRounds = 10;
        this.jwtSecret = config.auth?.jwtSecret || 'default-secret-change-in-production';
        this.jwtExpiresIn = config.auth?.jwtExpiresIn || '7d';
    }

    /**
     * Initialize service (ensure connection)
     * @returns {Promise<void>}
     */
    async initialize() {
        if (!this.connectionManager.isConnected) {
            await this.connectionManager.initialize();
        }
    }

    /**
     * Register new user
     * @param {Object} userData - User registration data
     * @param {string} userData.username - Username (unique)
     * @param {string} userData.email - Email (unique)
     * @param {string} userData.password - Plain text password
     * @param {string} [userData.displayName] - Display name
     * @returns {Promise<Object>} Created user (without password)
     */
    async register({ username, email, password, displayName }) {
        try {
            await this.initialize();

            // Validate input
            this._validateRegistration({ username, email, password });

            // Check if username or email already exists
            const existingUser = await this._findByUsernameOrEmail(username, email);
            if (existingUser) {
                if (existingUser.username === username) {
                    throw new ValidationError('Username already exists', {
                        field: 'username'
                    });
                }
                if (existingUser.email === email) {
                    throw new ValidationError('Email already exists', {
                        field: 'email'
                    });
                }
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, this.saltRounds);

            // Insert user
            const sql = `
                INSERT INTO users (username, email, password_hash, display_name)
                VALUES (?, ?, ?, ?)
            `;

            const result = await this.connectionManager.query(sql, [
                username,
                email,
                passwordHash,
                displayName || username
            ]);

            const userId = result.insertId;

            logger.info('User registered successfully', {
                userId,
                username,
                email
            });

            // Return user without password (role defaults to 'user' from database)
            return {
                id: userId,
                username,
                email,
                displayName: displayName || username,
                role: 'user', // New users default to 'user' role
                createdAt: new Date()
            };
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }

            logger.error('Failed to register user', {
                username,
                email,
                error: error.message
            });

            throw new AuthenticationError('Registration failed', {
                cause: error
            });
        }
    }

    /**
     * Authenticate user and generate JWT token
     * @param {string} username - Username or email
     * @param {string} password - Plain text password
     * @returns {Promise<Object>} Authentication result with token and user
     */
    async login(username, password) {
        try {
            await this.initialize();

            // Validate input
            if (!username || !password) {
                throw new ValidationError('Username and password are required');
            }

            // Find user by username or email
            const user = await this._findByUsernameOrEmail(username, username);

            if (!user) {
                throw new AuthenticationError('Invalid username or password');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                logger.warn('Failed login attempt', { username });
                throw new AuthenticationError('Invalid username or password');
            }

            // Generate JWT token
            const token = this._generateToken(user);

            // Update last login
            await this._updateLastLogin(user.id);

            logger.info('User logged in successfully', {
                userId: user.id,
                username: user.username
            });

            // Return token and user data (without password)
            return {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    displayName: user.display_name,
                    avatarUrl: user.avatar_url,
                    bio: user.bio,
                    role: user.role
                }
            };
        } catch (error) {
            if (error instanceof ValidationError || error instanceof AuthenticationError) {
                throw error;
            }

            logger.error('Login failed', {
                username,
                error: error.message
            });

            throw new AuthenticationError('Login failed', {
                cause: error
            });
        }
    }

    /**
     * Verify JWT token and return user
     * @param {string} token - JWT token
     * @returns {Promise<Object>} User data
     */
    async verifyToken(token) {
        try {
            // Decode and verify token
            const decoded = jwt.verify(token, this.jwtSecret);

            // Get user from database
            const user = await this._findById(decoded.userId);

            if (!user) {
                throw new AuthenticationError('User not found');
            }

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                bio: user.bio,
                role: user.role
            };
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new AuthenticationError('Invalid token');
            }

            if (error instanceof jwt.TokenExpiredError) {
                throw new AuthenticationError('Token expired');
            }

            throw error;
        }
    }

    /**
     * Check if user has specific role
     * @param {number} userId - User ID
     * @param {string} role - Role to check ('user' or 'admin')
     * @returns {Promise<boolean>} True if user has the role
     */
    async hasRole(userId, role) {
        try {
            await this.initialize();

            const user = await this._findById(userId);

            if (!user) {
                return false;
            }

            return user.role === role;
        } catch (error) {
            logger.error('Role check failed', {
                userId,
                role,
                error: error.message
            });

            return false;
        }
    }

    /**
     * Check if user is admin
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if user is admin
     */
    async isAdmin(userId) {
        return this.hasRole(userId, 'admin');
    }

    /**
     * Require admin role or throw error
     * @param {number} userId - User ID
     * @throws {AuthenticationError} If user is not admin
     * @returns {Promise<void>}
     */
    async requireAdmin(userId) {
        const isAdmin = await this.isAdmin(userId);

        if (!isAdmin) {
            throw new AuthenticationError('Admin access required', {
                userId,
                requiredRole: 'admin'
            });
        }
    }

    /**
     * Get user role
     * @param {number} userId - User ID
     * @returns {Promise<string|null>} User role or null if not found
     */
    async getUserRole(userId) {
        try {
            await this.initialize();

            const user = await this._findById(userId);

            return user?.role || null;
        } catch (error) {
            logger.error('Get user role failed', {
                userId,
                error: error.message
            });

            return null;
        }
    }

    /**
     * Change user password
     * @param {number} userId - User ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<void>}
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            await this.initialize();

            // Validate new password
            this._validatePassword(newPassword);

            // Get user
            const user = await this._findById(userId);

            if (!user) {
                throw new AuthenticationError('User not found');
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

            if (!isPasswordValid) {
                throw new AuthenticationError('Current password is incorrect');
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

            // Update password
            const sql = `
                UPDATE users
                SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await this.connectionManager.query(sql, [newPasswordHash, userId]);

            logger.info('Password changed successfully', { userId });
        } catch (error) {
            if (error instanceof ValidationError || error instanceof AuthenticationError) {
                throw error;
            }

            logger.error('Failed to change password', {
                userId,
                error: error.message
            });

            throw new AuthenticationError('Failed to change password', {
                cause: error
            });
        }
    }

    /**
     * Update user profile
     * @param {number} userId - User ID
     * @param {Object} profileData - Profile data to update
     * @returns {Promise<Object>} Updated user
     */
    async updateProfile(userId, profileData) {
        try {
            await this.initialize();

            const { displayName, avatarUrl, bio } = profileData;

            const sql = `
                UPDATE users
                SET display_name = COALESCE(?, display_name),
                    avatar_url = COALESCE(?, avatar_url),
                    bio = COALESCE(?, bio),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await this.connectionManager.query(sql, [
                displayName,
                avatarUrl,
                bio,
                userId
            ]);

            // Get updated user
            const user = await this._findById(userId);

            logger.info('Profile updated successfully', { userId });

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                bio: user.bio
            };
        } catch (error) {
            logger.error('Failed to update profile', {
                userId,
                error: error.message
            });

            throw new AuthenticationError('Failed to update profile', {
                cause: error
            });
        }
    }

    /**
     * Find user by username or email
     * @private
     * @param {string} username - Username
     * @param {string} email - Email
     * @returns {Promise<Object|null>}
     */
    async _findByUsernameOrEmail(username, email) {
        const sql = `
            SELECT * FROM users
            WHERE username = ? OR email = ?
            LIMIT 1
        `;

        const rows = await this.connectionManager.query(sql, [username, email]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Find user by ID
     * @private
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>}
     */
    async _findById(userId) {
        const sql = `
            SELECT * FROM users
            WHERE id = ?
        `;

        const rows = await this.connectionManager.query(sql, [userId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Generate JWT token
     * @private
     * @param {Object} user - User data
     * @returns {string} JWT token
     */
    _generateToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                username: user.username,
                email: user.email
            },
            this.jwtSecret,
            {
                expiresIn: this.jwtExpiresIn
            }
        );
    }

    /**
     * Update last login timestamp
     * @private
     * @param {number} userId - User ID
     * @returns {Promise<void>}
     */
    async _updateLastLogin(userId) {
        const sql = `
            UPDATE users
            SET last_login_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await this.connectionManager.query(sql, [userId]);
    }

    /**
     * Validate registration data
     * @private
     * @param {Object} data - Registration data
     */
    _validateRegistration({ username, email, password }) {
        if (!username || username.length < 3) {
            throw new ValidationError('Username must be at least 3 characters', {
                field: 'username'
            });
        }

        if (!email || !this._isValidEmail(email)) {
            throw new ValidationError('Invalid email address', {
                field: 'email'
            });
        }

        this._validatePassword(password);
    }

    /**
     * Validate password
     * @private
     * @param {string} password - Password
     */
    _validatePassword(password) {
        if (!password || password.length < 8) {
            throw new ValidationError('Password must be at least 8 characters', {
                field: 'password'
            });
        }
    }

    /**
     * Validate email format
     * @private
     * @param {string} email - Email
     * @returns {boolean}
     */
    _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

export default AuthService;
