/**
 * Application State Manager
 * Centralized state management with persistence, mutations, and subscriptions.
 * Similar to Vuex/Redux pattern for predictable state changes.
 */

import { EventBus } from '../../Core/EventBus.js';
import { Logger } from '../../Core/Logger.js';
import { StorageService } from '../../Infrastructure/Storage/StorageService.js';

export class ApplicationState {
    /**
     * Create application state manager
     * @param {object} options - Configuration options
     * @param {EventBus} options.eventBus - Event bus instance
     * @param {Logger} options.logger - Logger instance
     * @param {StorageService} options.storage - Storage service for persistence
     * @param {object} options.initialState - Initial state
     * @param {boolean} options.persist - Enable persistence (default: true)
     */
    constructor(options = {}) {
        this._eventBus = options.eventBus || new EventBus();
        this._logger = options.logger || new Logger({ prefix: 'AppState' });
        this._storage = options.storage || new StorageService({ namespace: 'app-state' });
        this._persist = options.persist !== false;

        // State management
        this._state = options.initialState || this._getDefaultState();
        this._mutations = new Map();
        this._actions = new Map();
        this._getters = new Map();
        this._subscribers = new Map();
        this._history = [];
        this._historyIndex = -1;
        this._maxHistory = 50;

        // Load persisted state
        if (this._persist) {
            this._loadPersistedState();
        }

        this._logger.info('Application state initialized');
    }

    /**
     * Get default state structure
     * @returns {object} Default state
     * @private
     */
    _getDefaultState() {
        return {
            user: {
                preferences: {
                    theme: 'light',
                    defaultView: 'schedule',
                    autoPlay: false
                }
            },
            ui: {
                sidebarOpen: true,
                activeView: 'schedule',
                modalOpen: false,
                modalContent: null
            },
            cache: {
                lastSync: null,
                offlineMode: false
            }
        };
    }

    /**
     * Get state value by path
     * @param {string} path - Dot-separated path (e.g., 'user.preferences.theme')
     * @returns {*} State value
     */
    get(path) {
        // Check getters first
        if (this._getters.has(path)) {
            const getterFn = this._getters.get(path);
            return getterFn(this._state);
        }

        // Navigate state path
        return this._getNestedValue(this._state, path);
    }

    /**
     * Commit a mutation to change state
     * @param {string} mutation - Mutation name
     * @param {*} payload - Mutation payload
     */
    commit(mutation, payload) {
        if (!this._mutations.has(mutation)) {
            this._logger.error(`Unknown mutation: ${mutation}`);
            throw new Error(`Mutation ${mutation} not registered`);
        }

        this._logger.debug(`Committing mutation: ${mutation}`, payload);

        // Save current state to history
        this._saveToHistory();

        // Execute mutation
        const mutationFn = this._mutations.get(mutation);
        mutationFn(this._state, payload);

        // Emit change event
        this._emitChange(mutation, payload);

        // Notify subscribers
        this._notifySubscribers(mutation, payload);

        // Persist state
        if (this._persist) {
            this._persistState();
        }
    }

    /**
     * Dispatch an action
     * @param {string} action - Action name
     * @param {*} payload - Action payload
     * @returns {Promise<*>} Action result
     */
    async dispatch(action, payload) {
        if (!this._actions.has(action)) {
            this._logger.error(`Unknown action: ${action}`);
            throw new Error(`Action ${action} not registered`);
        }

        this._logger.debug(`Dispatching action: ${action}`, payload);

        const actionFn = this._actions.get(action);

        const context = {
            state: this._state,
            commit: this.commit.bind(this),
            dispatch: this.dispatch.bind(this),
            getters: this._createGettersProxy()
        };

        try {
            const result = await actionFn(context, payload);
            return result;
        } catch (error) {
            this._logger.error(`Error in action ${action}:`, error);
            throw error;
        }
    }

    /**
     * Register a mutation
     * @param {string} name - Mutation name
     * @param {function} mutationFn - Mutation function (state, payload) => void
     */
    registerMutation(name, mutationFn) {
        if (this._mutations.has(name)) {
            this._logger.warn(`Overwriting mutation: ${name}`);
        }

        this._mutations.set(name, mutationFn);
        this._logger.debug(`Mutation registered: ${name}`);
    }

    /**
     * Register multiple mutations
     * @param {object} mutations - Mutations object { name: fn }
     */
    registerMutations(mutations) {
        Object.entries(mutations).forEach(([name, fn]) => {
            this.registerMutation(name, fn);
        });
    }

    /**
     * Register an action
     * @param {string} name - Action name
     * @param {function} actionFn - Action function (context, payload) => Promise
     */
    registerAction(name, actionFn) {
        if (this._actions.has(name)) {
            this._logger.warn(`Overwriting action: ${name}`);
        }

        this._actions.set(name, actionFn);
        this._logger.debug(`Action registered: ${name}`);
    }

    /**
     * Register multiple actions
     * @param {object} actions - Actions object { name: fn }
     */
    registerActions(actions) {
        Object.entries(actions).forEach(([name, fn]) => {
            this.registerAction(name, fn);
        });
    }

    /**
     * Register a getter
     * @param {string} name - Getter name
     * @param {function} getterFn - Getter function (state) => value
     */
    registerGetter(name, getterFn) {
        if (this._getters.has(name)) {
            this._logger.warn(`Overwriting getter: ${name}`);
        }

        this._getters.set(name, getterFn);
        this._logger.debug(`Getter registered: ${name}`);
    }

