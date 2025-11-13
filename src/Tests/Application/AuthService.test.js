/**
 * @jest-environment node
 */

/**
 * AuthService Tests
 * 
 * Tests for JWT authentication and role-based access control
 */

import { AuthService } from '../../Application/Services/AuthService.js';
import { Logger } from '../../Core/Logger.js';

// Mock database connection
const createMockConnection = () => ({
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
});

// Mock connection manager
const createMockConnectionManager = (mockConnection) => ({
    initialize: jest.fn(),
    query: jest.fn(),
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    executeInTransaction: jest.fn(async (callback) => {
        const conn = mockConnection;
        await conn.beginTransaction();
        try {
            const result = await callback(conn);
            await conn.commit();
            return result;
        } catch (error) {
            await conn.rollback();
            throw error;
        }
    })
});

describe('AuthService', () => {
    let authService;
    let mockConnection;
    let mockConnectionManager;
    let mockLogger;

    beforeEach(() => {
        mockConnection = createMockConnection();
        mockConnectionManager = createMockConnectionManager(mockConnection);
        mockLogger = new Logger({ level: 'silent' });

        authService = new AuthService({
            connectionManager: mockConnectionManager,
            logger: mockLogger
        });
    });

    describe('User Registration', () => {
        test('should register a new user with hashed password', async () => {
            const userData = {
                username: 'testuser',
                password: 'SecurePass123!',
                email: 'test@example.com'
            };

            // Mock: Check if user exists (no)
            mockConnection.query
                .mockResolvedValueOnce([[]])  // User doesn't exist
                .mockResolvedValueOnce([{ insertId: 1 }]);  // Insert successful

            const result = await authService.register(userData);

            expect(result.success).toBe(true);
            expect(result.user).toMatchObject({
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user'
            });
            expect(result.token).toBeDefined();
            expect(result.user.password_hash).toBeUndefined(); // Password should not be returned
        });

        test('should hash password with bcrypt', async () => {
            const userData = {
                username: 'testuser',
                password: 'SecurePass123!'
            };

            mockConnection.query
                .mockResolvedValueOnce([[]])  // User doesn't exist
                .mockResolvedValueOnce([{ insertId: 1 }]);  // Insert successful

            await authService.register(userData);

            // Check that password was hashed (bcrypt hash is 60 chars)
            const insertCall = mockConnection.query.mock.calls.find(
                call => call[0].includes('INSERT INTO users')
            );
            expect(insertCall).toBeDefined();
            const passwordHash = insertCall[1][1]; // Second parameter
            expect(passwordHash).toHaveLength(60);
            expect(passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt format
        });

        test('should reject duplicate username', async () => {
            const userData = {
                username: 'existinguser',
                password: 'SecurePass123!'
            };

            // Mock: User already exists
            mockConnection.query.mockResolvedValueOnce([[{ id: 1 }]]);

            await expect(authService.register(userData)).rejects.toThrow('Username already exists');
        });

        test('should validate required fields', async () => {
            await expect(authService.register({ username: 'test' }))
                .rejects.toThrow('Username and password are required');

            await expect(authService.register({ password: 'pass' }))
                .rejects.toThrow('Username and password are required');
        });

        test('should default role to user', async () => {
            const userData = {
                username: 'testuser',
                password: 'SecurePass123!'
            };

            mockConnection.query
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            const result = await authService.register(userData);

            expect(result.user.role).toBe('user');
        });
    });

    describe('User Login', () => {
        test('should login with correct credentials', async () => {
            const username = 'testuser';
            const password = 'SecurePass123!';

            // Create a real bcrypt hash for testing
            const bcrypt = (await import('bcrypt')).default;
            const passwordHash = await bcrypt.hash(password, 10);

            // Mock: User exists with hashed password
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                username: 'testuser',
                password_hash: passwordHash,
                email: 'test@example.com',
                role: 'user',
                created_at: new Date()
            }]]);

            const result = await authService.login(username, password);

            expect(result.success).toBe(true);
            expect(result.user.username).toBe('testuser');
            expect(result.token).toBeDefined();
            expect(result.user.password_hash).toBeUndefined();
        });

        test('should reject incorrect password', async () => {
            const bcrypt = (await import('bcrypt')).default;
            const passwordHash = await bcrypt.hash('CorrectPass123!', 10);

            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                username: 'testuser',
                password_hash: passwordHash
            }]]);

            await expect(authService.login('testuser', 'WrongPassword'))
                .rejects.toThrow('Invalid credentials');
        });

        test('should reject non-existent user', async () => {
            mockConnection.query.mockResolvedValueOnce([[]]);

            await expect(authService.login('nonexistent', 'password'))
                .rejects.toThrow('Invalid credentials');
        });

        test('should return user with role', async () => {
            const bcrypt = (await import('bcrypt')).default;
            const passwordHash = await bcrypt.hash('AdminPass123!', 10);

            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                username: 'admin',
                password_hash: passwordHash,
                role: 'admin',
                created_at: new Date()
            }]]);

            const result = await authService.login('admin', 'AdminPass123!');

            expect(result.user.role).toBe('admin');
        });
    });

    describe('JWT Token Generation', () => {
        test('should generate valid JWT token', async () => {
            const userData = {
                username: 'testuser',
                password: 'SecurePass123!'
            };

            mockConnection.query
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            const result = await authService.register(userData);

            expect(result.token).toBeDefined();
            expect(typeof result.token).toBe('string');
            expect(result.token.split('.')).toHaveLength(3); // JWT format
        });

        test('should include user data in token', async () => {
            const jwt = (await import('jsonwebtoken')).default;

            const userData = {
                username: 'testuser',
                password: 'SecurePass123!'
            };

            mockConnection.query
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 1 }]);

            const result = await authService.register(userData);

            // Decode token (don't verify for this test)
            const decoded = jwt.decode(result.token);

            expect(decoded.userId).toBe(1);
            expect(decoded.username).toBe('testuser');
            expect(decoded.role).toBe('user');
        });
    });

    describe('Token Verification', () => {
        test('should verify valid token', async () => {
            const jwt = (await import('jsonwebtoken')).default;
            const token = jwt.sign(
                { userId: 1, username: 'testuser', role: 'user' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '7d' }
            );

            const result = await authService.verifyToken(token);

            expect(result.valid).toBe(true);
            expect(result.payload.userId).toBe(1);
            expect(result.payload.username).toBe('testuser');
        });

        test('should reject invalid token', async () => {
            const result = await authService.verifyToken('invalid.token.here');

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should reject expired token', async () => {
            const jwt = (await import('jsonwebtoken')).default;
            const token = jwt.sign(
                { userId: 1, username: 'testuser' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '-1h' } // Expired 1 hour ago
            );

            const result = await authService.verifyToken(token);

            expect(result.valid).toBe(false);
            expect(result.error).toContain('expired');
        });
    });

    describe('Role-Based Access Control', () => {
        test('should check if user has specific role', async () => {
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                role: 'admin'
            }]]);

            const result = await authService.hasRole(1, 'admin');

            expect(result).toBe(true);
        });

        test('should return false for wrong role', async () => {
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                role: 'user'
            }]]);

            const result = await authService.hasRole(1, 'admin');

            expect(result).toBe(false);
        });

        test('should check if user is admin', async () => {
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                role: 'admin'
            }]]);

            const result = await authService.isAdmin(1);

            expect(result).toBe(true);
        });

        test('should return false for non-admin', async () => {
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                role: 'user'
            }]]);

            const result = await authService.isAdmin(1);

            expect(result).toBe(false);
        });

        test('should require admin or throw', async () => {
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                role: 'user'
            }]]);

            await expect(authService.requireAdmin(1))
                .rejects.toThrow('Admin access required');
        });

        test('should allow admin to pass requireAdmin', async () => {
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                role: 'admin'
            }]]);

            await expect(authService.requireAdmin(1)).resolves.not.toThrow();
        });

        test('should get user role', async () => {
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                role: 'admin'
            }]]);

            const role = await authService.getUserRole(1);

            expect(role).toBe('admin');
        });
    });

    describe('Password Change', () => {
        test('should change password with correct old password', async () => {
            const bcrypt = (await import('bcrypt')).default;
            const oldPasswordHash = await bcrypt.hash('OldPass123!', 10);

            mockConnection.query
                .mockResolvedValueOnce([[{
                    id: 1,
                    password_hash: oldPasswordHash
                }]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            const result = await authService.changePassword(
                1,
                'OldPass123!',
                'NewPass123!'
            );

            expect(result.success).toBe(true);
        });

        test('should reject incorrect old password', async () => {
            const bcrypt = (await import('bcrypt')).default;
            const oldPasswordHash = await bcrypt.hash('OldPass123!', 10);

            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                password_hash: oldPasswordHash
            }]]);

            await expect(authService.changePassword(1, 'WrongOld', 'NewPass123!'))
                .rejects.toThrow('Current password is incorrect');
        });

        test('should hash new password', async () => {
            const bcrypt = (await import('bcrypt')).default;
            const oldPasswordHash = await bcrypt.hash('OldPass123!', 10);

            mockConnection.query
                .mockResolvedValueOnce([[{
                    id: 1,
                    password_hash: oldPasswordHash
                }]])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            await authService.changePassword(1, 'OldPass123!', 'NewPass123!');

            const updateCall = mockConnection.query.mock.calls.find(
                call => call[0].includes('UPDATE users')
            );
            expect(updateCall).toBeDefined();
            const newPasswordHash = updateCall[1][0];
            expect(newPasswordHash).toHaveLength(60);
            expect(newPasswordHash).toMatch(/^\$2[aby]\$/);
        });
    });

    describe('User Profile', () => {
        test('should get user profile without password', async () => {
            mockConnection.query.mockResolvedValueOnce([[{
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                created_at: new Date()
            }]]);

            const profile = await authService.getUserProfile(1);

            expect(profile.username).toBe('testuser');
            expect(profile.email).toBe('test@example.com');
            expect(profile.password_hash).toBeUndefined();
        });

        test('should update user profile', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const result = await authService.updateUserProfile(1, {
                email: 'newemail@example.com'
            });

            expect(result.success).toBe(true);
        });

        test('should not allow password update via profile', async () => {
            mockConnection.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

            await authService.updateUserProfile(1, {
                password: 'should-not-work'
            });

            // Verify password field wasn't included
            const updateCall = mockConnection.query.mock.calls[0];
            expect(updateCall[0]).not.toContain('password');
        });
    });

    describe('Error Handling', () => {
        test('should handle database errors gracefully', async () => {
            mockConnection.query.mockRejectedValueOnce(new Error('Database connection failed'));

            await expect(authService.login('testuser', 'password'))
                .rejects.toThrow('Database connection failed');
        });

        test('should handle transaction rollback on error', async () => {
            mockConnection.query
                .mockResolvedValueOnce([[]])  // User doesn't exist
                .mockRejectedValueOnce(new Error('Insert failed'));

            await expect(authService.register({
                username: 'testuser',
                password: 'SecurePass123!'
            })).rejects.toThrow();

            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });
});
