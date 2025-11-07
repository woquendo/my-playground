/**
 * ImportPage.js
 * Import page controller - import shows and music from various sources
 */

export class ImportPage {
    /**
     * @param {Object} dependencies - Page dependencies
     * @param {ImportService} dependencies.importService - Import service
     * @param {EventBus} dependencies.eventBus - Event bus
     * @param {Logger} dependencies.logger - Logger instance
     * @param {Container} dependencies.container - DI container
     */
    constructor({ importService, eventBus, logger, container }) {
        this.importService = importService;
        this.eventBus = eventBus;
        this.logger = logger;
        this.container = container;
        this.element = null;
    }

    /**
     * Render the import page
     * @returns {Promise<HTMLElement>} Page element
     */
    async render() {
        this.logger.info('Rendering import page');

        const page = document.createElement('div');
        page.className = 'page page--import';
        page.innerHTML = `
            <div class="page__header">
                <h2 class="page__title">Import Data</h2>
                <p class="page__subtitle">Import shows and music from various sources</p>
            </div>
            <div class="page__content">
                <div class="import-section">
                    <h3>Import from MyAnimeList</h3>
                    <p>Enter your MAL username to import your anime list</p>
                    <div class="import-form">
                        <input 
                            type="text" 
                            class="input" 
                            id="mal-username" 
                            placeholder="MAL Username"
                            aria-label="MyAnimeList username"
                        />
                        <button class="btn btn--primary" id="import-mal-btn">
                            Import from MAL
                        </button>
                    </div>
                    <div id="mal-import-result" class="import-result"></div>
                </div>

                <div class="import-section">
                    <h3>Import from JSON File</h3>
                    <p>Upload a JSON file containing show data</p>
                    <div class="import-form">
                        <input 
                            type="file" 
                            class="input" 
                            id="shows-file" 
                            accept=".json"
                            aria-label="Select shows JSON file"
                        />
                        <button class="btn btn--primary" id="import-shows-btn">
                            Import Shows
                        </button>
                    </div>
                    <div id="shows-import-result" class="import-result"></div>
                </div>

                <div class="import-section">
                    <h3>Import Music from JSON File</h3>
                    <p>Upload a JSON file containing music tracks</p>
                    <div class="import-form">
                        <input 
                            type="file" 
                            class="input" 
                            id="music-file" 
                            accept=".json"
                            aria-label="Select music JSON file"
                        />
                        <button class="btn btn--primary" id="import-music-btn">
                            Import Music
                        </button>
                    </div>
                    <div id="music-import-result" class="import-result"></div>
                </div>

                <div class="import-section">
                    <h3>Export Data</h3>
                    <p>Download your current data as JSON files</p>
                    <div class="import-form">
                        <button class="btn btn--secondary" id="export-shows-btn">
                            Export Shows
                        </button>
                        <button class="btn btn--secondary" id="export-music-btn">
                            Export Music
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.element = page;

        // Attach event listeners
        this.attachEventListeners(page);

        return page;
    }

    /**
     * Attach event listeners
     * @param {HTMLElement} element - Page element
     */
    attachEventListeners(element) {
        // MAL import
        const malBtn = element.querySelector('#import-mal-btn');
        if (malBtn) {
            malBtn.addEventListener('click', () => this.handleMALImport());
        }

        // Shows import
        const showsBtn = element.querySelector('#import-shows-btn');
        if (showsBtn) {
            showsBtn.addEventListener('click', () => this.handleShowsImport());
        }

        // Music import
        const musicBtn = element.querySelector('#import-music-btn');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => this.handleMusicImport());
        }

        // Export buttons
        const exportShowsBtn = element.querySelector('#export-shows-btn');
        if (exportShowsBtn) {
            exportShowsBtn.addEventListener('click', () => this.handleExportShows());
        }

        const exportMusicBtn = element.querySelector('#export-music-btn');
        if (exportMusicBtn) {
            exportMusicBtn.addEventListener('click', () => this.handleExportMusic());
        }
    }

    /**
     * Handle MAL import
     */
    async handleMALImport() {
        const input = this.element.querySelector('#mal-username');
        const resultDiv = this.element.querySelector('#mal-import-result');
        const username = input.value.trim();

        if (!username) {
            resultDiv.innerHTML = '<p class="error">Please enter a MAL username</p>';
            return;
        }

        try {
            resultDiv.innerHTML = '<p class="loading">Importing from MAL...</p>';

            const result = await this.importService.importFromMyAnimeList(username);

            resultDiv.innerHTML = `
                <p class="success">
                    ✓ Successfully imported ${result.imported} shows
                    ${result.errors > 0 ? ` (${result.errors} errors)` : ''}
                </p>
            `;

            const toastService = this.container.get('toastService');
            toastService.success(`Imported ${result.imported} shows from MAL!`);

        } catch (error) {
            this.logger.error('MAL import failed:', error);
            resultDiv.innerHTML = `<p class="error">Import failed: ${error.message}</p>`;

            const toastService = this.container.get('toastService');
            toastService.error('Failed to import from MAL');
        }
    }

    /**
     * Handle shows import from file
     */
    async handleShowsImport() {
        const fileInput = this.element.querySelector('#shows-file');
        const resultDiv = this.element.querySelector('#shows-import-result');
        const file = fileInput.files[0];

        if (!file) {
            resultDiv.innerHTML = '<p class="error">Please select a file</p>';
            return;
        }

        try {
            resultDiv.innerHTML = '<p class="loading">Importing shows...</p>';

            const result = await this.importService.importShowsFromFile(file);

            resultDiv.innerHTML = `
                <p class="success">
                    ✓ Successfully imported ${result.imported} shows
                    ${result.errors > 0 ? ` (${result.errors} errors)` : ''}
                </p>
            `;

            const toastService = this.container.get('toastService');
            toastService.success(`Imported ${result.imported} shows!`);

        } catch (error) {
            this.logger.error('Shows import failed:', error);
            resultDiv.innerHTML = `<p class="error">Import failed: ${error.message}</p>`;

            const toastService = this.container.get('toastService');
            toastService.error('Failed to import shows');
        }
    }

    /**
     * Handle music import from file
     */
    async handleMusicImport() {
        const fileInput = this.element.querySelector('#music-file');
        const resultDiv = this.element.querySelector('#music-import-result');
        const file = fileInput.files[0];

        if (!file) {
            resultDiv.innerHTML = '<p class="error">Please select a file</p>';
            return;
        }

        try {
            resultDiv.innerHTML = '<p class="loading">Importing music...</p>';

            const result = await this.importService.importMusicFromFile(file);

            resultDiv.innerHTML = `
                <p class="success">
                    ✓ Successfully imported ${result.imported} tracks
                    ${result.errors > 0 ? ` (${result.errors} errors)` : ''}
                </p>
            `;

            const toastService = this.container.get('toastService');
            toastService.success(`Imported ${result.imported} tracks!`);

        } catch (error) {
            this.logger.error('Music import failed:', error);
            resultDiv.innerHTML = `<p class="error">Import failed: ${error.message}</p>`;

            const toastService = this.container.get('toastService');
            toastService.error('Failed to import music');
        }
    }

    /**
     * Handle export shows
     */
    async handleExportShows() {
        try {
            const data = await this.importService.exportShows();
            this.downloadFile(data, 'shows.json', 'application/json');

            const toastService = this.container.get('toastService');
            toastService.success('Shows exported!');
        } catch (error) {
            this.logger.error('Export failed:', error);

            const toastService = this.container.get('toastService');
            toastService.error('Failed to export shows');
        }
    }

    /**
     * Handle export music
     */
    async handleExportMusic() {
        try {
            const data = await this.importService.exportMusic();
            this.downloadFile(data, 'music.json', 'application/json');

            const toastService = this.container.get('toastService');
            toastService.success('Music exported!');
        } catch (error) {
            this.logger.error('Export failed:', error);

            const toastService = this.container.get('toastService');
            toastService.error('Failed to export music');
        }
    }

    /**
     * Download a file
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} contentType - MIME type
     */
    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Destroy the page
     */
    async destroy() {
        this.logger.info('Destroying import page');
    }
}
