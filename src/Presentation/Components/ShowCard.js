/**
 * Show Card Component
 * Displays a show in card format with episode info, status, and actions.
 */

import { BaseComponent } from './BaseComponent.js';
import {
    getSites,
    constructSiteUrl,
    getAvailableSitesForShow,
    toggleSiteAvailability
} from '../../../js/sitesService.js';

export class ShowCard extends BaseComponent {
    /**
     * Create a show card component
     * @param {object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {Show} options.show - Show to display
     * @param {string} options.airTime - Air time for future shows (MM-DD-YY format)
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
                airTime: options.airTime || null,
                onProgress: options.onProgress || (() => { }),
                onStatusChange: options.onStatusChange || (() => { }),
                onSelect: options.onSelect || (() => { }),
                onUpdateAirDate: options.onUpdateAirDate || (() => { }),
                onSkipWeek: options.onSkipWeek || (() => { })
            }
        });

        // Load streaming sites
        this._sites = [];
        this._loadSites();
    }

    /**
     * Load streaming sites from sites.json
     * @private
     */
    async _loadSites() {
        try {
            this._sites = await getSites();
            // Re-render if sites were loaded after initial render
            if (this._element && this._sites.length > 0) {
                this._renderSiteLinks();
            }
        } catch (error) {
            this._logger?.error('Failed to load streaming sites', error);
        }
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
        const showUrl = show.getUrl?.() || show.url || '#';

        // Determine the air day/date display
        let airDay;
        const airTime = this._props.airTime;

        if (airTime) {
            // For future/unscheduled shows with airTime, format the date
            airDay = this._formatAirDate(airTime);
        } else {
            // For regular shows, use the standard air day
            airDay = show.getAirDay() || 'Unknown';
        }

        // Use getter method for image URL
        const imageUrl = show.getImageUrl?.() || '';

        const isBehind = current < latest;
        const behindClass = isBehind ? 'show-card--behind' : '';
        const statusClass = `show-card--${status}`;

        return `
            <div class="show-card-wrapper">
            <div class="show-card show-card--horizontal ${statusClass} ${behindClass}" data-show-id="${show.getId()}">
                <a href="${this._escapeHtml(showUrl)}" target="_blank" rel="noopener noreferrer" class="show-card__image-link" title="View on MyAnimeList">
                    ${imageUrl ? `
                        <div class="show-card__image">
                            <img src="${this._escapeHtml(imageUrl)}" 
                                 alt="${title}" 
                                 loading="lazy"
                                 decoding="async"
                                 crossorigin="anonymous"
                                 onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='none';" />
                            <div class="show-card__image-overlay">
                                <span class="image-overlay-icon">🔗</span>
                            </div>
                        </div>
                    ` : `
                        <div class="show-card__image show-card__image--placeholder">
                            <div class="placeholder-icon">📺</div>
                        </div>
                    `}
                </a>
                <div class="show-card__content">
                <div class="show-card__header">
                    <div class="show-card__title-wrapper">
                        <h3 class="show-card__title" title="${title}">${title}</h3>
                        <span class="show-card__badge badge badge--${status}">
                            ${this._formatStatus(status)}
                        </span>
                    </div>
                </div>

                <div class="show-card__body">
                    <div class="show-card__info">
                        <div class="show-card__info-item">
                            <span class="info-label">Airs:</span>
                            <span class="info-value">${airDay}</span>
                        </div>
                        <div class="show-card__info-item">
                            <span class="info-label">Episode:</span>
                            <span class="info-value">${current} / ${total}</span>
                        </div>
                        <div class="show-card__info-item">
                            <span class="info-label">Latest:</span>
                            <span class="info-value">${latest}</span>
                        </div>
                    </div>

                    ${isBehind ? `
                            <div class="show-card__alert">
                                <span class="alert-icon">⚠️</span>
                                <span class="alert-text">${latest - current} ep${latest - current > 1 ? 's' : ''} behind</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <div class="show-card__actions">
                <button class="show-card__action-btn show-card__action-btn--primary" data-action="progress" title="Mark next episode as watched">
                    <span class="action-btn__icon">✓</span>
                    <span class="action-btn__text">Mark Watched</span>
                </button>
                <div class="show-card__status-wrapper">
                    <label class="status-label" for="status-${show.getId()}">Status:</label>
                    <select class="show-card__status-select" id="status-${show.getId()}" data-action="status-change" title="Change watch status">
                        <option value="watching" ${status === 'watching' ? 'selected' : ''}>📺 Watching</option>
                        <option value="completed" ${status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                        <option value="on_hold" ${status === 'on_hold' ? 'selected' : ''}>⏸️ On Hold</option>
                        <option value="dropped" ${status === 'dropped' ? 'selected' : ''}>❌ Dropped</option>
                        <option value="plan_to_watch" ${status === 'plan_to_watch' ? 'selected' : ''}>📋 Plan to Watch</option>
                    </select>
                </div>
                <div class="show-card__menu">
                    <button class="show-card__action-btn show-card__action-btn--ghost" data-action="menu-toggle" title="More options" aria-label="Show menu" aria-expanded="false">
                        <span class="action-btn__icon">⋮</span>
                    </button>
                    <div class="show-card__dropdown" data-dropdown hidden>
                        <a href="${this._escapeHtml(showUrl)}" target="_blank" rel="noopener noreferrer" class="show-card__dropdown-item">
                            <span class="dropdown-icon">🔗</span>
                            <span class="dropdown-text">View on MAL</span>
                        </a>
                        <button class="show-card__dropdown-item" data-action="update-air-date">
                            <span class="dropdown-icon">📅</span>
                            <span class="dropdown-text">Update Air Date</span>
                        </button>
                        <button class="show-card__dropdown-item" data-action="update-skipped-weeks">
                            <span class="dropdown-icon">⏩</span>
                            <span class="dropdown-text">Update Skipped Weeks</span>
                        </button>
                        <button class="show-card__dropdown-item" data-action="skip-week">
                            <span class="dropdown-icon">⏭️</span>
                            <span class="dropdown-text">Skip This Week</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Streaming Sites Section -->
            <div class="show-card__streaming-sites" data-streaming-sites>
                <div class="streaming-sites__header">
                    <span class="streaming-sites__title">Watch on:</span>
                    <button class="streaming-sites__manage-btn" data-action="manage-sites" title="Manage site availability">
                        <span class="manage-btn__icon">⚙️</span>
                    </button>
                </div>
                <div class="streaming-sites__links" data-site-links>
                    <!-- Site links will be dynamically inserted here -->
                </div>
                <div class="streaming-sites__manager" data-site-manager hidden>
                    <div class="site-manager__header">
                        <span class="site-manager__title">Mark which sites have this show:</span>
                        <button class="site-manager__close" data-action="close-manager" title="Close">✕</button>
                    </div>
                    <div class="site-manager__checkboxes" data-site-checkboxes>
                        <!-- Checkboxes will be dynamically inserted here -->
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Render streaming site links dynamically
     * @private
     */
    _renderSiteLinks() {
        const container = this._querySelector('[data-site-links]');
        if (!container || !this._sites || this._sites.length === 0) {
            return;
        }

        const show = this._props.show;
        const showId = show.getId();
        const animeTitle = show.getPrimaryTitle();

        // Get available sites for this show
        const availableSites = getAvailableSitesForShow(showId);

        // Filter sites: if none are marked, show all; otherwise show only available
        const sitesToShow = availableSites.length === 0
            ? this._sites
            : this._sites.filter(site => availableSites.includes(site.name.toLowerCase()));

        // Show message if no sites are available (but some were marked)
        if (sitesToShow.length === 0 && availableSites.length === 0 && this._hasMarkedAnySite()) {
            container.innerHTML = `
                <div class="streaming-sites__empty">
                    <span class="empty-message">No sites marked. Click ⚙️ to select.</span>
                </div>
            `;
            return;
        }

        // Generate site link buttons
        const siteButtons = sitesToShow.map(site => {
            const siteUrl = constructSiteUrl(site.name, site.url, animeTitle);
            const siteIcon = this._getSiteIcon(site.name);

            return `
                <a href="${this._escapeHtml(siteUrl)}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="streaming-site-btn" 
                   data-site="${this._escapeHtml(site.name.toLowerCase())}"
                   title="Watch on ${this._escapeHtml(site.name)}">
                    <span class="site-btn__icon">${siteIcon}</span>
                    <span class="site-btn__name">${this._escapeHtml(site.name)}</span>
                </a>
            `;
        }).join('');

        container.innerHTML = siteButtons;
    }

    /**
     * Check if user has marked any sites for any show
     * @private
     * @returns {boolean} True if any sites have been marked
     */
    _hasMarkedAnySite() {
        try {
            const data = localStorage.getItem('anime_site_availability');
            if (!data) return false;
            const availability = JSON.parse(data);
            return Object.keys(availability).some(key => availability[key].length > 0);
        } catch {
            return false;
        }
    }

    /**
     * Render site availability checkboxes
     * @private
     */
    _renderSiteCheckboxes() {
        const container = this._querySelector('[data-site-checkboxes]');
        if (!container || !this._sites || this._sites.length === 0) {
            return;
        }

        const show = this._props.show;
        const showId = show.getId();
        const availableSites = getAvailableSitesForShow(showId);

        const checkboxes = this._sites.map(site => {
            const siteIcon = this._getSiteIcon(site.name);
            const isChecked = availableSites.includes(site.name.toLowerCase());

            return `
                <label class="site-checkbox">
                    <input type="checkbox" 
                           class="site-checkbox__input" 
                           data-site-name="${this._escapeHtml(site.name.toLowerCase())}"
                           ${isChecked ? 'checked' : ''}>
                    <span class="site-checkbox__label">
                        <span class="site-checkbox__icon">${siteIcon}</span>
                        <span class="site-checkbox__name">${this._escapeHtml(site.name)}</span>
                    </span>
                </label>
            `;
        }).join('');

        container.innerHTML = checkboxes;

        // Add change listeners to checkboxes
        container.querySelectorAll('.site-checkbox__input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const siteName = e.target.dataset.siteName;
                toggleSiteAvailability(showId, siteName);
                this._renderSiteLinks(); // Re-render site links
            });
        });
    }

    /**
     * Get icon emoji for streaming site
     * @private
     * @param {string} siteName - Site name
     * @returns {string} Icon emoji
     */
    _getSiteIcon(siteName) {
        const icons = {
            'aniwave': '🌊',
            'hianime': '📺',
            'crunchyroll': '🍥',
            'hidive': '🎬'
        };
        return icons[siteName.toLowerCase()] || '▶️';
    }

    /**
     * Initialize component
     * @protected
     */
    _initialize() {
        // Render streaming site links
        if (this._sites.length > 0) {
            this._renderSiteLinks();
        }

        // Add click handler for card selection
        this._addEventListener(this._element, 'click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('select') && !e.target.closest('a')) {
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
                const isHidden = dropdown.hasAttribute('hidden');

                // Close all other dropdowns first
                document.querySelectorAll('.show-card__dropdown').forEach(d => {
                    if (d !== dropdown) {
                        d.setAttribute('hidden', '');
                    }
                });

                // Toggle this dropdown
                if (isHidden) {
                    dropdown.removeAttribute('hidden');
                    menuToggle.setAttribute('aria-expanded', 'true');
                } else {
                    dropdown.setAttribute('hidden', '');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            });

            // Close dropdown when clicking outside
            this._addEventListener(document, 'click', (e) => {
                if (!this._element.contains(e.target)) {
                    dropdown.setAttribute('hidden', '');
                    menuToggle.setAttribute('aria-expanded', 'false');
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
                    dropdown.setAttribute('hidden', '');
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
                    dropdown.setAttribute('hidden', '');
                }
            });
        }

        // Add site manager handlers
        const manageSitesBtn = this._querySelector('[data-action="manage-sites"]');
        const siteManager = this._querySelector('[data-site-manager]');
        const closeManagerBtn = this._querySelector('[data-action="close-manager"]');

        if (manageSitesBtn && siteManager) {
            this._addEventListener(manageSitesBtn, 'click', (e) => {
                e.stopPropagation();

                // Render checkboxes when opening
                this._renderSiteCheckboxes();

                // Toggle manager visibility
                const isHidden = siteManager.hasAttribute('hidden');
                if (isHidden) {
                    siteManager.removeAttribute('hidden');
                } else {
                    siteManager.setAttribute('hidden', '');
                }
            });
        }

        if (closeManagerBtn && siteManager) {
            this._addEventListener(closeManagerBtn, 'click', (e) => {
                e.stopPropagation();
                siteManager.setAttribute('hidden', '');
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
            dropdown.setAttribute('hidden', '');
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
     * Format air date for display
     * @param {string} airTime - Air time in MM-DD-YY format
     * @returns {string} Formatted air date or "Unscheduled"
     * @private
     */
    /**
     * Format air date for future shows
     * @private
     * @param {string} airTime - Air time in MM-DD-YY format
     * @returns {string} Formatted date or "Unscheduled"
     */
    _formatAirDate(airTime) {
        // First, try to get the actual start date from the show
        const show = this._props.show;
        const startDate = show.getStartDate?.() || show.startDate;

        // If show has a valid start date, use it
        if (startDate) {
            try {
                // Check if it's a ShowDate value object
                if (startDate.toDate && typeof startDate.toDate === 'function') {
                    const date = startDate.toDate();
                    if (date && !isNaN(date.getTime())) {
                        const options = { month: 'short', day: 'numeric', year: 'numeric' };
                        return date.toLocaleDateString('en-US', options);
                    }
                }
                // If it's already a Date object
                else if (startDate instanceof Date && !isNaN(startDate.getTime())) {
                    const options = { month: 'short', day: 'numeric', year: 'numeric' };
                    return startDate.toLocaleDateString('en-US', options);
                }
            } catch (error) {
                this._logger?.debug('Could not format show start date, falling back to airTime', error);
            }
        }

        // Fall back to airTime parameter if provided
        if (!airTime) {
            return 'Unscheduled';
        }

        try {
            // Parse MM-DD-YY format
            const parts = airTime.split('-');
            if (parts.length !== 3) {
                return 'Unscheduled';
            }

            const [month, day, year] = parts;

            // Check for invalid date (00-00-00 or similar)
            if (month === '00' || day === '00' || year === '00') {
                return 'Unscheduled';
            }

            // Convert 2-digit year to 4-digit
            const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;

            // Create date object
            const date = new Date(`${fullYear}-${month}-${day}`);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Unscheduled';
            }

            // Format as "Mon DD, YYYY"
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            this._logger?.warn('Failed to format air date:', airTime, error);
            return 'Unscheduled';
        }
    }

    /**
     * Update show data
     * @param {Show} show - Updated show
     */
    updateShow(show) {
        this.update({ show });
    }
}
