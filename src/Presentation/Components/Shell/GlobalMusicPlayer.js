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
                
                <!-- Expanded Section (Search + Track List) -->
                <div class="global-music-player__expanded">
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

        return this.filteredTracks.map(track => `
            <div class="player-track ${this.currentTrack && String(this.currentTrack.id) === String(track.id) ? 'player-track--active' : ''}" 
                 data-track-id="${track.id}">
                <div class="player-track__info">
                    <div class="player-track__title">${this._escapeHtml(track.title)}</div>
                    <div class="player-track__meta">${this._escapeHtml(track.show || track.artist || 'Unknown')} · ${this._escapeHtml(track.type || '')}</div>
                </div>
                <button class="player-track__play" aria-label="Play ${this._escapeHtml(track.title)}">▶</button>
            </div>
        `).join('');
    }

    /**
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

        // Progress bar
        const progressSlider = this.element.querySelector('.progress-bar__slider');
        progressSlider?.addEventListener('input', (e) => this.seek(e.target.value));

        // Search input
        const searchInput = this.element.querySelector('.player-search__input');
        searchInput?.addEventListener('input', (e) => this._handleSearch(e.target.value));

        // Track list clicks
        const trackList = this.element.querySelector('.player-tracklist');
        trackList?.addEventListener('click', (e) => {
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
                type: track.genre || 'Music',
                autoplay: track.autoplay || false
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

        // Hide YouTube, show audio
        const ytContainer = this.element?.querySelector('.global-music-player__youtube');
        if (ytContainer) ytContainer.style.display = 'none';

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

        // Hide audio, show YouTube
        if (this.audioElement) this.audioElement.pause();

        const ytContainer = this.element?.querySelector('.global-music-player__youtube');
        if (ytContainer) ytContainer.style.display = 'none'; // Keep hidden in minified view

        if (this.youtubePlayer && this.youtubePlayerReady) {
            this.youtubePlayer.loadVideoById({
                videoId: videoId,
                startSeconds: 0
            });
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
                origin: window.location.origin
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
        } else if (event.data === YT.PlayerState.PAUSED) {
            this._updatePlayState(false);
        } else if (event.data === YT.PlayerState.ENDED) {
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

        this._youtubeInterval = setInterval(() => {
            if (this.youtubePlayer && this.youtubePlayerReady &&
                typeof this.youtubePlayer.getCurrentTime === 'function' &&
                typeof this.youtubePlayer.getDuration === 'function') {

                this.currentTime = this.youtubePlayer.getCurrentTime();
                this.duration = this.youtubePlayer.getDuration();
                this._updateProgressDisplay();
            }
        }, 500);
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
    }

    /**
     * Play next track
     */
    playNext() {
        const currentIndex = this.tracks.findIndex(t => t.id === this.currentTrack?.id);
        const nextIndex = (currentIndex + 1) % this.tracks.length;
        if (this.tracks[nextIndex]) {
            this.playTrack(this.tracks[nextIndex], true);
        }
    }

    /**
     * Play previous track
     */
    playPrevious() {
        const currentIndex = this.tracks.findIndex(t => t.id === this.currentTrack?.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.tracks.length - 1;
        if (this.tracks[prevIndex]) {
            this.playTrack(this.tracks[prevIndex], true);
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
     * Save player state
     * @private
     */
    _saveState() {
        const state = {
            isVisible: this.isVisible,
            isExpanded: this.isExpanded,
            currentTrackId: this.currentTrack?.id,
            currentTime: this.currentTime
        };

        try {
            localStorage.setItem('globalPlayer', JSON.stringify(state));
        } catch (error) {
            this._logger.error('Failed to save player state', error);
        }
    }

    /**
     * Restore player state
     * @private
     */
    _restoreState() {
        try {
            const stateJson = localStorage.getItem('globalPlayer');
            if (!stateJson) return;

            const state = JSON.parse(stateJson);

            if (state.isVisible) {
                this.show();
            }

            if (state.isExpanded) {
                this.toggleExpanded();
            }

            if (state.currentTrackId) {
                const track = this.tracks.find(t => t.id === state.currentTrackId);
                if (track) {
                    this.playTrack(track, false);
                    if (state.currentTime) {
                        setTimeout(() => this.seek((state.currentTime / this.duration) * 100), 1000);
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
