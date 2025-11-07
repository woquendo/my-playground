/**
 * HTTP Music Repository
 * Implements IMusicRepository with HTTP-based data access
 */
import { IMusicRepository } from '../../Domain/Repositories/IMusicRepository.js';
import { Music } from '../../Domain/Models/Music.js';
import { RepositoryError } from '../../Core/Errors/ApplicationErrors.js';

export class HttpMusicRepository extends IMusicRepository {
    /**
     * Create an HTTP music repository
     * @param {HttpClient} httpClient - HTTP client instance
     * @param {CacheManager} cache - Cache manager instance (optional)
     * @param {object} options - Configuration options
     */
    constructor(httpClient, cache = null, options = {}) {
        super();
        this.httpClient = httpClient;
        this.cache = cache;
        this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
        this.endpoint = options.endpoint || '/data/songs.json';
    }

    /**
     * Get all music tracks
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getAll() {
        try {
            const cacheKey = 'music:all';

            // Try cache first
            if (this.cache) {
                const cached = this.cache.get(cacheKey);
                if (cached) return cached;
            }

            // Fetch from HTTP
            const data = await this.httpClient.get(this.endpoint);
            const tracks = this._transformToMusic(data);

            // Cache result
            if (this.cache) {
                this.cache.set(cacheKey, tracks, this.cacheTTL);
            }

            return tracks;
        } catch (error) {
            throw new RepositoryError('Failed to fetch all music tracks', {
                operation: 'getAll',
                entity: 'Music',
                cause: error
            });
        }
    }

    /**
     * Get a music track by ID
     * @param {string} id - Music track identifier
     * @returns {Promise<Music|null>} Music domain object or null if not found
     */
    async getById(id) {
        try {
            const cacheKey = `music:${id}`;

            // Try cache first
            if (this.cache) {
                const cached = this.cache.get(cacheKey);
                if (cached) return cached;
            }

            // Fetch all and find by ID
            const tracks = await this.getAll();
            const track = tracks.find(m => m.getId() === id) || null;

            // Cache result
            if (this.cache && track) {
                this.cache.set(cacheKey, track, this.cacheTTL);
            }

            return track;
        } catch (error) {
            throw new RepositoryError(`Failed to fetch music track with ID ${id}`, {
                operation: 'getById',
                entity: 'Music',
                id,
                cause: error
            });
        }
    }

    /**
     * Get music tracks by rating
     * @param {number} minRating - Minimum rating (0-5)
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getByRating(minRating) {
        try {
            const tracks = await this.getAll();
            return tracks.filter(track => {
                const rating = track.getRating();
                return rating !== null && rating >= minRating;
            });
        } catch (error) {
            throw new RepositoryError(`Failed to fetch music tracks with rating >= ${minRating}`, {
                operation: 'getByRating',
                entity: 'Music',
                minRating,
                cause: error
            });
        }
    }

    /**
     * Get music tracks by artist
     * @param {string} artist - Artist name
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getByArtist(artist) {
        try {
            const tracks = await this.getAll();
            const lowerArtist = artist.toLowerCase();
            return tracks.filter(track =>
                track.getArtist().toLowerCase() === lowerArtist
            );
        } catch (error) {
            throw new RepositoryError(`Failed to fetch music tracks by artist "${artist}"`, {
                operation: 'getByArtist',
                entity: 'Music',
                artist,
                cause: error
            });
        }
    }

    /**
     * Get music tracks by album
     * @param {string} album - Album name
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getByAlbum(album) {
        try {
            const tracks = await this.getAll();
            const lowerAlbum = album.toLowerCase();
            return tracks.filter(track => {
                const trackAlbum = track.getAlbum();
                return trackAlbum && trackAlbum.toLowerCase() === lowerAlbum;
            });
        } catch (error) {
            throw new RepositoryError(`Failed to fetch music tracks by album "${album}"`, {
                operation: 'getByAlbum',
                entity: 'Music',
                album,
                cause: error
            });
        }
    }

    /**
     * Search music tracks by title, artist, or album
     * @param {string} query - Search query
     * @returns {Promise<Music[]>} Array of matching Music domain objects
     */
    async search(query) {
        try {
            const tracks = await this.getAll();
            return tracks.filter(track => track.matchesSearchQuery(query));
        } catch (error) {
            throw new RepositoryError(`Failed to search music tracks with query "${query}"`, {
                operation: 'search',
                entity: 'Music',
                query,
                cause: error
            });
        }
    }

    /**
     * Get music tracks by tags
     * @param {string[]} tags - Array of tags to filter by
     * @returns {Promise<Music[]>} Array of Music domain objects
     */
    async getByTags(tags) {
        try {
            const tracks = await this.getAll();
            return tracks.filter(track => {
                const trackTags = track.getTags();
                return tags.some(tag => trackTags.includes(tag));
            });
        } catch (error) {
            throw new RepositoryError(`Failed to fetch music tracks by tags`, {
                operation: 'getByTags',
                entity: 'Music',
                tags,
                cause: error
            });
        }
    }

    /**
     * Get recently played music tracks
     * @param {number} limit - Maximum number of tracks to return
     * @returns {Promise<Music[]>} Array of recently played Music domain objects
     */
    async getRecentlyPlayed(limit = 10) {
        try {
            const tracks = await this.getAll();

            // Filter tracks with lastPlayed date and sort
            return tracks
                .filter(track => track.getLastPlayed() !== null)
                .sort((a, b) => b.getLastPlayed() - a.getLastPlayed())
                .slice(0, limit);
        } catch (error) {
            throw new RepositoryError('Failed to fetch recently played music tracks', {
                operation: 'getRecentlyPlayed',
                entity: 'Music',
                limit,
                cause: error
            });
        }
    }

