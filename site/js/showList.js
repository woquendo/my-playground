// Show/Anime list rendering and management
import { statusMap } from './config.js';
import { createViewToggle, setViewToggleState, setContainerView } from './viewManager.js';
import {
    createScheduleControls,
    setupScheduleEventListeners,
    calculateCurrentEpisode,
    formatDate,
    renderScheduleView
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
                        episodes: item.anime_num_episodes || 12,
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
    const episodes = node.episodes || node.episodes_aired || node.episode_count || 12;
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

export function renderShowList(shows, container, view = 'shows') {
    if (!container) return;

    container.innerHTML = '';
    if (!shows || shows.length === 0) {
        container.innerHTML = '<div class="small">No shows or anime found.</div>';
        return;
    }

    // If this is the schedule view, directly render the schedule
    if (view === 'schedule') {
        renderScheduleView(shows, container);
        return;
    }

    // State for pagination and view mode
    let currentPage = 1;
    let itemsPerPage = 20;

    // Remember selected tab and view
    let currentStatus = localStorage.getItem('showsStatus') || 'watching';
    let currentView = localStorage.getItem('showsView') || 'grid';

    const isAnime = shows.some(s => s.status);
    if (isAnime) {
        // Create controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'shows-controls';

        // Initialize view toggle
        const viewToggle = createViewToggle(currentView, (newView) => {
            localStorage.setItem('showsView', newView);
            currentView = newView;
            renderFilteredShows();
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
            <button class="btn small status-btn${status === currentStatus ? ' active' : ''}" data-status="${status}">
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

        // State variables
        let searchQuery = '';

        function renderFilteredShows() {
            itemsPerPage = currentView === 'grid' ? (window.innerWidth >= 1920 ? 18 : 12) : 20;
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
            const paginationContainer = document.getElementById('pagination-options');
            const existingPagination = paginationContainer.querySelector('.pagination');
            if (existingPagination) {
                existingPagination.remove();
            }
            const pagination = createNavigation(filteredShows.length);
            if (pagination) {
                paginationContainer.appendChild(pagination);
            }

            // Display message when no shows match filter
            if (paginatedShows.length === 0) {
                showsContainer.innerHTML = '<div class="small">No shows match your search criteria.</div>';
                return;
            }

            paginatedShows.forEach(item => {
                const div = document.createElement('div');
                div.className = `show-item show-item-${currentView}`;

                if (currentView === 'grid') {
                    const gridContent = document.createElement('div');
                    gridContent.className = 'grid-content';

                    if (item.image_url) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'show-image';
                        const imgHtml = item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer"><img src="${item.image_url}" alt="${item.title}" loading="lazy"></a>` : `<img src="${item.image_url}" alt="${item.title}" loading="lazy">`;
                        imgContainer.innerHTML = imgHtml;
                        gridContent.appendChild(imgContainer);
                    }

                    const title = item.title || item.name || 'Untitled';
                    const url = item.url || '';
                    const meta = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>` : title;

                    const infoContainer = document.createElement('div');
                    infoContainer.className = 'show-info';
                    infoContainer.innerHTML = `
                        <strong class="show-title">${meta}</strong>
                        <div class="show-details">
                            ${item.episodes ? `<span class="episodes">${item.episodes} eps</span>` : ''}
                            ${item.score ? `<span class="score">★ ${item.score}</span>` : ''}
                        </div>
                        <div class="show-meta small">
                            ${item.type ? `<span>${item.type}</span>` : ''}
                            ${item.season && item.season_year ?
                            `<span>${item.season} ${item.season_year}</span>` : ''}
                        </div>
                    `;
                    gridContent.appendChild(infoContainer);
                    div.appendChild(gridContent);
                } else {
                    const listContent = document.createElement('div');
                    listContent.className = 'list-content';

                    if (item.image_url) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'show-image-small';
                        imgContainer.innerHTML = `<img src="${item.image_url}" alt="${item.title}" loading="lazy">`;
                        listContent.appendChild(imgContainer);
                    }

                    const title = item.title || item.name || 'Untitled';
                    const url = item.url || '';
                    const meta = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>` : title;

                    const metadataArr = [];
                    if (item.episodes) metadataArr.push(`${item.episodes} eps`);
                    if (item.score) metadataArr.push(`★ ${item.score}`);
                    if (item.type) metadataArr.push(item.type);
                    if (item.season && item.season_year) metadataArr.push(`${item.season} ${item.season_year}`);
                    if (item.studios) metadataArr.push(item.studios);

                    const infoContainer = document.createElement('div');
                    infoContainer.className = 'list-info';
                    infoContainer.innerHTML = `
                        <strong class="show-title">${meta}</strong>
                        <div class="show-meta small">${metadataArr.join(' • ')}</div>
                    `;
                    listContent.appendChild(infoContainer);
                    div.appendChild(listContent);
                }

                showsContainer.appendChild(div);
            });
        }

        // Event listeners
        statusTabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('status-btn')) {
                statusTabs.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentStatus = e.target.dataset.status;
                localStorage.setItem('showsStatus', currentStatus);
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