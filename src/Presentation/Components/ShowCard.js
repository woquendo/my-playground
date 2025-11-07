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
     * @param {function} options.onUpdateAirDate - Callback for air date update
     * @param {function} options.onSkipWeek - Callback for skip week
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
                onSelect: options.onSelect || (() => { }),
                onUpdateAirDate: options.onUpdateAirDate || (() => { }),
                onSkipWeek: options.onSkipWeek || (() => { })
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
        const title = this._escapeHtml(show.getPrimaryTitle());
        const airDay = show.getAirDay() || 'Unknown';
        const imageUrl = show.imageUrl || show.getImageUrl?.() || '';

        const isBehind = current < latest;
        const behindClass = isBehind ? 'show-card--behind' : '';
        const statusClass = `show-card--${status}`;

        return `
            <div class="show-card ${statusClass} ${behindClass}" data-show-id="${show.getId()}">
                ${imageUrl ? `
                    <div class="show-card__image">
                        <img src="${imageUrl}" alt="${title}" loading="lazy" />
                    </div>
                ` : ''}
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
                    <div class="show-card__menu">
                        <button class="btn btn--ghost btn--icon" data-action="menu-toggle" title="More options">
                            ⋮
                        </button>
                        <div class="show-card__dropdown" data-dropdown style="display: none;">
                            <button class="dropdown-item" data-action="update-air-date">
                                📅 Update Air Date
                            </button>
                            <button class="dropdown-item" data-action="update-skipped-weeks">
                                ⏩ Update Skipped Weeks
                            </button>
                            <button class="dropdown-item" data-action="skip-week">
                                ⏭️ Skip This Week
                            </button>
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

        // Add menu toggle handler
        const menuToggle = this._querySelector('[data-action="menu-toggle"]');
        const dropdown = this._querySelector('[data-dropdown]');
        if (menuToggle && dropdown) {
            this._addEventListener(menuToggle, 'click', (e) => {
                e.stopPropagation();
                const isVisible = dropdown.style.display !== 'none';
                dropdown.style.display = isVisible ? 'none' : 'block';
            });

            // Close dropdown when clicking outside
            this._addEventListener(document, 'click', (e) => {
                if (!this._element.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });
        }

        // Add update air date handler
        const updateAirDateBtn = this._querySelector('[data-action="update-air-date"]');
        if (updateAirDateBtn) {
            this._addEventListener(updateAirDateBtn, 'click', (e) => {
                e.stopPropagation();
                this._handleUpdateAirDate();
            });
        }

        // Add skip week handler
        const skipWeekBtn = this._querySelector('[data-action="skip-week"]');
        if (skipWeekBtn) {
            this._addEventListener(skipWeekBtn, 'click', (e) => {
                e.stopPropagation();
                this._props.onSkipWeek(this._props.show);
                this._emit('skip-week', { show: this._props.show });

                // Close dropdown
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            });
        }

        // Add update skipped weeks handler
        const updateSkippedWeeksBtn = this._querySelector('[data-action="update-skipped-weeks"]');
        if (updateSkippedWeeksBtn) {
            this._addEventListener(updateSkippedWeeksBtn, 'click', (e) => {
                e.stopPropagation();
                this._handleUpdateSkippedWeeks();

                // Close dropdown
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            });
        }
    }

    /**
     * Handle update air date
     * @private
     */
    _handleUpdateAirDate() {
        const show = this._props.show;
        const currentDate = show.getEffectiveStartDate?.();

        // Format current date as MM-DD-YY (the format used in the data)
        let defaultValue = '';
        if (currentDate) {
            defaultValue = currentDate.format?.() || '';
        }

        // Create a modal for date input
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Update Air Date</h3>
                <p class="text-secondary">Enter the new air date for: <strong>${this._escapeHtml(show.getTitle())}</strong></p>
                <div class="form-group">
                    <label for="air-date-input">Air Date (MM-DD-YY format):</label>
                    <input 
                        type="text" 
                        id="air-date-input" 
                        class="input" 
                        placeholder="MM-DD-YY (e.g., 10-05-25)"
                        value="${defaultValue}"
                        pattern="\\d{2}-\\d{2}-\\d{2}"
                        maxlength="8"
                    />
                    <small class="form-hint">Format: MM-DD-YY (e.g., 10-05-25 for October 5, 2025)</small>
                </div>
                <div class="modal-actions">
                    <button class="btn btn--secondary" data-action="cancel">Cancel</button>
                    <button class="btn btn--primary" data-action="save">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#air-date-input');
        const saveBtn = modal.querySelector('[data-action="save"]');
        const cancelBtn = modal.querySelector('[data-action="cancel"]');

        // Focus input
        input.focus();
        input.select();

        // Handle save
        const handleSave = () => {
            const newDateStr = input.value.trim();

            // Validate format MM-DD-YY
            const datePattern = /^(\d{2})-(\d{2})-(\d{2})$/;
            const match = newDateStr.match(datePattern);

            if (!match) {
                alert('Invalid date format. Please use MM-DD-YY (e.g., 10-05-25)');
                input.focus();
                return;
            }

            const [, month, day, year] = match;

            // Validate ranges
            if (parseInt(month) < 1 || parseInt(month) > 12) {
                alert('Invalid month. Must be between 01 and 12.');
                input.focus();
                return;
            }

            if (parseInt(day) < 1 || parseInt(day) > 31) {
                alert('Invalid day. Must be between 01 and 31.');
                input.focus();
                return;
            }

            this._props.onUpdateAirDate(show, newDateStr);
            this._emit('update-air-date', { show, date: newDateStr });

            document.body.removeChild(modal);
        };

        // Handle cancel
        const handleCancel = () => {
            document.body.removeChild(modal);
        };

        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', handleCancel);

        // Handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        });

        // Handle Escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        });

        // Close dropdown
        const dropdown = this._querySelector('[data-dropdown]');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    /**
     * Handle update skipped weeks
     * @private
     */
    _handleUpdateSkippedWeeks() {
        const show = this._props.show;
        const currentSkipped = show.getSkippedWeeks?.() || 0;

        // Create a modal for skipped weeks input
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Update Skipped Weeks</h3>
                <p class="text-secondary">Set skipped weeks for: <strong>${this._escapeHtml(show.getTitle())}</strong></p>
                <div class="form-group">
                    <label for="skipped-weeks-input">Number of Skipped Weeks:</label>
                    <input 
                        type="number" 
                        id="skipped-weeks-input" 
                        class="input" 
                        min="0"
                        max="52"
                        value="${currentSkipped}"
                    />
                    <small class="form-hint">Number of weeks this show has skipped airing (0-52)</small>
                </div>
                <div class="modal-actions">
                    <button class="btn btn--secondary" data-action="cancel">Cancel</button>
                    <button class="btn btn--primary" data-action="save">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#skipped-weeks-input');
        const saveBtn = modal.querySelector('[data-action="save"]');
        const cancelBtn = modal.querySelector('[data-action="cancel"]');

        // Focus input
        input.focus();
        input.select();

        // Handle save
        const handleSave = () => {
            const skippedWeeks = parseInt(input.value);

            if (isNaN(skippedWeeks) || skippedWeeks < 0) {
                alert('Please enter a valid number of skipped weeks (0 or greater).');
                input.focus();
                return;
            }

            // Call onUpdateAirDate with skipped weeks data
            // The handler will need to differentiate between date updates and skipped weeks updates
            this._emit('update-skipped-weeks', { show, skippedWeeks });

            // For now, we'll need to add this to the show management
            if (show.updateSkippedWeeks) {
                show.updateSkippedWeeks(skippedWeeks);
            }

            document.body.removeChild(modal);
        };

        // Handle cancel
        const handleCancel = () => {
            document.body.removeChild(modal);
        };

        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', handleCancel);

        // Handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSave();
            }
        });

        // Handle Escape key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        });
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
