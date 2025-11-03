// Song list rendering and management
import { createPlayer, extractYouTubeId, setSongsList } from './player.js';

export function renderSongList(songs, container) {
    if (!container) return;

    container.innerHTML = '';
    if (!songs || !songs.length) {
        container.innerHTML = '<p class="small">No songs available.</p>';
        return;
    }

    // Create list container
    const listWrapper = document.createElement('div');
    listWrapper.className = 'list-column';

    // Controls
    const controls = document.createElement('div');
    controls.className = 'song-list-controls';
    controls.innerHTML = `
        <input id="song-search" placeholder="Search songs or artists" 
               style="flex:1;padding:6px;border-radius:6px;border:1px solid #ddd" />
        <select id="page-size" style="margin-left:8px;padding:6px;border-radius:6px;border:1px solid #ddd">
            <option value="5">5/page</option>
            <option value="8">8/page</option>
            <option value="12">12/page</option>
        </select>`;
    listWrapper.appendChild(controls);

    // List container
    const listWrap = document.createElement('div');
    listWrap.id = 'song-list-wrap';
    listWrap.style.maxHeight = '72vh';
    listWrap.style.overflow = 'auto';
    listWrap.style.marginTop = '0.6rem';

    const list = document.createElement('div');
    list.id = 'song-list-items';
    list.className = 'song-cards';
    listWrap.appendChild(list);
    listWrapper.appendChild(listWrap);

    // Pagination
    const pager = document.createElement('div');
    pager.className = 'pager small';
    pager.style.marginTop = '0.6rem';
    pager.innerHTML = '<button id="prev-page" class="btn small">Prev</button> <span id="page-info" style="margin:0 8px"></span> <button id="next-page" class="btn small">Next</button>';
    listWrapper.appendChild(pager);

    container.appendChild(listWrapper);

    // Setup pagination and search
    let currentPage = 1;
    let pageSize = parseInt(document.getElementById('page-size').value, 10) || 5;

    const searchInput = document.getElementById('song-search');

    function renderSongPage() {
        const q = (searchInput.value || '').trim().toLowerCase();
        const filtered = songs.filter(s => {
            const t = (s.title || '').toString().toLowerCase();
            const a = (s.artist || '').toString().toLowerCase();
            return !q || t.includes(q) || a.includes(q);
        });

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize);

        list.innerHTML = '';
        pageItems.forEach((song, idx) => {
            const realIdx = start + idx;
            const card = document.createElement('div');
            card.className = 'song-card';
            const title = song.title || 'Untitled';
            const artist = song.artist ? `<div class="small artist">${song.artist}</div>` : '';
            card.innerHTML = `<div class="song-card-inner"><div><strong>${title}</strong>${artist}</div><div><button class="btn play-btn" data-idx="${realIdx}">Play</button></div></div>`;
            list.appendChild(card);

            card.querySelector('.play-btn').addEventListener('click', () => {
                Array.from(list.querySelectorAll('.song-card')).forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                const playerContainer = document.getElementById('song-player');
                const videoId = extractYouTubeId(song.youtube || '');
                if (videoId) {
                    createPlayer(videoId, { muted: false, index: realIdx });
                } else if (song.youtube) {
                    const a = document.createElement('a');
                    a.href = song.youtube;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = 'Open on YouTube';
                    playerContainer.innerHTML = '';
                    playerContainer.appendChild(a);
                }
            });
        });

        document.getElementById('page-info').textContent = `${currentPage}/${totalPages} — ${total} songs`;
    }

    // Event listeners
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            renderSongPage();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        currentPage += 1;
        renderSongPage();
    });

    document.getElementById('page-size').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value, 10);
        currentPage = 1;
        renderSongPage();
    });

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderSongPage();
    });

    // Set up songs list in player
    setSongsList(songs);

    // Initial render
    renderSongPage();

    // Handle autoplay if any
    const firstAutoplay = songs.findIndex(s => s.autoplay);
    if (firstAutoplay >= 0) {
        const pageOf = Math.floor(firstAutoplay / pageSize) + 1;
        currentPage = pageOf;
        renderSongPage();
        const song = songs[firstAutoplay];
        const videoId = extractYouTubeId(song.youtube || '');
        if (videoId) {
            createPlayer(videoId, { muted: false, index: firstAutoplay });
            const card = list.querySelector(`.song-card:nth-child(${(firstAutoplay - (pageOf - 1) * pageSize) + 1})`);
            if (card) card.classList.add('active');
        }
    }
}