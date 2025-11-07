/**
 * Music Domain Model
 * Rich domain object representing a music track with metadata and playback information
 */
import { ValidationError } from '../../Core/Errors/ApplicationErrors.js';

export class Music {
    /**
     * Create a Music instance
     * @param {object} data - Music data
     */
    constructor(data) {
        this._validateRequiredFields(data);

        // Core identifiers and metadata
        this.title = data.title;
        this.artist = data.artist;
        this.album = data.album || null;
        this.genre = data.genre || null;
        this.year = data.year || null;

        // Playback information
        this.duration = data.duration || null; // Duration in seconds
        this.youtubeUrl = data.youtube || data.youtubeUrl || null;
        this.spotifyUrl = data.spotify || data.spotifyUrl || null;
        this.soundcloudUrl = data.soundcloud || data.soundcloudUrl || null;
        this.localFile = data.localFile || data.local_file || null;

        // Settings
        this.autoplay = Boolean(data.autoplay);
        this.volume = this._validateVolume(data.volume);

        // User data
        this.rating = this._validateRating(data.rating);
        this.playCount = data.playCount || data.play_count || 0;
        this.lastPlayed = data.lastPlayed || data.last_played ?
            new Date(data.lastPlayed || data.last_played) : null;
        this.dateAdded = data.dateAdded || data.date_added ?
            new Date(data.dateAdded || data.date_added) : new Date();

        // Playlist associations
        this.playlists = data.playlists || [];
        this.tags = data.tags || [];

        // Additional metadata
        this.bpm = data.bpm || null;
        this.key = data.key || null;
        this.mood = data.mood || null;
        this.language = data.language || null;
        this.isExplicit = Boolean(data.isExplicit || data.is_explicit);

        // Generate unique ID if not provided
        this.id = data.id || this._generateId();

        // Make ID immutable
        Object.defineProperty(this, 'id', { writable: false, configurable: false });
    }

    /**
     * Validate required fields
     * @private
     * @param {object} data - Input data
     */
    _validateRequiredFields(data) {
        if (!data) {
            throw new ValidationError('Music data is required');
        }

        if (!data.title || typeof data.title !== 'string') {
            throw new ValidationError('Music title is required and must be a string', {
                context: { title: data.title, data }
            });
        }

        if (!data.artist || typeof data.artist !== 'string') {
            throw new ValidationError('Music artist is required and must be a string', {
                context: { artist: data.artist, data }
            });
        }

        // Must have at least one playback source
        const hasSources = data.youtube || data.youtubeUrl ||
            data.spotify || data.spotifyUrl ||
            data.soundcloud || data.soundcloudUrl ||
            data.localFile || data.local_file;

        if (!hasSources) {
            throw new ValidationError('Music must have at least one playback source', {
                context: { data }
            });
        }
    }

    /**
     * Validate volume level
     * @private
     * @param {number} volume - Volume level
     * @returns {number} Validated volume
     */
    _validateVolume(volume) {
        if (volume === null || volume === undefined) {
            return 1.0; // Default volume
        }

        const numVolume = Number(volume);
        if (isNaN(numVolume)) {
            throw new ValidationError('Volume must be a number', {
                context: { volume, type: typeof volume }
            });
        }

        if (numVolume < 0 || numVolume > 1) {
            throw new ValidationError('Volume must be between 0 and 1', {
                context: { volume: numVolume }
            });
        }

        return numVolume;
    }

    /**
     * Validate rating
     * @private
     * @param {number} rating - Rating value
     * @returns {number|null} Validated rating
     */
    _validateRating(rating) {
        if (rating === null || rating === undefined) {
            return null;
        }

        const numRating = Number(rating);
        if (isNaN(numRating)) {
            throw new ValidationError('Rating must be a number', {
                context: { rating, type: typeof rating }
            });
        }

        if (numRating < 1 || numRating > 10) {
            throw new ValidationError('Rating must be between 1 and 10', {
                context: { rating: numRating }
            });
        }

        return Math.round(numRating * 10) / 10; // Round to 1 decimal place
    }

    /**
     * Generate unique ID based on title and artist
     * @private
     * @returns {string} Generated ID
     */
    _generateId() {
        const text = `${this.title}-${this.artist}`.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return `${text}-${Date.now()}`;
    }

    /**
     * Get primary playback URL
     * @returns {string|null} Primary URL for playback
     */
    getPrimaryUrl() {
        return this.youtubeUrl || this.spotifyUrl || this.soundcloudUrl || this.localFile;
    }

