/**
 * Show Repository Interface
 * Defines the contract for Show data access operations
 * 
 * This interface follows the Repository pattern to abstract data access
 * and allow for different implementations (HTTP, LocalStorage, Mock, etc.)
 */
export class IShowRepository {
    /**
     * Get all shows
     * @returns {Promise<Show[]>} Array of Show domain objects
     */
    async getAll() {
        throw new Error('IShowRepository.getAll() must be implemented');
    }

    /**
     * Get a show by ID
     * @param {string} id - Show identifier
     * @returns {Promise<Show|null>} Show domain object or null if not found
     */
    async getById(id) {
        throw new Error('IShowRepository.getById() must be implemented');
    }

    /**
     * Get shows by status
     * @param {string} status - Show status (watching, completed, etc.)
     * @returns {Promise<Show[]>} Array of Show domain objects
     */
    async getByStatus(status) {
        throw new Error('IShowRepository.getByStatus() must be implemented');
    }

    /**
     * Get shows by airing status
     * @param {string} airingStatus - Airing status (currently_airing, finished_airing, etc.)
     * @returns {Promise<Show[]>} Array of Show domain objects
     */
    async getByAiringStatus(airingStatus) {
        throw new Error('IShowRepository.getByAiringStatus() must be implemented');
    }

    /**
     * Search shows by title
     * @param {string} query - Search query
     * @returns {Promise<Show[]>} Array of matching Show domain objects
     */
    async searchByTitle(query) {
        throw new Error('IShowRepository.searchByTitle() must be implemented');
    }

    /**
     * Save a show (create or update)
     * @param {Show} show - Show domain object to save
     * @returns {Promise<Show>} Saved Show domain object
     */
    async save(show) {
        throw new Error('IShowRepository.save() must be implemented');
    }

    /**
     * Delete a show
     * @param {string} id - Show identifier
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async delete(id) {
        throw new Error('IShowRepository.delete() must be implemented');
    }

    /**
     * Get currently airing shows
     * @returns {Promise<Show[]>} Array of currently airing Show domain objects
     */
    async getCurrentlyAiring() {
        throw new Error('IShowRepository.getCurrentlyAiring() must be implemented');
    }

    /**
     * Get shows that need update (behind on episodes)
     * @returns {Promise<Show[]>} Array of Show domain objects behind schedule
     */
    async getNeedingUpdate() {
        throw new Error('IShowRepository.getNeedingUpdate() must be implemented');
    }

    /**
     * Batch update multiple shows
     * @param {Show[]} shows - Array of Show domain objects to update
     * @returns {Promise<Show[]>} Array of updated Show domain objects
     */
    async batchUpdate(shows) {
        throw new Error('IShowRepository.batchUpdate() must be implemented');
    }
}
