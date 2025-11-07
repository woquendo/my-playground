/**
 * Base View Model
 * Abstract base class for all view models providing common functionality:
 * - State management with change tracking
 * - Loading and error state handling
 * - Event emission for UI updates
 * - Validation support
 * - Computed properties
 */

import { EventBus } from '../../Core/EventBus.js';
import { Logger } from '../../Core/Logger.js';

export class BaseViewModel {
    /**
     * Create a base view model
     * @param {object} options - Configuration options
     * @param {EventBus} options.eventBus - Event bus instance
     * @param {Logger} options.logger - Logger instance
     * @param {string} options.name - View model name for logging
     */
    constructor(options = {}) {
        this._eventBus = options.eventBus || new EventBus();
        this._logger = options.logger || new Logger({ prefix: options.name || 'ViewModel' });
        this._name = options.name || 'BaseViewModel';

        // State management
        this._state = {};
        this._previousState = {};
        this._loading = false;
        this._errors = [];
        this._isDirty = false;

        // Change tracking
        this._changeListeners = new Map();
        this._computedProperties = new Map();

        // Initialization
        this._initialize();
    }

    /**
     * Initialize the view model (override in subclasses)
     * @protected
     */
    _initialize() {
        // Override in subclasses
    }

    /**
     * Get state property
     * @param {string} key - Property key
     * @returns {*} Property value
     */
    get(key) {
        // Check computed properties first
        if (this._computedProperties.has(key)) {
            const computeFn = this._computedProperties.get(key);
            return computeFn.call(this);
        }

        return this._state[key];
    }

    /**
     * Set state property
     * @param {string} key - Property key
     * @param {*} value - Property value
     * @param {boolean} silent - If true, don't emit change event
     */
    set(key, value, silent = false) {
        const oldValue = this._state[key];

        if (oldValue === value) {
            return; // No change
        }

        this._state[key] = value;
        this._isDirty = true;

        if (!silent) {
            this._notifyChange(key, value, oldValue);
            this._emit('change', { key, value, oldValue });
        }
    }

