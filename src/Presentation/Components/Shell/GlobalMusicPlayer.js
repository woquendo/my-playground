/**
 * GlobalMusicPlayer.js
 * Persistent minified music player component
 * Accessible from header, persists across page navigation
 * Follows SOLID principles with reactive state management
 */

import { BaseComponent } from '../BaseComponent.js';

export class GlobalMusicPlayer extends BaseComponent {
    /**
     * @param {Object} dependencies - Component dependencies
     * @param {MusicManagementService} dependencies.musicService - Music service
     * @param {ApplicationState} dependencies.applicationState - Application state
     * @param {EventBus} dependencies.eventBus - Event bus
     * @param {Logger} dependencies.logger - Logger instance
     */
    constructor({ musicService, applicationState, eventBus, logger }) {
        super({ eventBus, logger });

        this.musicService = musicService;
        this.applicationState = applicationState;

        // Component state
        this.isVisible = false;
        this.isExpanded = false;
        this.currentTrack = null;
        this.tracks = [];
        this.filteredTracks = [];
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 0.7; // Default volume 70%
        this.isMuted = false;
        this.viewMode = 'type'; // 'type', 'playlist', or 'all'
        this.selectedPlaylist = null; // For filtering by specific playlist
        this.selectedType = null; // For filtering by specific type in type view
        this._lastStateSaveTime = null; // Track last time state was saved

        // DOM elements
        this.element = null;
        this.audioElement = null;
        this.youtubePlayer = null;
        this.youtubePlayerReady = false;

        // Subscribe to events
        this._subscribeToEvents();
    }

    /**
     * Subscribe to relevant events
     * @private
     */
    _subscribeToEvents() {
        this._logger.info('=== GlobalMusicPlayer subscribing to events ===');

        // Listen for music playback requests
        this._eventBus.subscribe('music:play', (track) => {
            this._logger.info('=== RECEIVED music:play event ===', {
                trackId: track?.getId ? track.getId() : track?.id,
                trackTitle: track?.getTitle ? track.getTitle() : track?.title,
                track
            });
            // Don't auto-show - let user toggle visibility manually
            this.playTrack(track, true); // Explicitly pass true to autoplay
        });

        // Listen for global player toggle
        this._eventBus.subscribe('globalPlayer:toggle', () => {
            this._logger.info('Received globalPlayer:toggle event');
            this.toggle();
        });

        // Listen for show request
        this._eventBus.subscribe('globalPlayer:show', () => {
            this._logger.info('Received globalPlayer:show event');
            this.show();
        });

        // Listen for hide request
        this._eventBus.subscribe('globalPlayer:hide', () => {
            this._logger.info('Received globalPlayer:hide event');
            this.hide();
        });

        // Listen for music library updates
        this._eventBus.subscribe('music:libraryUpdated', async () => {
            this._logger.info('Received music:libraryUpdated event - reloading tracks');
            await this.reloadTracks();
        });

        this._logger.info('=== GlobalMusicPlayer event subscriptions complete ===');
    }

    /**
     * Initialize the component
     */
    async initialize() {
        this._logger.info('Initializing GlobalMusicPlayer');

        // Load tracks
        await this._loadTracks();

        // Create DOM element
        this.element = this._createPlayerElement();
        document.body.appendChild(this.element);

        // Load YouTube API
        this._loadYouTubeAPI();

        // Attach event listeners
        this._attachEventListeners();

        // Load volume state
        this._loadVolumeState();

        // Restore previous state if any
        this._restoreState();

        this._logger.info('GlobalMusicPlayer initialized');
    }

    /**
     * Create player DOM element
     * @returns {HTMLElement}
     * @private
     */
    _createPlayerElement() {
        const container = document.createElement('div');
        container.className = 'global-music-player';
        container.setAttribute('data-visible', 'false');
        container.setAttribute('data-expanded', 'false');
        container.innerHTML = this._renderPlayer();
        return container;
    }

