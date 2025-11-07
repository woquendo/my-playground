/**
 * MusicPage.js
 * Music page controller - music player and track management
 */

export class MusicPage {
    /**
     * @param {Object} dependencies - Page dependencies
     * @param {MusicViewModel} dependencies.viewModel - Music ViewModel
     * @param {EventBus} dependencies.eventBus - Event bus
     * @param {Logger} dependencies.logger - Logger instance
     * @param {Container} dependencies.container - DI container
     */
    constructor({ viewModel, eventBus, logger, container }) {
        this.viewModel = viewModel;
        this.eventBus = eventBus;
        this.logger = logger;
        this.container = container;
        this.element = null;
        this.currentTrack = null;
    }

    /**
     * Render the music page
     * @returns {Promise<HTMLElement>} Page element
     */
    async render() {
        this.logger.info('Rendering music page');

        const page = document.createElement('div');
        page.className = 'page page--music';
        page.innerHTML = `
            <div class="page__header">
                <h2 class="page__title">Music Player</h2>
                <p class="page__subtitle">Your anime music collection</p>
            </div>
            <div class="page__player">
                <div id="music-player-container"></div>
            </div>
            <div class="page__filters">
                <div class="filters">
                    <input 
                        type="text" 
                        class="input" 
                        id="music-search" 
                        placeholder="Search tracks..."
                        aria-label="Search tracks"
                    />
                    <select class="input" id="music-type-filter" aria-label="Filter by type">
                        <option value="all">All Types</option>
                        <option value="op">Opening</option>
                        <option value="ed">Ending</option>
                        <option value="ost">OST</option>
                    </select>
                </div>
            </div>
            <div class="page__content">
                <div id="track-list-container"></div>
            </div>
        `;

        this.element = page;

        // Attach event listeners
        this.attachEventListeners(page);

        // Load and render tracks
        await this.loadTracks();

        return page;
    }

    /**
     * Attach event listeners
     * @param {HTMLElement} element - Page element
     */
    attachEventListeners(element) {
        const searchInput = element.querySelector('#music-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        const typeFilter = element.querySelector('#music-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.handleTypeFilter(e.target.value);
            });
        }
    }

    /**
     * Load and render tracks
     */
    async loadTracks() {
        try {
            const container = this.element.querySelector('#track-list-container');
            if (!container) return;

            container.innerHTML = '<div class="loading">Loading tracks...</div>';

            // Get tracks from ViewModel
            await this.viewModel.loadTracks();
            const tracks = this.viewModel.get('tracks');

            if (tracks.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No music tracks in your collection.</p>
                        <a href="/import" class="btn btn--primary">Import Music</a>
                    </div>
                `;
                return;
            }

            // Render track list
            container.innerHTML = `
                <div class="track-list">
                    ${tracks.map(track => this.renderTrack(track)).join('')}
                </div>
            `;

            // Attach track event listeners
            this.attachTrackListeners(container);

        } catch (error) {
            this.logger.error('Failed to load tracks:', error);
            const container = this.element.querySelector('#track-list-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p>Failed to load music tracks.</p>
                        <button class="btn btn--primary" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Render a track item
     * @param {Music} track - Track model
     * @returns {string} HTML string
     */
    renderTrack(track) {
        return `
            <div class="track-item" data-track-id="${track.id}">
                <button class="track-item__play btn btn--ghost btn--icon" data-action="play" aria-label="Play track">
                    ▶️
                </button>
                <div class="track-item__info">
                    <div class="track-item__title">${this.escapeHtml(track.title)}</div>
                    <div class="track-item__artist">${this.escapeHtml(track.artist || 'Unknown Artist')}</div>
                </div>
                <div class="track-item__meta">
                    <span class="badge badge--${track.type}">${track.type?.toUpperCase() || 'TRACK'}</span>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to track items
     * @param {HTMLElement} container - Container element
     */
    attachTrackListeners(container) {
        container.querySelectorAll('[data-action="play"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const trackItem = e.target.closest('.track-item');
                const trackId = trackItem?.dataset.trackId;
                if (trackId) {
                    this.handlePlayTrack(trackId);
                }
            });
        });
    }

    /**
     * Handle play track
     * @param {string} trackId - Track ID
     */
    async handlePlayTrack(trackId) {
        try {
            const tracks = this.viewModel.get('tracks');
            const track = tracks.find(t => t.getId() === trackId);

            if (!track) {
                throw new Error('Track not found');
            }

            await this.viewModel.playTrack(track);
            this.currentTrack = trackId;

            this.logger.info('Playing track:', trackId);

            const toastService = this.container.get('toastService');
            toastService.success('Track playing!');

            // Update UI to show playing state
            this.updatePlayingState(trackId);
        } catch (error) {
            this.logger.error('Failed to play track:', error);
            const toastService = this.container.get('toastService');
            toastService.error('Failed to play track');
        }
    }    /**
     * Update UI to show playing state
     * @param {string} trackId - Currently playing track ID
     */
    updatePlayingState(trackId) {
        // Remove playing state from all tracks
        this.element.querySelectorAll('.track-item').forEach(item => {
            item.classList.remove('track-item--playing');
        });

        // Add playing state to current track
        const currentTrackElement = this.element.querySelector(`[data-track-id="${trackId}"]`);
        if (currentTrackElement) {
            currentTrackElement.classList.add('track-item--playing');
        }
    }

    /**
     * Handle search
     * @param {string} query - Search query
     */
    handleSearch(query) {
        this.viewModel.setFilter('search', query);
        this.loadTracks();
    }

    /**
     * Handle type filter
     * @param {string} type - Track type
     */
    handleTypeFilter(type) {
        this.viewModel.setFilter('type', type);
        this.loadTracks();
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy the page
     */
    async destroy() {
        this.logger.info('Destroying music page');
        // Stop playback if needed
        if (this.currentTrack) {
            try {
                await this.viewModel.stopPlayback();
            } catch (error) {
                this.logger.error('Failed to stop playback:', error);
            }
        }
    }
}
