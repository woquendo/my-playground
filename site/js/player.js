// YouTube player functionality
let ytApiReady = false;
let currentPlayer = null;
let currentVideoIndex = null;
let songsList = [];

export function extractYouTubeId(url) {
    if (!url) return null;
    const vMatch = url.match(/[?&]v=([\w-]{11})/);
    if (vMatch && vMatch[1]) return vMatch[1];
    const shortMatch = url.match(/youtu\.be\/([\w-]{11})/);
    if (shortMatch && shortMatch[1]) return shortMatch[1];
    const embedMatch = url.match(/embed\/([\w-]{11})/);
    if (embedMatch && embedMatch[1]) return embedMatch[1];
    const general = url.match(/([\w-]{11})/);
    return general ? general[1] : null;
}

function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    return new Promise((resolve) => {
        const existing = document.getElementById('youtube-api-script');
        if (!existing) {
            const s = document.createElement('script');
            s.id = 'youtube-api-script';
            s.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(s);
        }

        // Handle case where API might have loaded before we set up listener
        if (window.YT && window.YT.Player) {
            ytApiReady = true;
            resolve(window.YT);
            return;
        }

        // Set up listener for API load
        const originalReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
            ytApiReady = true;
            if (originalReady) originalReady();
            resolve(window.YT);
        };
    });
}

export function createPlayer(videoId, opts = {}) {
    const muted = !!opts.muted;
    const index = typeof opts.index === 'number' ? opts.index : null;
    const playerContainer = document.getElementById('song-player');
    if (!playerContainer) return;

    if (currentPlayer && currentPlayer.destroy) {
        try { currentPlayer.destroy(); } catch (e) { }
        currentPlayer = null;
    }

    playerContainer.innerHTML = '';
    const holder = document.createElement('div');
    holder.id = 'yt-player';
    holder.style.width = '100%';
    holder.style.height = '0';
    holder.style.position = 'relative';
    holder.style.paddingBottom = '56.25%';
    playerContainer.appendChild(holder);

    loadYouTubeAPI().then((YT) => {
        currentPlayer = new YT.Player('yt-player', {
            videoId: videoId,
            height: '100%',
            width: '100%',
            playerVars: {
                rel: 0,
                autoplay: 1,
                controls: 1,
                modestbranding: 0,
                showinfo: 1,
                iv_load_policy: 3,
                fs: 1,
                playsinline: 1,
                mute: muted ? 1 : 0,
                suggestedQuality: 'default',
                enablejsapi: 1,
                origin: window.location.origin,
                widget_referrer: window.location.href
            },
            events: {
                onReady: function (ev) {
                    if (!muted && ev.target.isMuted()) {
                        ev.target.unMute();
                    }
                    setTimeout(() => {
                        ev.target.playVideo();
                    }, 100);
                    ev.target.playVideo();
                },
                onStateChange: function (ev) {
                    if (ev.data === YT.PlayerState.ENDED) { playNext(); }
                    // Update minimized player if visible
                    const minimized = document.getElementById('minimized-player');
                    if (minimized && minimized.style.display !== 'none') {
                        updateMinimizedPlayer();
                    }
                }
            }
        });
        currentVideoIndex = index;
    }).catch(err => {
        // fallback: embed plain iframe
        const iframe = document.createElement('iframe');
        const params = new URLSearchParams({
            rel: '0',
            autoplay: '1',
            controls: '1',
            showinfo: '1',
            modestbranding: '0',
            iv_load_policy: '3',
            fs: '1',
            enablejsapi: '1',
            origin: window.location.origin,
            widget_referrer: window.location.href,
            mute: muted ? '1' : '0'
        });
        iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; autoplay';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.setAttribute('allowfullscreen', '');
        playerContainer.appendChild(iframe);
        currentVideoIndex = index;
    });
}

export function setSongsList(songs) {
    songsList = songs;
}

export function playNext() {
    if (typeof currentVideoIndex !== 'number') return;
    let next = currentVideoIndex + 1;
    if (next >= songsList.length) return;

    const nextSong = songsList[next];
    const btn = document.querySelector(`button.play-btn[data-idx="${next}"]`);

    if (btn) {
        btn.click();
    } else {
        const vid = extractYouTubeId(nextSong.youtube || '');
        if (vid) createPlayer(vid, { muted: false, index: next });
        if (currentPlayer && currentPlayer.playVideo) {
            currentPlayer.playVideo();
        }
    }
}

export function playPrevious() {
    if (typeof currentVideoIndex !== 'number') return;
    let prev = currentVideoIndex - 1;
    if (prev < 0) return;

    const prevSong = songsList[prev];
    const btn = document.querySelector(`button.play-btn[data-idx="${prev}"]`);

    if (btn) {
        btn.click();
    } else {
        const vid = extractYouTubeId(prevSong.youtube || '');
        if (vid) createPlayer(vid, { muted: false, index: prev });
        if (currentPlayer && currentPlayer.playVideo) {
            currentPlayer.playVideo();
        }
    }
}

export function getCurrentSong() {
    if (typeof currentVideoIndex === 'number' && songsList[currentVideoIndex]) {
        return songsList[currentVideoIndex];
    }
    return null;
}

export function isPlaying() {
    return currentPlayer && currentPlayer.getPlayerState && currentPlayer.getPlayerState() === 1; // YT.PlayerState.PLAYING
}

export function pausePlayer() {
    if (currentPlayer && currentPlayer.pauseVideo) {
        currentPlayer.pauseVideo();
    }
}

export function playPlayer() {
    if (currentPlayer && currentPlayer.playVideo) {
        currentPlayer.playVideo();
    }
}

export function stopPlayer() {
    if (currentPlayer && currentPlayer.stopVideo) {
        currentPlayer.stopVideo();
    }
    currentPlayer = null;
    currentVideoIndex = null;
}

function updateMinimizedPlayer() {
    const minimized = document.getElementById('minimized-player');
    const titleEl = document.getElementById('minimized-title');
    const playPauseBtn = document.getElementById('minimized-play-pause');

    if (!minimized || !titleEl || !playPauseBtn) return;

    const song = getCurrentSong();
    if (song) {
        titleEl.textContent = `${song.title || 'Untitled'} - ${song.artist || 'Unknown'}`;
        playPauseBtn.textContent = isPlaying() ? 'Pause' : 'Play';
    }
}

export function showMinimizedPlayer() {
    const minimized = document.getElementById('minimized-player');
    if (minimized) {
        minimized.style.display = 'flex';
        updateMinimizedPlayer();
    }
}

export function hideMinimizedPlayer() {
    const minimized = document.getElementById('minimized-player');
    if (minimized) {
        minimized.style.display = 'none';
    }
}

export function isPlayerActive() {
    return !!currentPlayer;
}