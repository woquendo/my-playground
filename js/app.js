// Main application initialization
import { fetchLocalOrRemote, saveLocalData, downloadJSON, loadLocalData } from './dataManager.js';
import { renderSongList } from './songList.js';
import { renderShowList, importAnimeList } from './showList.js';
import { setupNavigation } from './navigation.js';
import { fallbackData, STORAGE_KEY } from './config.js';
import { setSongsList } from './player.js';
import { pausePlayer, playPlayer, playNext, playPrevious, stopPlayer, hideMinimizedPlayer } from './player.js';
import { setupImportControls } from './importControls.js';

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

    // Set initial username if available
    const usernameEl = document.getElementById('mal-username');
    if (initialData && initialData.anime_username) {
        usernameEl.value = initialData.anime_username;
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializeApp);