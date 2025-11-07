/**
 * Show Management Service
 * Handles business logic for show management, episode progression, and status transitions.
 */
import { ValidationError, ApplicationError } from '../../Core/Errors/ApplicationErrors.js';
import { Show } from '../../Domain/Models/Show.js';
import { ShowStatus } from '../../Domain/ValueObjects/ShowStatus.js';
import { ShowDate } from '../../Domain/ValueObjects/ShowDate.js';

export class ShowManagementService {
    /**
     * Create a ShowManagementService
     * @param {object} dependencies - Service dependencies
     * @param {object} dependencies.showRepository - Show repository implementation
     * @param {EventBus} dependencies.eventBus - Event bus for service events
     * @param {Logger} dependencies.logger - Logger instance
     * @param {EpisodeCalculatorService} dependencies.episodeCalculator - Episode calculator service
     */
    constructor({ showRepository, eventBus = null, logger = null, episodeCalculator = null }) {
        if (!showRepository) {
            throw new ValidationError('Show repository is required', {
                context: { service: 'ShowManagementService' }
            });
        }

        this.repository = showRepository;
        this.eventBus = eventBus;
        this.logger = logger;
        this.episodeCalculator = episodeCalculator;
    }

    /**
     * Create a new show
     * @param {object} showData - Show data
     * @returns {Promise<Show>} Created show
     */
    async createShow(showData) {
        try {
            this.logger?.debug('Creating new show', showData);

            // Validate required fields
            this._validateShowData(showData);

            // Create Show domain object (will validate internally)
            const show = new Show(showData);

            // Save to repository
            const savedShow = await this.repository.save(show);

            // Emit event
            this.eventBus?.emit('show:created', { show: savedShow });
            this.logger?.info(`Show created: ${savedShow.getId()}`);

            return savedShow;
        } catch (error) {
            this.logger?.error('Failed to create show', error);
            throw error;
        }
    }

    /**
     * Update an existing show
     * @param {string} id - Show ID
     * @param {object} updates - Fields to update
     * @returns {Promise<Show>} Updated show
     */
    async updateShow(id, updates) {
        try {
            this.logger?.debug(`Updating show: ${id}`, updates);

            // Fetch existing show
            const existingShow = await this.repository.getById(id);
            if (!existingShow) {
                throw new ValidationError(`Show not found: ${id}`, {
                    context: { id, operation: 'update' }
                });
            }

            // Create updated show with merged data
            const updatedData = {
                id: existingShow.getId(),
                title: updates.title ?? existingShow.getTitle(),
                status: updates.status ?? existingShow.getStatus(),
                rating: updates.rating ?? existingShow.getRating(),
                currentEpisode: updates.currentEpisode ?? existingShow.getCurrentEpisode(),
                totalEpisodes: updates.totalEpisodes ?? existingShow.getTotalEpisodes(),
                startDate: updates.startDate ?? existingShow.getStartDate().format(),
                airingStatus: updates.airingStatus ?? existingShow.getAiringStatus(),
                imageUrl: updates.imageUrl ?? existingShow.getImageUrl(),
                notes: updates.notes ?? existingShow.getNotes()
            };

            const updatedShow = new Show(updatedData);
            const savedShow = await this.repository.save(updatedShow);

            // Emit event
            this.eventBus?.emit('show:updated', { show: savedShow, updates });
            this.logger?.info(`Show updated: ${id}`);

            return savedShow;
        } catch (error) {
            this.logger?.error(`Failed to update show: ${id}`, error);
            throw error;
        }
    }

    /**
     * Delete a show
     * @param {string} id - Show ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteShow(id) {
        try {
            this.logger?.debug(`Deleting show: ${id}`);

            // Verify show exists
            const show = await this.repository.getById(id);
            if (!show) {
                throw new ValidationError(`Show not found: ${id}`, {
                    context: { id, operation: 'delete' }
                });
            }

            // Delete from repository
            const result = await this.repository.delete(id);

            // Emit event
            this.eventBus?.emit('show:deleted', { id, show });
            this.logger?.info(`Show deleted: ${id}`);

            return result;
        } catch (error) {
            this.logger?.error(`Failed to delete show: ${id}`, error);
            throw error;
        }
    }

    /**
     * Progress show to next episode
     * @param {string} id - Show ID
     * @returns {Promise<Show>} Updated show
     */
    async progressEpisode(id) {
        try {
            this.logger?.debug(`Progressing episode for show: ${id}`);

            const show = await this.repository.getById(id);
            if (!show) {
                throw new ValidationError(`Show not found: ${id}`, {
                    context: { id, operation: 'progressEpisode' }
                });
            }

            const currentEpisode = show.getCurrentEpisode();
            const totalEpisodes = show.getTotalEpisodes();

            // Check if we can progress
            if (currentEpisode >= totalEpisodes) {
                throw new ValidationError('Cannot progress beyond total episodes', {
                    context: { id, currentEpisode, totalEpisodes }
                });
            }

            // Update episode count
            const updatedShow = await this.updateShow(id, {
                currentEpisode: currentEpisode + 1
            });

            // Auto-complete if reached final episode
            if (updatedShow.getCurrentEpisode() === totalEpisodes) {
                await this.updateStatus(id, 'completed');
                this.eventBus?.emit('show:completed', { show: updatedShow });
            }

            this.eventBus?.emit('show:episode-progressed', {
                show: updatedShow,
                previousEpisode: currentEpisode,
                newEpisode: currentEpisode + 1
            });

            return updatedShow;
        } catch (error) {
            this.logger?.error(`Failed to progress episode for show: ${id}`, error);
            throw error;
        }
    }