    /**
     * Render player HTML
     * @returns {string}
     * @private
     */
    _renderPlayer() {
        return `
            <div class="global-music-player__header">
                <button class="global-music-player__toggle" aria-label="Toggle player size">
                    <span class="toggle-icon">▼</span>
                </button>
                <div class="global-music-player__track-info">
                    <div class="track-title">${this.currentTrack ? this._escapeHtml(this.currentTrack.title) : 'No track playing'}</div>
                    <div class="track-artist">${this.currentTrack ? this._escapeHtml(this.currentTrack.show || 'Unknown') : ''}</div>
                </div>
                <button class="global-music-player__close" aria-label="Close player">×</button>
            </div>
            
            <div class="global-music-player__body">
                <!-- Compact Controls -->
                <div class="global-music-player__controls">
                    <button class="control-btn control-btn--prev" aria-label="Previous track">⏮</button>
                    <button class="control-btn control-btn--play" aria-label="Play/Pause">
                        <span class="play-icon">${this.isPlaying ? '⏸' : '▶'}</span>
                    </button>
                    <button class="control-btn control-btn--next" aria-label="Next track">⏭</button>
                    
                    <!-- Volume Control -->
                    <div class="volume-control">
                        <button class="control-btn control-btn--volume" aria-label="Mute/Unmute">
                            <span class="volume-icon">${this.isMuted ? '🔇' : (this.volume > 0.5 ? '🔊' : (this.volume > 0 ? '🔉' : '🔈'))}</span>
                        </button>
                        <input 
                            type="range" 
                            class="volume-slider" 
                            min="0" 
                            max="100" 
                            value="${this.volume * 100}"
                            aria-label="Volume"
                        />
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="global-music-player__progress">
                    <span class="progress-time progress-time--current">0:00</span>
                    <div class="progress-bar">
                        <div class="progress-bar__fill" style="width: 0%"></div>
                        <input 
                            type="range" 
                            class="progress-bar__slider" 
                            min="0" 
                            max="100" 
                            value="0"
                            aria-label="Seek"
                        />
                    </div>
                    <span class="progress-time progress-time--duration">0:00</span>
                </div>
                
                <!-- Expanded Section (Filters + Search + Track List) -->
                <div class="global-music-player__expanded">
                    <!-- Filter Bar -->
                    <div class="player-filters">
                        <button class="filter-btn filter-btn--active" data-view="type" aria-label="Group by Type">
                            <span class="filter-icon">📁</span>
                            <span class="filter-label">By Type</span>
                        </button>
                        <button class="filter-btn" data-view="playlist" aria-label="Group by Playlist">
                            <span class="filter-icon">📚</span>
                            <span class="filter-label">Playlists</span>
                        </button>
                        <button class="filter-btn" data-view="all" aria-label="Show all tracks">
                            <span class="filter-icon">🎵</span>
                            <span class="filter-label">All Songs</span>
                        </button>
                    </div>
                    
                    <div class="player-search">
                        <input 
                            type="text" 
                            class="player-search__input" 
                            placeholder="Search tracks..."
                            aria-label="Search tracks"
                        />
                        <span class="player-search__icon">🔍</span>
                    </div>
                    
                    <div class="player-tracklist" id="global-player-tracklist">
                        ${this._renderTrackList()}
                    </div>
                </div>
                
                <!-- Audio/Video Elements -->
                <audio class="global-music-player__audio" preload="metadata"></audio>
                <div class="global-music-player__youtube" id="global-youtube-player"></div>
            </div>
        `;
    }

    /**
     * Render track list
     * @returns {string}
     * @private
     */
    _renderTrackList() {
        if (this.filteredTracks.length === 0) {
            return '<div class="player-tracklist__empty">No tracks found</div>';
        }

        // Render based on view mode
        switch (this.viewMode) {
            case 'playlist':
                return this._renderPlaylistView();
            case 'all':
                return this._renderAllTracksView();
            case 'type':
            default:
                return this._renderTypeView();
        }
    }

    /**
     * Render tracks grouped by type with fixed filter buttons
     * @returns {string}
     * @private
     */
    _renderTypeView() {
        const groupedTracks = this._groupTracksByType(this.filteredTracks);
        const types = Object.keys(groupedTracks);

        // If no type is selected, select the first one by default
        if (!this.selectedType && types.length > 0) {
            this.selectedType = types[0];
        }

        // Get tracks for selected type
        const selectedTracks = this.selectedType ? groupedTracks[this.selectedType] || [] : [];

        // Render fixed type filter buttons at the top
        const typeButtons = types.map(type => {
            const count = groupedTracks[type].length;
            const isActive = type === this.selectedType;
            return `
                <button class="type-filter-btn ${isActive ? 'type-filter-btn--active' : ''}" data-type="${this._escapeHtml(type)}">
                    <span class="type-filter-btn__label">${this._escapeHtml(type)}</span>
                    <span class="type-filter-btn__count">${count}</span>
                </button>
            `;
        }).join('');

        return `
            <div class="type-filters">
                ${typeButtons}
            </div>
            <div class="type-tracks-container">
                ${this._renderTracksInGroup(selectedTracks)}
            </div>
        `;
    }

    /**
     * Render playlist view - shows list of playlists or songs in selected playlist
     * @returns {string}
     * @private
     */
    _renderPlaylistView() {
        // If a specific playlist is selected, show its tracks
        if (this.selectedPlaylist) {
            const playlistTracks = this.filteredTracks.filter(track =>
                track.playlists && track.playlists.includes(this.selectedPlaylist)
            );

            return `
                <div class="playlist-back-button" data-action="back-to-playlists">
                    <span class="playlist-back-icon">← Back to Playlists</span>
                </div>
                <div class="track-group">
                    <div class="track-group__header">
                        <span class="track-group__title">📚 ${this._escapeHtml(this.selectedPlaylist)}</span>
                        <span class="track-group__count">${playlistTracks.length}</span>
                    </div>
                    <div class="track-group__tracks">
                        ${this._renderTracksInGroup(playlistTracks)}
                    </div>
                </div>
            `;
        }

        // Otherwise, show list of available playlists
        const playlistsMap = this._getAvailablePlaylists();

        if (playlistsMap.size === 0) {
            return '<div class="player-tracklist__empty">No playlists found</div>';
        }

        return Array.from(playlistsMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([playlistName, count]) => {
                return `
                    <div class="playlist-item" data-playlist-name="${this._escapeHtml(playlistName)}">
                        <span class="playlist-item__icon">📚</span>
                        <div class="playlist-item__info">
                            <div class="playlist-item__name">${this._escapeHtml(playlistName)}</div>
                            <div class="playlist-item__count">${count} song${count !== 1 ? 's' : ''}</div>
                        </div>
                        <span class="playlist-item__arrow">→</span>
                    </div>
                `;
            }).join('');
    }

