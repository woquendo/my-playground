/**
 * MySQL Music Repository
 * Implements IMusicRepository interface for MySQL database storage
 */
import { RepositoryError } from '../../Core/Errors/ApplicationErrors.js';
import { Music } from '../../Domain/Models/Music.js';
import { connectionManager } from '../Database/ConnectionManager.js';
import { logger } from '../../Core/Logger.js';

export class MySQLMusicRepository {
    constructor(userId = 1) {
        this.userId = userId; // Current user ID (multi-tenant support)
        this.connectionManager = connectionManager;
    }

    /**
     * Initialize repository (ensure connection)
     * @returns {Promise<void>}
     */
    async initialize() {
        if (!this.connectionManager.isConnected) {
            await this.connectionManager.initialize();
        }
    }

    /**
     * Find all songs for current user
     * @returns {Promise<Array<Music>>}
     */
    async findAll() {
        try {
            await this.initialize();

            const sql = `
                SELECT 
                    s.*,
                    us.rating,
                    us.play_count,
                    us.last_played,
                    us.is_favorite as favorite,
                    us.tags,
                    us.notes
                FROM songs s
                LEFT JOIN user_songs us ON s.id = us.song_id AND us.user_id = ?
                ORDER BY s.title
            `;

            const rows = await this.connectionManager.query(sql, [this.userId]);

            // console.log('🔍 [MySQLMusicRepository.findAll] Query completed:', {
            //     userId: this.userId,
            //     rowCount: rows.length,
            //     sampleRow: rows[0] ? {
            //         id: rows[0].id,
            //         title: rows[0].title,
            //         youtube_url: rows[0].youtube_url,
            //         youtube_url_length: rows[0].youtube_url?.length,
            //         youtube_url_type: typeof rows[0].youtube_url
            //     } : null
            // });

            // Get playlists for the user
            const playlistsMap = await this._getPlaylistsForSongs(rows.map(r => r.id));

            logger.debug('Retrieved songs from MySQL', {
                count: rows.length,
                userId: this.userId,
                playlistsFound: playlistsMap.size
            });

            // console.log('🔍 [MySQLMusicRepository.findAll] Playlist mapping:', {
            //     totalSongs: rows.length,
            //     playlistMapSize: playlistsMap.size,
            //     sampleMappings: Array.from(playlistsMap.entries()).slice(0, 3),
            //     firstSongId: rows[0]?.id,
            //     firstSongPlaylists: playlistsMap.get(rows[0]?.id)
            // });

            // CRITICAL: Force log to show
            // logger.error('🔍 BACKEND FINDALL: Returning ' + rows.length + ' songs with ' + playlistsMap.size + ' songs having playlists');

            return rows.map(row => this._mapRowToMusic(row, playlistsMap.get(row.id) || []));
        } catch (error) {
            logger.error('Failed to find all songs', { error: error.message });
            throw new RepositoryError('Failed to retrieve songs from database', {
                operation: 'findAll',
                cause: error
            });
        }
    }

    /**
     * Find song by ID
     * @param {string} id - Song ID
     * @returns {Promise<Music|null>}
     */
    async findById(id) {
        try {
            await this.initialize();

            const sql = `
                SELECT 
                    s.*,
                    us.rating,
                    us.play_count,
                    us.last_played,
                    us.is_favorite as favorite,
                    us.tags,
                    us.notes
                FROM songs s
                LEFT JOIN user_songs us ON s.id = us.song_id AND us.user_id = ?
                WHERE s.id = ?
            `;

            const rows = await this.connectionManager.query(sql, [this.userId, id]);

            if (rows.length === 0) {
                return null;
            }

            return this._mapRowToMusic(rows[0]);
        } catch (error) {
            logger.error('Failed to find song by ID', {
                id,
                error: error.message
            });
            throw new RepositoryError('Failed to retrieve song from database', {
                operation: 'findById',
                entity: 'Music',
                context: { id },
                cause: error
            });
        }
    }

