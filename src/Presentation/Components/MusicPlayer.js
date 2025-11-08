/**
 * Music Player Component
 * Provides audio playback controls and streaming functionality
 */

import { BaseComponent } from './BaseComponent.js';

export class MusicPlayer extends BaseComponent {
    /**
     * Create a music player component
     * @param {object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {Music|null} options.track - Current track
     * @param {function} options.onPlay - Callback for play button
     * @param {function} options.onPause - Callback for pause button
     * @param {function} options.onStop - Callback for stop button
     * @param {function} options.onNext - Callback for next track
     * @param {function} options.onPrevious - Callback for previous track
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger
     */
    constructor(options) {
        super({
            ...options,
            name: 'MusicPlayer',
            props: {
                track: options.track || null,
                onPlay: options.onPlay || (() => { }),
                onPause: options.onPause || (() => { }),
                onStop: options.onStop || (() => { }),
                onNext: options.onNext || (() => { }),
                onPrevious: options.onPrevious || (() => { })
            }
        });

        this._audioElement = null;
        this._isPlaying = false;
        this._currentTime = 0;
        this._duration = 0;
        this._volume = 1.0;
    }

    /**
     * Get component template
     * @returns {string} HTML template
     * @protected
     */
    _template() {
        const track = this._props.track;
        const hasTrack = track !== null;
        const trackTitle = hasTrack ? this._escapeHtml(track.getTitle()) : 'No track selected';
        const trackArtist = hasTrack ? this._escapeHtml(track.getArtist() || 'Unknown Artist') : '';

        return `
            <div class="music-player ${hasTrack ? 'music-player--active' : 'music-player--inactive'}">
                <div class="music-player__info">
                    <div class="music-player__track">
                        <div class="music-player__title">${trackTitle}</div>
                        ${trackArtist ? `<div class="music-player__artist">${trackArtist}</div>` : ''}
                    </div>
                    <div class="music-player__time">
                        <span class="time-current">0:00</span>
                        <span class="time-separator">/</span>
                        <span class="time-duration">0:00</span>
                    </div>
                </div>
                
                <div class="music-player__controls">
                    <button class="btn btn--ghost btn--icon" data-action="previous" ${!hasTrack ? 'disabled' : ''}>
                        ⏮️
                    </button>
                    <button class="btn btn--primary btn--icon btn--play-pause" data-action="play-pause" ${!hasTrack ? 'disabled' : ''}>
                        ${this._isPlaying ? '⏸️' : '▶️'}
                    </button>
                    <button class="btn btn--ghost btn--icon" data-action="next" ${!hasTrack ? 'disabled' : ''}>
                        ⏭️
                    </button>
                    <button class="btn btn--ghost btn--icon" data-action="stop" ${!hasTrack ? 'disabled' : ''}>
                        ⏹️
                    </button>
                </div>
                
                <div class="music-player__progress">
                    <input 
                        type="range" 
                        class="progress-slider" 
                        data-slider="progress"
                        min="0" 
                        max="${this._duration}" 
                        value="${this._currentTime}"
                        ${!hasTrack ? 'disabled' : ''}
                    />
                </div>
                
                <div class="music-player__volume">
                    <span class="volume-icon">🔊</span>
                    <input 
                        type="range" 
                        class="volume-slider" 
                        data-slider="volume"
                        min="0" 
                        max="1" 
                        step="0.1"
                        value="${this._volume}"
                    />
                </div>

                <audio data-audio style="display: none;"></audio>
                <div data-youtube-player style="display: none;"></div>
            </div>
        `;
    }