    /**
     * Get available playlists with song counts
     * @returns {Map} Map of playlist name to song count
     * @private
     */
    _getAvailablePlaylists() {
        const playlistsMap = new Map();

        this.tracks.forEach(track => {
            if (track.playlists && track.playlists.length > 0) {
                track.playlists.forEach(playlistName => {
                    playlistsMap.set(playlistName, (playlistsMap.get(playlistName) || 0) + 1);
                });
            }
        });

        return playlistsMap;
    }

    /**
     * Render all tracks without grouping
     * @returns {string}
     * @private
     */
    _renderAllTracksView() {
        return this._renderTracksInGroup(this.filteredTracks);
    }

    /**
     * Render tracks within a group
     * @param {Array} tracks - Tracks to render
     * @returns {string}
     * @private
     */
    _renderTracksInGroup(tracks) {
        return tracks.map(track => `
            <div class="player-track ${this.currentTrack && String(this.currentTrack.id) === String(track.id) ? 'player-track--active' : ''}" 
                 data-track-id="${track.id}">
                <div class="player-track__info">
                    <div class="player-track__title">${this._escapeHtml(track.title)}</div>
                    <div class="player-track__meta">${this._escapeHtml(track.show || track.artist || 'Unknown')}</div>
                </div>
                <button class="player-track__play" aria-label="Play ${this._escapeHtml(track.title)}">▶</button>
            </div>
        `).join('');
    }

    /**
     * Group tracks by type with ordering
     * @param {Array} tracks - Tracks to group
     * @returns {Object} Grouped tracks
     * @private
     */
    _groupTracksByType(tracks) {
        const typeOrder = ['Opening', 'Ending', 'Insert Song', 'OST', 'Other'];
        const grouped = {};

        // Initialize groups in order
        typeOrder.forEach(type => grouped[type] = []);

        // Group tracks
        tracks.forEach(track => {
            const type = track.type || 'Other';
            if (!grouped[type]) {
                grouped[type] = [];
            }
            grouped[type].push(track);
        });

        // Remove empty groups
        Object.keys(grouped).forEach(type => {
            if (grouped[type].length === 0) {
                delete grouped[type];
            }
        });

        return grouped;
    }

    /**
     * Group tracks by playlist
     * @param {Array} tracks - Tracks to group
     * @returns {Object} Grouped tracks
     * @private
     */
    _groupTracksByPlaylist(tracks) {
        const grouped = {};

        tracks.forEach(track => {
            const playlists = track.playlists || [];

            if (playlists.length === 0) {
                // Track not in any playlist - add to "No Playlist" group
                if (!grouped['No Playlist']) {
                    grouped['No Playlist'] = [];
                }
                grouped['No Playlist'].push(track);
            } else {
                // Add track to each of its playlists
                playlists.forEach(playlistName => {
                    if (!grouped[playlistName]) {
                        grouped[playlistName] = [];
                    }
                    grouped[playlistName].push(track);
                });
            }
        });

        // Sort playlists alphabetically (but keep "No Playlist" last)
        const sortedGrouped = {};
        const sortedKeys = Object.keys(grouped)
            .filter(key => key !== 'No Playlist')
            .sort();

        sortedKeys.forEach(key => {
            sortedGrouped[key] = grouped[key];
        });

        // Add "No Playlist" at the end if it exists
        if (grouped['No Playlist']) {
            sortedGrouped['No Playlist'] = grouped['No Playlist'];
        }

        return sortedGrouped;
    }

    /**
     * Check if a group is collapsed
     * @param {string} type - Group type
     * @returns {boolean}
     * @private
     */
    _isGroupCollapsed(type) {
        if (!this._collapsedGroups) {
            this._collapsedGroups = new Set();
        }
        return this._collapsedGroups.has(type);
    }

    /**
     * Toggle group collapsed state
     * @param {string} type - Group type
     * @private
     */
    _toggleGroupCollapsed(type) {
        if (!this._collapsedGroups) {
            this._collapsedGroups = new Set();
        }

        if (this._collapsedGroups.has(type)) {
            this._collapsedGroups.delete(type);
        } else {
            this._collapsedGroups.add(type);
        }
    }

