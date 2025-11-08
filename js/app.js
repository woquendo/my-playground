// Main application initialization
import { fetchLocalOrRemote, saveLocalData, downloadJSON, loadLocalData } from './dataManager.js';
import { renderSongList } from './songList.js';
import { renderShowList, importAnimeList } from './showList.js';
import { setupNavigation } from './navigation.js';
import { fallbackData, STORAGE_KEY } from './config.js';
import { setSongsList } from './player.js';
import { pausePlayer, playPlayer, playNext, playPrevious, stopPlayer, hideMinimizedPlayer } from './player.js';
import { setupImportControls } from './importControls.js';
import {
    parseYouTubeUrl,
    extractVideoData,
    loadSongs,
    saveSongs,
    loadPlaylists,
    savePlaylists,
    extractPlaylistData,
    importPlaylistSongs,
    addPlaylistMetadata
} from './youtubeImportService.js';

let initialData = null;

// Keep track of what's loaded
let loadedData = null;

function renderPage(pageName, data) {
    console.log(`Rendering page ${pageName} with data:`, data);

    if (!data) {
        console.warn('No data provided to render');
        return;
    }

    if (pageName === 'shows') {
        const showsEl = document.getElementById('shows');
        const shows = data.shows || [];
        console.log('Rendering shows:', shows.length);
        renderShowList(shows, showsEl, 'shows', data.titles || {}, (updatedTitles) => {
            loadedData.titles = updatedTitles;
            renderPage('shows', loadedData);
        });
    }
    else if (pageName === 'songs') {
        const songsEl = document.getElementById('songs');
        const songs = data.songs || [];
        console.log('Rendering songs:', songs.length);
        renderSongList(songs, songsEl);
        setSongsList(songs);
    }
    else if (pageName === 'schedule') {
        const showsEl = document.getElementById('schedule-container');
        const shows = data.shows || [];
        console.log('Rendering schedule:', shows.length);
        renderShowList(shows, showsEl, 'schedule', data.titles || {}, (updatedTitles) => {
            loadedData.titles = updatedTitles;
            renderPage('schedule', loadedData);
        });
    }
}

// Update navigation to handle data loading
function renderPageCallback(pageName) {
    renderPage(pageName, loadedData);
}

function render(data) {
    loadedData = data; // Store the data
    setupNavigation(renderPageCallback);
}

function setupMinimizedPlayer() {
    const prevBtn = document.getElementById('minimized-prev');
    const playPauseBtn = document.getElementById('minimized-play-pause');
    const nextBtn = document.getElementById('minimized-next');
    const closeBtn = document.getElementById('minimized-close');

    if (prevBtn) {
        prevBtn.addEventListener('click', playPrevious);
    }

    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (playPauseBtn.textContent === 'Pause') {
                pausePlayer();
                playPauseBtn.textContent = 'Play';
            } else {
                playPlayer();
                playPauseBtn.textContent = 'Pause';
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', playNext);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            stopPlayer();
            hideMinimizedPlayer();
        });
    }
}

