/**
 * Music Repository Interface
 * Defines the contract for Music data access operations
 * 
 * This interface follows the Repository pattern to abstract data access
 * and allow for different implementations (HTTP, LocalStorage, Mock, etc.)
 */
export class IMusicRepository {
    /**
     * Get all music tracks
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getAll() {
        throw new Error('IMusicRepository.getAll() must be implemented');
    }

    /**
     * Get a music track by ID
     * @param {string} id - Music track identifier
     * @returns {Promise<Music|null>} Music domain object or null if not found
     */
    async getById(id) {
        throw new Error('IMusicRepository.getById() must be implemented');
    }

    /**
     * Get music tracks by rating
     * @param {number} minRating - Minimum rating (0-5)
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getByRating(minRating) {
        throw new Error('IMusicRepository.getByRating() must be implemented');
    }

    /**
     * Get music tracks by artist
     * @param {string} artist - Artist name
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getByArtist(artist) {
        throw new Error('IMusicRepository.getByArtist() must be implemented');
    }

    /**
     * Get music tracks by album
     * @param {string} album - Album name
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getByAlbum(album) {
        throw new Error('IMusicRepository.getByAlbum() must be implemented');
    }

    /**
     * Search music tracks by title, artist, or album
     * @param {string} query - Search query
     * @returns {Promise<Music[]>} Array of matching Music domain objects
     */
    async search(query) {
        throw new Error('IMusicRepository.search() must be implemented');
    }

    /**
     * Get music tracks by tags
     * @param {string[]} tags - Array of tags to filter by
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getByTags(tags) {
        throw new Error('IMusicRepository.getByTags() must be implemented');
    }

    /**
     * Get recently played music tracks
     * @param {number} limit - Maximum number of tracks to return
     * @returns {Promise<Music[]>} Array of recently played Music domain objects
     */
    async getRecentlyPlayed(limit = 10) {
        throw new Error('IMusicRepository.getRecentlyPlayed() must be implemented');
    }

    /**
     * Get top rated music tracks
     * @param {number} limit - Maximum number of tracks to return
     * @returns {Promise<Music[]>} Array of top rated Music domain objects
     */
    async getTopRated(limit = 10) {
        throw new Error('IMusicRepository.getTopRated() must be implemented');
    }

    /**
     * Save a music track (create or update)
     * @param {Music} music - Music domain object to save
     * @returns {Promise<Music>} Saved Music domain object
     */
    async save(music) {
        throw new Error('IMusicRepository.save() must be implemented');
    }

    /**
     * Delete a music track
     * @param {string} id - Music track identifier
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async delete(id) {
        throw new Error('IMusicRepository.delete() must be implemented');
    }

    /**
     * Batch update multiple music tracks
     * @param {Music[]} tracks - Array of Music domain objects to update
     * @returns {Promise<Music[]>} Array of updated Music domain objects
     */
    async batchUpdate(tracks) {
        throw new Error('IMusicRepository.batchUpdate() must be implemented');
    }

    /**
     * Increment play count for a music track
     * @param {string} id - Music track identifier
     * @returns {Promise<Music>} Updated Music domain object
     */
    async incrementPlayCount(id) {
        throw new Error('IMusicRepository.incrementPlayCount() must be implemented');
    }
}
