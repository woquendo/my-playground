/**
 * Backward Compatibility Layer
 * Ensures existing functionality continues to work while new architecture is being implemented
 */
import { container } from '../Core/Container.js';
import { EventBus } from '../Core/EventBus.js';
import { Logger } from '../Core/Logger.js';
import { ApplicationError, NetworkError, ValidationError } from '../Core/Errors/ApplicationErrors.js';

/**
 * Initialize backward compatibility services
 */
function initializeBackwardCompatibility() {
    // Register core services that might be needed by legacy code
    container.register('eventBus', () => new EventBus(), { singleton: true });
    container.register('logger', () => new Logger(), { singleton: true });

    // Make services globally available for legacy code
    if (typeof window !== 'undefined') {
        window.ModernizedApp = {
            container,
            EventBus,
            Logger,
            Errors: {
                ApplicationError,
                NetworkError,
                ValidationError
            }
        };

        // Add event listener for when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('🚀 Modernized infrastructure initialized');
                console.log('📊 Container diagnostics:', container.getDiagnostics());
            });
        } else {
            console.log('🚀 Modernized infrastructure initialized');
            console.log('📊 Container diagnostics:', container.getDiagnostics());
        }
    }
}

// Initialize immediately
initializeBackwardCompatibility();

export { container };