    /**
     * Toggle group visibility
     * @param {string} type - Group type
     * @private
     */
    _toggleGroup(type) {
        this._toggleGroupCollapsed(type);

        // Update UI
        const trackList = this.element.querySelector('.player-tracklist');
        if (trackList) {
            trackList.innerHTML = this._renderTrackList();
        }
    }    /**
     * Attach event listeners
     * @private
     */
    _attachEventListeners() {
        if (!this.element) return;

        // Close button
        const closeBtn = this.element.querySelector('.global-music-player__close');
        closeBtn?.addEventListener('click', () => this.hide());

        // Toggle expand/collapse
        const toggleBtn = this.element.querySelector('.global-music-player__toggle');
        toggleBtn?.addEventListener('click', () => this.toggleExpanded());

        // Play/Pause button
        const playBtn = this.element.querySelector('.control-btn--play');
        playBtn?.addEventListener('click', () => this.togglePlayPause());

        // Previous/Next buttons
        const prevBtn = this.element.querySelector('.control-btn--prev');
        prevBtn?.addEventListener('click', () => this.playPrevious());

        const nextBtn = this.element.querySelector('.control-btn--next');
        nextBtn?.addEventListener('click', () => this.playNext());

        // Volume controls
        const volumeBtn = this.element.querySelector('.control-btn--volume');
        volumeBtn?.addEventListener('click', () => this.toggleMute());

        const volumeSlider = this.element.querySelector('.volume-slider');
        volumeSlider?.addEventListener('input', (e) => this.setVolume(e.target.value / 100));

        // Progress bar
        const progressSlider = this.element.querySelector('.progress-bar__slider');
        progressSlider?.addEventListener('input', (e) => this.seek(e.target.value));

        // Search input
        const searchInput = this.element.querySelector('.player-search__input');
        searchInput?.addEventListener('input', (e) => this._handleSearch(e.target.value));

        // Filter buttons
        const filterBtns = this.element.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update view mode
                this.viewMode = btn.dataset.view;

                // Reset selections when switching views
                this.selectedPlaylist = null;
                this.selectedType = null;

                // Update active button styling
                filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
                btn.classList.add('filter-btn--active');

                // Re-render track list
                const trackList = this.element.querySelector('.player-tracklist');
                if (trackList) {
                    trackList.innerHTML = this._renderTrackList();
                }

                this._logger.info(`Switched to ${this.viewMode} view`);
            });
        });

        // Track list clicks (tracks, type filters, group headers, playlists, and back button)
        const trackList = this.element.querySelector('.player-tracklist');
        trackList?.addEventListener('click', (e) => {
            // Check if clicking type filter button
            const typeFilterBtn = e.target.closest('.type-filter-btn');
            if (typeFilterBtn) {
                this.selectedType = typeFilterBtn.dataset.type;
                this._updateTrackList();
                return;
            }

            // Check if clicking back to playlists button
            const backButton = e.target.closest('.playlist-back-button');
            if (backButton) {
                this.selectedPlaylist = null;
                this._updateTrackList();
                return;
            }

            // Check if clicking playlist item
            const playlistItem = e.target.closest('.playlist-item');
            if (playlistItem) {
                const playlistName = playlistItem.dataset.playlistName;
                this.selectedPlaylist = playlistName;
                this._updateTrackList();
                return;
            }

            // Check if clicking group header
            const groupHeader = e.target.closest('.track-group__header');
            if (groupHeader) {
                const groupType = groupHeader.dataset.groupType;
                this._toggleGroup(groupType);
                return;
            }

            // Check if clicking track
            const trackElement = e.target.closest('.player-track');
            if (trackElement) {
                const trackId = trackElement.dataset.trackId; // Keep as string
                const track = this.tracks.find(t => String(t.id) === String(trackId));
                if (track) {
                    this.playTrack(track, true);
                }
            }
        });

        // Audio element events
        this.audioElement = this.element.querySelector('.global-music-player__audio');
        if (this.audioElement) {
            this.audioElement.addEventListener('timeupdate', () => this._updateProgress());
            this.audioElement.addEventListener('loadedmetadata', () => this._updateDuration());
            this.audioElement.addEventListener('play', () => this._updatePlayState(true));
            this.audioElement.addEventListener('pause', () => this._updatePlayState(false));
            this.audioElement.addEventListener('ended', () => this.playNext());
        }
    }

    /**
     * Load tracks from music service
     * @private
     */
    async _loadTracks() {
        try {
            const rawTracks = await this.musicService.getAllTracks();
            // Normalize all tracks
            this.tracks = rawTracks.map(track => this._normalizeTrack(track));
            this.filteredTracks = [...this.tracks];
            this._logger.info(`Loaded ${this.tracks.length} tracks`);
        } catch (error) {
            this._logger.error('Failed to load tracks', error);
            this.tracks = [];
            this.filteredTracks = [];
        }
    }

    /**
     * Reload tracks from music service (public method)
     * @returns {Promise<void>}
     */
    async reloadTracks() {
        this._logger.info('Reloading tracks in GlobalMusicPlayer');

        // Clear repository cache to get fresh data
        if (this.musicService.repository && typeof this.musicService.repository.clearCache === 'function') {
            this.musicService.repository.clearCache();
            this._logger.info('Cleared music repository cache');
        }

        await this._loadTracks();

        // Re-render track list if player is expanded
        if (this.isExpanded) {
            const trackListElement = this.element.querySelector('.player-tracklist');
            if (trackListElement) {
                trackListElement.innerHTML = this._renderTrackList();
            }
        }

        this._logger.info(`Tracks reloaded: ${this.tracks.length} total tracks`);
    }

    /**
     * Handle search input
     * @param {string} query
     * @private
     */
    _handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();

        if (!searchTerm) {
            this.filteredTracks = [...this.tracks];
        } else {
            this.filteredTracks = this.tracks.filter(track =>
                track.title.toLowerCase().includes(searchTerm) ||
                (track.show && track.show.toLowerCase().includes(searchTerm)) ||
                (track.artist && track.artist.toLowerCase().includes(searchTerm))
            );
        }

        this._updateTrackList();
    }

    /**
     * Update track list display
     * @private
     */
    _updateTrackList() {
        const trackListContainer = this.element?.querySelector('.player-tracklist');
        if (trackListContainer) {
            trackListContainer.innerHTML = this._renderTrackList();
        }
    }

    /**
     * Play a track
     * @param {Object} track - Track to play (Music model or plain object)
     * @param {boolean} autoPlay - Whether to auto-play
     */
    playTrack(track, autoPlay = true) {
        // Normalize track object (handle Music domain model)
        const normalizedTrack = this._normalizeTrack(track);

        this.currentTrack = normalizedTrack;
        this._logger.info(`Playing track: ${normalizedTrack.title}`);

        // Update UI
        this._updateTrackInfo();
        this._updateTrackList();

        // Determine if YouTube or audio
        const isYouTube = normalizedTrack.url && (normalizedTrack.url.includes('youtube.com') || normalizedTrack.url.includes('youtu.be'));

        if (isYouTube) {
            this._playYouTubeTrack(normalizedTrack, autoPlay);
        } else {
            this._playAudioTrack(normalizedTrack, autoPlay);
        }

        // Save state
        this._saveState();

        // Emit event
        this._eventBus.emit('globalPlayer:trackChanged', normalizedTrack);
    }

    /**
     * Normalize track object (convert Music model to plain object)
     * @param {Object|Music} track - Track object
     * @returns {Object} Normalized track
     * @private
     */
    _normalizeTrack(track) {
        // If it's a Music domain model, convert it
        if (track.getTitle && typeof track.getTitle === 'function') {
            return {
                id: track.getId(),
                title: track.getTitle(),
                artist: track.getArtist(),
                show: track.getArtist(), // Use artist as show for music
                url: track.getPrimaryUrl(),
                type: track.type || track.genre || 'OST',
                autoplay: track.autoplay || false,
                playlists: track.playlists || []
            };
        }

        // Otherwise assume it's already a plain object
        return track;
    }

    /**
     * Play audio track
     * @param {Object} track
     * @param {boolean} autoPlay
     * @private
     */
    _playAudioTrack(track, autoPlay) {
        if (!this.audioElement) return;

        // CRITICAL: Stop YouTube polling interval when switching to audio
        if (this._youtubeInterval) {
            clearInterval(this._youtubeInterval);
            this._youtubeInterval = null;
        }

        // Hide YouTube, show audio
        const ytContainer = this.element?.querySelector('.global-music-player__youtube');
        if (ytContainer) ytContainer.style.display = 'none';

        // Apply volume settings
        this.audioElement.volume = this.volume;
        this.audioElement.muted = this.isMuted;

        this.audioElement.src = track.url;
        if (autoPlay) {
            this.audioElement.play().catch(err => {
                this._logger.error('Audio playback failed', err);
            });
        }
    }

    /**
     * Play YouTube track
     * @param {Object} track
     * @param {boolean} autoPlay
     * @private
     */
    _playYouTubeTrack(track, autoPlay) {
        const videoId = this._extractYouTubeId(track.url);
        if (!videoId) {
            this._logger.error('Invalid YouTube URL', track.url);
            return;
        }

        // CRITICAL: Clear existing interval before creating new one
        // This prevents resource leaks from multiple polling intervals
        if (this._youtubeInterval) {
            clearInterval(this._youtubeInterval);
            this._youtubeInterval = null;
        }

        // Hide audio, show YouTube
        if (this.audioElement) this.audioElement.pause();

        const ytContainer = this.element?.querySelector('.global-music-player__youtube');
        if (ytContainer) ytContainer.style.display = 'none'; // Keep hidden in minified view

        if (this.youtubePlayer && this.youtubePlayerReady) {
            this.youtubePlayer.loadVideoById({
                videoId: videoId,
                startSeconds: 0,
                suggestedQuality: 'tiny' // Force lowest quality (144p) for audio-only
            });

            // Double-check quality setting after load
            try {
                if (typeof this.youtubePlayer.setPlaybackQuality === 'function') {
                    this.youtubePlayer.setPlaybackQuality('tiny');
                }
            } catch (error) {
                this._logger.debug('Could not set playback quality:', error);
            }

            if (autoPlay) {
                this.youtubePlayer.playVideo();
            }
        } else {
            // Queue for when player is ready
            this._youtubeQueue = { videoId, autoPlay };
        }
    }

    /**
     * Extract YouTube video ID from URL
     * @param {string} url
     * @returns {string|null}
     * @private
     */
    _extractYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
            /youtube\.com\/embed\/([^&\s]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    /**
     * Load YouTube iframe API
     * @private
     */
    _loadYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            this._initializeYouTubePlayer();
            return;
        }

        if (!window.onYouTubeIframeAPIReady) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);

            window.onYouTubeIframeAPIReady = () => {
                this._initializeYouTubePlayer();
            };
        }
    }

    /**
     * Initialize YouTube player
     * @private
     */
    _initializeYouTubePlayer() {
        if (!window.YT || !window.YT.Player) return;

        this.youtubePlayer = new YT.Player('global-youtube-player', {
            height: '0',
            width: '0',
            playerVars: {
                autoplay: 0,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                origin: window.location.origin,
                // OPTIMIZATION: Reduce bandwidth for audio-only playback
                vq: 'tiny',           // Request lowest video quality (144p)
                playsinline: 1,       // Prevent fullscreen on mobile
                disablekb: 1,         // Disable keyboard controls
                fs: 0,                // Hide fullscreen button
                iv_load_policy: 3     // Hide video annotations
            },
            events: {
                onReady: () => this._onYouTubeReady(),
                onStateChange: (event) => this._onYouTubeStateChange(event)
            }
        });
    }

    /**
     * YouTube player ready handler
     * @private
     */
    _onYouTubeReady() {
        this.youtubePlayerReady = true;
        this._logger.info('YouTube player ready');

        // OPTIMIZATION: Force lowest quality for audio-only playback
        // This dramatically reduces bandwidth and videoplayback requests
        try {
            if (typeof this.youtubePlayer.setPlaybackQuality === 'function') {
                this.youtubePlayer.setPlaybackQuality('tiny'); // 144p - lowest quality
            }
        } catch (error) {
            this._logger.debug('Could not set playback quality:', error);
        }

        // Apply volume settings
        try {
            if (typeof this.youtubePlayer.setVolume === 'function') {
                this.youtubePlayer.setVolume(this.volume * 100);
            }
            if (this.isMuted && typeof this.youtubePlayer.mute === 'function') {
                this.youtubePlayer.mute();
            }
        } catch (error) {
            this._logger.debug('Could not set YouTube volume:', error);
        }

        // Play queued video if any
        if (this._youtubeQueue) {
            const { videoId, autoPlay } = this._youtubeQueue;
            this.youtubePlayer.loadVideoById({ videoId, startSeconds: 0 });
            if (autoPlay) {
                this.youtubePlayer.playVideo();
            }
            this._youtubeQueue = null;
        }

        // Start time tracking
        this._startYouTubeTimeTracking();
    }

    /**
     * YouTube state change handler
     * @param {Object} event
     * @private
     */
    _onYouTubeStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            this._updatePlayState(true);
            // Ensure tracking interval is running when playing
            this._startYouTubeTimeTracking();
        } else if (event.data === YT.PlayerState.PAUSED) {
            this._updatePlayState(false);
            // Stop polling when paused to save resources
            if (this._youtubeInterval) {
                clearInterval(this._youtubeInterval);
                this._youtubeInterval = null;
            }
        } else if (event.data === YT.PlayerState.ENDED) {
            // Stop polling when video ends
            if (this._youtubeInterval) {
                clearInterval(this._youtubeInterval);
                this._youtubeInterval = null;
            }
            this.playNext();
        }
    }

    /**
     * Start YouTube time tracking
     * @private
     */
    _startYouTubeTimeTracking() {
        if (this._youtubeInterval) {
            clearInterval(this._youtubeInterval);
        }

        // Poll every 1 second (reduced from 500ms to save resources)
        // This provides smooth progress updates while minimizing API calls
        this._youtubeInterval = setInterval(() => {
            if (this.youtubePlayer && this.youtubePlayerReady &&
                typeof this.youtubePlayer.getCurrentTime === 'function' &&
                typeof this.youtubePlayer.getDuration === 'function') {

                this.currentTime = this.youtubePlayer.getCurrentTime();
                this.duration = this.youtubePlayer.getDuration();
                this._updateProgressDisplay();

                // Save state every 2 seconds during YouTube playback
                if (!this._lastStateSaveTime || Date.now() - this._lastStateSaveTime > 2000) {
                    this._saveState();
                    this._lastStateSaveTime = Date.now();
                }
            }
        }, 1000); // Optimized: 1000ms instead of 500ms
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Play current track
     */
    play() {
        if (!this.currentTrack) return;

        const isYouTube = this.currentTrack.url &&
            (this.currentTrack.url.includes('youtube.com') || this.currentTrack.url.includes('youtu.be'));

        if (isYouTube && this.youtubePlayer && this.youtubePlayerReady) {
            this.youtubePlayer.playVideo();
        } else if (this.audioElement) {
            this.audioElement.play();
        }
    }

    /**
     * Pause current track
     */
    pause() {
        if (this.youtubePlayer && this.youtubePlayerReady && typeof this.youtubePlayer.pauseVideo === 'function') {
            this.youtubePlayer.pauseVideo();
        }
        if (this.audioElement) {
            this.audioElement.pause();
        }

        // Optional: Stop polling when paused to save resources
        // Note: Interval will restart when play() is called via _startYouTubeTimeTracking
        if (this._youtubeInterval) {
            clearInterval(this._youtubeInterval);
            this._youtubeInterval = null;
        }
    }

    /**
     * Get the currently visible tracks based on view mode and filters
     * This respects selectedType and selectedPlaylist selections
     * @returns {Array}
     * @private
     */
    _getVisibleTracks() {
        const baseFilteredTracks = this.filteredTracks.length > 0 ? this.filteredTracks : this.tracks;

        // If in type view and a specific type is selected, filter by that type
        if (this.viewMode === 'type' && this.selectedType) {
            return baseFilteredTracks.filter(track => track.type === this.selectedType);
        }

        // If in playlist view and a specific playlist is selected, filter by that playlist
        if (this.viewMode === 'playlist' && this.selectedPlaylist) {
            return baseFilteredTracks.filter(track =>
                track.playlists && track.playlists.includes(this.selectedPlaylist)
            );
        }

        // Otherwise return the base filtered tracks
        return baseFilteredTracks;
    }

    /**
     * Play next track
     */
    playNext() {
        const tracksToUse = this._getVisibleTracks();
        const currentIndex = tracksToUse.findIndex(t => t.id === this.currentTrack?.id);
        const nextIndex = (currentIndex + 1) % tracksToUse.length;
        if (tracksToUse[nextIndex]) {
            this.playTrack(tracksToUse[nextIndex], true);
        }
    }

    /**
     * Play previous track
     */
    playPrevious() {
        const tracksToUse = this._getVisibleTracks();
        const currentIndex = tracksToUse.findIndex(t => t.id === this.currentTrack?.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tracksToUse.length - 1;
        if (tracksToUse[prevIndex]) {
            this.playTrack(tracksToUse[prevIndex], true);
        }
    }

    /**
     * Seek to position
     * @param {number} percentage - 0-100
     */
    seek(percentage) {
        const position = (percentage / 100) * this.duration;

        if (this.youtubePlayer && this.youtubePlayerReady && typeof this.youtubePlayer.seekTo === 'function') {
            this.youtubePlayer.seekTo(position, true);
        } else if (this.audioElement) {
            this.audioElement.currentTime = position;
        }
    }

    /**
     * Set volume
     * @param {number} volume - 0 to 1
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.isMuted = false;

        // Apply to audio element
        if (this.audioElement) {
            this.audioElement.volume = this.volume;
        }

        // Apply to YouTube player
        if (this.youtubePlayer && this.youtubePlayerReady && typeof this.youtubePlayer.setVolume === 'function') {
            this.youtubePlayer.setVolume(this.volume * 100);
        }

        this._updateVolumeDisplay();
        this._saveVolumeState();
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;

        // Apply to audio element
        if (this.audioElement) {
            this.audioElement.muted = this.isMuted;
        }

        // Apply to YouTube player
        if (this.youtubePlayer && this.youtubePlayerReady) {
            if (this.isMuted && typeof this.youtubePlayer.mute === 'function') {
                this.youtubePlayer.mute();
            } else if (!this.isMuted && typeof this.youtubePlayer.unMute === 'function') {
                this.youtubePlayer.unMute();
            }
        }

        this._updateVolumeDisplay();
        this._saveVolumeState();
    }

    /**
     * Update volume display
     * @private
     */
    _updateVolumeDisplay() {
        const volumeIcon = this.element?.querySelector('.volume-icon');
        const volumeSlider = this.element?.querySelector('.volume-slider');

        if (volumeIcon) {
            if (this.isMuted) {
                volumeIcon.textContent = '🔇';
            } else if (this.volume > 0.5) {
                volumeIcon.textContent = '🔊';
            } else if (this.volume > 0) {
                volumeIcon.textContent = '🔉';
            } else {
                volumeIcon.textContent = '🔈';
            }
        }

        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
            // Update slider gradient to show filled portion
            const percentage = this.volume * 100;
            volumeSlider.style.background = `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percentage}%, var(--color-border) ${percentage}%, var(--color-border) 100%)`;
        }
    }

    /**
     * Save volume state to localStorage
     * @private
     */
    _saveVolumeState() {
        try {
            localStorage.setItem('globalPlayer:volume', this.volume.toString());
            localStorage.setItem('globalPlayer:muted', this.isMuted.toString());
        } catch (error) {
            this._logger.warn('Failed to save volume state:', error.message);
        }
    }

    /**
     * Load volume state from localStorage
     * @private
     */
    _loadVolumeState() {
        try {
            const savedVolume = localStorage.getItem('globalPlayer:volume');
            const savedMuted = localStorage.getItem('globalPlayer:muted');

            if (savedVolume !== null) {
                this.volume = parseFloat(savedVolume);
            }

            if (savedMuted !== null) {
                this.isMuted = savedMuted === 'true';
            }

            // Apply loaded volume to audio element if it exists
            if (this.audioElement) {
                this.audioElement.volume = this.volume;
                this.audioElement.muted = this.isMuted;
            }
        } catch (error) {
            this._logger.warn('Failed to load volume state:', error.message);
        }
    }

    /**
     * Update play state
     * @param {boolean} playing
     * @private
     */
    _updatePlayState(playing) {
        this.isPlaying = playing;

        const playBtn = this.element?.querySelector('.control-btn--play .play-icon');
        if (playBtn) {
            playBtn.textContent = playing ? '⏸' : '▶';
        }

        // Emit playback state events for other components (like header)
        if (playing) {
            this._eventBus.emit('globalPlayer:playing');
        } else {
            this._eventBus.emit('globalPlayer:paused');
        }

        // Save state when play/pause changes
        this._saveState();
    }

    /**
     * Update progress from audio element
     * @private
     */
    _updateProgress() {
        if (this.audioElement) {
            this.currentTime = this.audioElement.currentTime;
            this.duration = this.audioElement.duration || 0;
            this._updateProgressDisplay();

            // Save state every 2 seconds during playback
            if (!this._lastStateSaveTime || Date.now() - this._lastStateSaveTime > 2000) {
                this._saveState();
                this._lastStateSaveTime = Date.now();
            }
        }
    }

    /**
     * Update duration from audio element
     * @private
     */
    _updateDuration() {
        if (this.audioElement) {
            this.duration = this.audioElement.duration || 0;
            this._updateProgressDisplay();
        }
    }

    /**
     * Update progress display
     * @private
     */
    _updateProgressDisplay() {
        const percentage = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;

        const fillBar = this.element?.querySelector('.progress-bar__fill');
        if (fillBar) {
            fillBar.style.width = `${percentage}%`;
        }

        const slider = this.element?.querySelector('.progress-bar__slider');
        if (slider) {
            slider.value = percentage;
        }

        const currentTimeEl = this.element?.querySelector('.progress-time--current');
        if (currentTimeEl) {
            currentTimeEl.textContent = this._formatTime(this.currentTime);
        }

        const durationEl = this.element?.querySelector('.progress-time--duration');
        if (durationEl) {
            durationEl.textContent = this._formatTime(this.duration);
        }
    }

    /**
     * Update track info display
     * @private
     */
    _updateTrackInfo() {
        const titleEl = this.element?.querySelector('.track-title');
        const artistEl = this.element?.querySelector('.track-artist');

        if (titleEl) {
            titleEl.textContent = this.currentTrack ? this.currentTrack.title : 'No track playing';
        }
        if (artistEl) {
            artistEl.textContent = this.currentTrack ? (this.currentTrack.show || 'Unknown') : '';
        }
    }

    /**
     * Format time in MM:SS
     * @param {number} seconds
     * @returns {string}
     * @private
     */
    _formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Show player
     */
    show() {
        this.isVisible = true;
        if (this.element) {
            this.element.setAttribute('data-visible', 'true');
        }
        this._saveState();
    }

    /**
     * Hide player
     */
    hide() {
        this.isVisible = false;
        if (this.element) {
            this.element.setAttribute('data-visible', 'false');
        }
        this._saveState();
    }

    /**
     * Toggle player visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Toggle expanded/collapsed state
     */
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        if (this.element) {
            this.element.setAttribute('data-expanded', this.isExpanded.toString());

            const toggleIcon = this.element.querySelector('.toggle-icon');
            if (toggleIcon) {
                toggleIcon.textContent = this.isExpanded ? '▲' : '▼';
            }
        }
        this._saveState();
    }

    /**
     * Save current player state to localStorage
     * @private
     */
    _saveState() {
        try {
            const state = {
                isVisible: this.isVisible,
                isExpanded: this.isExpanded,
                currentTrackId: this.currentTrack?.id || null,
                currentTime: this.currentTime || 0,
                isPlaying: this.isPlaying,
                viewMode: this.viewMode,
                selectedType: this.selectedType,
                selectedPlaylist: this.selectedPlaylist
            };

            localStorage.setItem('globalPlayer', JSON.stringify(state));
        } catch (error) {
            this._logger.error('Failed to save player state', error);
        }
    }

    /**
     * Restore player state from localStorage
     * @private
     */
    _restoreState() {
        try {
            const stateJson = localStorage.getItem('globalPlayer');
            if (!stateJson) return;

            const state = JSON.parse(stateJson);

            // Restore view preferences
            if (state.viewMode) {
                this.viewMode = state.viewMode;
            }
            if (state.selectedType) {
                this.selectedType = state.selectedType;
            }
            if (state.selectedPlaylist) {
                this.selectedPlaylist = state.selectedPlaylist;
            }

            if (state.isVisible) {
                this.show();
            }

            if (state.isExpanded) {
                this.toggleExpanded();
            }

            if (state.currentTrackId) {
                const track = this.tracks.find(t => String(t.id) === String(state.currentTrackId));
                if (track) {
                    this._logger.info(`Restoring track: ${track.title} at ${state.currentTime}s`);
                    this.playTrack(track, false); // Don't autoplay immediately

                    // Restore playback position after media loads
                    if (state.currentTime && state.currentTime > 0) {
                        setTimeout(() => {
                            if (this.audioElement && this.duration > 0) {
                                const seekPercentage = (state.currentTime / this.duration) * 100;
                                this.seek(seekPercentage);
                                this._logger.info(`Restored playback position to ${state.currentTime}s`);
                            } else if (this.youtubePlayer && this.youtubePlayerReady) {
                                this.youtubePlayer.seekTo(state.currentTime, true);
                                this._logger.info(`Restored YouTube position to ${state.currentTime}s`);
                            }
                        }, 1500); // Wait for media to load
                    }
                }
            }
        } catch (error) {
            this._logger.error('Failed to restore player state', error);
        }
    }

    /**
     * Escape HTML
     * @param {string} text
     * @returns {string}
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this._youtubeInterval) {
            clearInterval(this._youtubeInterval);
        }

        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
        }

        if (this.element) {
            this.element.remove();
        }

        super.destroy();
    }
}
