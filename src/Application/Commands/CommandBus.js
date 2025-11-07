/**
 * Command Bus
 * Handles command dispatching and execution following the Command pattern.
 * Supports command validation, event emission, and error handling.
 */
import { ValidationError, ApplicationError } from '../../Core/Errors/ApplicationErrors.js';

export class CommandBus {
    /**
     * Create a CommandBus
     * @param {object} options - Configuration options
     * @param {EventBus} options.eventBus - Event bus for command lifecycle events
     * @param {Logger} options.logger - Logger instance
     */
    constructor({ eventBus = null, logger = null } = {}) {
        this.handlers = new Map();
        this.middleware = [];
        this.eventBus = eventBus;
        this.logger = logger;
    }

    /**
     * Register a command handler
     * @param {string} commandName - Name of the command
     * @param {Function} handler - Handler function that executes the command
     * @param {object} options - Registration options
     * @param {Function} options.validator - Optional validation function
     * @throws {ValidationError} If commandName or handler is invalid
     */
    register(commandName, handler, options = {}) {
        if (!commandName || typeof commandName !== 'string') {
            throw new ValidationError('Command name must be a non-empty string', {
                context: { commandName }
            });
        }

        if (typeof handler !== 'function') {
            throw new ValidationError('Command handler must be a function', {
                context: { commandName, handlerType: typeof handler }
            });
        }

        if (this.handlers.has(commandName)) {
            throw new ValidationError(`Command handler already registered for: ${commandName}`, {
                context: { commandName }
            });
        }

        this.handlers.set(commandName, {
            handler,
            validator: options.validator || null
        });

        this.logger?.debug(`Registered command handler: ${commandName}`);
    }

    /**
     * Dispatch a command for execution
     * @param {string} commandName - Name of the command to execute
     * @param {object} payload - Command payload data
     * @returns {Promise<any>} Result from the command handler
     * @throws {ValidationError} If command is not registered or validation fails
     * @throws {ApplicationError} If command execution fails
     */
    async dispatch(commandName, payload = {}) {
        if (!this.handlers.has(commandName)) {
            throw new ValidationError(`No handler registered for command: ${commandName}`, {
                context: { commandName, availableCommands: Array.from(this.handlers.keys()) }
            });
        }

        const { handler, validator } = this.handlers.get(commandName);

        try {
            // Emit command start event
            this.eventBus?.emit('command:start', { commandName, payload });
            this.logger?.debug(`Executing command: ${commandName}`, payload);

            // Validate command if validator provided
            if (validator) {
                const validationResult = await validator(payload);
                if (validationResult !== true) {
                    throw new ValidationError(`Command validation failed for: ${commandName}`, {
                        context: {
                            commandName,
                            payload,
                            validationErrors: validationResult
                        }
                    });
                }
            }

            // Execute middleware chain
            let processedPayload = payload;
            for (const middlewareFn of this.middleware) {
                processedPayload = await middlewareFn(commandName, processedPayload);
            }

            // Execute command handler
            const result = await handler(processedPayload);

            // Emit command success event
            this.eventBus?.emit('command:success', { commandName, payload, result });
            this.logger?.debug(`Command executed successfully: ${commandName}`);

            return result;

        } catch (error) {
            // Emit command error event
            this.eventBus?.emit('command:error', { commandName, payload, error });
            this.logger?.error(`Command execution failed: ${commandName}`, error);

            // Wrap non-ApplicationErrors
            if (error instanceof ApplicationError) {
                throw error;
            }

            throw new ApplicationError(`Command execution failed: ${commandName}`, {
                context: { commandName, payload },
                cause: error
            });
        }
    }

    /**
     * Add middleware to the command execution pipeline
     * Middleware functions receive (commandName, payload) and must return the payload (possibly modified)
     * @param {Function} middlewareFn - Middleware function
     * @throws {ValidationError} If middleware is not a function
     */
    use(middlewareFn) {
        if (typeof middlewareFn !== 'function') {
            throw new ValidationError('Middleware must be a function', {
                context: { middlewareType: typeof middlewareFn }
            });
        }

        this.middleware.push(middlewareFn);
        this.logger?.debug('Added middleware to command bus');
    }

    /**
     * Check if a command handler is registered
     * @param {string} commandName - Name of the command
     * @returns {boolean} True if handler is registered
     */
    has(commandName) {
        return this.handlers.has(commandName);
    }

    /**
     * Unregister a command handler
     * @param {string} commandName - Name of the command to unregister
     * @returns {boolean} True if handler was unregistered
     */
    unregister(commandName) {
        const result = this.handlers.delete(commandName);
        if (result) {
            this.logger?.debug(`Unregistered command handler: ${commandName}`);
        }
        return result;
    }

    /**
     * Get list of registered command names
     * @returns {string[]} Array of command names
     */
    getRegisteredCommands() {
        return Array.from(this.handlers.keys());
    }

    /**
     * Clear all registered handlers and middleware
     */
    clear() {
        this.handlers.clear();
        this.middleware = [];
        this.logger?.debug('Cleared all command handlers and middleware');
    }
}
