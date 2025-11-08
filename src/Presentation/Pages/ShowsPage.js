/**
 * ShowsPage.js
 * Shows page controller - browse and manage all shows
 */

import { PageHeader } from '../Components/PageHeader.js';

export class ShowsPage {
    /**
     * @param {Object} dependencies - Page dependencies
     * @param {ScheduleViewModel} dependencies.viewModel - Schedule ViewModel (reused for shows)
     * @param {ShowManagementService} dependencies.showService - Show management service
     * @param {EventBus} dependencies.eventBus - Event bus
     * @param {Logger} dependencies.logger - Logger instance
     * @param {Container} dependencies.container - DI container
     */
    constructor({ viewModel, showService, eventBus, logger, container }) {
        this.viewModel = viewModel;
        this.showService = showService;
        this.eventBus = eventBus;
        this.logger = logger;
        this.container = container;
        this.element = null;
        this.pageHeader = new PageHeader();
    }

    /**
     * Render the shows page
     * @returns {Promise<HTMLElement>} Page element
     */
    async render() {
        this.logger.info('Rendering shows page');

        const page = document.createElement('div');
        page.className = 'page page--shows';

        // Render page header
        const headerHTML = this.pageHeader.render({
            title: 'My Shows',
            subtitle: 'Browse and manage your anime collection',
            icon: '📺',
            actions: [
                {
                    type: 'search',
                    id: 'shows-search',
                    placeholder: 'Search shows...'
                },
                {
                    type: 'select',
                    id: 'shows-status-filter',
                    label: 'Status:',
                    options: [
                        { value: 'all', label: 'All Status', selected: true },
                        { value: 'watching', label: 'Watching' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'on_hold', label: 'On Hold' },
                        { value: 'dropped', label: 'Dropped' },
                        { value: 'plan_to_watch', label: 'Plan to Watch' }
                    ]
                },
                {
                    type: 'select',
                    id: 'shows-airing-filter',
                    label: 'Airing:',
                    options: [
                        { value: 'all', label: 'All Airing Status', selected: true },
                        { value: 'current', label: 'Currently Airing' },
                        { value: 'finished', label: 'Finished' },
                        { value: 'not_yet', label: 'Not Yet Aired' }
                    ]
                }
            ]
        });

        page.innerHTML = `
            ${headerHTML}
            <div class="page__content">
                <div id="shows-list-container"></div>
            </div>
        `;

        this.element = page;

        // Attach event listeners
        this.attachEventListeners(page);

        // Load and render shows
        await this.loadShows();

        return page;
    }

    /**
     * Attach event listeners
     * @param {HTMLElement} element - Page element
     */
    attachEventListeners(element) {
        const searchInput = element.querySelector('#shows-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        const statusFilter = element.querySelector('#shows-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.handleStatusFilter(e.target.value);
            });
        }

        const airingFilter = element.querySelector('#shows-airing-filter');
        if (airingFilter) {
            airingFilter.addEventListener('change', (e) => {
                this.handleAiringFilter(e.target.value);
            });
        }
    }

    /**
     * Load and render shows
     */
    async loadShows() {
        try {
            const container = this.element.querySelector('#shows-list-container');
            if (!container) return;

            container.innerHTML = '<div class="loading">Loading shows...</div>';

            // Get shows from ViewModel
            await this.viewModel.loadShows();
            const shows = this.viewModel.get('shows');

            if (shows.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No shows in your collection.</p>
                        <a href="/import" class="btn btn--primary">Import Shows</a>
                    </div>
                `;
                return;
            }

            // Render shows grid
            container.innerHTML = `
                <div class="card-grid">
                    ${shows.map(show => this.renderShowCard(show)).join('')}
                </div>
            `;

            // Attach show card event listeners
            this.attachShowCardListeners(container);

        } catch (error) {
            this.logger.error('Failed to load shows:', error);
            const container = this.element.querySelector('#shows-list-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p>Failed to load shows.</p>
                        <button class="btn btn--primary" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Render a show card
     * @param {Show} show - Show model
     * @returns {string} HTML string
     */
    renderShowCard(show) {
        const progress = show.totalEpisodes > 0
            ? (show.watchedEpisodes / show.totalEpisodes * 100).toFixed(0)
            : 0;

        return `
            <div class="show-card" data-show-id="${show.id}">
                <div class="show-card__image">
                    ${show.getImageUrl() ? `<img src="${show.getImageUrl()}" alt="${show.title}" loading="lazy" decoding="async" crossorigin="anonymous">` : ''}
                </div>
                <div class="show-card__content">
                    <h3 class="show-card__title">${this.escapeHtml(show.title)}</h3>
                    <div class="show-card__meta">
                        <span class="badge badge--${show.status.toString()}">${show.status.toString().replace('_', ' ')}</span>
                        <span class="show-card__episodes">${show.watchedEpisodes}/${show.totalEpisodes || '?'}</span>
                    </div>
                    <div class="show-card__progress">
                        <div class="progress-bar">
                            <div class="progress-bar__fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
                <div class="show-card__actions">
                    <button class="btn btn--sm btn--ghost" data-action="increment">+1 Episode</button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to show cards
     * @param {HTMLElement} container - Container element
     */
    attachShowCardListeners(container) {
        container.querySelectorAll('[data-action="increment"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.show-card');
                const showId = card?.dataset.showId;
                if (showId) {
                    this.handleIncrementEpisode(showId);
                }
            });
        });
    }

    /**
     * Handle episode increment
     * @param {string} showId - Show ID
     */
    async handleIncrementEpisode(showId) {
        try {
            await this.showService.progressEpisode(showId);
            await this.loadShows(); // Reload to reflect changes

            const toastService = this.container.get('toastService');
            toastService.success('Episode incremented!');
        } catch (error) {
            this.logger.error('Failed to increment episode:', error);
            const toastService = this.container.get('toastService');
            toastService.error('Failed to update episode');
        }
    }

    /**
     * Handle search
     * @param {string} query - Search query
     */
    handleSearch(query) {
        this.viewModel.setFilter('search', query);
        this.loadShows();
    }

    /**
     * Handle status filter
     * @param {string} status - Status value
     */
    handleStatusFilter(status) {
        this.viewModel.setFilter('status', status);
        this.loadShows();
    }

    /**
     * Handle airing filter
     * @param {string} airing - Airing status value
     */
    handleAiringFilter(airing) {
        this.viewModel.setFilter('airing', airing);
        this.loadShows();
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
        this.logger.info('Destroying shows page');
    }
}
