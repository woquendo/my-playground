/**
 * Music Management Service
 * Handles business logic for music track management, playlists, and ratings.
 */
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';
import { Music } from '../../Domain/Models/Music.js';

export class MusicManagementService {
    /**
     * Create a MusicManagementService
     * @param {object} dependencies - Service dependencies
     * @param {object} dependencies.musicRepository - Music repository implementation
     * @param {EventBus} dependencies.eventBus - Event bus for service events
     * @param {Logger} dependencies.logger - Logger instance
     */
    constructor({ musicRepository, eventBus = null, logger = null }) {
        if (!musicRepository) {
            throw new ValidationError('Music repository is required', {
                context: { service: 'MusicManagementService' }
            });
        }

        this.repository = musicRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }

    /**
     * Create a new track
     * @param {object} trackData - Track data
     * @returns {Promise<Music>} Created track
     */
    async createTrack(trackData) {
        try {
            this.logger?.debug('Creating new track', trackData);

            // Validate required fields
            this._validateTrackData(trackData);

            // Create Music domain object
            const track = new Music(trackData);

            // Save to repository
            const savedTrack = await this.repository.save(track);

            // Emit event
            this.eventBus?.emit('music:created', { track: savedTrack });
            this.logger?.info(`Track created: ${savedTrack.getId()}`);

            return savedTrack;
        } catch (error) {
            this.logger?.error('Failed to create track', error);
            throw error;
        }
    }

    /**
     * Update an existing track
     * @param {string} id - Track ID
     * @param {object} updates - Fields to update
     * @returns {Promise<Music>} Updated track
     */
    async updateTrack(id, updates) {
        try {
            this.logger?.debug(`Updating track: ${id}`, updates);

            // Fetch existing track
            const existingTrack = await this.repository.getById(id);
            if (!existingTrack) {
                throw new ValidationError(`Track not found: ${id}`, {
                    context: { id, operation: 'update' }
                });
            }

            // Create updated track with merged data
            const updatedData = {
                id: existingTrack.getId(),
                title: updates.title ?? existingTrack.getTitle(),
                artist: updates.artist ?? existingTrack.getArtist(),
                album: updates.album ?? existingTrack.getAlbum(),
                genre: updates.genre ?? existingTrack.getGenre(),
                duration: updates.duration ?? existingTrack.getDuration(),
                rating: updates.rating ?? existingTrack.getRating(),
                playCount: updates.playCount ?? existingTrack.getPlayCount(),
                lastPlayed: updates.lastPlayed ?? existingTrack.getLastPlayed(),
                addedDate: updates.addedDate ?? existingTrack.getAddedDate(),
                tags: updates.tags ?? existingTrack.getTags()
            };

            const updatedTrack = new Music(updatedData);
            const savedTrack = await this.repository.save(updatedTrack);

            // Emit event
            this.eventBus?.emit('music:updated', { track: savedTrack, updates });
            this.logger?.info(`Track updated: ${id}`);

            return savedTrack;
        } catch (error) {
            this.logger?.error(`Failed to update track: ${id}`, error);
            throw error;
        }
    }

    /**
     * Delete a track
     * @param {string} id - Track ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteTrack(id) {
        try {
            this.logger?.debug(`Deleting track: ${id}`);

            // Verify track exists
            const track = await this.repository.getById(id);
            if (!track) {
                throw new ValidationError(`Track not found: ${id}`, {
                    context: { id, operation: 'delete' }
                });
            }

            // Delete from repository
            const result = await this.repository.delete(id);

            // Emit event
            this.eventBus?.emit('music:deleted', { id, track });
            this.logger?.info(`Track deleted: ${id}`);

            return result;
        } catch (error) {
            this.logger?.error(`Failed to delete track: ${id}`, error);
            throw error;
        }
    }

    /**
     * Increment play count for a track
     * @param {string} id - Track ID
     * @returns {Promise<Music>} Updated track
     */
    async playTrack(id) {
        try {
            this.logger?.debug(`Playing track: ${id}`);

            const updatedTrack = await this.repository.incrementPlayCount(id);

            this.eventBus?.emit('music:played', {
                track: updatedTrack,
                playCount: updatedTrack.getPlayCount()
            });

            return updatedTrack;
        } catch (error) {
            this.logger?.error(`Failed to play track: ${id}`, error);
            throw error;
        }
    }

    /**
     * Update track rating
     * @param {string} id - Track ID
     * @param {number} rating - New rating (0-5)
     * @returns {Promise<Music>} Updated track
     */
    async rateTrack(id, rating) {
        try {
            this.logger?.debug(`Rating track: ${id}`, { rating });

            // Validate rating
            if (typeof rating !== 'number' || rating < 0 || rating > 5) {
                throw new ValidationError('Rating must be a number between 0 and 5', {
                    context: { id, rating }
                });
            }

            const track = await this.repository.getById(id);
            if (!track) {
                throw new ValidationError(`Track not found: ${id}`, {
                    context: { id, operation: 'rate' }
                });
            }

            const oldRating = track.getRating();
            const updatedTrack = await this.updateTrack(id, { rating });

            this.eventBus?.emit('music:rated', {
                track: updatedTrack,
                oldRating,
                newRating: rating
            });

            return updatedTrack;
        } catch (error) {
            this.logger?.error(`Failed to rate track: ${id}`, error);
            throw error;
        }
    }

