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
        // console.log('🔍 [Music.constructor] Received data:', {
        //     title: data.title,
        //     youtube: data.youtube,
        //     youtubeUrl: data.youtubeUrl,
        //     youtube_type: typeof data.youtube,
        //     youtubeUrl_type: typeof data.youtubeUrl,
        //     youtube_length: data.youtube?.length,
        //     youtubeUrl_length: data.youtubeUrl?.length
        // });

        this._validateRequiredFields(data);

        // Core identifiers and metadata
        this.title = data.title;
        this.artist = data.artist;
        this.album = data.album || '';
        this.genre = data.genre || null;
        this.year = data.year || null;

        // Playback information - support both individual properties and sources object
        if (data.sources && typeof data.sources === 'object') {
            this.youtubeUrl = data.sources.youtube || null;
            this.spotifyUrl = data.sources.spotify || null;
            this.soundcloudUrl = data.sources.soundcloud || null;
            this.appleMusicUrl = data.sources.apple_music || null;
        } else {
            this.youtubeUrl = data.youtube || data.youtubeUrl || null;
            this.spotifyUrl = data.spotify || data.spotifyUrl || null;
            this.soundcloudUrl = data.soundcloud || data.soundcloudUrl || null;
            this.appleMusicUrl = data.apple_music || data.appleMusicUrl || null;
        }
        this.localFile = data.localFile || data.local_file || null;

        // console.log('🔍 [Music.constructor] Assigned URLs:', {
        //     title: this.title,
        //     youtubeUrl: this.youtubeUrl,
        //     youtubeUrl_length: this.youtubeUrl?.length,
        //     youtubeUrl_type: typeof this.youtubeUrl,
        //     spotifyUrl: this.spotifyUrl,
        //     appleMusicUrl: this.appleMusicUrl,
        //     localFile: this.localFile
        // });

        // Validate and set duration
        if (data.duration !== undefined && data.duration !== null && data.duration !== 0) {
            if (typeof data.duration !== 'number' || !Number.isInteger(data.duration) || data.duration < 0) {
                throw new ValidationError('Duration must be a non-negative integer', {
                    context: { duration: data.duration, type: typeof data.duration }
                });
            }
            this.duration = data.duration;
        } else {
            this.duration = data.duration || 0;
        }

        // Settings
        this.autoplay = Boolean(data.autoplay);
        this.volume = this._validateVolume(data.volume);

        // User data
        this.rating = this._validateRating(data.rating);
        this.playCount = data.playCount || data.play_count || 0;
        this.lastPlayed = data.lastPlayed || data.last_played ?
            new Date(data.lastPlayed || data.last_played) : null;
        this.dateAdded = data.dateAdded || data.date_added || data.createdAt || data.created_at ?
            new Date(data.dateAdded || data.date_added || data.createdAt || data.created_at) : new Date();

        // Playlist associations
        this.playlists = data.playlists || [];
        this.tags = data.tags || [];
        this.notes = data.notes || '';

        // Track type (Opening, Ending, OST, etc.)
        this.type = data.type || 'OST';

        // Additional metadata
        this.bpm = data.bpm || null;
        this.key = data.key || null;
        this.mood = data.mood || null;
        this.language = data.language || null;
        this.isExplicit = Boolean(data.isExplicit || data.is_explicit);

        // Generate unique ID if not provided
        this.id = data.id || this._generateId();

        // Validate id is a string
        if (typeof this.id !== 'string') {
            throw new ValidationError('Music id must be a string', {
                context: { id: this.id, type: typeof this.id }
            });
        }

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

        // Sources are optional - music can be created without playback sources
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

        if (numRating < 0 || numRating > 5) {
            throw new ValidationError('Rating must be between 0 and 5', {
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
        const result = this.youtubeUrl ||
            this.spotifyUrl ||
            this.soundcloudUrl ||
            this.appleMusicUrl ||
            this.localFile ||
            null;

        // console.log('🔍 [Music.getPrimaryUrl] URL priority check:', {
        //     title: this.title,
        //     youtubeUrl: this.youtubeUrl,
        //     spotifyUrl: this.spotifyUrl,
        //     soundcloudUrl: this.soundcloudUrl,
        //     appleMusicUrl: this.appleMusicUrl,
        //     localFile: this.localFile,
        //     result: result,
        //     result_length: result?.length
        // });

        return result;
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
     * Get formatted duration
     * @returns {string} Duration in MM:SS or HH:MM:SS format or 'Unknown'
     */
    getFormattedDuration() {
        if (this.duration === undefined || this.duration === null) {
            return 'Unknown';
        }

        if (this.duration === 0) {
            return '0:00';
        }

        const hours = Math.floor(this.duration / 3600);
        const minutes = Math.floor((this.duration % 3600) / 60);
        const seconds = this.duration % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }    /**
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
            type: this.type,
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

    // Simple getter methods
    getId() { return this.id; }
    getTitle() { return this.title; }
    getArtist() { return this.artist; }
    getAlbum() { return this.album || ''; }
    getDuration() { return this.duration || 0; }
    getRating() { return this.rating || 0; }
    getTags() { return this.tags || []; }
    getNotes() { return this.notes || ''; }
    getPlayCount() { return this.playCount || 0; }
    getLastPlayed() { return this.lastPlayed ? this.lastPlayed.getTime() : null; }
    getDateAdded() { return this.dateAdded; }
    getPlaylists() { return this.playlists || []; }

    // Get sources as object
    getSources() {
        const sources = {};
        if (this.youtubeUrl) sources.youtube = this.youtubeUrl;
        if (this.spotifyUrl) sources.spotify = this.spotifyUrl;
        if (this.soundcloudUrl) sources.soundcloud = this.soundcloudUrl;
        if (this.appleMusicUrl) sources.apple_music = this.appleMusicUrl;
        return sources;
    }

    // Source management
    addSource(platform, url) {
        if (!platform || typeof platform !== 'string') {
            throw new ValidationError('Platform must be a non-empty string', {
                context: { platform }
            });
        }
        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            throw new ValidationError('URL must be a valid http/https URL', {
                context: { url }
            });
        }

        const sources = { ...this.getSources(), [platform]: url };
        return new Music({ ...this._toPlainObject(), sources });
    }

    removeSource(platform) {
        const sources = { ...this.getSources() };
        delete sources[platform];
        return new Music({ ...this._toPlainObject(), sources });
    }

    hasSource(platform) {
        return this.getSources().hasOwnProperty(platform);
    }

    getPrimarySource() {
        const sources = this.getSources();
        const platforms = Object.keys(sources);
        return platforms.length > 0 ? sources[platforms[0]] : null;
    }

    getSourceByPlatform(platform) {
        return this.getSources()[platform] || null;
    }

    getPreferredSource(preferredPlatforms = []) {
        const sources = this.getSources();
        for (const platform of preferredPlatforms) {
            if (sources[platform]) {
                return sources[platform];
            }
        }
        return this.getPrimarySource();
    }

    // Rating management
    setRating(rating) {
        if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 0 || rating > 5) {
            throw new ValidationError('Rating must be an integer between 0 and 5', {
                context: { rating }
            });
        }
        return new Music({ ...this._toPlainObject(), rating });
    }

    isHighlyRated() {
        return this.rating >= 4;
    }

    getRatingCategory() {
        if (this.rating === 0) return 'unrated';
        if (this.rating === 5) return 'excellent';
        if (this.rating === 4) return 'good';
        if (this.rating === 3) return 'average';
        return 'poor';
    }

    // Playlist management
    addToPlaylist(playlistName) {
        if (!playlistName || typeof playlistName !== 'string') {
            throw new ValidationError('Playlist name must be a non-empty string', {
                context: { playlistName }
            });
        }
        if (this.playlists.includes(playlistName)) {
            return this;
        }
        return new Music({ ...this._toPlainObject(), playlists: [...this.playlists, playlistName] });
    }

    removeFromPlaylist(playlistName) {
        return new Music({
            ...this._toPlainObject(),
            playlists: this.playlists.filter(p => p !== playlistName)
        });
    }

    isInPlaylist(playlistName) {
        return this.playlists.includes(playlistName);
    }

    // Tag management
    addTag(tag) {
        if (!tag || typeof tag !== 'string') {
            throw new ValidationError('Tag must be a non-empty string', {
                context: { tag }
            });
        }
        if (this.tags.includes(tag)) {
            return this;
        }
        return new Music({ ...this._toPlainObject(), tags: [...this.tags, tag] });
    }

    removeTag(tag) {
        return new Music({
            ...this._toPlainObject(),
            tags: this.tags.filter(t => t !== tag)
        });
    }

    hasTag(tag) {
        return this.tags.includes(tag);
    }

    // Play tracking
    incrementPlayCount() {
        return new Music({
            ...this._toPlainObject(),
            playCount: this.playCount + 1,
            lastPlayed: new Date()
        });
    }

    /**
     * Mark as played (increments play count and updates last played)
     * @returns {Music} New Music instance
     */
    markAsPlayed() {
        return this.incrementPlayCount();
    }

    updateLastPlayed() {
        return new Music({
            ...this._toPlainObject(),
            lastPlayed: new Date()
        });
    }

    isRecentlyPlayed(daysThreshold = 1) {
        if (!this.lastPlayed) return false;
        const daysSincePlay = (new Date() - this.lastPlayed) / (1000 * 60 * 60 * 24);
        return daysSincePlay <= daysThreshold;
    }

    getPlayFrequency() {
        if (!this.dateAdded || this.playCount === 0) return 0;
        const daysSinceAdded = (new Date() - this.dateAdded) / (1000 * 60 * 60 * 24);
        return daysSinceAdded > 0 ? this.playCount / daysSinceAdded : 0;
    }

    // Duration handling
    setDuration(duration) {
        if (typeof duration !== 'number' || duration < 0 || !Number.isInteger(duration)) {
            throw new ValidationError('Duration must be a non-negative integer', {
                context: { duration }
            });
        }
        return new Music({ ...this._toPlainObject(), duration });
    }

    // Metadata management
    setNotes(notes) {
        if (notes === null || notes === undefined || typeof notes !== 'string') {
            throw new ValidationError('Notes must be a string', {
                context: { notes, type: typeof notes }
            });
        }
        return new Music({ ...this._toPlainObject(), notes });
    }

    updateArtist(artist) {
        if (!artist || typeof artist !== 'string') {
            throw new ValidationError('Artist must be a non-empty string', {
                context: { artist }
            });
        }
        return new Music({ ...this._toPlainObject(), artist });
    }

    updateAlbum(album) {
        if (!album || typeof album !== 'string') {
            throw new ValidationError('Album must be a non-empty string', {
                context: { album }
            });
        }
        return new Music({ ...this._toPlainObject(), album });
    }

    // Search and filtering
    matchesSearch(query) {
        const lowerQuery = query.toLowerCase();
        return this.title.toLowerCase().includes(lowerQuery) ||
            this.artist.toLowerCase().includes(lowerQuery) ||
            (this.album && this.album.toLowerCase().includes(lowerQuery)) ||
            this.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
    }

    /**
     * Check if music matches search query (alias for matchesSearch)
     * @param {string} query - Search query
     * @returns {boolean} True if matches
     */
    matchesSearchQuery(query) {
        return this.matchesSearch(query);
    }

    // Popularity scoring
    getPopularityScore() {
        const ratingWeight = 0.4;
        const playCountWeight = 0.4;
        const recencyWeight = 0.2;

        const ratingScore = (this.rating / 5) * 100;
        const playScore = Math.min(this.playCount * 10, 100);

        let recencyScore = 0;
        if (this.lastPlayed) {
            const daysSincePlay = (new Date() - this.lastPlayed) / (1000 * 60 * 60 * 24);
            recencyScore = Math.max(0, 100 - (daysSincePlay * 2));
        }

        return (ratingScore * ratingWeight) + (playScore * playCountWeight) + (recencyScore * recencyWeight);
    }

    /**
     * Calculate popularity score (alias for getPopularityScore)
     * @returns {number} Popularity score
     */
    calculatePopularityScore() {
        return this.getPopularityScore();
    }

    isMorePopularThan(otherMusic) {
        return this.getPopularityScore() > otherMusic.getPopularityScore();
    }

    // Serialization
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            artist: this.artist,
            album: this.album,
            type: this.type,
            duration: this.duration,
            sources: this.getSources(),
            rating: this.rating,
            tags: this.tags,
            notes: this.notes,
            playCount: this.playCount,
            playlists: this.playlists,
            lastPlayed: this.lastPlayed,
            dateAdded: this.dateAdded
        };
    }

    toExternalAPI() {
        return {
            id: this.id,
            title: this.title,
            artist: this.artist,
            album: this.album,
            duration: this.getFormattedDuration(),
            sources: this.getSources(),
            rating: this.rating,
            user_rating: this.rating,
            tags: this.tags
        };
    }

    /**
     * Export for external API (alias for toExternalAPI)
     * @returns {object} API-formatted music data
     */
    exportForAPI() {
        return this.toExternalAPI();
    }

    static fromJSON(json) {
        return new Music(json);
    }

    // Helper method to convert to plain object for immutability
    _toPlainObject() {
        return {
            id: this.id,
            title: this.title,
            artist: this.artist,
            album: this.album,
            type: this.type,
            duration: this.duration,
            sources: this.getSources(),
            rating: this.rating,
            tags: this.tags,
            notes: this.notes,
            playCount: this.playCount,
            playlists: this.playlists,
            lastPlayed: this.lastPlayed,
            dateAdded: this.dateAdded,
            genre: this.genre,
            year: this.year,
            autoplay: this.autoplay,
            volume: this.volume,
            bpm: this.bpm,
            key: this.key,
            mood: this.mood,
            language: this.language,
            isExplicit: this.isExplicit,
            localFile: this.localFile
        };
    }
}