    /**
     * Get top rated music tracks
     * @param {number} limit - Maximum number of tracks to return
     * @returns {Promise<Music[]>} Array of top rated Music domain objects
     */
    async getTopRated(limit = 10) {
        try {
            const tracks = await this.getAll();

            return tracks
                .filter(track => track.getRating() !== null && track.getRating() > 0)
                .sort((a, b) => b.getRating() - a.getRating())
                .slice(0, limit);
        } catch (error) {
            throw new RepositoryError('Failed to fetch top rated music tracks', {
                operation: 'getTopRated',
                entity: 'Music',
                limit,
                cause: error
            });
        }
    }

    /**
     * Save a music track (create or update)
     * @param {Music} music - Music domain object to save
     * @returns {Promise<Music>} Saved Music domain object
     */
    async save(music) {
        try {
            // In a real implementation, this would POST/PUT to the API
            // For now, we'll simulate it by invalidating cache
            if (this.cache) {
                this.cache.delete('music:all');
                this.cache.delete(`music:${music.getId()}`);
            }

            return music;
        } catch (error) {
            throw new RepositoryError(`Failed to save music track ${music.getId()}`, {
                operation: 'save',
                entity: 'Music',
                id: music.getId(),
                cause: error
            });
        }
    }

    /**
     * Delete a music track
     * @param {string} id - Music track identifier
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async delete(id) {
        try {
            // In a real implementation, this would DELETE to the API
            // For now, we'll simulate it by invalidating cache
            if (this.cache) {
                this.cache.delete('music:all');
                this.cache.delete(`music:${id}`);
            }

            return true;
        } catch (error) {
            throw new RepositoryError(`Failed to delete music track ${id}`, {
                operation: 'delete',
                entity: 'Music',
                id,
                cause: error
            });
        }
    }

    /**
     * Batch update multiple music tracks
     * @param {Music[]} tracks - Array of Music domain objects to update
     * @returns {Promise<Music[]>} Array of updated Music domain objects
     */
    async batchUpdate(tracks) {
        try {
            // In a real implementation, this would batch POST/PUT to the API
            // For now, we'll simulate it by invalidating cache
            if (this.cache) {
                this.cache.delete('music:all');
                tracks.forEach(track => {
                    this.cache.delete(`music:${track.getId()}`);
                });
            }

            return tracks;
        } catch (error) {
            throw new RepositoryError('Failed to batch update music tracks', {
                operation: 'batchUpdate',
                entity: 'Music',
                count: tracks.length,
                cause: error
            });
        }
    }

    /**
     * Increment play count for a music track
     * @param {string} id - Music track identifier
     * @returns {Promise<Music>} Updated Music domain object
     */
    async incrementPlayCount(id) {
        try {
            const track = await this.getById(id);
            if (!track) {
                throw new RepositoryError(`Music track ${id} not found`, {
                    operation: 'incrementPlayCount',
                    entity: 'Music',
                    id
                });
            }

            const updatedTrack = track.incrementPlayCount();
            return await this.save(updatedTrack);
        } catch (error) {
            throw new RepositoryError(`Failed to increment play count for music track ${id}`, {
                operation: 'incrementPlayCount',
                entity: 'Music',
                id,
                cause: error
            });
        }
    }

    /**
     * Transform raw data to Music domain objects
     * @private
     * @param {any} data - Raw data from HTTP response
     * @returns {Music[]} Array of Music domain objects
     */
    _transformToMusic(data) {
        // Handle different data formats
        const tracksArray = Array.isArray(data) ? data : (data.songs || data.tracks || []);

        return tracksArray.map(rawTrack => {
            try {
                // Generate consistent ID if not provided
                const generateConsistentId = (track) => {
                    const text = `${track.title || 'unknown'}-${track.artist || 'unknown'}`.toLowerCase()
                        .replace(/[^a-z0-9]/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
                    return text;
                };

                // Transform to domain object format
                const trackData = {
                    id: rawTrack.id || rawTrack.song_id || generateConsistentId(rawTrack),
                    title: rawTrack.title || rawTrack.name,
                    artist: rawTrack.artist,
                    album: rawTrack.album,
                    duration: rawTrack.duration,
                    genre: rawTrack.genre,
                    year: rawTrack.year,
                    rating: rawTrack.rating || rawTrack.user_rating || 0,
                    playCount: rawTrack.play_count || rawTrack.playCount || 0,
                    lastPlayed: rawTrack.last_played || rawTrack.lastPlayed,
                    dateAdded: rawTrack.date_added || rawTrack.dateAdded || rawTrack.createdAt,
                    tags: rawTrack.tags || [],
                    notes: rawTrack.notes || '',
                    sources: rawTrack.sources || {
                        youtube: rawTrack.youtube,
                        spotify: rawTrack.spotify,
                        soundcloud: rawTrack.soundcloud,
                        apple_music: rawTrack.apple_music
                    }
                };

                return new Music(trackData);
            } catch (error) {
                console.warn(`Failed to transform music track: ${rawTrack.title || 'unknown'}`, error);
                return null;
            }
        }).filter(track => track !== null);
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        if (this.cache) {
            this.cache.deletePattern('music');
        }
    }
}
