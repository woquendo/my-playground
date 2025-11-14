/**
 * MusicPage.js
 * Music page controller - music player and track management
 */

import { PageHeader } from '../Components/PageHeader.js';

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
        this.musicPlayer = null;
        this.tracks = [];
        this.currentTrackIndex = -1;
        this.pageHeader = new PageHeader();
    }

    /**
     * Render the music page
     * @returns {Promise<HTMLElement>} Page element
     */
    async render() {
        this.logger.info('Rendering music page');

        const page = document.createElement('div');
        page.className = 'page page--music';

        // Render page header
        const headerHTML = this.pageHeader.render({
            title: 'Music Player',
            subtitle: 'Your anime music collection',
            icon: '🎵',
            actions: [
                {
                    type: 'search',
                    id: 'music-search',
                    placeholder: 'Search tracks...'
                },
                {
                    type: 'select',
                    id: 'music-type-filter',
                    label: 'Type:',
                    options: [
                        { value: 'all', label: 'All Types', selected: true },
                        { value: 'op', label: 'Opening' },
                        { value: 'ed', label: 'Ending' },
                        { value: 'ost', label: 'OST' }
                    ]
                }
            ]
        });

        page.innerHTML = `
            ${headerHTML}
            <div class="page__player">
                <div id="music-player-container"></div>
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

        // Initialize music player
        await this.initializeMusicPlayer();

        // Don't auto-show global player - let users control visibility via toggle button
        // Users can click the music icon in the header to show/hide the player

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
            this.tracks = tracks;

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

            // Auto-load first track with autoplay enabled
            // Note: Music model has autoplay as a direct property, not a getter
            const autoplayTrack = tracks.find(track => track.autoplay === true);
            if (autoplayTrack) {
                this.logger.info('Auto-loading and playing first autoplay track:', autoplayTrack.getTitle());
                this.currentTrackIndex = tracks.indexOf(autoplayTrack);
                // Pass true to trigger playback via global player
                this.setCurrentTrack(autoplayTrack, true);
            } else if (tracks.length > 0 && !this.currentTrack) {
                // If no autoplay track, just load the first one without playing
                this.logger.info('Loading first track (no autoplay):', tracks[0].getTitle());
                this.currentTrackIndex = 0;
                this.setCurrentTrack(tracks[0], false);
            }

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
        const title = track.getTitle ? track.getTitle() : track.title;
        const artist = track.getArtist ? track.getArtist() : (track.artist || 'Unknown Artist');
        const id = track.getId ? track.getId() : track.id;
        const type = track.genre || track.type || 'TRACK';

        return `
            <div class="track-item" data-track-id="${id}">
                <button class="track-item__play btn btn--ghost btn--icon" data-action="play" aria-label="Play track">
                    ▶️
                </button>
                <div class="track-item__info">
                    <div class="track-item__title">${this.escapeHtml(title)}</div>
                    <div class="track-item__artist">${this.escapeHtml(artist)}</div>
                </div>
                <div class="track-item__meta">
                    <span class="badge badge--${type}">${type?.toUpperCase() || 'TRACK'}</span>
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
            const track = this.tracks.find(t => t.getId() === trackId);

            if (!track) {
                throw new Error('Track not found');
            }

            // Set as current track and delegate playback to global player
            this.setCurrentTrack(track, true);

            // Don't call viewModel.playTrack - global player handles all playback
            this.logger.info('Delegating track playback to global player:', trackId);

            const toastService = this.container.get('toastService');
            if (toastService) {
                toastService.success(`Now playing: ${track.getTitle()}`);
            } else {
                // Fallback notification
                console.log(`Now playing: ${track.getTitle()}`);
            }

        } catch (error) {
            this.logger.error('Failed to play track:', error);
            const toastService = this.container.get('toastService');
            if (toastService) {
                toastService.error('Failed to play track');
            } else {
                alert('Failed to play track');
            }
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
    async handleTypeFilter(type) {
        this.logger.debug('Filtering by type:', type);

        if (type === 'all') {
            // Load all tracks
            await this.viewModel.loadTracks();
        } else {
            // Filter tracks by type
            await this.viewModel.loadTracks();
            const allTracks = this.viewModel.get('tracks');
            const filteredTracks = allTracks.filter(track => {
                const trackType = track.getType?.() || track.type;
                return trackType === type;
            });
            this.viewModel.set('tracks', filteredTracks);
        }

        this.tracks = this.viewModel.get('tracks');
        await this.loadTracks();
    }

    /**
     * Initialize music player component
     */
    async initializeMusicPlayer() {
        const container = this.element.querySelector('#music-player-container');
        if (!container) return;

        try {
            // Don't initialize the actual MusicPlayer component
            // Global player handles all playback
            // Just show a simple UI instead
            container.innerHTML = `
                <div class="music-player music-player--display-only">
                    <div class="music-player__info">
                        <div class="music-player__track">
                            <div class="music-player__title">Select a track to play</div>
                            <div class="music-player__artist">All playback handled by global player</div>
                        </div>
                    </div>
                    <div class="music-player__controls">
                        <button class="btn btn--ghost btn--icon" data-action="previous" disabled>
                            ⏮️
                        </button>
                        <button class="btn btn--primary btn--icon btn--play-pause" data-action="play-global">
                            ▶️
                        </button>
                        <button class="btn btn--ghost btn--icon" data-action="next" disabled>
                            ⏭️
                        </button>
                    </div>
                    <div class="music-player__note">
                        <small>💡 Use the global player (top right) to control playback across all pages</small>
                    </div>
                </div>
            `;

            // Add click handler for the play button to open global player
            const playBtn = container.querySelector('[data-action="play-global"]');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    if (this.currentTrack) {
                        this.eventBus.emitSync('music:play', this.currentTrack);
                    }
                    // Also show the global player
                    this.eventBus.emitSync('globalPlayer:toggle');
                });
            }

            this.logger.info('Display-only music player UI initialized');

        } catch (error) {
            this.logger.error('Failed to initialize music player UI:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>Failed to load music player.</p>
                </div>
            `;
        }
    }

    /**
     * Handle player play event
     */
    handlePlayerPlay() {
        this.logger.info('Local player play button clicked - delegating to global player');

        // Stop the local player immediately to prevent double playback
        if (this.musicPlayer && this.musicPlayer._handleStop) {
            this.musicPlayer._handleStop();
        }

        if (this.currentTrack) {
            // Delegate playback to global player
            this.eventBus.emitSync('music:play', this.currentTrack);
            this.logger.info('Play delegated to global player, local player stopped');
        }
    }

    /**
     * Handle player pause event
     */
    handlePlayerPause() {
        this.logger.info('Player pause event');
        if (this.currentTrack) {
            this.eventBus.emit('track:paused', { track: this.currentTrack });
        }
    }

    /**
     * Handle player stop event
     */
    handlePlayerStop() {
        this.logger.info('Player stop event');
        if (this.currentTrack) {
            this.eventBus.emit('track:stopped', { track: this.currentTrack });
        }
    }

    /**
     * Handle next track
     */
    handleNextTrack() {
        if (this.tracks.length === 0) return;

        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        const nextTrack = this.tracks[this.currentTrackIndex];
        this.setCurrentTrack(nextTrack, true); // Auto-play next track
    }

    /**
     * Handle previous track
     */
    handlePreviousTrack() {
        if (this.tracks.length === 0) return;

        this.currentTrackIndex = this.currentTrackIndex <= 0
            ? this.tracks.length - 1
            : this.currentTrackIndex - 1;
        const previousTrack = this.tracks[this.currentTrackIndex];
        this.setCurrentTrack(previousTrack, true); // Auto-play previous track
    }

    /**
     * Set current track
     * @param {Music} track - Track to set as current
     * @param {boolean} shouldPlay - Whether to trigger playback (delegates to global player)
     */
    setCurrentTrack(track, shouldPlay = false) {
        this.currentTrack = track;

        // Update track index
        this.currentTrackIndex = this.tracks.findIndex(t => t.getId() === track.getId());

        // Update the display-only player UI
        const playerTitle = this.element?.querySelector('.music-player__title');
        const playerArtist = this.element?.querySelector('.music-player__artist');
        if (playerTitle && playerArtist) {
            playerTitle.textContent = track.getTitle();
            playerArtist.textContent = track.getArtist() || 'Unknown Artist';
        }

        // Update UI playing state
        this.updatePlayingState(track.getId());

        // If we should play, delegate to global player
        if (shouldPlay) {
            // Log EventBus diagnostics
            const diagnostics = this.eventBus.getDiagnostics();
            this.logger.info('=== EventBus Diagnostics ===', diagnostics);

            this.logger.info('=== EMITTING music:play event ===', {
                trackId: track.getId(),
                trackTitle: track.getTitle(),
                hasSubscribers: diagnostics.eventStats['music:play'] || 0
            });

            console.log('🔍 [MusicPage.setCurrentTrack] BEFORE emitSync:', {
                hasGetTitle: typeof track.getTitle === 'function',
                hasGetId: typeof track.getId === 'function',
                title: track.title,
                youtubeUrl: track.youtubeUrl,
                trackType: track.constructor.name
            });

            // Use emitSync to avoid async timing issues
            this.eventBus.emitSync('music:play', track);
            this.logger.info('Event emitted (sync) - Delegating playback to global player:', track.getTitle());
        } else {
            this.logger.info('Current track set (no playback):', track.getTitle());
        }
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
        // Don't stop playback - the global player handles all playback
        // Music should continue playing when navigating away from this page
    }
}
