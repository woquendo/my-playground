/**
 * Base Component
 * Abstract base class for all UI components providing:
 * - Lifecycle management (mount, unmount, update)
 * - Event handling
 * - Template rendering
 * - State binding
 */

import { EventBus } from '../../Core/EventBus.js';
import { Logger } from '../../Core/Logger.js';

export class BaseComponent {
    /**
     * Create a base component
     * @param {object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {EventBus} options.eventBus - Event bus instance
     * @param {Logger} options.logger - Logger instance
     * @param {string} options.name - Component name
     * @param {object} options.props - Component properties
     */
    constructor(options = {}) {
        this._container = options.container;
        this._eventBus = options.eventBus || new EventBus();
        this._logger = options.logger || new Logger({ prefix: options.name || 'Component' });
        this._name = options.name || 'BaseComponent';
        this._props = options.props || {};

        // Component state
        this._element = null;
        this._mounted = false;
        this._eventListeners = [];
        this._childComponents = [];

        this._logger.debug(`${this._name} created`);
    }

    /**
     * Get component template (override in subclasses)
     * @returns {string} HTML template
     * @protected
     */
    _template() {
        return '<div class="component"></div>';
    }

    /**
     * Initialize component after mount (override in subclasses)
     * @protected
     */
    _initialize() {
        // Override in subclasses
    }

    /**
     * Mount component to DOM
     */
    mount() {
        if (this._mounted) {
            this._logger.warn(`${this._name} already mounted`);
            return;
        }

        if (!this._container) {
            throw new Error('Container element is required');
        }

        // Render template
        const template = this._template();
        this._container.innerHTML = template;
        this._element = this._container.firstElementChild;

        // Initialize component
        this._initialize();

        this._mounted = true;
        this._emit('mounted');
        this._logger.debug(`${this._name} mounted`);
    }

    /**
     * Unmount component from DOM
     */
    unmount() {
        if (!this._mounted) {
            return;
        }

        // Cleanup event listeners
        this._eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this._eventListeners = [];

        // Unmount child components
        this._childComponents.forEach(child => child.unmount());
        this._childComponents = [];

        // Remove from DOM
        if (this._element && this._element.parentNode) {
            this._element.parentNode.removeChild(this._element);
        }

        this._mounted = false;
        this._emit('unmounted');
        this._logger.debug(`${this._name} unmounted`);
    }

    /**
     * Update component (re-render)
     * @param {object} newProps - New properties
     */
    update(newProps = {}) {
        if (!this._mounted) {
            return;
        }

        this._props = { ...this._props, ...newProps };

        // Re-render
        this.unmount();
        this.mount();

        this._emit('updated', { props: this._props });
        this._logger.debug(`${this._name} updated`);
    }

    /**
     * Add event listener to element
     * @param {HTMLElement} element - Element to attach to
     * @param {string} event - Event name
     * @param {function} handler - Event handler
     * @protected
     */
    _addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this._eventListeners.push({ element, event, handler });
    }

    /**
     * Query element within component
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null} Found element
     * @protected
     */
    _querySelector(selector) {
        return this._element?.querySelector(selector);
    }

    /**
     * Query all elements within component
     * @param {string} selector - CSS selector
     * @returns {NodeList} Found elements
     * @protected
     */
    _querySelectorAll(selector) {
        return this._element?.querySelectorAll(selector) || [];
    }

    /**
     * Add child component
     * @param {BaseComponent} component - Child component
     * @protected
     */
    _addChild(component) {
        this._childComponents.push(component);
    }

    /**
     * Emit component event
     * @param {string} eventName - Event name
     * @param {*} data - Event data
     * @private
     */
    _emit(eventName, data = {}) {
        const fullEventName = `component:${this._name}:${eventName}`;
        this._eventBus.emit(fullEventName, data);
    }

    /**
     * Subscribe to component events
     * @param {string} eventName - Event name (without prefix)
     * @param {function} callback - Event callback
     * @returns {function} Unsubscribe function
     */
    on(eventName, callback) {
        const fullEventName = `component:${this._name}:${eventName}`;
        return this._eventBus.on(fullEventName, callback);
    }

    /**
     * Get component name
     * @returns {string} Component name
     */
    getName() {
        return this._name;
    }

    /**
     * Check if component is mounted
     * @returns {boolean} True if mounted
     */
    isMounted() {
        return this._mounted;
    }

    /**
     * Get component element
     * @returns {HTMLElement|null} Component element
     */
    getElement() {
        return this._element;
    }

    /**
     * Get component props
     * @returns {object} Component properties
     */
    getProps() {
        return { ...this._props };
    }

    /**
     * Set component prop
     * @param {string} key - Property key
     * @param {*} value - Property value
     */
    setProp(key, value) {
        this._props[key] = value;
    }
}
