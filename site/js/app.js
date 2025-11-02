// Main application initialization
import { fetchLocalOrRemote, saveLocalData, downloadJSON, loadLocalData } from './dataManager.js';
import { renderSongList } from './songList.js';
import { renderShowList, importAnimeList } from './showList.js';
import { setupNavigation } from './navigation.js';
import { fallbackData, STORAGE_KEY } from './config.js';
import { setSongsList } from './player.js';

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
        renderShowList(shows, showsEl);
    }
    else if (pageName === 'songs') {
        const songsEl = document.getElementById('songs');
        const songs = data.songs || [];
        console.log('Rendering songs:', songs.length);
        renderSongList(songs, songsEl);
        setSongsList(songs);
    }
}

// Update navigation to handle data loading
function setupPageNavigation(data) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        const pageName = btn.dataset.page;
        btn.addEventListener('click', () => {
            // Show the selected page
            document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
            document.getElementById('page-' + pageName).style.display = '';

            // Update active state
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Render the page content
            renderPage(pageName, data);
        });
    });

    // Render initial page
    const activePage = document.querySelector('.nav-btn.active');
    if (activePage) {
        renderPage(activePage.dataset.page, data);
    }
}

function render(data) {
    loadedData = data; // Store the data
    setupPageNavigation(data);
}

async function initializeApp() {
    // Load initial data first but don't render yet
    initialData = await fetchLocalOrRemote();

    // Set up navigation before first render
    setupPageNavigation(initialData);

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
    });

    document.getElementById('download-btn').addEventListener('click', () => {
        const data = initialData || loadLocalData() || fallbackData;
        downloadJSON(data);
    });

    document.getElementById('reload-packaged').addEventListener('click', async () => {
        try {
            document.getElementById('reload-packaged').textContent = 'Reloading...';

            // Fetch both files separately
            const [showsRes, songsRes] = await Promise.all([
                fetch('./data/shows.json?t=' + Date.now()),
                fetch('./data/songs.json?t=' + Date.now())
            ]);

            if (!showsRes.ok || !songsRes.ok) {
                throw new Error('Failed to load data files');
            }

            const [shows, songs] = await Promise.all([
                showsRes.json(),
                songsRes.json()
            ]);

            const json = {
                shows: shows.shows || shows,
                songs: songs.songs || songs
            };

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