/**
 * Dependency Injection Container
 * Implements the Inversion of Control pattern to manage service dependencies
 */
export class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.resolutionStack = new Set();
    }

    /**
     * Register a service with the container
     * @param {string} name - Service identifier
     * @param {function} factory - Factory function that creates the service
     * @param {object} options - Configuration options (singleton, tags, etc.)
     */
    register(name, factory, options = {}) {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Service name must be a non-empty string');
        }

        if (typeof factory !== 'function') {
            throw new Error('Service factory must be a function');
        }

        this.services.set(name, {
            factory,
            options: {
                singleton: false,
                tags: [],
                ...options
            }
        });

        return this;
    }

    /**
     * Register a singleton service (shorthand method)
     * @param {string} name - Service identifier
     * @param {function} factory - Factory function that creates the service
     */
    singleton(name, factory) {
        return this.register(name, factory, { singleton: true });
    }

    /**
     * Resolve a service from the container
     * @param {string} name - Service identifier
     * @returns {*} The resolved service instance
     */
    get(name) {
        if (this.resolutionStack.has(name)) {
            const cycle = Array.from(this.resolutionStack).join(' -> ') + ' -> ' + name;
            throw new Error(`Circular dependency detected: ${cycle}`);
        }

        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
        }

        if (service.options.singleton) {
            if (!this.singletons.has(name)) {
                this.resolutionStack.add(name);
                try {
                    const instance = service.factory(this);
                    this.singletons.set(name, instance);
                } finally {
                    this.resolutionStack.delete(name);
                }
            }
            return this.singletons.get(name);
        }

        this.resolutionStack.add(name);
        try {
            return service.factory(this);
        } finally {
            this.resolutionStack.delete(name);
        }
    }

    /**
     * Check if a service is registered
     * @param {string} name - Service identifier
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Get all services with a specific tag
     * @param {string} tag - Tag to filter by
     * @returns {Array} Array of service instances
     */
    getTagged(tag) {
        const taggedServices = [];
        for (const [name, service] of this.services) {
            if (service.options.tags && service.options.tags.includes(tag)) {
                taggedServices.push(this.get(name));
            }
        }
        return taggedServices;
    }

    /**
     * Clear all services and singletons
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.resolutionStack.clear();
    }

    /**
     * Get diagnostic information about registered services
     * @returns {object} Diagnostic information
     */
    getDiagnostics() {
        const services = Array.from(this.services.keys());
        const singletons = Array.from(this.singletons.keys());
        const resolutionStack = Array.from(this.resolutionStack);

        return {
            registeredServices: services,
            activeSingletons: singletons,
            currentResolutionStack: resolutionStack,
            serviceCount: services.length,
            singletonCount: singletons.length
        };
    }
}

// Create and export a default container instance
export const container = new Container();