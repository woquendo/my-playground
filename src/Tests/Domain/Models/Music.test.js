import { Music } from '../../../Domain/Models/Music.js';
import { ValidationError } from '../../../Core/Errors/ApplicationErrors.js';

describe('Music Domain Model', () => {
    // Test data setup
    const validMusicData = {
        id: 'music-123',
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 180, // 3 minutes
        sources: {
            youtube: 'https://youtube.com/watch?v=test123',
            spotify: 'https://open.spotify.com/track/test123'
        },
        rating: 4,
        tags: ['rock', 'upbeat'],
        notes: 'Great song!'
    };

    describe('Construction and Validation', () => {
        test('should create Music with valid data', () => {
            const music = new Music(validMusicData);

            expect(music.getId()).toBe('music-123');
            expect(music.getTitle()).toBe('Test Song');
            expect(music.getArtist()).toBe('Test Artist');
            expect(music.getAlbum()).toBe('Test Album');
            expect(music.getDuration()).toBe(180);
            expect(music.getSources()).toEqual(validMusicData.sources);
            expect(music.getRating()).toBe(4);
            expect(music.getTags()).toEqual(['rock', 'upbeat']);
            expect(music.getNotes()).toBe('Great song!');
        });

        test('should throw ValidationError for missing required fields', () => {
            expect(() => new Music({})).toThrow(ValidationError);
            expect(() => new Music({ id: 'music-123' })).toThrow(ValidationError);
            expect(() => new Music({
                id: 'music-123',
                title: 'Test'
            })).toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid field types', () => {
            expect(() => new Music({
                ...validMusicData,
                id: 123
            })).toThrow(ValidationError);

            expect(() => new Music({
                ...validMusicData,
                title: null
            })).toThrow(ValidationError);

            expect(() => new Music({
                ...validMusicData,
                duration: '180'
            })).toThrow(ValidationError);

            expect(() => new Music({
                ...validMusicData,
                rating: 6
            })).toThrow(ValidationError);
        });

        test('should set default values for optional fields', () => {
            const minimalData = {
                id: 'music-123',
                title: 'Test Song',
                artist: 'Test Artist'
            };

            const music = new Music(minimalData);

            expect(music.getAlbum()).toBe('');
            expect(music.getDuration()).toBe(0);
            expect(music.getSources()).toEqual({});
            expect(music.getRating()).toBe(0);
            expect(music.getTags()).toEqual([]);
            expect(music.getNotes()).toBe('');
            expect(music.getPlayCount()).toBe(0);
            expect(music.getPlaylists()).toEqual([]);
        });
    });

    describe('Source Management', () => {
        test('should add source correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.addSource('apple_music', 'https://music.apple.com/track/test123');

            expect(updatedMusic.getSources().apple_music).toBe('https://music.apple.com/track/test123');
            expect(updatedMusic.getSources().youtube).toBe('https://youtube.com/watch?v=test123');
            expect(music.getSources()).not.toHaveProperty('apple_music'); // Original unchanged
        });

        test('should validate source URLs', () => {
            const music = new Music(validMusicData);

            expect(() => music.addSource('invalid', 'not-a-url')).toThrow(ValidationError);
            expect(() => music.addSource('youtube', '')).toThrow(ValidationError);
            expect(() => music.addSource('', 'https://valid.com')).toThrow(ValidationError);
        });

        test('should remove source correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.removeSource('youtube');

            expect(updatedMusic.getSources()).not.toHaveProperty('youtube');
            expect(updatedMusic.getSources().spotify).toBe('https://open.spotify.com/track/test123');
        });

        test('should check if has source', () => {
            const music = new Music(validMusicData);

            expect(music.hasSource('youtube')).toBe(true);
            expect(music.hasSource('apple_music')).toBe(false);
        });

        test('should get primary source', () => {
            const music = new Music(validMusicData);

            // Should return first available source (youtube in this case)
            expect(music.getPrimarySource()).toBe('https://youtube.com/watch?v=test123');
        });

        test('should get source by platform', () => {
            const music = new Music(validMusicData);

            expect(music.getSourceByPlatform('youtube')).toBe('https://youtube.com/watch?v=test123');
            expect(music.getSourceByPlatform('spotify')).toBe('https://open.spotify.com/track/test123');
            expect(music.getSourceByPlatform('apple_music')).toBeNull();
        });

        test('should get preferred source with fallback', () => {
            const music = new Music(validMusicData);

            expect(music.getPreferredSource(['apple_music', 'spotify', 'youtube']))
                .toBe('https://open.spotify.com/track/test123');

            expect(music.getPreferredSource(['apple_music', 'soundcloud']))
                .toBe('https://youtube.com/watch?v=test123'); // Fallback to primary
        });
    });

    describe('Rating System', () => {
        test('should set rating correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.setRating(5);

            expect(updatedMusic.getRating()).toBe(5);
            expect(music.getRating()).toBe(4); // Original unchanged
        });

        test('should validate rating range', () => {
            const music = new Music(validMusicData);

            expect(() => music.setRating(-1)).toThrow(ValidationError);
            expect(() => music.setRating(6)).toThrow(ValidationError);
            expect(() => music.setRating(1.5)).toThrow(ValidationError);
            expect(() => music.setRating('5')).toThrow(ValidationError);
        });

        test('should check if highly rated', () => {
            const highRated = new Music({ ...validMusicData, rating: 5 });
            const lowRated = new Music({ ...validMusicData, rating: 2 });

            expect(highRated.isHighlyRated()).toBe(true);
            expect(lowRated.isHighlyRated()).toBe(false);
        });

        test('should get rating category', () => {
            const excellent = new Music({ ...validMusicData, rating: 5 });
            const good = new Music({ ...validMusicData, rating: 4 });
            const average = new Music({ ...validMusicData, rating: 3 });
            const poor = new Music({ ...validMusicData, rating: 1 });
            const unrated = new Music({ ...validMusicData, rating: 0 });

            expect(excellent.getRatingCategory()).toBe('excellent');
            expect(good.getRatingCategory()).toBe('good');
            expect(average.getRatingCategory()).toBe('average');
            expect(poor.getRatingCategory()).toBe('poor');
            expect(unrated.getRatingCategory()).toBe('unrated');
        });
    });

    describe('Playlist Management', () => {
        test('should add to playlist correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.addToPlaylist('favorites');

            expect(updatedMusic.getPlaylists()).toContain('favorites');
            expect(music.getPlaylists()).not.toContain('favorites'); // Original unchanged
        });

        test('should not add duplicate playlists', () => {
            const music = new Music({
                ...validMusicData,
                playlists: ['rock_collection']
            });

            const updatedMusic = music.addToPlaylist('rock_collection');

            expect(updatedMusic.getPlaylists()).toEqual(['rock_collection']);
        });

        test('should remove from playlist correctly', () => {
            const music = new Music({
                ...validMusicData,
                playlists: ['favorites', 'workout', 'rock_collection']
            });

            const updatedMusic = music.removeFromPlaylist('workout');

            expect(updatedMusic.getPlaylists()).not.toContain('workout');
            expect(updatedMusic.getPlaylists()).toContain('favorites');
            expect(updatedMusic.getPlaylists()).toContain('rock_collection');
        });

        test('should check if in playlist', () => {
            const music = new Music({
                ...validMusicData,
                playlists: ['favorites', 'workout']
            });

            expect(music.isInPlaylist('favorites')).toBe(true);
            expect(music.isInPlaylist('rock_collection')).toBe(false);
        });

        test('should validate playlist names', () => {
            const music = new Music(validMusicData);

            expect(() => music.addToPlaylist('')).toThrow(ValidationError);
            expect(() => music.addToPlaylist(null)).toThrow(ValidationError);
            expect(() => music.addToPlaylist(123)).toThrow(ValidationError);
        });
    });

    describe('Tag Management', () => {
        test('should add tag correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.addTag('energetic');

            expect(updatedMusic.getTags()).toContain('energetic');
            expect(updatedMusic.getTags()).toContain('rock');
            expect(updatedMusic.getTags()).toContain('upbeat');
            expect(music.getTags()).not.toContain('energetic'); // Original unchanged
        });

        test('should not add duplicate tags', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.addTag('rock'); // Already exists

            expect(updatedMusic.getTags()).toEqual(['rock', 'upbeat']);
        });

        test('should remove tag correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.removeTag('rock');

            expect(updatedMusic.getTags()).not.toContain('rock');
            expect(updatedMusic.getTags()).toContain('upbeat');
        });

        test('should check if has tag', () => {
            const music = new Music(validMusicData);

            expect(music.hasTag('rock')).toBe(true);
            expect(music.hasTag('classical')).toBe(false);
        });

        test('should validate tag input', () => {
            const music = new Music(validMusicData);

            expect(() => music.addTag('')).toThrow(ValidationError);
            expect(() => music.addTag(null)).toThrow(ValidationError);
            expect(() => music.addTag(123)).toThrow(ValidationError);
        });
    });

    describe('Play Tracking', () => {
        test('should increment play count', () => {
            const music = new Music({ ...validMusicData, playCount: 5 });
            const updatedMusic = music.incrementPlayCount();

            expect(updatedMusic.getPlayCount()).toBe(6);
            expect(music.getPlayCount()).toBe(5); // Original unchanged
        });

        test('should update last played timestamp', () => {
            const music = new Music(validMusicData);
            const beforePlay = Date.now();
            const updatedMusic = music.markAsPlayed();
            const afterPlay = Date.now();

            expect(updatedMusic.getLastPlayed()).toBeGreaterThanOrEqual(beforePlay);
            expect(updatedMusic.getLastPlayed()).toBeLessThanOrEqual(afterPlay);
            expect(updatedMusic.getPlayCount()).toBe(1);
        });

        test('should check if recently played', () => {
            const recentMusic = new Music({
                ...validMusicData,
                lastPlayed: Date.now() - (30 * 60 * 1000) // 30 minutes ago
            });

            const oldMusic = new Music({
                ...validMusicData,
                lastPlayed: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
            });

            expect(recentMusic.isRecentlyPlayed()).toBe(true);
            expect(oldMusic.isRecentlyPlayed()).toBe(false);
        });

        test('should get play frequency', () => {
            const frequentMusic = new Music({
                ...validMusicData,
                playCount: 50,
                createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days ago
            });

            const frequency = frequentMusic.getPlayFrequency();
            expect(frequency).toBeCloseTo(1.67, 1); // 50 plays / 30 days ≈ 1.67
        });
    });

    describe('Duration and Format Handling', () => {
        test('should format duration correctly', () => {
            const shortMusic = new Music({ ...validMusicData, duration: 90 }); // 1:30
            const mediumMusic = new Music({ ...validMusicData, duration: 225 }); // 3:45
            const longMusic = new Music({ ...validMusicData, duration: 3661 }); // 1:01:01

            expect(shortMusic.getFormattedDuration()).toBe('1:30');
            expect(mediumMusic.getFormattedDuration()).toBe('3:45');
            expect(longMusic.getFormattedDuration()).toBe('1:01:01');
        });

        test('should handle zero duration', () => {
            const music = new Music({ ...validMusicData, duration: 0 });
            expect(music.getFormattedDuration()).toBe('0:00');
        });

        test('should set duration correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.setDuration(240);

            expect(updatedMusic.getDuration()).toBe(240);
            expect(music.getDuration()).toBe(180); // Original unchanged
        });

        test('should validate duration input', () => {
            const music = new Music(validMusicData);

            expect(() => music.setDuration(-1)).toThrow(ValidationError);
            expect(() => music.setDuration('240')).toThrow(ValidationError);
            expect(() => music.setDuration(240.5)).toThrow(ValidationError);
        });
    });

    describe('Metadata Management', () => {
        test('should set notes correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.setNotes('Updated notes');

            expect(updatedMusic.getNotes()).toBe('Updated notes');
            expect(music.getNotes()).toBe('Great song!'); // Original unchanged
        });

        test('should validate notes input', () => {
            const music = new Music(validMusicData);

            expect(() => music.setNotes(null)).toThrow(ValidationError);
            expect(() => music.setNotes(123)).toThrow(ValidationError);
        });

        test('should update artist correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.updateArtist('New Artist');

            expect(updatedMusic.getArtist()).toBe('New Artist');
            expect(music.getArtist()).toBe('Test Artist'); // Original unchanged
        });

        test('should update album correctly', () => {
            const music = new Music(validMusicData);
            const updatedMusic = music.updateAlbum('New Album');

            expect(updatedMusic.getAlbum()).toBe('New Album');
            expect(music.getAlbum()).toBe('Test Album'); // Original unchanged
        });
    });

    describe('Search and Filtering', () => {
        test('should match search query in title', () => {
            const music = new Music(validMusicData);

            expect(music.matchesSearchQuery('Test')).toBe(true);
            expect(music.matchesSearchQuery('song')).toBe(true);
            expect(music.matchesSearchQuery('random')).toBe(false);
        });

        test('should match search query in artist', () => {
            const music = new Music(validMusicData);

            expect(music.matchesSearchQuery('Test Artist')).toBe(true);
            expect(music.matchesSearchQuery('artist')).toBe(true);
        });

        test('should match search query in album', () => {
            const music = new Music(validMusicData);

            expect(music.matchesSearchQuery('Test Album')).toBe(true);
            expect(music.matchesSearchQuery('album')).toBe(true);
        });

        test('should match search query in tags', () => {
            const music = new Music(validMusicData);

            expect(music.matchesSearchQuery('rock')).toBe(true);
            expect(music.matchesSearchQuery('upbeat')).toBe(true);
        });

        test('should be case insensitive', () => {
            const music = new Music(validMusicData);

            expect(music.matchesSearchQuery('TEST')).toBe(true);
            expect(music.matchesSearchQuery('ROCK')).toBe(true);
            expect(music.matchesSearchQuery('ArTiSt')).toBe(true);
        });
    });

    describe('Popularity and Scoring', () => {
        test('should calculate popularity score', () => {
            const popularMusic = new Music({
                ...validMusicData,
                rating: 5,
                playCount: 100,
                playlists: ['favorites', 'workout', 'party']
            });

            const score = popularMusic.calculatePopularityScore();
            expect(score).toBeGreaterThan(0);
            expect(typeof score).toBe('number');
        });

        test('should compare popularity correctly', () => {
            const veryPopular = new Music({
                ...validMusicData,
                id: 'popular',
                rating: 5,
                playCount: 100,
                playlists: ['favorites', 'workout']
            });

            const lessPopular = new Music({
                ...validMusicData,
                id: 'less-popular',
                rating: 3,
                playCount: 10,
                playlists: []
            });

            expect(veryPopular.isMorePopularThan(lessPopular)).toBe(true);
            expect(lessPopular.isMorePopularThan(veryPopular)).toBe(false);
        });
    });

    describe('Serialization and Export', () => {
        test('should serialize to JSON correctly', () => {
            const music = new Music(validMusicData);
            const json = music.toJSON();

            expect(json.id).toBe('music-123');
            expect(json.title).toBe('Test Song');
            expect(json.artist).toBe('Test Artist');
            expect(json.album).toBe('Test Album');
            expect(json.duration).toBe(180);
            expect(json.rating).toBe(4);
        });

        test('should export for external APIs', () => {
            const music = new Music(validMusicData);
            const exported = music.exportForAPI();

            expect(exported).toHaveProperty('id');
            expect(exported).toHaveProperty('title');
            expect(exported).toHaveProperty('artist');
            expect(exported).toHaveProperty('sources');
            expect(exported).toHaveProperty('user_rating');
        });

        test('should create music from JSON', () => {
            const music = new Music(validMusicData);
            const json = music.toJSON();
            const recreated = Music.fromJSON(json);

            expect(recreated.getId()).toBe(music.getId());
            expect(recreated.getTitle()).toBe(music.getTitle());
            expect(recreated.getArtist()).toBe(music.getArtist());
            expect(recreated.getRating()).toBe(music.getRating());
        });
    });

    describe('Immutability and State Management', () => {
        test('should maintain immutability on all operations', () => {
            const music = new Music(validMusicData);

            const rated = music.setRating(5);
            const tagged = music.addTag('favorite');
            const played = music.markAsPlayed();
            const playlistAdded = music.addToPlaylist('favorites');

            expect(music.getRating()).toBe(4);
            expect(music.getTags()).not.toContain('favorite');
            expect(music.getPlayCount()).toBe(0);
            expect(music.getPlaylists()).not.toContain('favorites');

            expect(rated).not.toBe(music);
            expect(tagged).not.toBe(music);
            expect(played).not.toBe(music);
            expect(playlistAdded).not.toBe(music);
        });

        test('should handle complex state changes', () => {
            const music = new Music(validMusicData);

            const updated = music
                .setRating(5)
                .addTag('favorite')
                .addToPlaylist('top_tracks')
                .markAsPlayed()
                .setNotes('Updated after multiple listens');

            expect(updated.getRating()).toBe(5);
            expect(updated.getTags()).toContain('favorite');
            expect(updated.getPlaylists()).toContain('top_tracks');
            expect(updated.getPlayCount()).toBe(1);
            expect(updated.getNotes()).toBe('Updated after multiple listens');

            // Original remains unchanged
            expect(music.getRating()).toBe(4);
            expect(music.getPlayCount()).toBe(0);
        });
    });
});