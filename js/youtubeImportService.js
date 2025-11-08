/**
 * YouTube Import Service
 * Handles extraction of video/playlist data from YouTube URLs
 */

/**
 * Parse YouTube URL to determine type and extract ID
 * @param {string} url - YouTube URL
 * @returns {{type: 'video'|'playlist'|null, id: string|null}}
 */
export function parseYouTubeUrl(url) {
    const urlObj = new URL(url);

    // Check for playlist
    const playlistId = urlObj.searchParams.get('list');
    if (playlistId) {
        return { type: 'playlist', id: playlistId };
    }

    // Check for video (various formats)
    let videoId = null;

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
        videoId = urlObj.searchParams.get('v');
    }
    // youtu.be/VIDEO_ID
    else if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
    }
    // youtube.com/embed/VIDEO_ID
    else if (urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1].split('/')[0];
    }

    if (videoId) {
        return { type: 'video', id: videoId };
    }

    return { type: null, id: null };
}

/**
 * Extract video metadata using YouTube oEmbed API
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<{title: string, artist: string, url: string, type: string}>}
 */
export async function extractVideoData(videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

    try {
        const response = await fetch(oEmbedUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch video data: ${response.status}`);
        }

        const data = await response.json();

        // Parse title and artist from YouTube title
        let title = data.title;
        let artist = data.author_name;

        // Remove common video quality markers and extra info
        title = title.replace(/\s*\|\s*(4K|HD|1080p|720p|60FPS|Creditless|AMV|Official|Full|Extended|Short|TV Size).*$/gi, '').trim();
        title = title.replace(/\s*\[.*?\]\s*$/g, '').trim(); // Remove trailing brackets [Official]
        title = title.replace(/\s*[〈〉《》【】「」『』].*?[〈〉《》【】「」『』]\s*/g, '').trim(); // Remove Japanese brackets with content

        // Detect anime opening/ending format with various patterns:
        // 1. "Anime Name - Opening/Ending" with optional song name after | or -
        // 2. "Anime Name OP/ED"
        // 3. "Anime Name OP / Opening" or "Anime Name ED / Ending"
        // Pattern allows for optional song name after the type: "Anime - Opening | SongName" or "Anime - Opening - SongName"
        const animeOpEdMatch = title.match(/^(.+?)\s*[-–—]?\s*(OP|ED|Opening|Ending|Insert Song)(\s*[/\/]\s*(Opening|Ending|OP|ED))?(\s+\d+)?(?:\s*[|\-–—]\s*(.+))?$/i);
        if (animeOpEdMatch) {
            // For anime openings/endings, use anime name as title, channel as artist
            const animeName = animeOpEdMatch[1].trim();
            const songType = (animeOpEdMatch[4] || animeOpEdMatch[2]).trim().toLowerCase(); // Prefer the full word after slash
            const songNumber = animeOpEdMatch[5] || '';
            const songName = animeOpEdMatch[6] ? ` - ${animeOpEdMatch[6].trim()}` : ''; // Optional song name

            // Get the proper capitalized form
            let typeWord = animeOpEdMatch[4] || animeOpEdMatch[2];
            if (songType === 'opening' || songType === 'op') {
                typeWord = 'Opening';
            } else if (songType === 'ending' || songType === 'ed') {
                typeWord = 'Ending';
            } else if (songType.includes('insert')) {
                typeWord = 'Insert Song';
            }

            title = `${animeName} ${typeWord}${songNumber}${songName}`;
            artist = data.author_name;

            // Determine type based on whether it's an opening or ending
            let type = 'OST'; // Default
            if (songType === 'opening' || songType === 'op') {
                type = 'Opening';
            } else if (songType === 'ending' || songType === 'ed') {
                type = 'Ending';
            } else if (songType.includes('insert')) {
                type = 'Insert Song';
            }

            return {
                title,
                artist,
                youtube: videoUrl,
                autoplay: true,
                type,
                playlists: [] // Empty array for single video imports
            };
        }

        // Common music formats: "Artist - Title", "Title by Artist", "Title (Artist)"
        const dashMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
        const parenMatch = title.match(/^(.+?)\s*\((.+?)\)$/);

        if (dashMatch) {
            artist = dashMatch[1].trim();
            title = dashMatch[2].trim();
        } else if (byMatch) {
            title = byMatch[1].trim();
            artist = byMatch[2].trim();
        } else if (parenMatch && parenMatch[2].length < 50) {
            title = parenMatch[1].trim();
            artist = parenMatch[2].trim();
        }

        return {
            title,
            artist,
            youtube: videoUrl,
            autoplay: true,
            type: 'OST',
            playlists: [] // Empty array for single video imports
        };
    } catch (error) {
        console.error('Error fetching video data:', error);
        throw new Error(`Failed to extract video data: ${error.message}`);
    }
}

/**
 * Extract playlist metadata and video list by scraping the playlist page
 * @param {string} playlistId - YouTube playlist ID
 * @returns {Promise<{playlistName: string, videoIds: string[], videos: Array}>}
 */
export async function extractPlaylistData(playlistId) {
    try {
        // Use backend proxy to scrape playlist page
        const response = await fetch(`/scrape-playlist?id=${encodeURIComponent(playlistId)}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch playlist data: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to extract playlist data');
        }

        return {
            playlistName: data.playlistName || `Playlist ${playlistId}`,
            videoIds: data.videoIds || [],
            videoCount: data.videoIds ? data.videoIds.length : 0
        };
    } catch (error) {
        console.error('Error extracting playlist data:', error);
        throw new Error(`Failed to extract playlist: ${error.message}`);
    }
}

