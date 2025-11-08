/**
 * Resource Monitor
 * Tracks and reports application resource usage
 */

export class ResourceMonitor {
    constructor(logger) {
        this.logger = logger;
        this.metrics = {
            eventListeners: 0,
            intervals: 0,
            timeouts: 0,
            components: 0
        };
    }

    /**
     * Get current memory usage (if available)
     * @returns {object|null} Memory info or null if not supported
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    /**
     * Track resource metrics
     * @param {string} type - Resource type
     * @param {number} delta - Change in count (+1 or -1)
     */
    track(type, delta = 1) {
        if (this.metrics.hasOwnProperty(type)) {
            this.metrics[type] += delta;
        }
    }

    /**
     * Get current metrics
     * @returns {object} Current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Log current resource usage
     */
    logResourceUsage() {
        const memory = this.getMemoryUsage();

        this.logger.info('Resource Usage Report', {
            memory: memory ? `${memory.usedJSHeapSize} MB / ${memory.totalJSHeapSize} MB` : 'Not available',
            metrics: this.metrics
        });

        // Warn if metrics seem high
        if (this.metrics.eventListeners > 1000) {
            this.logger.warn('High event listener count detected:', this.metrics.eventListeners);
        }

        if (this.metrics.intervals > 10) {
            this.logger.warn('High interval count detected:', this.metrics.intervals);
        }
    }

    /**
     * Check for potential memory leaks
     * @returns {Array<string>} Array of warnings
     */
    checkForLeaks() {
        const warnings = [];

        if (this.metrics.eventListeners > 500) {
            warnings.push(`High event listener count: ${this.metrics.eventListeners}`);
        }

        if (this.metrics.intervals > 5) {
            warnings.push(`Active intervals: ${this.metrics.intervals} (check for cleanup)`);
        }

        if (this.metrics.components > 100) {
            warnings.push(`High component count: ${this.metrics.components} (check lifecycle)`);
        }

        const memory = this.getMemoryUsage();
        if (memory && memory.usedJSHeapSize > 100) {
            warnings.push(`High memory usage: ${memory.usedJSHeapSize} MB`);
        }

        return warnings;
    }

    /**
     * Reset all metrics
     */
    reset() {
        Object.keys(this.metrics).forEach(key => {
            this.metrics[key] = 0;
        });
    }
}

// Global instance (optional)
let globalMonitor = null;

/**
 * Get or create global resource monitor
 * @param {Logger} logger - Logger instance
 * @returns {ResourceMonitor} Global monitor instance
 */
export function getResourceMonitor(logger) {
    if (!globalMonitor) {
        globalMonitor = new ResourceMonitor(logger);
    }
    return globalMonitor;
}