    /**
     * Get all available playback sources
     * @returns {object} Object with all available sources
     */
    getAllSources() {
        const sources = {};

        if (this.youtubeUrl) sources.youtube = this.youtubeUrl;
        if (this.spotifyUrl) sources.spotify = this.spotifyUrl;
        if (this.soundcloudUrl) sources.soundcloud = this.soundcloudUrl;
        if (this.localFile) sources.local = this.localFile;

        return sources;
    }

    /**
     * Get source type of primary URL
     * @returns {string} Source type ('youtube', 'spotify', 'soundcloud', 'local', 'unknown')
     */
    getPrimarySourceType() {
        if (this.youtubeUrl) return 'youtube';
        if (this.spotifyUrl) return 'spotify';
        if (this.soundcloudUrl) return 'soundcloud';
        if (this.localFile) return 'local';
        return 'unknown';
    }

    /**
     * Check if music has a specific source
     * @param {string} sourceType - Source type to check
     * @returns {boolean} True if has source
     */
    hasSource(sourceType) {
        switch (sourceType.toLowerCase()) {
            case 'youtube':
                return Boolean(this.youtubeUrl);
            case 'spotify':
                return Boolean(this.spotifyUrl);
            case 'soundcloud':
                return Boolean(this.soundcloudUrl);
            case 'local':
                return Boolean(this.localFile);
            default:
                return false;
        }
    }

