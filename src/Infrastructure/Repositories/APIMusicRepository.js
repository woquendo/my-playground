/**
 * API Music Repository
 * Repository that communicates with backend API for music operations
 */
export class APIMusicRepository {
    constructor({ httpClient, logger, authManager }) {
        this.httpClient = httpClient;
        this.logger = logger;
        this.authManager = authManager;
        this.baseUrl = 'http://localhost:3000/api';
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
     * Find all songs
     */
    async findAll() {
        try {
            const response = await fetch(`${this.baseUrl}/music`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const songs = await response.json();
            this.logger.debug('Loaded songs from API', { count: songs.length });
            return songs;
        } catch (error) {
            this.logger.error('Failed to fetch songs', { error: error.message });
            throw error;
        }
    }

    /**
     * Find song by ID
     */
    async findById(id) {
        try {
            const allSongs = await this.findAll();
            return allSongs.find(song => song.id === id) || null;
        } catch (error) {
            this.logger.error('Failed to fetch song', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Find songs by type (Opening/Ending)
     */
    async findByType(type) {
        try {
            const response = await fetch(`${this.baseUrl}/music?type=${encodeURIComponent(type)}`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to fetch songs by type', { type, error: error.message });
            throw error;
        }
    }

    /**
     * Find songs by playlist
     */
    async findByPlaylist(playlistId) {
        try {
            const response = await fetch(`${this.baseUrl}/music?playlist=${encodeURIComponent(playlistId)}`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to fetch songs by playlist', { playlistId, error: error.message });
            throw error;
        }
    }

    /**
     * Search songs
     */
    async search(query) {
        try {
            const response = await fetch(`${this.baseUrl}/music?search=${encodeURIComponent(query)}`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to search songs', { query, error: error.message });
            throw error;
        }
    }

    /**
     * Get favorite songs
     */
    async findFavorites() {
        try {
            const response = await fetch(`${this.baseUrl}/music?favorites=true`, {
                headers: this._getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('Failed to fetch favorites', { error: error.message });
            throw error;
        }
    }

    /**
     * Create a new song
     */
    async create(songData) {
        try {
            const response = await fetch(`${this.baseUrl}/music`, {
                method: 'POST',
                headers: this._getAuthHeaders(),
                body: JSON.stringify(songData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const song = await response.json();
            this.logger.info('Created song', { id: song.id, title: song.title });
            return song;
        } catch (error) {
            this.logger.error('Failed to create song', { error: error.message });
            throw error;
        }
    }

    /**
     * Update a song
     */
    async update(id, updates) {
        try {
            const response = await fetch(`${this.baseUrl}/music/${id}`, {
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

            const song = await response.json();
            this.logger.info('Updated song', { id, updates });
            return song;
        } catch (error) {
            this.logger.error('Failed to update song', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Delete a song
     */
    async delete(id) {
        try {
            const response = await fetch(`${this.baseUrl}/music/${id}`, {
                method: 'DELETE',
                headers: this._getAuthHeaders()
            });

            if (response.status === 404) {
                return false;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.logger.info('Deleted song', { id });
            return true;
        } catch (error) {
            this.logger.error('Failed to delete song', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Save all songs (batch operation)
     */
    async saveAll(songs) {
        // For now, update each song individually
        // TODO: Implement batch endpoint
        const promises = songs.map(song => this.update(song.id, song));
        await Promise.all(promises);
        this.logger.info('Saved all songs', { count: songs.length });
    }

    /**
     * Import playlist from URL
     */
    async importPlaylist(playlistUrl) {
        try {
            const response = await fetch(`${this.baseUrl}/music/import`, {
                method: 'POST',
                headers: this._getAuthHeaders(),
                body: JSON.stringify({ playlistUrl })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.logger.info('Imported playlist', { url: playlistUrl, count: result.count });
            return result;
        } catch (error) {
            this.logger.error('Failed to import playlist', { playlistUrl, error: error.message });
            throw error;
        }
    }
}
