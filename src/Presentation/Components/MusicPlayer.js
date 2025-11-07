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
            </div>
        `;
    }

    /**
     * Initialize component
     * @protected
     */
    _initialize() {
        this._audioElement = this._querySelector('[data-audio]');

        if (this._audioElement) {
            // Set up audio element event listeners
            this._addEventListener(this._audioElement, 'loadedmetadata', () => this._onLoadedMetadata());
            this._addEventListener(this._audioElement, 'timeupdate', () => this._onTimeUpdate());
            this._addEventListener(this._audioElement, 'ended', () => this._onEnded());
            this._addEventListener(this._audioElement, 'play', () => this._onPlay());
            this._addEventListener(this._audioElement, 'pause', () => this._onPause());
            this._addEventListener(this._audioElement, 'error', (e) => this._onError(e));
        }

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
        if (!this._audioElement || !track) return;

        try {
            // Get audio source URL - prioritize different sources
            const audioUrl = this._getAudioUrl(track);

            if (!audioUrl) {
                this._logger.warn('No audio URL available for track:', track.getTitle());
                this._showError('No audio source available for this track');
                return;
            }

            this._audioElement.src = audioUrl;
            this._audioElement.load();

            this._logger.info('Track loaded:', track.getTitle());
        } catch (error) {
            this._logger.error('Failed to load track:', error);
            this._showError('Failed to load track');
        }
    }

    /**
     * Get audio URL for track
     * @param {Music} track - Track
     * @returns {string|null} Audio URL
     * @private
     */
    _getAudioUrl(track) {
        // Try different audio sources in order of preference
        if (track.getLocalFile?.()) {
            return track.getLocalFile();
        }

        if (track.getYouTubeUrl?.()) {
            // For demo purposes, we'll just log YouTube URLs
            // In production, you'd need YouTube API or iframe embed
            this._logger.info('YouTube URL available but not directly playable:', track.getYouTubeUrl());
        }

        if (track.getSpotifyUrl?.()) {
            // Spotify URLs need special handling with Spotify Web API
            this._logger.info('Spotify URL available but needs Web API:', track.getSpotifyUrl());
        }

        // For demo, create a placeholder audio URL or return null
        this._logger.warn('No direct audio URL available for track');
        return null;
    }

    /**
     * Handle play/pause button click
     * @private
     */
    _handlePlayPause() {
        if (!this._audioElement || !this._props.track) return;

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

    /**
     * Handle stop button click
     * @private
     */
    _handleStop() {
        if (!this._audioElement) return;

        this._audioElement.pause();
        this._audioElement.currentTime = 0;
        this._props.onStop();
    }

    /**
     * Handle progress slider change
     * @param {Event} e - Input event
     * @private
     */
    _handleProgressChange(e) {
        if (!this._audioElement) return;

        const newTime = parseFloat(e.target.value);
        this._audioElement.currentTime = newTime;
    }

    /**
     * Handle volume slider change
     * @param {Event} e - Input event
     * @private
     */
    _handleVolumeChange(e) {
        if (!this._audioElement) return;

        const newVolume = parseFloat(e.target.value);
        this._volume = newVolume;
        this._audioElement.volume = newVolume;
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
     */
    updateTrack(track) {
        this.update({ track });
        this._loadTrack(track);
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