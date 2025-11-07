/**
 * Show Commands
 * Command objects for show operations following the Command pattern.
 * Commands encapsulate requests as objects and are processed by handlers via CommandBus.
 */

/**
 * Create Show Command
 * Command to create a new show
 */
export class CreateShowCommand {
    constructor(data) {
        this.data = data;
    }
}

/**
 * Update Show Command
 * Command to update an existing show
 */
export class UpdateShowCommand {
    constructor(id, updates) {
        this.id = id;
        this.updates = updates;
    }
}

/**
 * Delete Show Command
 * Command to delete a show
 */
export class DeleteShowCommand {
    constructor(id) {
        this.id = id;
    }
}

/**
 * Progress Episode Command
 * Command to progress a show to the next episode
 */
export class ProgressEpisodeCommand {
    constructor(id) {
        this.id = id;
    }
}

/**
 * Update Show Status Command
 * Command to update a show's watch status
 */
export class UpdateShowStatusCommand {
    constructor(id, status) {
        this.id = id;
        this.status = status;
    }
}

/**
 * Command Handlers
 * Handlers process commands using the ShowManagementService
 */

/**
 * Create command handler factory
 * @param {ShowManagementService} showService - Show management service
 * @returns {object} Command handlers
 */
export function createShowCommandHandlers(showService) {
    return {
        /**
         * Handle CreateShowCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Show>} Created show
         */
        async 'show.create'(payload) {
            return await showService.createShow(payload.data);
        },

        /**
         * Handle UpdateShowCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Show>} Updated show
         */
        async 'show.update'(payload) {
            return await showService.updateShow(payload.id, payload.updates);
        },

        /**
         * Handle DeleteShowCommand
         * @param {object} payload - Command payload
         * @returns {Promise<boolean>} True if deleted
         */
        async 'show.delete'(payload) {
            return await showService.deleteShow(payload.id);
        },

        /**
         * Handle ProgressEpisodeCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Show>} Updated show
         */
        async 'show.progressEpisode'(payload) {
            return await showService.progressEpisode(payload.id);
        },

        /**
         * Handle UpdateShowStatusCommand
         * @param {object} payload - Command payload
         * @returns {Promise<Show>} Updated show
         */
        async 'show.updateStatus'(payload) {
            return await showService.updateStatus(payload.id, payload.status);
        }
    };
}

/**
 * Command validators
 * Validation functions for each command
 */
export const showCommandValidators = {
    /**
     * Validate CreateShowCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'show.create': (payload) => {
        const errors = [];

        if (!payload.data) {
            errors.push('Show data is required');
        } else {
            if (!payload.data.id) errors.push('Show ID is required');
            if (!payload.data.title) errors.push('Show title is required');
            if (!payload.data.status) errors.push('Show status is required');
            if (!payload.data.totalEpisodes) errors.push('Total episodes is required');
            if (!payload.data.startDate) errors.push('Start date is required');
        }

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate UpdateShowCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'show.update': (payload) => {
        const errors = [];

        if (!payload.id) errors.push('Show ID is required');
        if (!payload.updates || typeof payload.updates !== 'object') {
            errors.push('Updates object is required');
        }

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate DeleteShowCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'show.delete': (payload) => {
        const errors = [];

        if (!payload.id) errors.push('Show ID is required');

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate ProgressEpisodeCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'show.progressEpisode': (payload) => {
        const errors = [];

        if (!payload.id) errors.push('Show ID is required');

        return errors.length === 0 ? true : errors;
    },

    /**
     * Validate UpdateShowStatusCommand
     * @param {object} payload - Command payload
     * @returns {boolean|object} True if valid, error details if invalid
     */
    'show.updateStatus': (payload) => {
        const errors = [];

        if (!payload.id) errors.push('Show ID is required');
        if (!payload.status) errors.push('Status is required');

        return errors.length === 0 ? true : errors;
    }
};

/**
 * Register show commands with command bus
 * @param {CommandBus} commandBus - Command bus instance
 * @param {ShowManagementService} showService - Show management service
 */
export function registerShowCommands(commandBus, showService) {
    const handlers = createShowCommandHandlers(showService);

    Object.entries(handlers).forEach(([commandName, handler]) => {
        commandBus.register(commandName, handler, {
            validator: showCommandValidators[commandName]
        });
    });
}
