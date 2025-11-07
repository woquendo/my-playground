/**
 * Strategy Pattern Implementations
 * Strategies for filtering, sorting, and selecting shows and music.
 */

/**
 * Base Filter Strategy
 * Abstract base class for filter strategies
 */
export class FilterStrategy {
    /**
     * Filter items based on strategy
     * @param {Array} items - Items to filter
     * @returns {Array} Filtered items
     */
    filter(items) {
        throw new Error('FilterStrategy.filter() must be implemented');
    }

    /**
     * Get strategy name
     * @returns {string} Strategy name
     */
    getName() {
        return this.constructor.name;
    }
}

/**
 * Airing Shows Filter Strategy
 * Filters shows that are currently airing
 */
export class AiringShowsStrategy extends FilterStrategy {
    filter(shows) {
        return shows.filter(show => {
            const status = show.getStatus();
            return status.isWatching() || status.isOnHold();
        });
    }
}

/**
 * Completed Shows Filter Strategy
 * Filters shows that are completed
 */
export class CompletedShowsStrategy extends FilterStrategy {
    filter(shows) {
        return shows.filter(show => show.getStatus().isCompleted());
    }
}

/**
 * Dropped Shows Filter Strategy
 * Filters shows that are dropped
 */
export class DroppedShowsStrategy extends FilterStrategy {
    filter(shows) {
        return shows.filter(show => show.getStatus().isDropped());
    }
}

/**
 * Behind Schedule Filter Strategy
 * Filters shows where current episode is behind latest episode
 */
export class BehindScheduleStrategy extends FilterStrategy {
    filter(shows) {
        return shows.filter(show => {
            const current = show.getCurrentEpisode();
            const latest = show.getLatestEpisode();
            return current < latest;
        });
    }
}

/**
 * Rating Filter Strategy
 * Filters tracks by minimum rating
 */
export class RatingFilterStrategy extends FilterStrategy {
    constructor(minRating) {
        super();
        this.minRating = minRating;
    }

    filter(tracks) {
        return tracks.filter(track => {
            const rating = track.getRating();
            return rating !== null && rating >= this.minRating;
        });
    }
}

/**
 * Artist Filter Strategy
 * Filters tracks by artist
 */
export class ArtistFilterStrategy extends FilterStrategy {
    constructor(artist) {
        super();
        this.artist = artist.toLowerCase();
    }

    filter(tracks) {
        return tracks.filter(track =>
            track.getArtist().toLowerCase().includes(this.artist)
        );
    }
}

/**
 * Base Sort Strategy
 * Abstract base class for sort strategies
 */
export class SortStrategy {
    /**
     * Sort items based on strategy
     * @param {Array} items - Items to sort
     * @returns {Array} Sorted items
     */
    sort(items) {
        throw new Error('SortStrategy.sort() must be implemented');
    }

    /**
     * Get strategy name
     * @returns {string} Strategy name
     */
    getName() {
        return this.constructor.name;
    }
}

/**
 * Title Sort Strategy
 * Sorts items alphabetically by title
 */
export class TitleSortStrategy extends SortStrategy {
    constructor(ascending = true) {
        super();
        this.ascending = ascending;
    }

    sort(items) {
        const sorted = [...items].sort((a, b) => {
            const titleA = a.getTitle().toLowerCase();
            const titleB = b.getTitle().toLowerCase();
            return titleA.localeCompare(titleB);
        });

        return this.ascending ? sorted : sorted.reverse();
    }
}

/**
 * Rating Sort Strategy
 * Sorts tracks by rating
 */
export class RatingSortStrategy extends SortStrategy {
    constructor(ascending = false) {
        super();
        this.ascending = ascending;
    }

    sort(tracks) {
        const sorted = [...tracks].sort((a, b) => {
            const ratingA = a.getRating() || 0;
            const ratingB = b.getRating() || 0;
            return ratingA - ratingB;
        });

        return this.ascending ? sorted : sorted.reverse();
    }
}

/**
 * Play Count Sort Strategy
 * Sorts tracks by play count
 */
export class PlayCountSortStrategy extends SortStrategy {
    constructor(ascending = false) {
        super();
        this.ascending = ascending;
    }

    sort(tracks) {
        const sorted = [...tracks].sort((a, b) => {
            const countA = a.getPlayCount() || 0;
            const countB = b.getPlayCount() || 0;
            return countA - countB;
        });

        return this.ascending ? sorted : sorted.reverse();
    }
}

/**
 * Last Played Sort Strategy
 * Sorts tracks by last played date
 */
export class LastPlayedSortStrategy extends SortStrategy {
    constructor(ascending = false) {
        super();
        this.ascending = ascending;
    }