    /**
     * Initialize component
     * @protected
     */
    _initialize() {
        this._audioElement = this._querySelector('[data-audio]');
        this._youtubeContainer = this._querySelector('[data-youtube-player]');
        this._youtubePlayer = null;
        this._youtubePlayerReady = false;
        this._currentSourceType = null;

        if (this._audioElement) {
            // Set up audio element event listeners
            this._addEventListener(this._audioElement, 'loadedmetadata', () => this._onLoadedMetadata());
            this._addEventListener(this._audioElement, 'timeupdate', () => this._onTimeUpdate());
            this._addEventListener(this._audioElement, 'ended', () => this._onEnded());
            this._addEventListener(this._audioElement, 'play', () => this._onPlay());
            this._addEventListener(this._audioElement, 'pause', () => this._onPause());
            this._addEventListener(this._audioElement, 'error', (e) => this._onError(e));
        }

        // Load YouTube iframe API
        this._loadYouTubeAPI();

        // Control button handlers
        const playPauseBtn = this._querySelector('[data-action="play-pause"]');
        if (playPauseBtn) {
            this._addEventListener(playPauseBtn, 'click', () => this._handlePlayPause());
        }

        const stopBtn = this._querySelector('[data-action="stop"]');
        if (stopBtn) {
            this._addEventListener(stopBtn, 'click', () => this._handleStop());
        }

        const previousBtn = this._querySelector('[data-action="previous"]');
        if (previousBtn) {
            this._addEventListener(previousBtn, 'click', () => this._props.onPrevious());
        }

        const nextBtn = this._querySelector('[data-action="next"]');
        if (nextBtn) {
            this._addEventListener(nextBtn, 'click', () => this._props.onNext());
        }

        // Slider handlers
        const progressSlider = this._querySelector('[data-slider="progress"]');
        if (progressSlider) {
            this._addEventListener(progressSlider, 'input', (e) => this._handleProgressChange(e));
        }

        const volumeSlider = this._querySelector('[data-slider="volume"]');
        if (volumeSlider) {
            this._addEventListener(volumeSlider, 'input', (e) => this._handleVolumeChange(e));
        }

        // Load track if provided
        if (this._props.track) {
            this._loadTrack(this._props.track);
        }
    }

    /**
     * Load a track into the player
     * @param {Music} track - Track to load
     */
    _loadTrack(track) {
        if (!track) return;

        try {
            const sourceType = track.getPrimarySourceType();
            this._currentSourceType = sourceType;

            // Clean up previous player
            this._stopCurrentPlayer();

            if (sourceType === 'youtube') {
                this._loadYouTubeTrack(track);
            } else {
                this._loadAudioTrack(track);
            }

            this._logger.info('Track loaded:', track.getTitle());
        } catch (error) {
            this._logger.error('Failed to load track:', error);
            this._showError('Failed to load track');
        }
    }

    /**
     * Load track into HTML5 audio element
     * @param {Music} track - Track
     * @private
     */
    _loadAudioTrack(track) {
        if (!this._audioElement) return;

        const audioUrl = track.localFile;

        if (!audioUrl) {
            this._logger.warn('No direct audio file available for track:', track.getTitle());
            this._showError('No audio source available for this track');
            return;
        }

        this._audioElement.src = audioUrl;
        this._audioElement.load();
        this._audioElement.style.display = '';
        if (this._youtubeContainer) {
            this._youtubeContainer.style.display = 'none';
        }
    }

    /**
     * Load YouTube track
     * @param {Music} track - Track
     * @private
     */
    _loadYouTubeTrack(track) {
        const youtubeUrl = track.youtubeUrl;
        if (!youtubeUrl) {
            this._showError('No YouTube URL available');
            return;
        }

        const videoId = this._extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            this._logger.error('Invalid YouTube URL:', youtubeUrl);
            this._showError('Invalid YouTube URL');
            return;
        }

        // Hide audio element, show YouTube container
        if (this._audioElement) {
            this._audioElement.style.display = 'none';
        }

        if (!window.YT || !window.YT.Player) {
            this._logger.warn('YouTube API not loaded yet, waiting...');
            // Try again after API loads
            setTimeout(() => this._loadYouTubeTrack(track), 500);
            return;
        }

