/**
 * Music Commands
 * Command objects for music operations following the Command pattern.
 */

/**
 * Create Track Command
 * Command to create a new music track
 */
export class CreateTrackCommand {
    constructor(data) {
        this.data = data;
    }
}

/**
 * Update Track Command
 * Command to update an existing track
 */
export class UpdateTrackCommand {
    constructor(id, updates) {
        this.id = id;
        this.updates = updates;
    }
}

/**
 * Delete Track Command
 * Command to delete a track
 */
export class DeleteTrackCommand {
    constructor(id) {
        this.id = id;
    }
}

/**
 * Increment Play Count Command
 * Command to increment a track's play count
 */
export class IncrementPlayCountCommand {
    constructor(id) {
        this.id = id;
    }
}

/**
 * Update Rating Command
 * Command to update a track's rating
 */
export class UpdateRatingCommand {
    constructor(id, rating) {
        this.id = id;
        this.rating = rating;
    }
}

/**
 * Batch Update Tracks Command
 * Command to update multiple tracks at once
 */
export class BatchUpdateTracksCommand {
    constructor(tracks) {
        this.tracks = tracks;
    }
}

/**
 * Command Handlers
 * Handlers process commands using the MusicManagementService
 */

/**
 * Create command handler factory
 * @param {MusicManagementService} musicService - Music management service
 * @returns {object} Command handlers
 */
export function createMusicCommandHandlers(musicService) {
    return {
        /**
         * Handle CreateTrackCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Music>} Created track
         */
        async 'music.create'(payload) {
            return await musicService.createTrack(payload.data);
        },

        /**
         * Handle UpdateTrackCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Music>} Updated track
         */
        async 'music.update'(payload) {
            return await musicService.updateTrack(payload.id, payload.updates);
        },

        /**
         * Handle DeleteTrackCommand
         * @param {object} payload - Command payload
         * @returns {Promise<boolean>} True if deleted
         */
        async 'music.delete'(payload) {
            return await musicService.deleteTrack(payload.id);
        },

        /**
         * Handle IncrementPlayCountCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Music>} Updated track
         */
        async 'music.play'(payload) {
            return await musicService.playTrack(payload.id);
        },

        /**
         * Handle UpdateRatingCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Music>} Updated track
         */
        async 'music.rate'(payload) {
            return await musicService.rateTrack(payload.id, payload.rating);
        },

        /**
         * Handle BatchUpdateTracksCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Music[]>} Updated tracks
         */
        async 'music.batchUpdate'(payload) {
            return await musicService.batchUpdateTracks(payload.tracks);
        }
    };
}

/**
 * Command validators
 * Validation functions for each command
 */
export const musicCommandValidators = {
    /**
     * Validate CreateTrackCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'music.create': (payload) => {
        const errors = [];

        if (!payload.data) {
            errors.push('Track data is required');
        } else {
            if (!payload.data.id) errors.push('Track ID is required');
            if (!payload.data.title) errors.push('Track title is required');
            if (!payload.data.artist) errors.push('Artist is required');
        }

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate UpdateTrackCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'music.update': (payload) => {
        const errors = [];

        if (!payload.id) errors.push('Track ID is required');
        if (!payload.updates || typeof payload.updates !== 'object') {
            errors.push('Updates object is required');
        }

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate DeleteTrackCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'music.delete': (payload) => {
        const errors = [];

        if (!payload.id) errors.push('Track ID is required');

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate IncrementPlayCountCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'music.play': (payload) => {
        const errors = [];

        if (!payload.id) errors.push('Track ID is required');

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate UpdateRatingCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'music.rate': (payload) => {
        const errors = [];

        if (!payload.id) errors.push('Track ID is required');
        if (payload.rating === undefined || payload.rating === null) {
            errors.push('Rating is required');
        } else if (typeof payload.rating !== 'number' || payload.rating < 0 || payload.rating > 5) {
            errors.push('Rating must be a number between 0 and 5');
        }

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate BatchUpdateTracksCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'music.batchUpdate': (payload) => {
        const errors = [];

        if (!payload.tracks || !Array.isArray(payload.tracks)) {
            errors.push('Tracks array is required');
        } else if (payload.tracks.length === 0) {
            errors.push('Tracks array cannot be empty');
        }

        return errors.length === 0 ? true : errors;
    }
};

/**
 * Register music commands with command bus
 * @param {CommandBus} commandBus - Command bus instance
 * @param {MusicManagementService} musicService - Music management service
 */
export function registerMusicCommands(commandBus, musicService) {
    const handlers = createMusicCommandHandlers(musicService);

    Object.entries(handlers).forEach(([commandName, handler]) => {
        commandBus.register(commandName, handler, {
            validator: musicCommandValidators[commandName]
        });
    });
}