    sort(tracks) {
        const sorted = [...tracks].sort((a, b) => {
            const dateA = a.getLastPlayed() || new Date(0);
            const dateB = b.getLastPlayed() || new Date(0);
            return dateA.getTime() - dateB.getTime();
        });

        return this.ascending ? sorted : sorted.reverse();
    }
}

/**
 * Air Day Sort Strategy
 * Sorts shows by air day of week
 */
export class AirDaySortStrategy extends SortStrategy {
    constructor(ascending = true) {
        super();
        this.ascending = ascending;
        this.dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    }

    sort(shows) {
        const sorted = [...shows].sort((a, b) => {
            const dayA = this.dayOrder.indexOf(a.getAirDay());
            const dayB = this.dayOrder.indexOf(b.getAirDay());
            return dayA - dayB;
        });

        return this.ascending ? sorted : sorted.reverse();
    }
}

/**
 * Strategy Context
 * Context for applying filter and sort strategies
 */
export class StrategyContext {
    constructor() {
        this.filterStrategies = [];
        this.sortStrategy = null;
    }

    /**
     * Add a filter strategy
     * @param {FilterStrategy} strategy - Filter strategy to add
     * @returns {StrategyContext} This context for chaining
     */
    addFilter(strategy) {
        if (!(strategy instanceof FilterStrategy)) {
            throw new Error('Strategy must be an instance of FilterStrategy');
        }
        this.filterStrategies.push(strategy);
        return this;
    }

    /**
     * Set sort strategy
     * @param {SortStrategy} strategy - Sort strategy to use
     * @returns {StrategyContext} This context for chaining
     */
    setSort(strategy) {
        if (!(strategy instanceof SortStrategy)) {
            throw new Error('Strategy must be an instance of SortStrategy');
        }
        this.sortStrategy = strategy;
        return this;
    }

    /**
     * Clear all strategies
     * @returns {StrategyContext} This context for chaining
     */
    clear() {
        this.filterStrategies = [];
        this.sortStrategy = null;
        return this;
    }

    /**
     * Apply all strategies to items
     * @param {Array} items - Items to process
     * @returns {Array} Processed items
     */
    apply(items) {
        let result = [...items];

        // Apply all filters
        for (const filter of this.filterStrategies) {
            result = filter.filter(result);
        }

        // Apply sort if set
        if (this.sortStrategy) {
            result = this.sortStrategy.sort(result);
        }

        return result;
    }

    /**
     * Get applied strategy names
     * @returns {object} Strategy names
     */
    getAppliedStrategies() {
        return {
            filters: this.filterStrategies.map(s => s.getName()),
            sort: this.sortStrategy ? this.sortStrategy.getName() : null
        };
    }
}

/**
 * Strategy Factory
 * Factory for creating commonly used strategy combinations
 */
export class StrategyFactory {
    /**
     * Create context for currently airing shows
     * @returns {StrategyContext} Configured context
     */
    static createAiringShowsContext() {
        return new StrategyContext()
            .addFilter(new AiringShowsStrategy())
            .setSort(new AirDaySortStrategy());
    }

    /**
     * Create context for shows behind schedule
     * @returns {StrategyContext} Configured context
     */
    static createBehindScheduleContext() {
        return new StrategyContext()
            .addFilter(new AiringShowsStrategy())
            .addFilter(new BehindScheduleStrategy())
            .setSort(new TitleSortStrategy());
    }

    /**
     * Create context for completed shows
     * @returns {StrategyContext} Configured context
     */
    static createCompletedShowsContext() {
        return new StrategyContext()
            .addFilter(new CompletedShowsStrategy())
            .setSort(new TitleSortStrategy());
    }

    /**
     * Create context for top rated tracks
     * @param {number} minRating - Minimum rating (default: 4)
     * @returns {StrategyContext} Configured context
     */
    static createTopRatedTracksContext(minRating = 4) {
        return new StrategyContext()
            .addFilter(new RatingFilterStrategy(minRating))
            .setSort(new RatingSortStrategy(false));
    }

    /**
     * Create context for tracks by artist
     * @param {string} artist - Artist name
     * @returns {StrategyContext} Configured context
     */
    static createArtistTracksContext(artist) {
        return new StrategyContext()
            .addFilter(new ArtistFilterStrategy(artist))
            .setSort(new TitleSortStrategy());
    }

    /**
     * Create context for recently played tracks
     * @returns {StrategyContext} Configured context
     */
    static createRecentlyPlayedContext() {
        return new StrategyContext()
            .setSort(new LastPlayedSortStrategy(false));
    }

    /**
     * Create context for most played tracks
     * @returns {StrategyContext} Configured context
     */
    static createMostPlayedContext() {
        return new StrategyContext()
            .setSort(new PlayCountSortStrategy(false));
    }
}
