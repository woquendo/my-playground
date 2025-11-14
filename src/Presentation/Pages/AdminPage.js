/**
 * AdminPage
 * 
 * Admin-only dashboard for managing users and system settings
 */

export class AdminPage {
    constructor({ container, eventBus, logger }) {
        this.container = container;
        this.eventBus = eventBus;
        this.logger = logger;
        this.authManager = container.get('authManager');
        this.authService = container.get('authService');

        this.stats = {
            users: 0,
            shows: 0,
            songs: 0,
            migrations: []
        };

        this.users = [];
        this.loading = true;
    }

    /**
     * Render the admin dashboard
     */
    async render() {
        // Verify admin access
        if (!this.authManager.isAdmin()) {
            this.logger.warn('Non-admin attempted to access admin dashboard');
            this.eventBus.emit('toast:show', {
                message: 'Access denied. Admin privileges required.',
                type: 'error'
            });
            if (this.container && this.container.has('router')) {
                const router = this.container.get('router');
                router.navigate('/schedule');
            } else {
                window.location.href = '/schedule';
            }
            return document.createElement('div');
        }

        this.logger.info('Rendering AdminPage');

        const page = document.createElement('div');
        page.className = 'page page--admin';

        // Initial render with loading state
        page.innerHTML = this._template();

        // Load data
        await this._loadDashboardData();

        // Re-render with data
        page.innerHTML = this._template();
        this._attachEventListeners(page);

        return page;
    }

    /**
     * Template for admin dashboard
     */
    _template() {
        if (this.loading) {
            return `
                <div class="page__header">
                    <h2 class="page__title">🔐 Admin Dashboard</h2>
                </div>
                <div class="page__content">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Loading dashboard...</p>
                    </div>
                </div>
            `;
        }

        const currentUser = this.authManager.getCurrentUser();

        return `
            <div class="page__header">
                <h2 class="page__title">🔐 Admin Dashboard</h2>
                <p class="page__subtitle">
                    Welcome, <strong>${currentUser.username}</strong> (Administrator)
                </p>
            </div>

            <div class="page__content">
                <!-- System Statistics -->
                <section class="admin-section">
                    <h3 class="admin-section__title">📊 System Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-card__icon">👥</div>
                            <div class="stat-card__value">${this.stats.users}</div>
                            <div class="stat-card__label">Total Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card__icon">📺</div>
                            <div class="stat-card__value">${this.stats.shows}</div>
                            <div class="stat-card__label">Total Shows</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card__icon">🎵</div>
                            <div class="stat-card__value">${this.stats.songs}</div>
                            <div class="stat-card__label">Total Songs</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card__icon">🗄️</div>
                            <div class="stat-card__value">${this.stats.migrations.length}</div>
                            <div class="stat-card__label">Migrations Applied</div>
                        </div>
                    </div>
                </section>

                <!-- User Management -->
                <section class="admin-section">
                    <h3 class="admin-section__title">👥 User Management</h3>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.users.map(user => `
                                    <tr>
                                        <td>${user.id}</td>
                                        <td>
                                            <strong>${user.username}</strong>
                                            ${user.id === currentUser.id ? '<span class="badge badge--primary">You</span>' : ''}
                                        </td>
                                        <td>${user.email || '<em>No email</em>'}</td>
                                        <td>
                                            <span class="badge badge--${user.role === 'admin' ? 'danger' : 'default'}">
                                                ${user.role === 'admin' ? '👑 ' : ''}${user.role}
                                            </span>
                                        </td>
                                        <td>${this._formatDate(user.created_at)}</td>
                                        <td>
                                            ${user.id !== currentUser.id ? `
                                                <button 
                                                    class="btn btn--sm btn--outline"
                                                    data-toggle-role="${user.id}"
                                                    data-current-role="${user.role}"
                                                >
                                                    ${user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                                                </button>
                                            ` : '<em>Current user</em>'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- Database Migrations -->
                <section class="admin-section">
                    <h3 class="admin-section__title">🗄️ Database Migrations</h3>
                    <div class="migration-list">
                        ${this.stats.migrations.length > 0 ? this.stats.migrations.map(migration => `
                            <div class="migration-item">
                                <div class="migration-item__status">✓</div>
                                <div class="migration-item__details">
                                    <div class="migration-item__name">${migration.name}</div>
                                    <div class="migration-item__meta">
                                        Version: ${migration.version} | 
                                        Executed: ${this._formatDate(migration.executed_at)} | 
                                        Batch: ${migration.batch}
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<p class="empty-state">No migrations found</p>'}
                    </div>
                </section>

                <!-- System Actions -->
                <section class="admin-section">
                    <h3 class="admin-section__title">⚙️ System Actions</h3>
                    <div class="action-grid">
                        <button class="btn btn--outline" data-action="clear-cache">
                            🗑️ Clear Cache
                        </button>
                        <button class="btn btn--outline" data-action="export-data">
                            📥 Export All Data
                        </button>
                        <button class="btn btn--outline" data-action="view-logs">
                            📋 View Logs
                        </button>
                        <button class="btn btn--outline btn--danger" data-action="logout">
                            🚪 Logout
                        </button>
                    </div>
                </section>
            </div>
        `;
    }

    /**
     * Load dashboard data
     */
    async _loadDashboardData() {
        try {
            this.loading = true;

            // Get stats from database
            const connectionManager = this.container.get('connectionManager');

            // Count users
            const [usersCount] = await connectionManager.query(
                'SELECT COUNT(*) as count FROM users'
            );
            this.stats.users = usersCount[0].count;

            // Count shows (unique, not user-specific)
            const [showsCount] = await connectionManager.query(
                'SELECT COUNT(*) as count FROM shows'
            );
            this.stats.shows = showsCount[0].count;

            // Count songs (unique, not user-specific)
            const [songsCount] = await connectionManager.query(
                'SELECT COUNT(*) as count FROM songs'
            );
            this.stats.songs = songsCount[0].count;

            // Get migration history
            const [migrations] = await connectionManager.query(
                'SELECT * FROM schema_migrations ORDER BY executed_at DESC'
            );
            this.stats.migrations = migrations;

            // Get all users
            const [users] = await connectionManager.query(
                'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
            );
            this.users = users;

            this.loading = false;
            this.logger.info('Dashboard data loaded', this.stats);
        } catch (error) {
            this.logger.error('Failed to load dashboard data', { error: error.message });
            this.eventBus.emit('toast:show', {
                message: 'Failed to load dashboard data',
                type: 'error'
            });
            this.loading = false;
        }
    }

    /**
     * Attach event listeners
     */
    _attachEventListeners(page) {
        // Toggle user role
        const toggleRoleButtons = page.querySelectorAll('[data-toggle-role]');
        toggleRoleButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = parseInt(e.target.dataset.toggleRole);
                const currentRole = e.target.dataset.currentRole;
                const newRole = currentRole === 'admin' ? 'user' : 'admin';

                await this._toggleUserRole(userId, newRole);
            });
        });

