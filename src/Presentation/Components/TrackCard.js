/**
 * Track Card Component
 * Displays a music track in card format with play controls and rating.
 */

import { BaseComponent } from './BaseComponent.js';

export class TrackCard extends BaseComponent {
    /**
     * Create a track card component
     * @param {object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {Music} options.track - Track to display
     * @param {function} options.onPlay - Callback for play button
     * @param {function} options.onRate - Callback for rating change
     * @param {function} options.onSelect - Callback for card click
     * @param {boolean} options.isPlaying - Whether track is currently playing
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger
     */
    constructor(options) {
        super({
            ...options,
            name: 'TrackCard',
            props: {
                track: options.track,
                isPlaying: options.isPlaying || false,
                onPlay: options.onPlay || (() => { }),
                onRate: options.onRate || (() => { }),
                onSelect: options.onSelect || (() => { })
            }
        });
    }

    /**
     * Get component template
     * @returns {string} HTML template
     * @protected
     */
    _template() {
        const track = this._props.track;
        const isPlaying = this._props.isPlaying;
        const title = this._escapeHtml(track.getTitle());
        const artist = this._escapeHtml(track.getArtist());
        const album = track.getAlbum() ? this._escapeHtml(track.getAlbum()) : 'Unknown Album';
        const rating = track.getRating() || 0;
        const playCount = track.getPlayCount() || 0;
        const playingClass = isPlaying ? 'track-card--playing' : '';

        return `
            <div class="track-card ${playingClass}" data-track-id="${track.getId()}">
                <div class="track-card__header">
                    <div class="track-card__play-button" data-action="play">
                        <span class="play-icon">${isPlaying ? '⏸' : '▶'}</span>
                    </div>
                    <div class="track-card__info">
                        <h3 class="track-card__title">${title}</h3>
                        <p class="track-card__artist">${artist}</p>
                    </div>
                </div>
                
                <div class="track-card__body">
                    <div class="track-card__album">
                        <span class="label">Album:</span>
                        <span class="value">${album}</span>
                    </div>
                    <div class="track-card__play-count">
                        <span class="label">Plays:</span>
                        <span class="value">${playCount}</span>
                    </div>
                </div>
                
                <div class="track-card__footer">
                    <div class="track-card__rating">
                        <span class="rating-label">Rating:</span>
                        <div class="rating-stars" data-action="rate">
                            ${this._renderStars(rating)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize component
     * @protected
     */
    _initialize() {
        // Add click handler for card selection
        this._addEventListener(this._element, 'click', (e) => {
            if (!e.target.closest('[data-action]')) {
                this._props.onSelect(this._props.track);
                this._emit('select', { track: this._props.track });
            }
        });

        // Add play button handler
        const playBtn = this._querySelector('[data-action="play"]');
        if (playBtn) {
            this._addEventListener(playBtn, 'click', (e) => {
                e.stopPropagation();
                this._props.onPlay(this._props.track);
                this._emit('play', { track: this._props.track });
            });
        }

        // Add rating handler
        const ratingContainer = this._querySelector('[data-action="rate"]');
        if (ratingContainer) {
            const stars = ratingContainer.querySelectorAll('.star');
            stars.forEach((star, index) => {
                this._addEventListener(star, 'click', (e) => {
                    e.stopPropagation();
                    const rating = index + 1;
                    this._props.onRate(this._props.track, rating);
                    this._emit('rate', { track: this._props.track, rating });
                });

                this._addEventListener(star, 'mouseenter', () => {
                    this._highlightStars(index + 1);
                });
            });

            this._addEventListener(ratingContainer, 'mouseleave', () => {
                this._highlightStars(this._props.track.getRating() || 0);
            });
        }
    }

    /**
     * Render rating stars
     * @param {number} rating - Current rating (0-5)
     * @returns {string} Stars HTML
     * @private
     */
    _renderStars(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            const filled = i <= rating;
            const starClass = filled ? 'star star--filled' : 'star star--empty';
            html += `<span class="${starClass}" data-rating="${i}">★</span>`;
        }
        return html;
    }

    /**
     * Highlight stars up to rating
     * @param {number} rating - Rating to highlight
     * @private
     */
    _highlightStars(rating) {
        const stars = this._querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('star--filled');
                star.classList.remove('star--empty');
            } else {
                star.classList.add('star--empty');
                star.classList.remove('star--filled');
            }
        });
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

    /**
     * Update track data
     * @param {Music} track - Updated track
     */
    updateTrack(track) {
        this.update({ track });
    }

    /**
     * Update playing state
     * @param {boolean} isPlaying - Whether track is playing
     */
    updatePlayingState(isPlaying) {
        this.update({ isPlaying });
    }
}
