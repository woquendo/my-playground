/**
 * Event Bus System
 * Implements publish-subscribe pattern for decoupled communication
 */
export class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Set();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} callback - Event handler
     * @returns {function} Unsubscribe function
     */
    subscribe(event, callback) {
        if (typeof event !== 'string' || !event.trim()) {
            throw new Error('Event name must be a non-empty string');
        }

        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        this.events.get(event).push(callback);

        // Return unsubscribe function
        return () => this.unsubscribe(event, callback);
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first emission)
     * @param {string} event - Event name
     * @param {function} callback - Event handler
     * @returns {function} Unsubscribe function
     */
    once(event, callback) {
        const wrappedCallback = (...args) => {
            this.unsubscribe(event, wrappedCallback);
            callback(...args);
        };

        this.onceEvents.add(wrappedCallback);
        return this.subscribe(event, wrappedCallback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function} callback - Event handler to remove
     */
    unsubscribe(event, callback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);

                // Clean up empty event arrays
                if (callbacks.length === 0) {
                    this.events.delete(event);
                }
            }
        }

        this.onceEvents.delete(callback);
    }

    /**
     * Emit an event asynchronously
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @returns {Promise} Promise that resolves when all handlers complete
     */
    async emit(event, data) {
        const callbacks = this.events.get(event);
        if (!callbacks || callbacks.length === 0) {
            return;
        }

        const promises = callbacks.map(callback => {
            try {
                const result = callback(data);
                return Promise.resolve(result);
            } catch (error) {
                return Promise.reject(error);
            }
        });

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error(`Error in event handler for '${event}':`, error);
            throw error;
        }
    }

    /**
     * Emit an event synchronously
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emitSync(event, data) {
        const callbacks = this.events.get(event);
        if (!callbacks || callbacks.length === 0) {
            return;
        }

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for '${event}':`, error);
                throw error;
            }
        });
    }

    /**
     * Remove all event listeners
     */
    clear() {
        this.events.clear();
        this.onceEvents.clear();
    }

    /**
     * Get diagnostic information about registered events
     * @returns {object} Diagnostic information
     */
    getDiagnostics() {
        const eventStats = {};
        for (const [event, callbacks] of this.events) {
            eventStats[event] = callbacks.length;
        }

        return {
            events: Object.keys(eventStats),
            eventStats,
            totalEvents: this.events.size,
            totalCallbacks: Array.from(this.events.values()).reduce((sum, callbacks) => sum + callbacks.length, 0),
            onceCallbacks: this.onceEvents.size
        };
    }
}

// Create and export a default event bus instance
export const eventBus = new EventBus();