    /**
     * Get all tracks
     * @returns {Promise<Music[]>} All tracks
     */
    async getAllTracks() {
        try {
            return await this.repository.getAll();
        } catch (error) {
            this.logger?.error('Failed to get all tracks', error);
            throw error;
        }
    }

    /**
     * Get track by ID
     * @param {string} id - Track ID
     * @returns {Promise<Music|null>} Track or null if not found
     */
    async getTrackById(id) {
        try {
            return await this.repository.getById(id);
        } catch (error) {
            this.logger?.error(`Failed to get track: ${id}`, error);
            throw error;
        }
    }

    /**
     * Get tracks by artist
     * @param {string} artist - Artist name
     * @returns {Promise<Music[]>} Tracks by artist
     */
    async getTracksByArtist(artist) {
        try {
            if (!artist || typeof artist !== 'string') {
                throw new ValidationError('Artist must be a non-empty string', {
                    context: { artist }
                });
            }

            return await this.repository.getByArtist(artist);
        } catch (error) {
            this.logger?.error(`Failed to get tracks by artist: ${artist}`, error);
            throw error;
        }
    }

    /**
     * Get tracks by minimum rating
     * @param {number} minRating - Minimum rating
     * @returns {Promise<Music[]>} Tracks with rating >= minRating
     */
    async getTracksByRating(minRating) {
        try {
            if (typeof minRating !== 'number' || minRating < 0 || minRating > 5) {
                throw new ValidationError('Minimum rating must be a number between 0 and 5', {
                    context: { minRating }
                });
            }

            return await this.repository.getByRating(minRating);
        } catch (error) {
            this.logger?.error(`Failed to get tracks by rating: ${minRating}`, error);
            throw error;
        }
    }

    /**
     * Search tracks by title
     * @param {string} query - Search query
     * @returns {Promise<Music[]>} Matching tracks
     */
    async searchTracks(query) {
        try {
            if (!query || typeof query !== 'string') {
                throw new ValidationError('Search query must be a non-empty string', {
                    context: { query }
                });
            }

            return await this.repository.searchTracks(query);
        } catch (error) {
            this.logger?.error('Failed to search tracks', error);
            throw error;
        }
    }

    /**
     * Get recently played tracks
     * @param {number} limit - Maximum number of tracks to return
     * @returns {Promise<Music[]>} Recently played tracks
     */
    async getRecentlyPlayed(limit = 10) {
        try {
            if (typeof limit !== 'number' || limit < 1) {
                throw new ValidationError('Limit must be a positive number', {
                    context: { limit }
                });
            }

            return await this.repository.getRecentlyPlayed(limit);
        } catch (error) {
            this.logger?.error('Failed to get recently played tracks', error);
            throw error;
        }
    }

    /**
     * Get top rated tracks
     * @param {number} limit - Maximum number of tracks to return
     * @returns {Promise<Music[]>} Top rated tracks
     */
    async getTopRated(limit = 10) {
        try {
            if (typeof limit !== 'number' || limit < 1) {
                throw new ValidationError('Limit must be a positive number', {
                    context: { limit }
                });
            }

            return await this.repository.getTopRated(limit);
        } catch (error) {
            this.logger?.error('Failed to get top rated tracks', error);
            throw error;
        }
    }

    /**
     * Batch update multiple tracks
     * @param {Music[]} tracks - Tracks to update
     * @returns {Promise<Music[]>} Updated tracks
     */
    async batchUpdateTracks(tracks) {
        try {
            this.logger?.debug(`Batch updating ${tracks.length} tracks`);

            if (!Array.isArray(tracks) || tracks.length === 0) {
                throw new ValidationError('Tracks must be a non-empty array', {
                    context: { tracks }
                });
            }

            const updatedTracks = await this.repository.batchUpdate(tracks);

            this.eventBus?.emit('music:batch-updated', {
                count: updatedTracks.length
            });

            return updatedTracks;
        } catch (error) {
            this.logger?.error('Failed to batch update tracks', error);
            throw error;
        }
    }

    /**
     * Validate track data for creation
     * @private
     * @param {object} trackData - Track data to validate
     * @throws {ValidationError} If validation fails
     */
    _validateTrackData(trackData) {
        const requiredFields = ['id', 'title', 'artist'];
        const missing = requiredFields.filter(field => !trackData[field]);

        if (missing.length > 0) {
            throw new ValidationError('Missing required fields', {
                context: { missingFields: missing, trackData }
            });
        }
    }
}