    /**
     * Register multiple getters
     * @param {object} getters - Getters object { name: fn }
     */
    registerGetters(getters) {
        Object.entries(getters).forEach(([name, fn]) => {
            this.registerGetter(name, fn);
        });
    }

    /**
     * Subscribe to state changes
     * @param {function} callback - Callback function (mutation, payload) => void
     * @returns {function} Unsubscribe function
     */
    subscribe(callback) {
        const id = Date.now() + Math.random();
        this._subscribers.set(id, callback);

        return () => {
            this._subscribers.delete(id);
        };
    }

    /**
     * Subscribe to specific mutation
     * @param {string} mutation - Mutation name
     * @param {function} callback - Callback function (payload) => void
     * @returns {function} Unsubscribe function
     */
    subscribeTo(mutation, callback) {
        return this.subscribe((mutationName, payload) => {
            if (mutationName === mutation) {
                callback(payload);
            }
        });
    }

    /**
     * Get entire state
     * @returns {object} State object (readonly)
     */
    getState() {
        return JSON.parse(JSON.stringify(this._state));
    }

    /**
     * Replace entire state
     * @param {object} newState - New state object
     */
    replaceState(newState) {
        this._saveToHistory();
        this._state = newState;
        this._emitChange('state:replaced', newState);

        if (this._persist) {
            this._persistState();
        }
    }

    /**
     * Reset state to default
     */
    reset() {
        this.replaceState(this._getDefaultState());
        this._history = [];
        this._historyIndex = -1;
        this._logger.info('State reset to default');
    }

    /**
     * Undo last mutation
     * @returns {boolean} True if undo was successful
     */
    undo() {
        if (this._historyIndex <= 0) {
            this._logger.warn('Cannot undo: at beginning of history');
            return false;
        }

        this._historyIndex--;
        this._state = JSON.parse(JSON.stringify(this._history[this._historyIndex]));
        this._emitChange('state:undo');

        if (this._persist) {
            this._persistState();
        }

        this._logger.debug('State undo successful');
        return true;
    }

    /**
     * Redo last undone mutation
     * @returns {boolean} True if redo was successful
     */
    redo() {
        if (this._historyIndex >= this._history.length - 1) {
            this._logger.warn('Cannot redo: at end of history');
            return false;
        }

        this._historyIndex++;
        this._state = JSON.parse(JSON.stringify(this._history[this._historyIndex]));
        this._emitChange('state:redo');

        if (this._persist) {
            this._persistState();
        }

        this._logger.debug('State redo successful');
        return true;
    }

    /**
     * Check if undo is available
     * @returns {boolean} True if can undo
     */
    canUndo() {
        return this._historyIndex > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean} True if can redo
     */
    canRedo() {
        return this._historyIndex < this._history.length - 1;
    }

    /**
     * Get nested value from object by path
     * @param {object} obj - Object to navigate
     * @param {string} path - Dot-separated path
     * @returns {*} Value at path
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current?.[key];
        }, obj);
    }

    /**
     * Save current state to history
     * @private
     */
    _saveToHistory() {
        // Remove any states after current index (for redo)
        this._history = this._history.slice(0, this._historyIndex + 1);

        // Add current state to history
        this._history.push(JSON.parse(JSON.stringify(this._state)));
        this._historyIndex++;

        // Limit history size
        if (this._history.length > this._maxHistory) {
            this._history.shift();
            this._historyIndex--;
        }
    }

    /**
     * Emit change event
     * @param {string} mutation - Mutation name
     * @param {*} payload - Payload
     * @private
     */
    _emitChange(mutation, payload) {
        this._eventBus.emit('state:change', { mutation, payload, state: this._state });
    }

    /**
     * Notify subscribers
     * @param {string} mutation - Mutation name
     * @param {*} payload - Payload
     * @private
     */
    _notifySubscribers(mutation, payload) {
        this._subscribers.forEach(callback => {
            try {
                callback(mutation, payload);
            } catch (error) {
                this._logger.error('Error in subscriber:', error);
            }
        });
    }

    /**
     * Create getters proxy
     * @returns {Proxy} Getters proxy
     * @private
     */
    _createGettersProxy() {
        const getters = {};
        this._getters.forEach((fn, name) => {
            getters[name] = fn(this._state);
        });
        return getters;
    }

    /**
     * Persist state to storage
     * @private
     */
    _persistState() {
        try {
            this._storage.set('app-state', this._state);
            this._logger.debug('State persisted');
        } catch (error) {
            this._logger.error('Error persisting state:', error);
        }
    }

    /**
     * Load persisted state from storage
     * @private
     */
    _loadPersistedState() {
        try {
            const persisted = this._storage.get('app-state');
            if (persisted) {
                this._state = { ...this._state, ...persisted };
                this._logger.info('Persisted state loaded');
            }
        } catch (error) {
            this._logger.error('Error loading persisted state:', error);
        }
    }

    /**
     * Export state for debugging
     * @returns {object} State information
     */
    export() {
        return {
            state: this.getState(),
            mutations: Array.from(this._mutations.keys()),
            actions: Array.from(this._actions.keys()),
            getters: Array.from(this._getters.keys()),
            historySize: this._history.length,
            historyIndex: this._historyIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }
}