async function initializeApp() {
    // Load initial data first but don't render yet
    initialData = await fetchLocalOrRemote();

    // Render data and set up navigation
    render(initialData);

    // Set up import controls
    setupImportControls();

    // Set up minimized player controls
    setupMinimizedPlayer();

    // Wire up event handlers
    document.getElementById('import-btn').addEventListener('click', async () => {
        const usernameInput = document.getElementById('mal-username');
        const username = (usernameInput.value || '').trim() || (initialData && initialData.anime_username) || '';
        if (!username) {
            alert('Please enter a MyAnimeList username.');
            return;
        }

        document.getElementById('import-btn').textContent = 'Importing...';
        try {
            const animeShows = await importAnimeList(username);
            const base = initialData || fallbackData;
            const existingShows = base.shows || [];
            // Preserve custom_air_day from existing shows
            animeShows.forEach(newShow => {
                const existing = existingShows.find(s => s.id === newShow.id);
                if (existing && existing.custom_air_day !== undefined) {
                    newShow.custom_air_day = existing.custom_air_day;
                }
            });
            const newData = Object.assign({}, base, { anime_username: username, shows: animeShows });

            try {
                const saveRes = await fetch('/save-shows', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(animeShows)
                });

                if (!saveRes.ok) {
                    throw new Error('Failed to save shows to file');
                }

                saveLocalData(newData);
                initialData = newData;
                render(newData);
                alert('Imported ' + animeShows.length + ' entries from MyAnimeList for ' + username + '. Use Download JSON to save a file.');
            } catch (e) {
                console.error('Failed to save shows:', e);
                alert('Failed to save shows to file: ' + e.message);
            }
        } catch (e) {
            console.error(e);
            alert('Import failed: ' + e.message);
        } finally {
            document.getElementById('import-btn').textContent = 'Import anime list';
        }
    }); document.getElementById('download-btn').addEventListener('click', () => {
        const data = initialData || loadLocalData() || fallbackData;
        downloadJSON(data);
    });

    document.getElementById('download-schedule-updates-btn').addEventListener('click', () => {
        const updates = JSON.parse(localStorage.getItem('schedule_updates') || '{"updates":{}}');
        downloadJSON(updates, 'schedule_updates.json');
    });

    document.getElementById('reload-packaged').addEventListener('click', async () => {
        try {
            document.getElementById('reload-packaged').textContent = 'Reloading...';

            // Fetch both files separately
            const [showsRes, songsRes, titlesRes, updatesRes] = await Promise.all([
                fetch('./data/shows.json?t=' + Date.now()),
                fetch('./data/songs.json?t=' + Date.now()),
                fetch('./data/titles.json?t=' + Date.now()),
                fetch('./data/schedule_updates.json?t=' + Date.now()).catch(() => ({ ok: false }))
            ]);

            if (!showsRes.ok || !songsRes.ok) {
                throw new Error('Failed to load data files');
            }

            const [shows, songs] = await Promise.all([
                showsRes.json(),
                songsRes.json()
            ]);
            const titles = titlesRes.ok ? await titlesRes.json() : {};
            const updatesData = updatesRes.ok ? await updatesRes.json() : { updates: {} };

            const json = {
                shows: shows.shows || shows,
                songs: songs.songs || songs,
                titles: titles
            };

            // Apply schedule updates
            json.shows.forEach(show => {
                if (updatesData.updates && updatesData.updates[show.id] !== undefined) {
                    const update = updatesData.updates[show.id];
                    if (typeof update === 'number') {
                        // Legacy format: just custom air day
                        if (update >= 0 && update <= 6) {
                            show.custom_air_day = update;
                        }
                    } else if (typeof update === 'object') {
                        // New format: object with multiple properties
                        if (typeof update.custom_air_day === 'number' && update.custom_air_day >= 0 && update.custom_air_day <= 6) {
                            show.custom_air_day = update.custom_air_day;
                        }
                        if (typeof update.custom_start_date === 'string' && /^(\d{2})-(\d{2})-(\d{2})$/.test(update.custom_start_date)) {
                            show.custom_start_date = update.custom_start_date;
                        }
                        if (typeof update.custom_episodes === 'number' && update.custom_episodes > 0) {
                            show.custom_episodes = update.custom_episodes;
                        }
                        if (typeof update.skipped_weeks === 'number' && update.skipped_weeks >= 0) {
                            show.skipped_weeks = update.skipped_weeks;
                        }
                    }
                }
            });

            saveLocalData(json);
            initialData = json;
            render(json);
            alert('Reloaded data files and updated local data.');
        } catch (e) {
            console.error('Reload error:', e);
            alert('Could not reload data: ' + e.message);
        } finally {
            document.getElementById('reload-packaged').textContent = 'Reload packaged JSON';
        }
    });

    document.getElementById('clear-local').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        alert('Local data cleared. Reloading from packaged JSON.');
        fetchLocalOrRemote(render);
    });

    // YouTube Import Handlers
    const youtubeUrlInput = document.getElementById('youtube-url');
    const youtubeTypeIndicator = document.getElementById('youtube-type-indicator');
    const youtubeStatusContainer = document.getElementById('youtube-status-container');
    const youtubeImportLog = document.getElementById('youtube-import-log');

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
    document.getElementById('youtube-import-btn').addEventListener('click', async () => {
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
                // Extract single video
                youtubeImportLog.textContent = 'Extracting video metadata...';
                const videoData = await extractVideoData(parsed.id);

                // Load existing songs
                const songs = await loadSongs();

                // Check if video already exists
                const existingIndex = songs.findIndex(s => s.youtube === videoData.youtube);
                if (existingIndex >= 0) {
                    youtubeImportLog.textContent = `Video already exists: "${videoData.title}"\nUpdating entry...`;
                    songs[existingIndex] = videoData;
                } else {
                    songs.push(videoData);
                }

                // Save to songs.json
                youtubeImportLog.textContent = 'Saving to songs.json...';
                await saveSongs(songs);

                youtubeImportLog.classList.add('import-log--success');
                youtubeImportLog.textContent = `✓ Successfully imported video:\nTitle: ${videoData.title}\nArtist: ${videoData.artist}\nURL: ${videoData.youtube}\n\nTotal songs: ${songs.length}`;
                youtubeUrlInput.value = '';
                youtubeTypeIndicator.textContent = '-';
                youtubeStatusContainer.classList.remove('import-status--success', 'import-status--info', 'import-status--error');

                // Reload songs if on songs page
                if (loadedData) {
                    loadedData.songs = songs;
                    renderPage('songs', loadedData);
                }
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
                        existingSongs[existingIndex] = newSong;
                        updatedCount++;
                    } else {
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

                // Reload songs if on songs page
                if (loadedData) {
                    loadedData.songs = existingSongs;
                    renderPage('songs', loadedData);
                }
            }
            else {
                throw new Error('Invalid YouTube URL. Please provide a valid video or playlist URL.');
            }
        } catch (error) {
            console.error('YouTube import error:', error);
            youtubeImportLog.classList.add('import-log--visible', 'import-log--error');
            youtubeImportLog.textContent = `✗ Error: ${error.message}`;
        }
    });

    // Download songs JSON
    document.getElementById('download-songs-btn').addEventListener('click', async () => {
        try {
            const songs = await loadSongs();
            downloadJSON({ songs }, 'songs.json');
        } catch (error) {
            alert('Failed to download songs: ' + error.message);
        }
    });

    // Download playlists JSON
    document.getElementById('download-playlists-btn').addEventListener('click', async () => {
        try {
            const playlists = await loadPlaylists();
            downloadJSON({ playlists }, 'playlists.json');
        } catch (error) {
            alert('Failed to download playlists: ' + error.message);
        }
    });

    // Set initial username if available
    const usernameEl = document.getElementById('mal-username');
    if (initialData && initialData.anime_username) {
        usernameEl.value = initialData.anime_username;
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializeApp);