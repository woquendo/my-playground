// Show/Anime list rendering and management
import { statusMap } from './config.js';
import { createViewToggle, setViewToggleState, setContainerView } from './viewManager.js';
import {
    createScheduleControls,
    setupScheduleEventListeners,
    renderSchedule as renderScheduleContent,
    calculateCurrentEpisode,
    formatDate
} from './scheduleManager.js';

export async function fetchAnimelistAll(username) {
    const logEl = document.getElementById('import-log');
    const logs = [];
    logEl.style.display = 'block';
    logEl.textContent = 'Starting import for ' + username + "\n";

    let combined = [];
    for (const [statusId, statusName] of Object.entries(statusMap)) {
        const proxyUrl = `/proxy?username=${encodeURIComponent(username)}&status=${statusId}`;
        logs.push(`Fetching ${statusName} list...`);

        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) {
                logs.push(`  -> Error ${res.status}: ${res.statusText}`);
                continue;
            }
            const data = await res.json();
            const html = data.html;

            const match = html.match(/data-items="([^"]+)"/);
            if (match) {
                const jsonStr = decodeURIComponent(match[1].replace(/&quot;/g, '"'));
                try {
                    const items = JSON.parse(jsonStr);
                    const parsed = items.map(item => ({
                        title: item.anime_title,
                        status: statusName,
                        url: `https://myanimelist.net/anime/${item.anime_id}`,
                        score: item.score,
                        episodes: item.anime_num_episodes || null,
                        type: item.anime_media_type_string || null,
                        image_url: item.anime_image_path || null,
                        watching_status: item.status_watching_state || null,
                        id: item.anime_id || null,
                        start_date: item.anime_start_date_string || null,
                        end_date: item.anime_end_date_string || null,
                        studios: item.anime_studios || null,
                        licensors: item.anime_licensors || null,
                        rating: item.anime_mpaa_rating_string || null,
                        airing_status: item.anime_airing_status || null,
                        season: item.anime_season || null,
                        season_year: item.anime_season_year || null
                    }));
                    combined = combined.concat(parsed);
                    logs.push(`  -> Found ${parsed.length} items`);
                } catch (e) {
                    logs.push(`  ! Error parsing JSON: ${e.message}`);
                }
            } else {
                logs.push('  ! No anime data found in page');
            }
        } catch (e) {
            logs.push(`  ! Fetch error: ${e.message}`);
        }
    }

    logEl.textContent += logs.join('\n') + '\n';
    return combined;
}

function normalizeEntry(entry) {
    const node = entry.anime || entry.node || entry.entry || entry;
    const title = node.title || node.name || node.title_english || node.name_en || (node.mal_id && ("#" + node.mal_id)) || 'Untitled';
    const url = node.url || node.mal_url || '';
    const episodes = node.episodes || node.episodes_aired || node.episode_count || null;
    const status = (entry.status || (entry.list_status && entry.list_status.status) || (entry.animelist_status && entry.animelist_status.status) || '').toString().toLowerCase();
    const score = (entry.score || (entry.list_status && entry.list_status.score) || null);

    // Preserve all additional metadata if present
    const metadata = {
        title, url, episodes, score, status,
        type: node.type || entry.type || null,
        image_url: node.image_url || entry.image_url || null,
        watching_status: node.watching_status || entry.watching_status || null,
        id: node.id || entry.id || null,
        start_date: node.start_date || entry.start_date || null,
        end_date: node.end_date || entry.end_date || null,
        studios: node.studios || entry.studios || null,
        licensors: node.licensors || entry.licensors || null,
        rating: node.rating || entry.rating || null,
        airing_status: node.airing_status || entry.airing_status || null,
        season: node.season || entry.season || null,
        season_year: node.season_year || entry.season_year || null
    };

    return metadata;
}

export async function importAnimeList(username) {
    const raw = await fetchAnimelistAll(username);
    return raw.map(normalizeEntry);
}