/**
 * Import all videos from a playlist
 * @param {string} playlistId - YouTube playlist ID
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<{playlistName: string, songs: Array, errors: Array}>}
 */
export async function importPlaylistSongs(playlistId, progressCallback = null) {
    // Extract playlist metadata and video IDs
    if (progressCallback) progressCallback('Extracting playlist metadata...');
    const playlistData = await extractPlaylistData(playlistId);

    const { playlistName, videoIds } = playlistData;

    if (!videoIds || videoIds.length === 0) {
        throw new Error('No videos found in playlist');
    }

    // Extract data for each video
    const songs = [];
    const errors = [];

    for (let i = 0; i < videoIds.length; i++) {
        const videoId = videoIds[i];

        if (progressCallback) {
            progressCallback(`Processing video ${i + 1}/${videoIds.length}: ${videoId}`);
        }

        try {
            const videoData = await extractVideoData(videoId);
            // Add playlist information to the song
            videoData.playlists = [playlistName];
            songs.push(videoData);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`Failed to extract video ${videoId}:`, error);
            errors.push({ videoId, error: error.message });
        }
    }

    return {
        playlistName,
        songs,
        errors,
        totalVideos: videoIds.length,
        successCount: songs.length,
        errorCount: errors.length
    };
}

/**
 * Load existing songs from songs.json
 * @returns {Promise<Array>}
 */
export async function loadSongs() {
    try {
        const response = await fetch('./data/songs.json?t=' + Date.now());
        if (!response.ok) {
            throw new Error('Failed to load songs.json');
        }
        const data = await response.json();
        return data.songs || [];
    } catch (error) {
        console.error('Error loading songs:', error);
        return [];
    }
}

/**
 * Save songs to songs.json via backend
 * @param {Array} songs - Array of song objects
 * @returns {Promise<void>}
 */
export async function saveSongs(songs) {
    try {
        const response = await fetch('/save-songs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(songs)
        });

        if (!response.ok) {
            throw new Error('Failed to save songs to file');
        }
    } catch (error) {
        console.error('Error saving songs:', error);
        throw error;
    }
}

/**
 * Load existing playlists from playlists.json
 * @returns {Promise<Array>}
 */
export async function loadPlaylists() {
    try {
        const response = await fetch('./data/playlists.json?t=' + Date.now());
        if (!response.ok) {
            // File might not exist yet
            return [];
        }
        const data = await response.json();
        return data.playlists || [];
    } catch (error) {
        console.error('Error loading playlists:', error);
        return [];
    }
}

/**
 * Save playlists to playlists.json via backend
 * @param {Array} playlists - Array of playlist objects
 * @returns {Promise<void>}
 */
export async function savePlaylists(playlists) {
    try {
        const response = await fetch('/save-playlists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(playlists)
        });

        if (!response.ok) {
            throw new Error('Failed to save playlists to file');
        }
    } catch (error) {
        console.error('Error saving playlists:', error);
        throw error;
    }
}

/**
 * Add a playlist metadata entry
 * @param {string} playlistId - YouTube playlist ID
 * @param {string} playlistName - Playlist name
 * @param {Array<string>} videoIds - Array of video IDs in the playlist
 * @returns {Promise<void>}
 */
export async function addPlaylistMetadata(playlistId, playlistName, videoIds) {
    const playlists = await loadPlaylists();

    // Check if playlist already exists
    const existingIndex = playlists.findIndex(p => p.playlistId === playlistId);

    const playlistEntry = {
        playlistId,
        playlistName,
        playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
        videoCount: videoIds.length,
        videoIds,
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        playlists[existingIndex] = playlistEntry;
    } else {
        playlists.push(playlistEntry);
    }

    await savePlaylists(playlists);
}