        // System actions
        const actionButtons = page.querySelectorAll('[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const action = e.target.dataset.action;
                await this._handleAction(action);
            });
        });
    }

    /**
     * Toggle user role
     */
    async _toggleUserRole(userId, newRole) {
        try {
            this.logger.info('Toggling user role', { userId, newRole });

            const connectionManager = this.container.get('connectionManager');
            await connectionManager.query(
                'UPDATE users SET role = ? WHERE id = ?',
                [newRole, userId]
            );

            this.eventBus.emit('toast:show', {
                message: `User role updated to ${newRole}`,
                type: 'success'
            });

            // Reload data
            await this._loadDashboardData();

            // Re-render
            const page = document.querySelector('.page--admin');
            if (page) {
                page.innerHTML = this._template();
                this._attachEventListeners(page);
            }
        } catch (error) {
            this.logger.error('Failed to toggle user role', { error: error.message });
            this.eventBus.emit('toast:show', {
                message: 'Failed to update user role',
                type: 'error'
            });
        }
    }

    /**
     * Handle system actions
     */
    async _handleAction(action) {
        switch (action) {
            case 'clear-cache':
                const cache = this.container.get('cache');
                cache.clear();
                this.eventBus.emit('toast:show', {
                    message: 'Cache cleared successfully',
                    type: 'success'
                });
                break;

            case 'export-data':
                this.eventBus.emit('toast:show', {
                    message: 'Export feature coming soon',
                    type: 'info'
                });
                break;

            case 'view-logs':
                this.eventBus.emit('toast:show', {
                    message: 'Log viewer coming soon',
                    type: 'info'
                });
                break;

            case 'logout':
                this.authManager.logout();
                if (this.container && this.container.has('router')) {
                    const router = this.container.get('router');
                    router.navigate('/auth');
                } else {
                    window.location.href = '/auth';
                }
                break;
        }
    }

    /**
     * Format date for display
     */
    _formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Cleanup
     */
    async destroy() {
        this.logger.info('AdminPage destroyed');
    }
}