    /**
     * Save song (insert or update)
     * @param {Music} music - Music to save
     * @returns {Promise<Music>}
     */
    async save(music) {
        try {
            await this.initialize();

            // Use transaction for song + user_song
            return await this.connectionManager.transaction(async (connection) => {
                // Insert/update song data
                const songSql = `
                    INSERT INTO songs (
                        id, title, artist, source, album, spotify_url,
                        youtube_url, apple_music_url, duration, lyrics
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        artist = VALUES(artist),
                        source = VALUES(source),
                        album = VALUES(album),
                        spotify_url = VALUES(spotify_url),
                        youtube_url = VALUES(youtube_url),
                        apple_music_url = VALUES(apple_music_url),
                        duration = VALUES(duration),
                        updated_at = CURRENT_TIMESTAMP
                `;

                await connection.query(songSql, [
                    music.id,
                    music.title,
                    music.artist,
                    music.source,
                    music.album,
                    music.spotifyUrl,
                    music.youtubeUrl,
                    music.appleMusicUrl,
                    music.duration || 0,
                    null // lyrics
                ]);

                // Insert/update user song data
                const userSongSql = `
                    INSERT INTO user_songs (
                        user_id, song_id, rating, play_count,
                        last_played, is_favorite, tags, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        rating = VALUES(rating),
                        play_count = VALUES(play_count),
                        last_played = VALUES(last_played),
                        is_favorite = VALUES(is_favorite),
                        tags = VALUES(tags),
                        notes = VALUES(notes),
                        updated_at = CURRENT_TIMESTAMP
                `;

                await connection.query(userSongSql, [
                    this.userId,
                    music.id,
                    music.rating || 0,
                    music.playCount || 0,
                    music.lastPlayed || null,
                    music.favorite || false,
                    JSON.stringify(music.tags || []),
                    music.notes || ''
                ]);

                logger.info('Song saved successfully', {
                    songId: music.id,
                    title: music.title
                });

                return music;
            });
        } catch (error) {
            logger.error('Failed to save song', {
                songId: music.id,
                error: error.message
            });
            throw new RepositoryError('Failed to save song to database', {
                operation: 'save',
                entity: 'Music',
                context: { id: music.id },
                cause: error
            });
        }
    }

    /**
     * Delete song
     * @param {string} id - Song ID
     * @returns {Promise<boolean>}
     */
    async delete(id) {
        try {
            await this.initialize();

            // Only delete user_song entry, keep shared song data
            const sql = `
                DELETE FROM user_songs
                WHERE user_id = ? AND song_id = ?
            `;

            const result = await this.connectionManager.query(sql, [this.userId, id]);

            const deleted = result.affectedRows > 0;

            logger.info('Song deleted', {
                songId: id,
                deleted
            });

            return deleted;
        } catch (error) {
            logger.error('Failed to delete song', {
                id,
                error: error.message
            });
            throw new RepositoryError('Failed to delete song from database', {
                operation: 'delete',
                entity: 'Music',
                context: { id },
                cause: error
            });
        }
    }

    /**
     * Find favorite songs
     * @returns {Promise<Array<Music>>}
     */
    async findFavorites() {
        try {
            await this.initialize();

            const sql = `
                SELECT 
                    s.*,
                    us.rating,
                    us.play_count,
                    us.last_played,
                    us.is_favorite as favorite,
                    us.tags,
                    us.notes
                FROM songs s
                INNER JOIN user_songs us ON s.id = us.song_id
                WHERE us.user_id = ? AND us.is_favorite = TRUE
                ORDER BY s.title
            `;

            const rows = await this.connectionManager.query(sql, [this.userId]);

            logger.debug('Retrieved favorite songs', {
                count: rows.length
            });

            return rows.map(row => this._mapRowToMusic(row));
        } catch (error) {
            logger.error('Failed to find favorite songs', {
                error: error.message
            });
            throw new RepositoryError('Failed to retrieve favorite songs', {
                operation: 'findFavorites',
                cause: error
            });
        }
    }

    /**
     * Find songs by playlist
     * @param {string} playlistId - Playlist ID
     * @returns {Promise<Array<Music>>}
     */
    async findByPlaylist(playlistId) {
        try {
            await this.initialize();

            // Get playlist song IDs
            const playlistSql = `
                SELECT song_ids
                FROM playlists
                WHERE id = ? AND user_id = ?
            `;

            const playlistRows = await this.connectionManager.query(playlistSql, [
                playlistId,
                this.userId
            ]);

            if (playlistRows.length === 0 || !playlistRows[0].song_ids) {
                return [];
            }

            const songIds = JSON.parse(playlistRows[0].song_ids);

            if (songIds.length === 0) {
                return [];
            }

            // Get songs
            const songsSql = `
                SELECT 
                    s.*,
                    us.rating,
                    us.play_count,
                    us.last_played,
                    us.is_favorite as favorite,
                    us.tags,
                    us.notes
                FROM songs s
                LEFT JOIN user_songs us ON s.id = us.song_id AND us.user_id = ?
                WHERE s.id IN (?)
                ORDER BY FIELD(s.id, ?)
            `;

            const rows = await this.connectionManager.query(songsSql, [
                this.userId,
                songIds,
                songIds
            ]);

            return rows.map(row => this._mapRowToMusic(row));
        } catch (error) {
            logger.error('Failed to find songs by playlist', {
                playlistId,
                error: error.message
            });
            throw new RepositoryError('Failed to retrieve playlist songs', {
                operation: 'findByPlaylist',
                context: { playlistId },
                cause: error
            });
        }
    }

