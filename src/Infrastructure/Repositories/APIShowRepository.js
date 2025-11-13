/**
 * API Show Repository
 * Repository that communicates with backend API for show operations
 */
export class APIShowRepository {
    constructor({ httpClient, logger, authManager, config }) {
        this.httpClient = httpClient;
        this.logger = logger;
        this.authManager = authManager;
        this.baseUrl = config.api.baseUrl;
    }

    /**
     * Get auth headers with JWT token
     */
    _getAuthHeaders() {
        const token = this.authManager.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Find all shows
     */
    async findAll() {
        try {
            const response = await fetch(`${this.baseUrl}/shows`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const shows = await response.json();
            this.logger.debug('Loaded shows from API', { count: shows.length });
            return shows;
        } catch (error) {
            this.logger.error('Failed to fetch shows', { error: error.message });
            throw error;
        }
    }

    /**
     * Find show by ID
     */
    async findById(id) {
        try {
            const response = await fetch(`${this.baseUrl}/shows/${id}`, {
                headers: this._getAuthHeaders()
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to fetch show', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Find shows by status
     */
    async findByStatus(status) {
        try {
            const response = await fetch(`${this.baseUrl}/shows?status=${encodeURIComponent(status)}`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to fetch shows by status', { status, error: error.message });
            throw error;
        }
    }

    /**
     * Find shows by day
     */
    async findByDay(day) {
        try {
            const response = await fetch(`${this.baseUrl}/shows?day=${encodeURIComponent(day)}`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to fetch shows by day', { day, error: error.message });
            throw error;
        }
    }

    /**
     * Search shows
     */
    async search(query) {
        try {
            const response = await fetch(`${this.baseUrl}/shows?search=${encodeURIComponent(query)}`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to search shows', { query, error: error.message });
            throw error;
        }
    }

    /**
     * Create a new show
     */
    async create(showData) {
        try {
            const response = await fetch(`${this.baseUrl}/shows`, {
                method: 'POST',
                headers: this._getAuthHeaders(),
                body: JSON.stringify(showData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const show = await response.json();
            this.logger.info('Created show', { id: show.id, title: show.title });
            return show;
        } catch (error) {
            this.logger.error('Failed to create show', { error: error.message });
            throw error;
        }
    }

    /**
     * Update a show
     */
    async update(id, updates) {
        try {
            const response = await fetch(`${this.baseUrl}/shows/${id}`, {
                method: 'PUT',
                headers: this._getAuthHeaders(),
                body: JSON.stringify(updates)
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const show = await response.json();
            this.logger.info('Updated show', { id, updates });
            return show;
        } catch (error) {
            this.logger.error('Failed to update show', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Delete a show
     */
    async delete(id) {
        try {
            const response = await fetch(`${this.baseUrl}/shows/${id}`, {
                method: 'DELETE',
                headers: this._getAuthHeaders()
            });

            if (response.status === 404) {
                return false;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.logger.info('Deleted show', { id });
            return true;
        } catch (error) {
            this.logger.error('Failed to delete show', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Save all shows (batch operation)
     */
    async saveAll(shows) {
        // For now, update each show individually
        // TODO: Implement batch endpoint
        const promises = shows.map(show => this.update(show.id, show));
        await Promise.all(promises);
        this.logger.info('Saved all shows', { count: shows.length });
    }
}