    /**
     * Get formatted duration string
     * @returns {string} Duration in MM:SS format or 'Unknown'
     */
    getFormattedDuration() {
        if (!this.duration) {
            return 'Unknown';
        }

        const minutes = Math.floor(this.duration / 60);
        const seconds = this.duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get full display name
     * @returns {string} Full name (Artist - Title)
     */
    getFullName() {
        return `${this.artist} - ${this.title}`;
    }

    /**
     * Get display name with album
     * @returns {string} Name with album if available
     */
    getDisplayName() {
        const base = this.getFullName();
        return this.album ? `${base} (${this.album})` : base;
    }

    /**
     * Check if music is in a specific playlist
     * @param {string} playlistName - Playlist name
     * @returns {boolean} True if in playlist
     */
    isInPlaylist(playlistName) {
        return this.playlists.includes(playlistName);
    }

    /**
     * Check if music has a specific tag
     * @param {string} tag - Tag to check
     * @returns {boolean} True if has tag
     */
    hasTag(tag) {
        return this.tags.includes(tag);
    }

    /**
     * Check if music matches search query
     * @param {string} query - Search query
     * @returns {boolean} True if matches
     */
    matchesSearch(query) {
        if (!query) return true;

        const searchText = query.toLowerCase();
        const searchFields = [
            this.title,
            this.artist,
            this.album,
            this.genre,
            ...this.tags
        ].filter(Boolean).join(' ').toLowerCase();

        return searchFields.includes(searchText);
    }

    /**
     * Increment play count and update last played
     * @returns {Music} New Music instance with updated play data
     */
    recordPlay() {
        return new Music({
            ...this.toJSON(),
            playCount: this.playCount + 1,
            lastPlayed: new Date()
        });
    }

    /**
     * Update rating
     * @param {number} newRating - New rating (1-10)
     * @returns {Music} New Music instance with updated rating
     */
    updateRating(newRating) {
        const validatedRating = this._validateRating(newRating);

        return new Music({
            ...this.toJSON(),
            rating: validatedRating
        });
    }

    /**
     * Add to playlist
     * @param {string} playlistName - Playlist name
     * @returns {Music} New Music instance with playlist added
     */
    addToPlaylist(playlistName) {
        if (this.isInPlaylist(playlistName)) {
            return this; // Already in playlist
        }

        return new Music({
            ...this.toJSON(),
            playlists: [...this.playlists, playlistName]
        });
    }

    /**
     * Remove from playlist
     * @param {string} playlistName - Playlist name
     * @returns {Music} New Music instance with playlist removed
     */
    removeFromPlaylist(playlistName) {
        return new Music({
            ...this.toJSON(),
            playlists: this.playlists.filter(p => p !== playlistName)
        });
    }

    /**
     * Add tag
     * @param {string} tag - Tag to add
     * @returns {Music} New Music instance with tag added
     */
    addTag(tag) {
        if (this.hasTag(tag)) {
            return this; // Already has tag
        }

        return new Music({
            ...this.toJSON(),
            tags: [...this.tags, tag]
        });
    }

    /**
     * Remove tag
     * @param {string} tag - Tag to remove
     * @returns {Music} New Music instance with tag removed
     */
    removeTag(tag) {
        return new Music({
            ...this.toJSON(),
            tags: this.tags.filter(t => t !== tag)
        });
    }

    /**
     * Calculate popularity score
     * @returns {number} Popularity score based on play count and rating
     */
    getPopularityScore() {
        const playScore = Math.min(this.playCount * 10, 100); // Max 100 from plays
        const ratingScore = this.rating ? this.rating * 10 : 50; // Default 50 if no rating

        return (playScore + ratingScore) / 2;
    }

    /**
     * Check equality with another Music
     * @param {Music} other - Other Music to compare
     * @returns {boolean} True if music tracks are equal
     */
    equals(other) {
        if (!(other instanceof Music)) {
            return false;
        }
        return this.id === other.id;
    }

    /**
     * Compare for sorting
     * @param {Music} other - Other Music to compare
     * @param {string} sortBy - Field to sort by ('title', 'artist', 'rating', 'playCount', 'dateAdded')
     * @returns {number} Comparison result
     */
    compare(other, sortBy = 'title') {
        if (!(other instanceof Music)) {
            throw new ValidationError('Can only compare with another Music');
        }

        switch (sortBy) {
            case 'title':
                return this.title.localeCompare(other.title);
            case 'artist':
                return this.artist.localeCompare(other.artist);
            case 'rating':
                return (other.rating || 0) - (this.rating || 0); // Higher rating first
            case 'playCount':
                return other.playCount - this.playCount; // Higher play count first
            case 'dateAdded':
                return other.dateAdded.getTime() - this.dateAdded.getTime(); // Newer first
            case 'popularity':
                return other.getPopularityScore() - this.getPopularityScore();
            default:
                return this.title.localeCompare(other.title);
        }
    }

    /**
     * Convert to plain object for serialization
     * @returns {object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            artist: this.artist,
            album: this.album,
            genre: this.genre,
            year: this.year,
            duration: this.duration,
            youtube: this.youtubeUrl,
            spotify: this.spotifyUrl,
            soundcloud: this.soundcloudUrl,
            localFile: this.localFile,
            autoplay: this.autoplay,
            volume: this.volume,
            rating: this.rating,
            playCount: this.playCount,
            lastPlayed: this.lastPlayed ? this.lastPlayed.toISOString() : null,
            dateAdded: this.dateAdded.toISOString(),
            playlists: [...this.playlists],
            tags: [...this.tags],
            bpm: this.bpm,
            key: this.key,
            mood: this.mood,
            language: this.language,
            isExplicit: this.isExplicit
        };
    }

    /**
     * Get detailed information for display
     * @returns {object} Detailed music information
     */
    getDetailedInfo() {
        return {
            basic: {
                id: this.id,
                title: this.title,
                artist: this.artist,
                album: this.album,
                fullName: this.getFullName(),
                displayName: this.getDisplayName()
            },
            metadata: {
                genre: this.genre,
                year: this.year,
                duration: this.duration,
                formattedDuration: this.getFormattedDuration(),
                bpm: this.bpm,
                key: this.key,
                mood: this.mood,
                language: this.language,
                isExplicit: this.isExplicit
            },
            playback: {
                primaryUrl: this.getPrimaryUrl(),
                primarySource: this.getPrimarySourceType(),
                allSources: this.getAllSources(),
                autoplay: this.autoplay,
                volume: this.volume
            },
            userdata: {
                rating: this.rating,
                playCount: this.playCount,
                lastPlayed: this.lastPlayed,
                dateAdded: this.dateAdded,
                popularityScore: this.getPopularityScore()
            },
            organization: {
                playlists: [...this.playlists],
                tags: [...this.tags]
            }
        };
    }

    /**
     * Create Music from legacy data format
     * @param {object} legacyData - Legacy music data
     * @returns {Music} New Music instance
     */
    static fromLegacyData(legacyData) {
        return new Music(legacyData);
    }

    /**
     * Validate music data without creating instance
     * @param {object} data - Music data to validate
     * @returns {boolean} True if valid
     */
    static isValid(data) {
        try {
            new Music(data);
            return true;
        } catch {
            return false;
        }
    }
}