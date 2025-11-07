/**
 * Show Card Component
 * Displays a show in card format with episode info, status, and actions.
 */

import { BaseComponent } from './BaseComponent.js';

export class ShowCard extends BaseComponent {
    /**
     * Create a show card component
     * @param {object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {Show} options.show - Show to display
     * @param {function} options.onProgress - Callback for progress button
     * @param {function} options.onStatusChange - Callback for status change
     * @param {function} options.onSelect - Callback for card click
     * @param {EventBus} options.eventBus - Event bus
     * @param {Logger} options.logger - Logger
     */
    constructor(options) {
        super({
            ...options,
            name: 'ShowCard',
            props: {
                show: options.show,
                onProgress: options.onProgress || (() => { }),
                onStatusChange: options.onStatusChange || (() => { }),
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
        const show = this._props.show;
        const current = show.getWatchingStatus();
        const total = show.getTotalEpisodes();
        const latest = show.getCurrentEpisode(new Date());
        const status = show.getStatus();
        const title = this._escapeHtml(show.getTitle());
        const airDay = show.getAirDay() || 'Unknown';

        const isBehind = current < latest;
        const behindClass = isBehind ? 'show-card--behind' : '';
        const statusClass = `show-card--${status}`;

        return `
            <div class="show-card ${statusClass} ${behindClass}" data-show-id="${show.getId()}">
                <div class="show-card__header">
                    <h3 class="show-card__title">${title}</h3>
                    <span class="show-card__status show-card__status--${status}">
                        ${this._formatStatus(status)}
                    </span>
                </div>
                
                <div class="show-card__body">
                    <div class="show-card__info">
                        <div class="show-card__air-day">
                            <span class="label">Airs:</span>
                            <span class="value">${airDay}</span>
                        </div>
                        <div class="show-card__episode">
                            <span class="label">Episode:</span>
                            <span class="value">${current} / ${total}</span>
                        </div>
                        <div class="show-card__latest">
                            <span class="label">Latest:</span>
                            <span class="value">${latest}</span>
                        </div>
                    </div>
                    
                    ${isBehind ? `
                        <div class="show-card__alert">
                            <span class="alert-icon">⚠️</span>
                            <span class="alert-text">${latest - current} episodes behind</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="show-card__actions">
                    <button class="btn btn--primary btn--progress" data-action="progress">
                        <span class="btn-icon">▶</span>
                        Progress
                    </button>
                    <select class="select select--status" data-action="status-change">
                        <option value="watching" ${status === 'watching' ? 'selected' : ''}>Watching</option>
                        <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="on_hold" ${status === 'on_hold' ? 'selected' : ''}>On Hold</option>
                        <option value="dropped" ${status === 'dropped' ? 'selected' : ''}>Dropped</option>
                        <option value="plan_to_watch" ${status === 'plan_to_watch' ? 'selected' : ''}>Plan to Watch</option>
                    </select>
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
            if (!e.target.closest('button') && !e.target.closest('select')) {
                this._props.onSelect(this._props.show);
                this._emit('select', { show: this._props.show });
            }
        });

        // Add progress button handler
        const progressBtn = this._querySelector('[data-action="progress"]');
        if (progressBtn) {
            this._addEventListener(progressBtn, 'click', (e) => {
                e.stopPropagation();
                this._props.onProgress(this._props.show);
                this._emit('progress', { show: this._props.show });
            });
        }

        // Add status change handler
        const statusSelect = this._querySelector('[data-action="status-change"]');
        if (statusSelect) {
            this._addEventListener(statusSelect, 'change', (e) => {
                e.stopPropagation();
                const newStatus = e.target.value;
                this._props.onStatusChange(this._props.show, newStatus);
                this._emit('status-change', { show: this._props.show, status: newStatus });
            });
        }
    }

    /**
     * Format status for display
     * @param {string} status - Status value
     * @returns {string} Formatted status
     * @private
     */
    _formatStatus(status) {
        const statusMap = {
            'watching': 'Watching',
            'completed': 'Completed',
            'on_hold': 'On Hold',
            'dropped': 'Dropped',
            'plan_to_watch': 'Plan to Watch',
            'rewatching': 'Rewatching'
        };
        return statusMap[status] || status;
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
     * Update show data
     * @param {Show} show - Updated show
     */
    updateShow(show) {
        this.update({ show });
    }
}
