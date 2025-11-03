// Page navigation
import { getCurrentSong, showMinimizedPlayer, hideMinimizedPlayer, isPlayerActive } from './player.js';

export function showPage(name, renderCallback) {
    document.querySelectorAll('.page').forEach(el => el.style.display = 'none');
    const el = document.getElementById('page-' + name);
    if (el) el.style.display = '';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
    if (btn) btn.classList.add('active');
    // Add page class to container for styling
    const container = document.querySelector('.container.main');
    if (container) {
        container.className = 'container main page-' + name;
    }
    // Remember last selected page
    localStorage.setItem('lastPage', name);

    // Clear any existing content
    const showsContainer = name === 'schedule' ? document.getElementById('schedule-container') : document.getElementById('shows');
    if (showsContainer) {
        showsContainer.innerHTML = name === 'schedule' ?
            '<p class="small">Loading schedule…</p>' :
            '<p class="small">Loading shows…</p>';
    }

    // Hide/show the full player based on page
    const playerEl = document.getElementById('song-player');
    if (playerEl) {
        playerEl.style.display = name === 'songs' ? '' : 'none';
    }

    // Clear pagination if not on paginated pages
    if (name !== 'shows' && name !== 'schedule') {
        const paginationContainer = document.getElementById('pagination-options');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
    }

    // Handle minimized player
    if (name === 'songs') {
        hideMinimizedPlayer();
    } else if (isPlayerActive()) {
        showMinimizedPlayer();
    } else {
        hideMinimizedPlayer();
    }

    // Call render callback if provided
    if (renderCallback) renderCallback(name);
}

export function setupNavigation(renderCallback) {
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.addEventListener('click', () => showPage(b.dataset.page, renderCallback));
    });
    // Restore last page or default to songs
    const lastPage = localStorage.getItem('lastPage') || 'songs';
    showPage(lastPage, renderCallback);
}