    /**
     * Search songs by title or artist
     * @param {string} query - Search query
     * @returns {Promise<Array<Music>>}
     */
    async search(query) {
        try {
            await this.initialize();

            const searchTerm = `%${query}%`;

            const sql = `
                SELECT 
                    s.*,
                    us.rating,
                    us.play_count,
                    us.last_played,
                    us.is_favorite as favorite,
                    us.tags,
                    us.notes
                FROM songs s
                LEFT JOIN user_songs us ON s.id = us.song_id AND us.user_id = ?
                WHERE s.title LIKE ? OR s.artist LIKE ? OR s.source LIKE ?
                ORDER BY s.title
            `;

            const rows = await this.connectionManager.query(sql, [
                this.userId,
                searchTerm,
                searchTerm,
                searchTerm
            ]);

            logger.debug('Search completed', {
                query,
                results: rows.length
            });

            return rows.map(row => this._mapRowToMusic(row));
        } catch (error) {
            logger.error('Failed to search songs', {
                query,
                error: error.message
            });
            throw new RepositoryError('Failed to search songs', {
                operation: 'search',
                context: { query },
                cause: error
            });
        }
    }

    /**
     * Count total songs
     * @returns {Promise<number>}
     */
    async count() {
        try {
            await this.initialize();

            const sql = `
                SELECT COUNT(*) as count
                FROM user_songs
                WHERE user_id = ?
            `;

            const rows = await this.connectionManager.query(sql, [this.userId]);
            return rows[0].count;
        } catch (error) {
            logger.error('Failed to count songs', { error: error.message });
            throw new RepositoryError('Failed to count songs', {
                operation: 'count',
                cause: error
            });
        }
    }

    /**
     * Increment play count
     * @param {string} id - Song ID
     * @returns {Promise<void>}
     */
    async incrementPlayCount(id) {
        try {
            await this.initialize();

            const sql = `
                INSERT INTO user_songs (user_id, song_id, play_count, last_played)
                VALUES (?, ?, 1, NOW())
                ON DUPLICATE KEY UPDATE
                    play_count = play_count + 1,
                    last_played = NOW()
            `;

            await this.connectionManager.query(sql, [this.userId, id]);

            logger.debug('Play count incremented', { songId: id });
        } catch (error) {
            logger.error('Failed to increment play count', {
                id,
                error: error.message
            });
            throw new RepositoryError('Failed to update play count', {
                operation: 'incrementPlayCount',
                context: { id },
                cause: error
            });
        }
    }

