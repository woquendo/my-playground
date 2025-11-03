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
import { saveTitlesToServer } from './dataManager.js';

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
                    const parsed = items.map(item => {
                        // Extract English title from HTML
                        let englishTitle = null;
                        try {
                            // Create a temporary DOM element to parse the HTML
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = html;

                            // Find the title link for this anime by href containing the anime id
                            const allLinks = tempDiv.querySelectorAll('a[href*="/anime/"]');
                            console.log(`Found ${allLinks.length} anime links for anime ${item.anime_id}`);
                            for (const link of allLinks) {
                                const href = link.getAttribute('href') || link.href;
                                console.log(`Checking link: ${href}, text: "${link.textContent.trim()}"`);
                                if (href && href.includes(`/anime/${item.anime_id}`)) {
                                    englishTitle = link.textContent.trim();
                                    console.log(`Found English title for ${item.anime_id}: "${englishTitle}"`);
                                    break;
                                }
                            }

                            if (!englishTitle) {
                                console.warn(`Could not find title link for anime ${item.anime_id} (${item.anime_title})`);
                            }
                        } catch (e) {
                            // If HTML parsing fails, fall back to API title
                            console.warn('Failed to parse English title from HTML:', e);
                        }

                        return {
                            title: englishTitle || item.anime_title, // Use English title if available, otherwise Japanese
                            title_english: englishTitle,
                            title_japanese: item.anime_title,
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
                        };
                    });
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
    const title_english = node.title_english || entry.title_english || null;
    const title_japanese = node.title_japanese || entry.title_japanese || node.title || null;
    const url = node.url || node.mal_url || '';
    const episodes = node.episodes || node.episodes_aired || node.episode_count || 12;
    const status = (entry.status || (entry.list_status && entry.list_status.status) || (entry.animelist_status && entry.animelist_status.status) || '').toString().toLowerCase();
    const score = (entry.score || (entry.list_status && entry.list_status.score) || null);

    // Preserve all additional metadata if present
    const metadata = {
        title, title_english, title_japanese, url, episodes, score, status,
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
    const combined = await fetchAnimelistAll(username);
    return combined.map(normalizeEntry);
}

export async function fetchEnglishTitle(showId) {
    try {
        const proxyUrl = `/proxy-anime?id=${showId}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        const html = data.html;

        // Extract English title
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const englishTitleEl = tempDiv.querySelector('p.title-english.title-inherit');
        if (englishTitleEl) {
            const englishTitle = englishTitleEl.textContent.trim();
            if (englishTitle) {
                return englishTitle;
            }
        }
        return null;
    } catch (e) {
        console.error(`Error fetching English title for ${showId}:`, e);
        return null;
    }
}

export async function fetchAnimeStats(showId) {
    try {
        const proxyUrl = `/proxy-anime?id=${showId}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        const html = data.html;

        // Parse stats from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const stats = {};

        // Extract score
        const scoreEl = tempDiv.querySelector('.score-label');
        if (scoreEl) {
            stats.score = scoreEl.textContent.trim();
            // Also get user count from data-user attribute
            const scoreDiv = tempDiv.querySelector('.score');
            if (scoreDiv && scoreDiv.dataset.user) {
                stats.scoreUsers = scoreDiv.dataset.user;
            }
        }

        // Extract ranking
        const rankedEl = tempDiv.querySelector('.numbers.ranked strong');
        if (rankedEl) {
            stats.ranked = rankedEl.textContent.trim();
        }

        // Extract popularity
        const popularityEl = tempDiv.querySelector('.numbers.popularity strong');
        if (popularityEl) {
            stats.popularity = popularityEl.textContent.trim();
        }

        // Extract members
        const membersEl = tempDiv.querySelector('.numbers.members strong');
        if (membersEl) {
            stats.members = membersEl.textContent.trim();
        }

        return stats;
    } catch (e) {
        console.error(`Error fetching stats for ${showId}:`, e);
        return null;
    }
}// Custom alert dialog function
function showCustomAlert(message) {
    // Remove any existing alert
    const existingAlert = document.querySelector('.alert-dialog-overlay');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'alert-dialog-overlay';

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'alert-dialog';

    // Create message
    const messageEl = document.createElement('p');
    messageEl.textContent = message;

    // Create OK button
    const okBtn = document.createElement('button');
    okBtn.className = 'btn';
    okBtn.textContent = 'OK';
    okBtn.addEventListener('click', () => {
        overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
    });

    // Assemble dialog
    dialog.appendChild(messageEl);
    dialog.appendChild(okBtn);
    overlay.appendChild(dialog);

    // Add click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    });

    // Add ESC key to close
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Add to body
    document.body.appendChild(overlay);

    // Focus the button
    okBtn.focus();
}

