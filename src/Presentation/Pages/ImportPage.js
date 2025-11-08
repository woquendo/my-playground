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

                <div class="import-section import-section--divider" style="display: block !important; opacity: 1 !important; visibility: visible !important;">
                    <div class="import-section__header">
                        <h3 class="import-section__title">
                            <span class="import-section__title-icon">🎵</span>
                            YouTube Music Import
                            <span class="import-badge import-badge--success">New</span>
                        </h3>
                        <p class="import-section__description">Import songs from YouTube videos or playlists</p>
                    </div>

                    <div class="import-form-group">
                        <label for="youtube-url" class="import-form-group__label">YouTube URL</label>
                        <div class="import-input-row">
                            <div class="import-input-row__input">
                                <input id="youtube-url" type="url" class="import-input" 
                                    placeholder="https://www.youtube.com/watch?v=..." 
                                    aria-label="YouTube URL"
                                />
                                <span class="import-form-group__helper">Paste a YouTube video or playlist URL</span>
                            </div>
                            <div class="import-input-row__actions">
                                <button id="youtube-import-btn" class="btn btn--primary">Import</button>
                            </div>
                        </div>
                    </div>

                    <div class="import-status" id="youtube-status-container">
                        <span class="import-status__label">Type detected:</span>
                        <span id="youtube-type-indicator" class="import-status__value">-</span>
                    </div>

                    <div class="url-examples">
                        <p class="url-examples__title">📋 Supported URL Formats:</p>
                        <ul class="url-examples__list">
                            <li class="url-examples__item">https://www.youtube.com/watch?v=Cb0JZhdmjtg</li>
                            <li class="url-examples__item">https://youtu.be/Cb0JZhdmjtg</li>
                            <li class="url-examples__item">
                                https://www.youtube.com/watch?v=a-rt6oYvFbI&list=OLAK5uy_kpb1g10x_cXdSabFqZLnwFPA3EEctbeUw</li>
                        </ul>
                    </div>

                    <div class="import-actions">
                        <button id="download-songs-btn" class="btn btn--secondary">Download Songs JSON</button>
                        <button id="download-playlists-btn" class="btn btn--secondary">Download Playlists JSON</button>
                    </div>

                    <pre id="youtube-import-log" class="import-log"></pre>
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

        // YouTube import
        this.setupYouTubeImport(element);
    }

    /**
     * Setup YouTube import functionality
     * @param {HTMLElement} element - Page element
     */
    async setupYouTubeImport(element) {
        // Capture context for event listeners (must check they exist)
        if (!this.eventBus) {
            console.error('EventBus not available in ImportPage');
        }
        const eventBus = this.eventBus;
        const container = this.container;
        const logger = this.logger;

        // Import YouTube service dynamically
        const {
            parseYouTubeUrl,
            extractVideoData,
            loadSongs,
            saveSongs,
            loadPlaylists,
            savePlaylists,
            importPlaylistSongs,
            addPlaylistMetadata
        } = await import('../../../js/youtubeImportService.js'); const youtubeUrlInput = element.querySelector('#youtube-url');
        const youtubeTypeIndicator = element.querySelector('#youtube-type-indicator');
        const youtubeStatusContainer = element.querySelector('#youtube-status-container');
        const youtubeImportLog = element.querySelector('#youtube-import-log');
        const youtubeImportBtn = element.querySelector('#youtube-import-btn');
        const downloadSongsBtn = element.querySelector('#download-songs-btn');
        const downloadPlaylistsBtn = element.querySelector('#download-playlists-btn');

        // Update type indicator as user types
        youtubeUrlInput.addEventListener('input', () => {
            const url = youtubeUrlInput.value.trim();

            // Reset classes
            youtubeStatusContainer.classList.remove('import-status--success', 'import-status--info', 'import-status--error');

            if (!url) {
                youtubeTypeIndicator.textContent = '-';
                return;
            }

            try {
                const parsed = parseYouTubeUrl(url);
                if (parsed.type === 'video') {
                    youtubeTypeIndicator.textContent = `✓ Video (ID: ${parsed.id})`;
                    youtubeStatusContainer.classList.add('import-status--success');
                } else if (parsed.type === 'playlist') {
                    youtubeTypeIndicator.textContent = `✓ Playlist (ID: ${parsed.id})`;
                    youtubeStatusContainer.classList.add('import-status--info');
                } else {
                    youtubeTypeIndicator.textContent = '✗ Invalid URL';
                    youtubeStatusContainer.classList.add('import-status--error');
                }
            } catch (e) {
                youtubeTypeIndicator.textContent = '✗ Invalid URL';
                youtubeStatusContainer.classList.add('import-status--error');
            }
        });

        // Import YouTube video/playlist
        youtubeImportBtn.addEventListener('click', async () => {
            const url = youtubeUrlInput.value.trim();
            if (!url) {
                alert('Please enter a YouTube URL.');
                return;
            }

            youtubeImportLog.classList.add('import-log--visible');
            youtubeImportLog.classList.remove('import-log--success', 'import-log--error');
            youtubeImportLog.textContent = 'Processing...';

            try {
                const parsed = parseYouTubeUrl(url);

                if (parsed.type === 'video') {
                    // Construct the expected YouTube URL to check for duplicates
                    const videoUrl = `https://www.youtube.com/watch?v=${parsed.id}`;

                    // Load existing songs first to check for duplicates
                    const songs = await loadSongs();

                    // Check if video URL already exists
                    const existingIndex = songs.findIndex(s => s.youtube === videoUrl);
                    if (existingIndex >= 0) {
                        youtubeImportLog.classList.add('import-log--error');
                        youtubeImportLog.textContent = `⚠ Video already imported:\nTitle: ${songs[existingIndex].title}\nArtist: ${songs[existingIndex].artist}\n\nSkipping duplicate entry.`;

                        const toastService = container.get('toastService');
                        toastService.error(`Video already exists: "${songs[existingIndex].title}"`);
                        return;
                    }

                    // Extract single video
                    youtubeImportLog.textContent = 'Extracting video metadata...';
                    const videoData = await extractVideoData(parsed.id);

                    // Add new video
                    songs.push(videoData);

                    // Save to songs.json
                    youtubeImportLog.textContent = 'Saving to songs.json...';
                    await saveSongs(songs);

                    youtubeImportLog.classList.add('import-log--success');
                    youtubeImportLog.textContent = `✓ Successfully imported video:\nTitle: ${videoData.title}\nArtist: ${videoData.artist}\nType: ${videoData.type}\nURL: ${videoData.youtube}\n\nTotal songs: ${songs.length}`;
                    youtubeUrlInput.value = '';
                    youtubeTypeIndicator.textContent = '-';
                    youtubeStatusContainer.classList.remove('import-status--success', 'import-status--info', 'import-status--error');

                    // Notify music player to reload tracks
                    if (eventBus && typeof eventBus.emit === 'function') {
                        logger.info('Emitting music:libraryUpdated event after video import');
                        await eventBus.emit('music:libraryUpdated', { count: songs.length });
                    } else {
                        logger.warn('EventBus not available - music player will not auto-refresh');
                    }

                    const toastService = container.get('toastService');
                    toastService.success(`Imported "${videoData.title}"!`);
                }
                else if (parsed.type === 'playlist') {
                    // Import entire playlist
                    youtubeImportLog.textContent = 'Extracting playlist metadata...';

                    const result = await importPlaylistSongs(parsed.id, (progress) => {
                        youtubeImportLog.textContent = progress;
                    });

                    // Load existing songs
                    const existingSongs = await loadSongs();

                    // Merge new songs with existing, avoiding duplicates
                    let addedCount = 0;
                    let updatedCount = 0;

                    for (const newSong of result.songs) {
                        const existingIndex = existingSongs.findIndex(s => s.youtube === newSong.youtube);
                        if (existingIndex >= 0) {
                            // Merge playlists arrays (avoid duplicates)
                            const existingPlaylists = existingSongs[existingIndex].playlists || [];
                            const newPlaylists = newSong.playlists || [];
                            const mergedPlaylists = [...new Set([...existingPlaylists, ...newPlaylists])];

                            // Update song while preserving merged playlists
                            existingSongs[existingIndex] = {
                                ...newSong,
                                playlists: mergedPlaylists
                            };
                            updatedCount++;
                        } else {
                            // Ensure new songs have playlists array
                            if (!newSong.playlists) {
                                newSong.playlists = [];
                            }
                            existingSongs.push(newSong);
                            addedCount++;
                        }
                    }

                    // Save to songs.json
                    youtubeImportLog.textContent = 'Saving songs to songs.json...';
                    await saveSongs(existingSongs);

                    // Save playlist metadata
                    await addPlaylistMetadata(parsed.id, result.playlistName, result.songs.map(s => {
                        const url = new URL(s.youtube);
                        return url.searchParams.get('v');
                    }));

                    // Show results
                    youtubeImportLog.classList.add('import-log--success');
                    let resultText = `✓ Successfully imported playlist: "${result.playlistName}"\n\n`;
                    resultText += `Total videos in playlist: ${result.totalVideos}\n`;
                    resultText += `Successfully imported: ${result.successCount}\n`;
                    resultText += `New songs added: ${addedCount}\n`;
                    resultText += `Existing songs updated: ${updatedCount}\n`;

                    if (result.errorCount > 0) {
                        resultText += `\nFailed to import: ${result.errorCount}\n`;
                        result.errors.forEach(err => {
                            resultText += `  - ${err.videoId}: ${err.error}\n`;
                        });
                    }

                    resultText += `\nTotal songs in library: ${existingSongs.length}`;
                    youtubeImportLog.textContent = resultText;

                    youtubeUrlInput.value = '';
                    youtubeTypeIndicator.textContent = '-';
                    youtubeStatusContainer.classList.remove('import-status--success', 'import-status--info', 'import-status--error');

                    // Notify music player to reload tracks
                    if (eventBus && typeof eventBus.emit === 'function') {
                        logger.info('Emitting music:libraryUpdated event after playlist import');
                        await eventBus.emit('music:libraryUpdated', { count: existingSongs.length });
                    } else {
                        logger.warn('EventBus not available - music player will not auto-refresh');
                    }

                    const toastService = container.get('toastService');
                    toastService.success(`Imported ${result.successCount} songs from playlist!`);
                }
                else {
                    throw new Error('Invalid YouTube URL. Please provide a valid video or playlist URL.');
                }
            } catch (error) {
                logger.error('YouTube import error:', error);
                youtubeImportLog.classList.add('import-log--visible', 'import-log--error');
                youtubeImportLog.textContent = `✗ Error: ${error.message}`;

                const toastService = container.get('toastService');
                toastService.error('Failed to import from YouTube');
            }
        });

        // Download songs JSON
        downloadSongsBtn.addEventListener('click', async () => {
            try {
                const songs = await loadSongs();
                this.downloadFile(JSON.stringify({ songs }, null, 2), 'songs.json', 'application/json');

                const toastService = this.container.get('toastService');
                toastService.success('Songs JSON downloaded!');
            } catch (error) {
                this.logger.error('Download songs error:', error);
                const toastService = this.container.get('toastService');
                toastService.error('Failed to download songs');
            }
        });

        // Download playlists JSON
        downloadPlaylistsBtn.addEventListener('click', async () => {
            try {
                const playlists = await loadPlaylists();
                this.downloadFile(JSON.stringify({ playlists }, null, 2), 'playlists.json', 'application/json');

                const toastService = this.container.get('toastService');
                toastService.success('Playlists JSON downloaded!');
            } catch (error) {
                this.logger.error('Download playlists error:', error);
                const toastService = this.container.get('toastService');
                toastService.error('Failed to download playlists');
            }
        });
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