export function renderShowList(shows, container) {
    if (!container) return;

    container.innerHTML = '';
    if (!shows || shows.length === 0) {
        container.innerHTML = '<div class="small">No shows or anime found.</div>';
        return;
    }

    // State for pagination and view mode
    let currentPage = 1;
    const itemsPerPage = 20;

    const isAnime = shows.some(s => s.status);
    if (isAnime) {
        // Create controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'shows-controls';

        // Initialize view toggle
        const initialView = localStorage.getItem('showsView') || 'grid';
        const viewToggle = createViewToggle(initialView, (newView) => {
            localStorage.setItem('showsView', newView);
            renderFilteredShows(newView);
        });

        // Status tabs
        const statusTabs = document.createElement('div');
        statusTabs.className = 'status-tabs';
        const order = ['watching', 'plan_to_watch', 'completed', 'on_hold', 'dropped'];
        const groups = {};
        shows.forEach(s => {
            const st = (s.status || 'unknown').toString().toLowerCase();
            if (!groups[st]) groups[st] = [];
            groups[st].push(s);
        });

        statusTabs.innerHTML = order.map(status => `
            <button class="btn small status-btn${status === 'watching' ? ' active' : ''}" data-status="${status}">
                ${status.replace(/_/g, ' ')} (${(groups[status] || []).length})
            </button>
        `).join('');

        // Search input
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" id="show-search" class="search-input" placeholder="Search shows...">
        `;

        // Add controls to container
        controlsContainer.appendChild(viewToggle);
        controlsContainer.appendChild(statusTabs);
        controlsContainer.appendChild(searchContainer);
        container.appendChild(controlsContainer);

        // Create shows container
        const showsContainer = document.createElement('div');
        showsContainer.className = 'shows-grid';
        showsContainer.id = 'shows-container';
        container.appendChild(showsContainer);

        // State variables for both views
        let currentStatus = 'watching';
        let currentView = 'grid';
        let searchQuery = '';

        // Shows view handler
        function renderShowView() {
            // Create controls container
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'shows-controls';

            // View toggle
            const viewToggle = document.createElement('div');
            viewToggle.className = 'view-toggle';
            viewToggle.innerHTML = `
                <button class="btn small view-btn active" data-view="grid">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                    </svg>
                </button>
                <button class="btn small view-btn" data-view="list">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            `;

            // Status tabs
            const statusTabs = document.createElement('div');
            statusTabs.className = 'status-tabs';

            // Add controls to container
            controlsContainer.appendChild(viewToggle);
            controlsContainer.appendChild(statusTabs);

            // Search input
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            searchContainer.innerHTML = `
                <input type="text" id="show-search" class="search-input" placeholder="Search shows...">
            `;
            controlsContainer.appendChild(searchContainer);

            container.appendChild(controlsContainer);

            // Create shows container
            const showsContainer = document.createElement('div');
            showsContainer.className = 'shows-grid';
            showsContainer.id = 'shows-container';
            container.appendChild(showsContainer);

            // Set up event listeners directly
            // Status tabs listener
            statusTabs.addEventListener('click', (e) => {
                if (e.target.classList.contains('status-btn')) {
                    statusTabs.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    currentStatus = e.target.dataset.status;
                    currentPage = 1; // Reset to first page when changing status
                    renderFilteredShows();
                }
            });

            // View toggle listener
            viewToggle.addEventListener('click', (e) => {
                if (e.target.closest('.view-btn')) {
                    const btn = e.target.closest('.view-btn');
                    viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentView = btn.dataset.view;
                    renderFilteredShows();
                }
            });

            // Search input listener
            searchContainer.querySelector('#show-search').addEventListener('input', (e) => {
                searchQuery = e.target.value;
                currentPage = 1; // Reset to first page when searching
                renderFilteredShows();
            });

            // Initial render
            renderFilteredShows();
        }

        function renderFilteredShows() {
            let filteredShows = (groups[currentStatus] || []).filter(item => {
                if (!searchQuery) return true;
                return item.title.toLowerCase().includes(searchQuery.toLowerCase());
            });

            // Reset current page if we're beyond the last page
            const maxPages = Math.ceil(filteredShows.length / itemsPerPage);
            if (currentPage > maxPages) {
                currentPage = 1;
            }

            // Apply pagination
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedShows = filteredShows.slice(startIndex, startIndex + itemsPerPage);

            showsContainer.className = `shows-${currentView}`;
            showsContainer.innerHTML = '';

            // Update pagination
            const existingPagination = container.querySelector('.pagination');
            if (existingPagination) {
                existingPagination.remove();
            }
            const pagination = createNavigation(filteredShows.length);
            if (pagination) {
                // Insert after the showsContainer
                showsContainer.insertAdjacentElement('afterend', pagination);
            }

            // Display message when no shows match filter
            if (paginatedShows.length === 0) {
                showsContainer.innerHTML = '<div class="small">No shows match your search criteria.</div>';
                return;
            }

            paginatedShows.forEach(item => {
                const div = document.createElement('div');
                div.className = `show-item show-item-${currentView}`;

                const showContent = document.createElement('div');
                showContent.className = 'show-content';

                if (item.image_url) {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'show-image';
                    imgContainer.innerHTML = `<img src="${item.image_url}" alt="${item.title}" loading="lazy">`;
                    div.appendChild(imgContainer);
                }

                const title = item.title || item.name || 'Untitled';
                const url = item.url || '';
                const meta = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>` : title;

                const metadataArr = [];
                if (item.episodes) metadataArr.push(`${item.episodes} eps`);
                if (item.score) metadataArr.push(`Score: ${item.score}`);
                if (item.type) metadataArr.push(item.type);
                if (item.season && item.season_year) metadataArr.push(`${item.season} ${item.season_year}`);
                if (item.studios) metadataArr.push(`Studio: ${item.studios}`);

                showContent.innerHTML = `
                    <strong>${meta}</strong>
                    <div class="small metadata-row">${metadataArr.join(' • ')}</div>
                `;

                div.appendChild(showContent);
                showsContainer.appendChild(div);
            });
        }

        // Event listeners
        statusTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('status-btn')) {
                statusTabs.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentStatus = e.target.dataset.status;
                currentPage = 1; // Reset to first page when changing status
                renderFilteredShows();
            }
        });

        viewToggle.addEventListener('click', (e) => {
            if (e.target.closest('.view-btn')) {
                const btn = e.target.closest('.view-btn');
                viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                renderFilteredShows();
            }
        });

        const searchInput = document.getElementById('show-search');
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderFilteredShows();
        });

        // Navigation buttons
        function createNavigation(filteredCount) {
            const totalPages = Math.ceil(filteredCount / itemsPerPage);
            if (totalPages <= 1) return null;

            // Reset current page if it's beyond the total pages
            if (currentPage > totalPages) {
                currentPage = 1;
            }

            const nav = document.createElement('div');
            nav.className = 'pagination';

            // Create page numbers array
            let pageNumbers = [];
            if (totalPages <= 10) {
                // Show all pages if 10 or fewer
                pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
            } else {
                // Complex pagination with ellipsis
                if (currentPage <= 5) {
                    // Near start
                    pageNumbers = [1, 2, 3, 4, 5, 6, 7, '...', totalPages - 1, totalPages];
                } else if (currentPage >= totalPages - 4) {
                    // Near end
                    pageNumbers = [1, 2, '...', totalPages - 6, totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                } else {
                    // Middle
                    pageNumbers = [1, 2, '...', currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, '...', totalPages];
                }
            }

            // Create navigation HTML
            const navHTML = [`
                <button class="btn small" ${currentPage === 1 ? 'disabled' : ''} data-page="prev">&laquo;</button>
            `];

            pageNumbers.forEach(num => {
                if (num === '...') {
                    navHTML.push('<span class="ellipsis">...</span>');
                } else {
                    navHTML.push(`
                        <button class="btn small page-num ${num === currentPage ? 'active' : ''}" 
                                data-page="${num}">${num}</button>
                    `);
                }
            });

            navHTML.push(`
                <button class="btn small" ${currentPage === totalPages ? 'disabled' : ''} data-page="next">&raquo;</button>
            `);

            nav.innerHTML = navHTML.join('');

            // Event listener for navigation
            nav.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn || btn.disabled) return;

                if (btn.dataset.page === 'prev') {
                    currentPage--;
                } else if (btn.dataset.page === 'next') {
                    currentPage++;
                } else if (btn.dataset.page) {
                    currentPage = parseInt(btn.dataset.page);
                }

                renderFilteredShows();
            });

            return nav;
        }

        // Initial render
        renderFilteredShows();

        // Add schedule tab only if it doesn't exist
        const navContainer = document.querySelector('.nav');
        if (navContainer && !navContainer.querySelector('[data-view="schedule"]')) {
            const scheduleBtn = document.createElement('button');
            scheduleBtn.className = 'btn small nav-btn';
            scheduleBtn.textContent = 'Schedule';
            scheduleBtn.dataset.view = 'schedule';

            // Find the existing shows button
            const existingShowsBtn = navContainer.querySelector('[data-page="shows"]');
            if (existingShowsBtn) {
                navContainer.insertBefore(scheduleBtn, existingShowsBtn.nextSibling);
            }

            // Schedule button click handler
            scheduleBtn.addEventListener('click', () => {
                const showsBtn = navContainer.querySelector('[data-page="shows"]');
                if (showsBtn) showsBtn.classList.remove('active');
                scheduleBtn.classList.add('active');
                container.innerHTML = '';
                renderScheduleView();
            });

            // Add handler to existing shows button
            const showsBtn = navContainer.querySelector('[data-page="shows"]');
            if (showsBtn) {
                showsBtn.addEventListener('click', () => {
                    scheduleBtn.classList.remove('active');
                    showsBtn.classList.add('active');
                    container.innerHTML = '';
                    renderShowView();
                });
            }
        }

        // Schedule view handler
        function renderScheduleView() {
            const today = new Date();
            const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            // Create schedule controls
            const controls = createScheduleControls(currentDate);
            const scheduleContent = document.createElement('div');
            scheduleContent.className = 'schedule-content';

            container.appendChild(controls);
            container.appendChild(scheduleContent);

            // Setup schedule controls event listeners
            setupScheduleEventListeners(controls, currentDate, (selectedDate) => {
                renderScheduleContent(shows, scheduleContent, selectedDate, localStorage.getItem('scheduleView') || 'grid');
            });

            // Initial render
            renderScheduleContent(shows, scheduleContent, currentDate, localStorage.getItem('scheduleView') || 'grid');
        }

        // Initial schedule render
        renderScheduleView();
    }

    if (!isAnime) {
        // Simple show list rendering for non-anime shows
        shows.forEach(s => {
            const div = document.createElement('div');
            div.className = 'show-item';
            div.innerHTML = `<strong>${s.title}</strong> — <span class="small">${s.date ? new Date(s.date).toLocaleDateString() : ''} ${s.location ? '(' + s.location + ')' : ''}</span><div class="small">${s.description || ''}</div>`;
            container.appendChild(div);
        });
    }
}