    /**
     * Get playlists for given song IDs
     * @private
     * @param {Array<string>} songIds - Song IDs
     * @returns {Promise<Map<string, Array<string>>>} Map of song ID to playlist names
     */
    async _getPlaylistsForSongs(songIds) {
        // console.log('🔍 [MySQLMusicRepository._getPlaylistsForSongs] Called with:', {
        //     songIdsCount: songIds?.length,
        //     userId: this.userId,
        //     firstThreeSongIds: songIds?.slice(0, 3)
        // });

        if (!songIds || songIds.length === 0) {
            console.log('🔍 [MySQLMusicRepository._getPlaylistsForSongs] No song IDs provided, returning empty map');
            return new Map();
        }

        try {
            // logger.error('🔍 _getPlaylistsForSongs START: userId=' + this.userId + ', songIds=' + songIds.length);

            // Use junction table for better performance and scalability
            const sql = `
                SELECT ps.song_id, p.name as playlist_name
                FROM playlist_songs ps
                JOIN playlists p ON ps.playlist_id = p.id
                WHERE p.user_id = ? AND ps.song_id IN (${songIds.map(() => '?').join(',')})
                ORDER BY ps.song_id, ps.position
            `;

            const params = [this.userId, ...songIds];
            // logger.error('🔍 _getPlaylistsForSongs QUERY: params count=' + params.length);
            // console.log('🔍 [MySQLMusicRepository._getPlaylistsForSongs] Executing query with params:', {
            //     userId: params[0],
            //     songIdsCount: params.length - 1,
            //     sql: sql.substring(0, 200) + '...'
            // });

            // logger.error('🔍 _getPlaylistsForSongs BEFORE QUERY');
            const rows = await this.connectionManager.query(sql, params);
            // logger.error('🔍 _getPlaylistsForSongs AFTER QUERY: rows=' + rows.length);

            // console.log('🔍 [MySQLMusicRepository._getPlaylistsForSongs] Query results:', {
            //     rowsReturned: rows.length,
            //     sampleRows: rows.slice(0, 3)
            // });

            logger.debug('_getPlaylistsForSongs fetched from junction table', {
                userId: this.userId,
                songIdsQueried: songIds.length,
                rowsReturned: rows.length
            });

            // Create a map of song ID to playlist names
            const songToPlaylists = new Map();

            rows.forEach(row => {
                if (!songToPlaylists.has(row.song_id)) {
                    songToPlaylists.set(row.song_id, []);
                }
                songToPlaylists.get(row.song_id).push(row.playlist_name);
            });

            logger.debug('_getPlaylistsForSongs created map', {
                totalSongsWithPlaylists: songToPlaylists.size,
                sampleMappings: Array.from(songToPlaylists.entries()).slice(0, 3)
            });

            // console.log('🔍 [MySQLMusicRepository._getPlaylistsForSongs] SUCCESS returning map with', songToPlaylists.size, 'songs');
            // logger.error('🔍 PLAYLIST QUERY SUCCESS: Found ' + songToPlaylists.size + ' songs with playlists');
            return songToPlaylists;
        } catch (error) {
            // console.log('🔍 [MySQLMusicRepository._getPlaylistsForSongs] ERROR:', error.message);
            // logger.error('🔍 PLAYLIST QUERY FAILED:', { error: error.message, stack: error.stack });
            return new Map(); // Return empty map on error
        }
    }

    /**
     * Map database row to Music model
     * @private
     * @param {Object} row - Database row
     * @param {Array<string>} playlists - Playlist names for this song
     * @returns {Music}
     */
    _mapRowToMusic(row, playlists = []) {
        // console.log('🔍 [MySQLMusicRepository._mapRowToMusic] Mapping row:', {
        //     title: row.title,
        //     playlists: playlists,
        //     playlistsLength: playlists.length,
        //     playlistsType: typeof playlists,
        //     playlistsIsArray: Array.isArray(playlists),
        //     youtube_url_from_db: row.youtube_url,
        //     youtube_url_length: row.youtube_url?.length,
        //     youtube_url_type: typeof row.youtube_url,
        //     youtube_url_isEmpty: row.youtube_url === '',
        //     youtube_url_isNull: row.youtube_url === null,
        //     youtube_url_isUndefined: row.youtube_url === undefined
        // });

        // Parse tags safely - handle null, empty string, arrays, and JSON arrays
        let tags = [];
        if (row.tags) {
            // If tags is already an array, use it directly
            if (Array.isArray(row.tags)) {
                tags = row.tags;
            }
            // If tags is a string, try to parse it
            else if (typeof row.tags === 'string' && row.tags !== '[]' && row.tags.trim() !== '') {
                try {
                    tags = JSON.parse(row.tags);
                    // Ensure it's an array
                    if (!Array.isArray(tags)) {
                        tags = [];
                    }
                } catch (e) {
                    // Silently default to empty array if parsing fails
                    tags = [];
                }
            }
        }

        const music = new Music({
            id: row.id,
            title: row.title,
            artist: row.artist,
            source: row.source,
            album: row.album,
            type: row.type || 'OST',
            spotifyUrl: row.spotify_url,
            youtubeUrl: row.youtube_url,
            appleMusicUrl: row.apple_music_url,
            duration: row.duration,
            playlists: playlists, // Add playlists array
            // User-specific data
            rating: row.rating || 0,
            playCount: row.play_count || 0,
            lastPlayed: row.last_played,
            favorite: row.favorite || false,
            tags: tags,
            notes: row.notes || ''
        });

        // console.log('🔍 [MySQLMusicRepository._mapRowToMusic] Created Music object:', {
        //     title: music.title,
        //     youtubeUrl: music.youtubeUrl,
        //     youtubeUrl_length: music.youtubeUrl?.length,
        //     getPrimaryUrl: music.getPrimaryUrl()
        // });

        return music;
    }

    /**
     * Set current user ID
     * @param {number} userId - User ID
     */
    setUserId(userId) {
        this.userId = userId;
    }
}

export default MySQLMusicRepository;