    /**
     * Update show status
     * @param {string} id - Show ID
     * @param {string} newStatus - New status
     * @returns {Promise<Show>} Updated show
     */
    async updateStatus(id, newStatus) {
        try {
            this.logger?.debug(`Updating status for show: ${id}`, { newStatus });

            // Validate status
            new ShowStatus(newStatus); // Will throw if invalid

            const show = await this.repository.getById(id);
            if (!show) {
                throw new ValidationError(`Show not found: ${id}`, {
                    context: { id, operation: 'updateStatus' }
                });
            }

            const oldStatus = show.getStatus();
            const updatedShow = await this.updateShow(id, { status: newStatus });

            this.eventBus?.emit('show:status-changed', {
                show: updatedShow,
                oldStatus,
                newStatus
            });

            return updatedShow;
        } catch (error) {
            this.logger?.error(`Failed to update status for show: ${id}`, error);
            throw error;
        }
    }

    /**
     * Get all shows
     * @returns {Promise<Show[]>} All shows
     */
    async getAllShows() {
        try {
            return await this.repository.getAll();
        } catch (error) {
            this.logger?.error('Failed to get all shows', error);
            throw error;
        }
    }

    /**
     * Get show by ID
     * @param {string} id - Show ID
     * @returns {Promise<Show|null>} Show or null if not found
     */
    async getShowById(id) {
        try {
            return await this.repository.getById(id);
        } catch (error) {
            this.logger?.error(`Failed to get show: ${id}`, error);
            throw error;
        }
    }

    /**
     * Get shows by status
     * @param {string} status - Show status
     * @returns {Promise<Show[]>} Shows with specified status
     */
    async getShowsByStatus(status) {
        try {
            // Validate status
            new ShowStatus(status);

            return await this.repository.getByStatus(status);
        } catch (error) {
            this.logger?.error(`Failed to get shows by status: ${status}`, error);
            throw error;
        }
    }

    /**
     * Get currently airing shows
     * @returns {Promise<Show[]>} Currently airing shows
     */
    async getCurrentlyAiringShows() {
        try {
            return await this.repository.getCurrentlyAiring();
        } catch (error) {
            this.logger?.error('Failed to get currently airing shows', error);
            throw error;
        }
    }

    /**
     * Search shows by title
     * @param {string} query - Search query
     * @returns {Promise<Show[]>} Matching shows
     */
    async searchShows(query) {
        try {
            if (!query || typeof query !== 'string') {
                throw new ValidationError('Search query must be a non-empty string', {
                    context: { query }
                });
            }

            return await this.repository.searchByTitle(query);
        } catch (error) {
            this.logger?.error('Failed to search shows', error);
            throw error;
        }
    }

    /**
     * Calculate current episode for a show based on air date
     * @param {string} id - Show ID
     * @returns {Promise<number>} Calculated current episode
     */
    async calculateCurrentEpisode(id) {
        try {
            const show = await this.repository.getById(id);
            if (!show) {
                throw new ValidationError(`Show not found: ${id}`, {
                    context: { id, operation: 'calculateCurrentEpisode' }
                });
            }

            if (!this.episodeCalculator) {
                throw new ApplicationError('Episode calculator service not available', {
                    context: { service: 'ShowManagementService' }
                });
            }

            return this.episodeCalculator.calculateCurrentEpisode(show);
        } catch (error) {
            this.logger?.error(`Failed to calculate current episode for show: ${id}`, error);
            throw error;
        }
    }

    /**
     * Validate show data for creation
     * @private
     * @param {object} showData - Show data to validate
     * @throws {ValidationError} If validation fails
     */
    _validateShowData(showData) {
        const requiredFields = ['id', 'title', 'status', 'totalEpisodes', 'startDate'];
        const missing = requiredFields.filter(field => !showData[field]);

        if (missing.length > 0) {
            throw new ValidationError('Missing required fields', {
                context: { missingFields: missing, showData }
            });
        }
    }
}