        // Create YouTube player
        if (this._youtubePlayer && this._youtubePlayerReady) {
            // Player exists and is ready, load new video
            try {
                if (typeof this._youtubePlayer.loadVideoById === 'function') {
                    this._youtubePlayer.loadVideoById({
                        videoId: videoId,
                        suggestedQuality: 'tiny'
                    });
                    // Double-check quality setting
                    this._youtubePlayer.setPlaybackQuality('tiny');
                } else {
                    this._logger.warn('YouTube player exists but loadVideoById not available, recreating...');
                    this._destroyYouTubePlayer();
                    setTimeout(() => this._loadYouTubeTrack(track), 100);
                }
            } catch (error) {
                this._logger.warn('Error loading video, recreating player:', error.message);
                this._destroyYouTubePlayer();
                setTimeout(() => this._loadYouTubeTrack(track), 100);
            }
        } else if (this._youtubePlayer && !this._youtubePlayerReady) {
            // Player exists but not ready yet, wait and retry
            this._logger.debug('YouTube player not ready yet, waiting...');
            setTimeout(() => this._loadYouTubeTrack(track), 500);
        } else {
            // Create new player
            this._logger.info('Creating new YouTube player for video:', videoId);
            this._youtubePlayerReady = false;

            // Check if track should autoplay
            const shouldAutoplay = track.autoplay ? 1 : 0;

            this._youtubePlayer = new window.YT.Player(this._youtubeContainer, {
                height: '0',
                width: '0',
                videoId: videoId,
                playerVars: {
                    autoplay: shouldAutoplay,
                    controls: 0,
                    modestbranding: 1,
                    playsinline: 1,
                    enablejsapi: 1,
                    origin: window.location.origin,
                    // OPTIMIZATION: Reduce bandwidth for audio-only playback
                    vq: 'tiny',           // Request lowest video quality (144p)
                    disablekb: 1,         // Disable keyboard controls
                    fs: 0,                // Hide fullscreen button
                    iv_load_policy: 3     // Hide video annotations
                },
                events: {
                    onReady: (event) => this._onYouTubeReady(event),
                    onStateChange: (event) => this._onYouTubeStateChange(event),
                    onError: (event) => this._onYouTubeError(event)
                }
            });
        }
    }

    /**
     * Extract YouTube video ID from URL
     * @param {string} url - YouTube URL
     * @returns {string|null} Video ID
     * @private
     */
    _extractYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
            /youtube\.com\/embed\/([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Load YouTube iframe API
     * @private
     */
    _loadYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            // API already loaded
            return;
        }

        if (window.YTAPILoading) {
            // API is currently loading
            return;
        }

        window.YTAPILoading = true;

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            this._logger.info('YouTube iframe API loaded');
            window.YTAPILoading = false;
        };
    }

    /**
     * Stop current player
     * @private
     */
    _stopCurrentPlayer() {
        if (this._currentSourceType === 'youtube' && this._youtubePlayer) {
            try {
                // Check if stopVideo method exists (player is fully initialized)
                if (typeof this._youtubePlayer.stopVideo === 'function') {
                    this._youtubePlayer.stopVideo();
                }
            } catch (error) {
                this._logger.debug('Could not stop YouTube player:', error.message);
            }
        } else if (this._audioElement) {
            this._audioElement.pause();
            this._audioElement.currentTime = 0;
        }

        // Stop YouTube time tracking if active
        this._stopYouTubeTimeTracking();
    }

    /**
     * Destroy YouTube player
     * @private
     */
    _destroyYouTubePlayer() {
        if (this._youtubePlayer) {
            try {
                if (typeof this._youtubePlayer.destroy === 'function') {
                    this._youtubePlayer.destroy();
                }
            } catch (error) {
                this._logger.debug('Error destroying YouTube player:', error.message);
            }
            this._youtubePlayer = null;
            this._youtubePlayerReady = false;
        }
        this._stopYouTubeTimeTracking();
    }

    /**
     * YouTube player ready handler
     * @private
     */
    _onYouTubeReady(event) {
        this._logger.info('YouTube player ready');
        this._youtubePlayerReady = true;
        this._duration = event.target.getDuration();
        this._updateTimeDisplay();

        // Force lowest quality for audio-only playback
        try {
            event.target.setPlaybackQuality('tiny');
            this._logger.info('Set YouTube quality to tiny (144p) for audio-only playback');
        } catch (error) {
            this._logger.warn('Could not set playback quality:', error.message);
        }

        // Auto-play if track has autoplay enabled
        if (this._props.track && this._props.track.autoplay) {
            this._logger.info('Auto-playing track');
            try {
                event.target.playVideo();
            } catch (error) {
                this._logger.warn('Auto-play failed (may require user interaction):', error.message);
            }
        }
    }

    /**
     * YouTube state change handler
     * @private
     */
    _onYouTubeStateChange(event) {
        // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
        if (event.data === window.YT.PlayerState.PLAYING) {
            this._isPlaying = true;
            this._startYouTubeTimeTracking();
            this._updatePlayPauseButton();
        } else if (event.data === window.YT.PlayerState.PAUSED) {
            this._isPlaying = false;
            this._stopYouTubeTimeTracking();
            this._updatePlayPauseButton();
        } else if (event.data === window.YT.PlayerState.ENDED) {
            this._isPlaying = false;
            this._stopYouTubeTimeTracking();
            this._onEnded();
        }
    }

    /**
     * YouTube error handler
     * @private
     */
    _onYouTubeError(event) {
        this._logger.error('YouTube player error:', event.data);
        this._showError('Failed to load YouTube video');
    }

    /**
     * Start tracking YouTube time
     * @private
     */
    _startYouTubeTimeTracking() {
        if (this._youtubeTimeInterval) return;

        // Poll every 1 second (optimized from 500ms to save resources)
        this._youtubeTimeInterval = setInterval(() => {
            if (this._youtubePlayer && this._youtubePlayer.getCurrentTime) {
                this._currentTime = this._youtubePlayer.getCurrentTime();
                this._duration = this._youtubePlayer.getDuration();
                this._updateTimeDisplay();
                this._updateProgressSlider();
            }
        }, 1000); // Optimized: 1000ms instead of 500ms
    }

    /**
     * Stop tracking YouTube time
     * @private
     */
    _stopYouTubeTimeTracking() {
        if (this._youtubeTimeInterval) {
            clearInterval(this._youtubeTimeInterval);
            this._youtubeTimeInterval = null;
        }
    }

    /**
     * Handle play/pause button click
     * @private
     */
    _handlePlayPause() {
        if (!this._props.track) return;

        if (this._currentSourceType === 'youtube' && this._youtubePlayer) {
            // YouTube player
            try {
                if (this._isPlaying) {
                    if (typeof this._youtubePlayer.pauseVideo === 'function') {
                        this._youtubePlayer.pauseVideo();
                        this._props.onPause();
                    }
                } else {
                    if (typeof this._youtubePlayer.playVideo === 'function') {
                        this._youtubePlayer.playVideo();
                        this._props.onPlay();
                    }
                }
            } catch (error) {
                this._logger.error('YouTube player error:', error);
                this._showError('YouTube player not ready');
            }
        } else if (this._audioElement) {
            // HTML5 audio
            if (this._isPlaying) {
                this._audioElement.pause();
                this._props.onPause();
            } else {
                this._audioElement.play()
                    .then(() => {
                        this._props.onPlay();
                    })
                    .catch((error) => {
                        this._logger.error('Failed to play track:', error);
                        this._showError('Failed to play track');
                    });
            }
        }
    }

    /**
     * Handle stop button click
     * @private
     */
    _handleStop() {
        if (this._currentSourceType === 'youtube' && this._youtubePlayer) {
            try {
                if (typeof this._youtubePlayer.stopVideo === 'function') {
                    this._youtubePlayer.stopVideo();
                }
                if (typeof this._youtubePlayer.seekTo === 'function') {
                    this._youtubePlayer.seekTo(0);
                }
            } catch (error) {
                this._logger.debug('YouTube stop error:', error.message);
            }
        } else if (this._audioElement) {
            this._audioElement.pause();
            this._audioElement.currentTime = 0;
        }

        this._props.onStop();
    }

    /**
     * Handle progress slider change
     * @param {Event} e - Input event
     * @private
     */
    _handleProgressChange(e) {
        const newTime = parseFloat(e.target.value);

        if (this._currentSourceType === 'youtube' && this._youtubePlayer) {
            try {
                if (typeof this._youtubePlayer.seekTo === 'function') {
                    this._youtubePlayer.seekTo(newTime, true);
                }
            } catch (error) {
                this._logger.debug('YouTube seek error:', error.message);
            }
        } else if (this._audioElement) {
            this._audioElement.currentTime = newTime;
        }
    }

    /**
     * Handle volume slider change
     * @param {Event} e - Input event
     * @private
     */
    _handleVolumeChange(e) {
        const newVolume = parseFloat(e.target.value);
        this._volume = newVolume;

        if (this._currentSourceType === 'youtube' && this._youtubePlayer) {
            try {
                if (typeof this._youtubePlayer.setVolume === 'function') {
                    this._youtubePlayer.setVolume(newVolume * 100); // YouTube uses 0-100
                }
            } catch (error) {
                this._logger.debug('YouTube volume error:', error.message);
            }
        } else if (this._audioElement) {
            this._audioElement.volume = newVolume;
        }
    }

    /**
     * Handle audio metadata loaded
     * @private
     */
    _onLoadedMetadata() {
        this._duration = this._audioElement.duration || 0;

        // Update progress slider max value
        const progressSlider = this._querySelector('[data-slider="progress"]');
        if (progressSlider) {
            progressSlider.max = this._duration;
        }

        // Update duration display
        this._updateTimeDisplay();
    }

    /**
     * Handle time update
     * @private
     */
    _onTimeUpdate() {
        this._currentTime = this._audioElement.currentTime || 0;

        // Update progress slider
        const progressSlider = this._querySelector('[data-slider="progress"]');
        if (progressSlider) {
            progressSlider.value = this._currentTime;
        }

        // Update time display
        this._updateTimeDisplay();
    }

    /**
     * Handle audio ended
     * @private
     */
    _onEnded() {
        this._isPlaying = false;
        this._updatePlayButton();
        this._props.onNext(); // Auto-advance to next track
    }

    /**
     * Handle play event
     * @private
     */
    _onPlay() {
        this._isPlaying = true;
        this._updatePlayButton();
        this._emit('track:playing', { track: this._props.track });
    }

    /**
     * Handle pause event
     * @private
     */
    _onPause() {
        this._isPlaying = false;
        this._updatePlayButton();
        this._emit('track:paused', { track: this._props.track });
    }

    /**
     * Handle audio error
     * @param {Event} e - Error event
     * @private
     */
    _onError(e) {
        this._logger.error('Audio playback error:', e);
        this._showError('Audio playback error');
        this._isPlaying = false;
        this._updatePlayButton();
    }

    /**
     * Update play/pause button
     * @private
     */
    _updatePlayButton() {
        const playPauseBtn = this._querySelector('[data-action="play-pause"]');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = this._isPlaying ? '⏸️' : '▶️';
        }
    }

    /**
     * Update play/pause button (alias for consistency)
     * @private
     */
    _updatePlayPauseButton() {
        this._updatePlayButton();
    }

    /**
     * Update progress slider
     * @private
     */
    _updateProgressSlider() {
        const progressSlider = this._querySelector('[data-slider="progress"]');
        if (progressSlider) {
            progressSlider.max = this._duration;
            progressSlider.value = this._currentTime;
        }
    }

    /**
     * Update time display
     * @private
     */
    _updateTimeDisplay() {
        const currentTimeEl = this._querySelector('.time-current');
        const durationEl = this._querySelector('.time-duration');

        if (currentTimeEl) {
            currentTimeEl.textContent = this._formatTime(this._currentTime);
        }

        if (durationEl) {
            durationEl.textContent = this._formatTime(this._duration);
        }
    }

    /**
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     * @private
     */
    _formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @private
     */
    _showError(message) {
        // For now, just show an alert. In production, use toast notifications
        const infoEl = this._querySelector('.music-player__info');
        if (infoEl) {
            infoEl.innerHTML = `
                <div class="music-player__error">
                    <span class="error-icon">⚠️</span>
                    <span class="error-message">${message}</span>
                </div>
            `;
        }
    }

    /**
     * Update track
     * @param {Music|null} track - New track
     * @param {boolean} autoPlay - Whether to auto-play the track
     */
    updateTrack(track, autoPlay = false) {
        this.update({ track });

        // Temporarily override autoplay if requested
        if (autoPlay && track) {
            const originalAutoplay = track.autoplay;
            track.autoplay = true;
            this._loadTrack(track);
            track.autoplay = originalAutoplay;
        } else {
            this._loadTrack(track);
        }
    }

    /**
     * Get current playback state
     * @returns {object} Playback state
     */
    getPlaybackState() {
        return {
            isPlaying: this._isPlaying,
            currentTime: this._currentTime,
            duration: this._duration,
            volume: this._volume,
            track: this._props.track
        };
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}