    /**
     * Set multiple properties at once
     * @param {object} updates - Key-value pairs to update
     * @param {boolean} silent - If true, don't emit change events
     */
    setMultiple(updates, silent = false) {
        const changes = [];

        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this._state[key];
            if (oldValue !== value) {
                this._state[key] = value;
                changes.push({ key, value, oldValue });
            }
        });

        if (changes.length > 0) {
            this._isDirty = true;

            if (!silent) {
                changes.forEach(change => {
                    this._notifyChange(change.key, change.value, change.oldValue);
                });
                this._emit('change:multiple', { changes });
            }
        }
    }

    /**
     * Reset state to previous snapshot
     */
    reset() {
        this._state = { ...this._previousState };
        this._isDirty = false;
        this._emit('reset');
    }

    /**
     * Save current state as snapshot
     */
    saveSnapshot() {
        this._previousState = { ...this._state };
        this._isDirty = false;
    }

    /**
     * Check if state has changed since last snapshot
     * @returns {boolean} True if state has changed
     */
    isDirty() {
        return this._isDirty;
    }

    /**
     * Get all state
     * @returns {object} State object
     */
    getState() {
        return { ...this._state };
    }

    /**
     * Replace entire state
     * @param {object} newState - New state object
     */
    setState(newState) {
        this._state = { ...newState };
        this._isDirty = true;
        this._emit('state:replaced', { state: this._state });
    }

    /**
     * Clear all state
     */
    clearState() {
        this._state = {};
        this._previousState = {};
        this._isDirty = false;
        this._emit('state:cleared');
    }

    /**
     * Watch a property for changes
     * @param {string} key - Property key to watch
     * @param {function} callback - Callback function (newValue, oldValue) => void
     * @returns {function} Unwatch function
     */
    watch(key, callback) {
        if (!this._changeListeners.has(key)) {
            this._changeListeners.set(key, []);
        }

        const listeners = this._changeListeners.get(key);
        listeners.push(callback);

        // Return unwatch function
        return () => {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }

    /**
     * Define a computed property
     * @param {string} key - Property key
     * @param {function} computeFn - Compute function that returns the value
     */
    defineComputed(key, computeFn) {
        this._computedProperties.set(key, computeFn);
    }

    /**
     * Notify listeners of property change
     * @param {string} key - Property key
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     * @private
     */
    _notifyChange(key, newValue, oldValue) {
        const listeners = this._changeListeners.get(key) || [];
        listeners.forEach(callback => {
            try {
                callback(newValue, oldValue);
            } catch (error) {
                this._logger.error(`Error in change listener for ${key}:`, error);
            }
        });
    }

    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     */
    setLoading(loading) {
        this._loading = loading;
        this._emit('loading', { loading });
    }

    /**
     * Check if view model is loading
     * @returns {boolean} Loading state
     */
    isLoading() {
        return this._loading;
    }

    /**
     * Add error
     * @param {string|Error} error - Error message or Error object
     */
    addError(error) {
        const errorMessage = error instanceof Error ? error.message : error;
        this._errors.push(errorMessage);
        this._emit('error', { error: errorMessage });
    }

    /**
     * Clear errors
     */
    clearErrors() {
        this._errors = [];
        this._emit('errors:cleared');
    }

    /**
     * Get all errors
     * @returns {string[]} Array of error messages
     */
    getErrors() {
        return [...this._errors];
    }

    /**
     * Check if view model has errors
     * @returns {boolean} True if has errors
     */
    hasErrors() {
        return this._errors.length > 0;
    }

    /**
     * Validate view model state (override in subclasses)
     * @returns {boolean} True if valid
     */
    validate() {
        return true;
    }

    /**
     * Emit event
     * @param {string} eventName - Event name
     * @param {*} data - Event data
     * @private
     */
    _emit(eventName, data = {}) {
        const fullEventName = `viewmodel:${this._name}:${eventName}`;
        this._eventBus.emit(fullEventName, data);
        this._logger.debug(`Event emitted: ${fullEventName}`, data);
    }

    /**
     * Subscribe to view model events
     * @param {string} eventName - Event name (without prefix)
     * @param {function} callback - Event callback
     * @returns {function} Unsubscribe function
     */
    on(eventName, callback) {
        const fullEventName = `viewmodel:${this._name}:${eventName}`;
        return this._eventBus.subscribe(fullEventName, callback);
    }

    /**
     * Execute async operation with loading and error handling
     * @param {function} operation - Async operation to execute
     * @returns {Promise<*>} Operation result
     */
    async executeAsync(operation) {
        this.setLoading(true);
        this.clearErrors();

        try {
            const result = await operation();
            return result;
        } catch (error) {
            this._logger.error(`Error in ${this._name}:`, error);
            this.addError(error);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Dispose the view model and cleanup resources
     */
    dispose() {
        this._changeListeners.clear();
        this._computedProperties.clear();
        this.clearState();
        this.clearErrors();
        this._emit('disposed');
        this._logger.info(`${this._name} disposed`);
    }

    /**
     * Get view model name
     * @returns {string} View model name
     */
    getName() {
        return this._name;
    }

    /**
     * Export view model state for persistence
     * @returns {object} Serializable state
     */
    export() {
        return {
            name: this._name,
            state: this.getState(),
            isDirty: this.isDirty(),
            hasErrors: this.hasErrors(),
            errors: this.getErrors()
        };
    }

    /**
     * Import view model state from persistence
     * @param {object} data - Exported state
     */
    import(data) {
        if (data.state) {
            this.setState(data.state);
        }
        if (data.isDirty !== undefined) {
            this._isDirty = data.isDirty;
        }
        if (data.errors && Array.isArray(data.errors)) {
            this._errors = [...data.errors];
        }
        this._emit('imported', { data });
    }
}