// Stats tooltip system
let currentTooltip = null;
let tooltipTimeout = null;
let statsCache = new Map(); // Cache stats for 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function createStatsTooltip(show, event) {
    // Remove existing tooltip
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'stats-tooltip';

    // Position tooltip near mouse cursor
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY - 10}px`;

    // Add loading state
    tooltip.innerHTML = `
        <div class="stats-title">${show.title || 'Loading...'}</div>
        <div class="stats-loading">Loading stats...</div>
    `;

    document.body.appendChild(tooltip);
    currentTooltip = tooltip;

    // Make visible
    setTimeout(() => tooltip.classList.add('visible'), 10);

    return tooltip;
}

function updateTooltipWithStats(tooltip, stats, show) {
    if (!stats) {
        tooltip.innerHTML = `
            <div class="stats-title">${show.title || 'Unknown'}</div>
            <div class="stats-loading">Failed to load stats</div>
        `;
        return;
    }

    const title = show.title_english || show.title || 'Unknown';

    tooltip.innerHTML = `
        <div class="stats-title">${title}</div>
        ${stats.score ? `<div class="stats-item"><span class="stats-label">Score:</span> <span class="stats-value">${stats.score}${stats.scoreUsers ? ` (${stats.scoreUsers})` : ''}</span></div>` : ''}
        ${stats.ranked ? `<div class="stats-item"><span class="stats-label">Ranked:</span> <span class="stats-value">${stats.ranked}</span></div>` : ''}
        ${stats.popularity ? `<div class="stats-item"><span class="stats-label">Popularity:</span> <span class="stats-value">${stats.popularity}</span></div>` : ''}
        ${stats.members ? `<div class="stats-item"><span class="stats-label">Members:</span> <span class="stats-value">${stats.members}</span></div>` : ''}
    `;
}

function hideStatsTooltip() {
    if (currentTooltip) {
        currentTooltip.classList.remove('visible');
        setTimeout(() => {
            if (currentTooltip) {
                currentTooltip.remove();
                currentTooltip = null;
            }
        }, 200);
    }
}

function setupStatsHover(showItem, show) {
    if (!show.id) return; // Only for shows with MAL IDs

    let hoverTimeout = null;

    showItem.addEventListener('mouseenter', (e) => {
        // Clear any existing timeout
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }

        // Delay showing tooltip to avoid flickering
        hoverTimeout = setTimeout(async () => {
            const tooltip = createStatsTooltip(show, e);

            // Check cache first
            const cacheKey = `stats_${show.id}`;
            const cached = statsCache.get(cacheKey);

            if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                // Use cached data
                updateTooltipWithStats(tooltip, cached.data, show);
            } else {
                // Fetch fresh data
                try {
                    const stats = await fetchAnimeStats(show.id);
                    if (stats) {
                        // Cache the result
                        statsCache.set(cacheKey, {
                            data: stats,
                            timestamp: Date.now()
                        });
                        updateTooltipWithStats(tooltip, stats, show);
                    } else {
                        updateTooltipWithStats(tooltip, null, show);
                    }
                } catch (error) {
                    console.error('Failed to fetch stats:', error);
                    updateTooltipWithStats(tooltip, null, show);
                }
            }
        }, 500); // 500ms delay before showing tooltip
    });

    showItem.addEventListener('mouseleave', () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }

        // Delay hiding tooltip to allow moving to tooltip
        tooltipTimeout = setTimeout(() => {
            hideStatsTooltip();
        }, 300);
    });

    // Keep tooltip visible when hovering over it
    showItem.addEventListener('mousemove', (e) => {
        if (currentTooltip) {
            // Update tooltip position to follow mouse
            currentTooltip.style.left = `${e.clientX + 10}px`;
            currentTooltip.style.top = `${e.clientY - 10}px`;
        }
    });
}

export function renderShowList(shows, container, view = 'shows', titles = {}, onTitleFetched = null) {
    if (!container) return;

    container.innerHTML = '';
    if (!shows || shows.length === 0) {
        container.innerHTML = '<div class="small">No shows or anime found.</div>';
        return;
    }

    // If this is the schedule view, directly render the schedule
    if (view === 'schedule') {
        renderScheduleView(shows, container, titles);
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

        // Fetch all titles button
        const fetchAllBtn = document.createElement('button');
        fetchAllBtn.className = 'btn small';
        fetchAllBtn.id = 'fetch-all-titles-btn';
        fetchAllBtn.textContent = 'Fetch All English Titles';
        fetchAllBtn.title = 'Fetch English titles for all shows in current filter';

        // Add controls to container
        controlsContainer.appendChild(viewToggle);
        controlsContainer.appendChild(statusTabs);
        controlsContainer.appendChild(searchContainer);
        controlsContainer.appendChild(fetchAllBtn);
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
                const query = searchQuery.toLowerCase();
                // Search across all available titles: stored English, imported English, and original title
                const storedTitle = titles[item.id];
                const importedTitle = item.title_english;
                const originalTitle = item.title || item.name || '';
                return storedTitle?.toLowerCase().includes(query) ||
                    importedTitle?.toLowerCase().includes(query) ||
                    originalTitle.toLowerCase().includes(query);
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

                let gridContent, listContent;

                if (currentView === 'grid') {
                    gridContent = document.createElement('div');
                    gridContent.className = 'grid-content';

                    if (item.image_url) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'show-image';
                        const imgHtml = item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer"><img src="${item.image_url}" alt="${item.title}" loading="lazy"></a>` : `<img src="${item.image_url}" alt="${item.title}" loading="lazy">`;
                        imgContainer.innerHTML = imgHtml;
                        gridContent.appendChild(imgContainer);
                    }

                    const title = titles[item.id] || item.title_english || item.title || item.name || 'Untitled';
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

                    // Add fetch title button if no title in titles.json and no title_english from import
                    if (!titles[item.id] && !item.title_english && item.id && onTitleFetched) {
                        const fetchBtn = document.createElement('button');
                        fetchBtn.className = 'fetch-title-btn';
                        fetchBtn.innerHTML = '🔍';
                        fetchBtn.title = 'Fetch English title';
                        fetchBtn.style.display = 'none';
                        fetchBtn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fetchBtn.disabled = true;
                            fetchBtn.textContent = '⏳';
                            const englishTitle = await fetchEnglishTitle(item.id);
                            if (englishTitle) {
                                titles[item.id] = englishTitle;
                                await saveTitlesToServer(titles);
                                onTitleFetched(titles);
                            } else {
                                showCustomAlert('Could not find English title for this show.');
                            }
                            fetchBtn.disabled = false;
                            fetchBtn.innerHTML = '🔍';
                        });
                        gridContent.appendChild(fetchBtn);

                        // Show on hover
                        div.addEventListener('mouseenter', () => {
                            fetchBtn.style.display = 'block';
                        });
                        div.addEventListener('mouseleave', () => {
                            fetchBtn.style.display = 'none';
                        });
                    }

                } else {
                    listContent = document.createElement('div');
                    listContent.className = 'list-content';

                    if (item.image_url) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'show-image-small';
                        imgContainer.innerHTML = `<img src="${item.image_url}" alt="${item.title}" loading="lazy">`;
                        listContent.appendChild(imgContainer);
                    }

                    const title = titles[item.id] || item.title_english || item.title || item.name || 'Untitled';
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

                    // Add fetch title button if no title in titles.json and no title_english from import
                    if (!titles[item.id] && !item.title_english && item.id && onTitleFetched) {
                        const fetchBtn = document.createElement('button');
                        fetchBtn.className = 'fetch-title-btn';
                        fetchBtn.innerHTML = '🔍';
                        fetchBtn.title = 'Fetch English title';
                        fetchBtn.style.display = 'none';
                        fetchBtn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fetchBtn.disabled = true;
                            fetchBtn.textContent = '⏳';
                            const englishTitle = await fetchEnglishTitle(item.id);
                            if (englishTitle) {
                                titles[item.id] = englishTitle;
                                await saveTitlesToServer(titles);
                                onTitleFetched(titles);
                            } else {
                                showCustomAlert('Could not find English title for this show.');
                            }
                            fetchBtn.disabled = false;
                            fetchBtn.innerHTML = '🔍';
                        });
                        listContent.appendChild(fetchBtn);

                        // Show on hover
                        div.addEventListener('mouseenter', () => {
                            fetchBtn.style.display = 'block';
                        });
                        div.addEventListener('mouseleave', () => {
                            fetchBtn.style.display = 'none';
                        });
                    }
                }

                if (currentView === 'grid') {
                    div.appendChild(gridContent);
                } else {
                    div.appendChild(listContent);
                }

                // Setup stats hover for all show items
                setupStatsHover(div, item);

                showsContainer.appendChild(div);
            });
        }
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

        // Fetch all titles functionality
        fetchAllBtn.addEventListener('click', async () => {
            // Get currently filtered shows
            let filteredShows = (groups[currentStatus] || []).filter(item => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                // Search across all available titles: stored English, imported English, and original title
                const storedTitle = titles[item.id];
                const importedTitle = item.title_english;
                const originalTitle = item.title || item.name || '';
                return storedTitle?.toLowerCase().includes(query) ||
                    importedTitle?.toLowerCase().includes(query) ||
                    originalTitle.toLowerCase().includes(query);
            });

            // Filter to shows that don't have English titles yet (neither stored nor from import)
            const showsToFetch = filteredShows.filter(item =>
                !titles[item.id] && !item.title_english && item.id
            );

            if (showsToFetch.length === 0) {
                showCustomAlert('All shows in the current filter already have English titles (either stored or imported).');
                return;
            }

            // Confirm with user
            const confirmed = confirm(`Fetch English titles for ${showsToFetch.length} shows? This may take a while.`);
            if (!confirmed) return;

            // Disable button and show progress
            fetchAllBtn.disabled = true;
            fetchAllBtn.textContent = `Fetching... (0/${showsToFetch.length})`;

            let successCount = 0;
            let errorCount = 0;

            // Fetch titles one by one with small delay to avoid overwhelming the server
            for (let i = 0; i < showsToFetch.length; i++) {
                const show = showsToFetch[i];
                fetchAllBtn.textContent = `Fetching... (${i + 1}/${showsToFetch.length})`;

                try {
                    const englishTitle = await fetchEnglishTitle(show.id);
                    if (englishTitle) {
                        titles[show.id] = englishTitle;
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (e) {
                    console.error(`Failed to fetch title for ${show.title}:`, e);
                    errorCount++;
                }

                // Small delay between requests
                if (i < showsToFetch.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            // Save titles to server
            try {
                await saveTitlesToServer(titles);
                if (onTitleFetched) {
                    onTitleFetched(titles);
                }
            } catch (e) {
                console.error('Failed to save titles:', e);
                showCustomAlert('Titles were fetched but failed to save to server.');
                fetchAllBtn.disabled = false;
                fetchAllBtn.textContent = 'Fetch All English Titles';
                return;
            }

            // Show results
            const message = `Fetched ${successCount} English titles successfully.${errorCount > 0 ? ` ${errorCount} shows had no English title available.` : ''}`;
            showCustomAlert(message);

            // Re-enable button
            fetchAllBtn.disabled = false;
            fetchAllBtn.textContent = 'Fetch All English Titles';
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