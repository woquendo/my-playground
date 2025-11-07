/**
 * Query Handlers
 * Query objects and handlers for read operations following the CQRS pattern.
 */

/**
 * Get Schedule Query
 * Query to retrieve weekly schedule
 */
export class GetScheduleQuery {
    constructor(options = {}) {
        this.weekStart = options.weekStart;
        this.statuses = options.statuses || ['watching'];
    }
}

/**
 * Get Shows By Status Query
 * Query to retrieve shows filtered by status
 */
export class GetShowsByStatusQuery {
    constructor(status) {
        this.status = status;
    }
}

/**
 * Get Music Library Query
 * Query to retrieve all music tracks
 */
export class GetMusicLibraryQuery {
    constructor(options = {}) {
        this.sortBy = options.sortBy || 'title';
        this.filterByArtist = options.filterByArtist;
        this.minRating = options.minRating;
    }
}

/**
 * Search Tracks Query
 * Query to search music tracks by title
 */
export class SearchTracksQuery {
    constructor(query) {
        this.query = query;
    }
}

/**
 * Search Shows Query
 * Query to search shows by title
 */
export class SearchShowsQuery {
    constructor(query) {
        this.query = query;
    }
}

/**
 * Get Currently Airing Query
 * Query to get currently airing shows
 */
export class GetCurrentlyAiringQuery {
    constructor() { }
}

/**
 * Get Show By ID Query
 * Query to retrieve a specific show
 */
export class GetShowByIdQuery {
    constructor(id) {
        this.id = id;
    }
}

/**
 * Get Track By ID Query
 * Query to retrieve a specific track
 */
export class GetTrackByIdQuery {
    constructor(id) {
        this.id = id;
    }
}

/**
 * Get Recently Played Query
 * Query to get recently played tracks
 */
export class GetRecentlyPlayedQuery {
    constructor(limit = 10) {
        this.limit = limit;
    }
}

/**
 * Get Top Rated Query
 * Query to get top rated tracks
 */
export class GetTopRatedQuery {
    constructor(limit = 10) {
        this.limit = limit;
    }
}

/**
 * Create query handler factory for shows
 * @param {ShowManagementService} showService - Show management service
 * @param {ScheduleService} scheduleService - Schedule service
 * @returns {object} Query handlers
 */
export function createShowQueryHandlers(showService, scheduleService) {
    return {
        /**
         * Handle GetScheduleQuery
         * @param {object} params - Query parameters
         * @returns {Promise<object>} Weekly schedule
         */
        async 'schedule.weekly'(params) {
            return await scheduleService.getWeeklySchedule({
                weekStart: params.weekStart,
                statuses: params.statuses
            });
        },

        /**
         * Handle GetShowsByStatusQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Show[]>} Shows with specified status
         */
        async 'shows.byStatus'(params) {
            return await showService.getShowsByStatus(params.status);
        },

        /**
         * Handle SearchShowsQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Show[]>} Matching shows
         */
        async 'shows.search'(params) {
            return await showService.searchShows(params.query);
        },

        /**
         * Handle GetCurrentlyAiringQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Show[]>} Currently airing shows
         */
        async 'shows.currentlyAiring'(params) {
            return await showService.getCurrentlyAiringShows();
        },

        /**
         * Handle GetShowByIdQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Show|null>} Show or null
         */
        async 'shows.byId'(params) {
            return await showService.getShowById(params.id);
        },

        /**
         * Handle get all shows
         * @param {object} params - Query parameters
         * @returns {Promise<Show[]>} All shows
         */
        async 'shows.all'(params) {
            return await showService.getAllShows();
        }
    };
}

/**
 * Create query handler factory for music
 * @param {MusicManagementService} musicService - Music management service
 * @returns {object} Query handlers
 */
export function createMusicQueryHandlers(musicService) {
    return {
        /**
         * Handle GetMusicLibraryQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Music[]>} Music library
         */
        async 'music.library'(params) {
            let tracks = await musicService.getAllTracks();

            // Apply filters
            if (params.filterByArtist) {
                tracks = await musicService.getTracksByArtist(params.filterByArtist);
            }

            if (params.minRating !== undefined) {
                tracks = await musicService.getTracksByRating(params.minRating);
            }

            // Sort
            if (params.sortBy === 'rating') {
                tracks = tracks.sort((a, b) => (b.getRating() || 0) - (a.getRating() || 0));
            } else if (params.sortBy === 'playCount') {
                tracks = tracks.sort((a, b) => (b.getPlayCount() || 0) - (a.getPlayCount() || 0));
            } else {
                // Default sort by title
                tracks = tracks.sort((a, b) => a.getTitle().localeCompare(b.getTitle()));
            }

            return tracks;
        },

        /**
         * Handle SearchTracksQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Music[]>} Matching tracks
         */
        async 'music.search'(params) {
            return await musicService.searchTracks(params.query);
        },

        /**
         * Handle GetTrackByIdQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Music|null>} Track or null
         */
        async 'music.byId'(params) {
            return await musicService.getTrackById(params.id);
        },

        /**
         * Handle GetRecentlyPlayedQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Music[]>} Recently played tracks
         */
        async 'music.recentlyPlayed'(params) {
            return await musicService.getRecentlyPlayed(params.limit);
        },

        /**
         * Handle GetTopRatedQuery
         * @param {object} params - Query parameters
         * @returns {Promise<Music[]>} Top rated tracks
         */
        async 'music.topRated'(params) {
            return await musicService.getTopRated(params.limit);
        },

        /**
         * Handle get all tracks
         * @param {object} params - Query parameters
         * @returns {Promise<Music[]>} All tracks
         */
        async 'music.all'(params) {
            return await musicService.getAllTracks();
        }
    };
}

/**
 * Register show queries with query bus
 * @param {QueryBus} queryBus - Query bus instance
 * @param {ShowManagementService} showService - Show management service
 * @param {ScheduleService} scheduleService - Schedule service
 * @param {object} options - Cache options
 */
export function registerShowQueries(queryBus, showService, scheduleService, options = {}) {
    const handlers = createShowQueryHandlers(showService, scheduleService);
    const defaultCacheTTL = options.defaultCacheTTL || 60000; // 1 minute default

    Object.entries(handlers).forEach(([queryName, handler]) => {
        const cacheTTL = options[queryName] || defaultCacheTTL;
        queryBus.register(queryName, handler, { cacheTTL });
    });
}

/**
 * Register music queries with query bus
 * @param {QueryBus} queryBus - Query bus instance
 * @param {MusicManagementService} musicService - Music management service
 * @param {object} options - Cache options
 */
export function registerMusicQueries(queryBus, musicService, options = {}) {
    const handlers = createMusicQueryHandlers(musicService);
    const defaultCacheTTL = options.defaultCacheTTL || 60000; // 1 minute default

    Object.entries(handlers).forEach(([queryName, handler]) => {
        const cacheTTL = options[queryName] || defaultCacheTTL;
        queryBus.register(queryName, handler, { cacheTTL });
    });
}
