/**
 * Test Setup
 * Configuration and utilities for Jest testing
 */

// Mock browser APIs for Node.js environment
if (typeof window === 'undefined') {
    global.window = {
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
        location: {
            href: 'http://localhost:3000'
        }
    };

    global.document = {
        addEventListener: () => { },
        removeEventListener: () => { },
        readyState: 'complete'
    };

    global.console = {
        log: () => { },
        warn: () => { },
        error: () => { },
        info: () => { },
        debug: () => { }
    };
}

// Global test utilities
global.testUtils = {
    waitFor: (condition, timeout = 1000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const check = () => {
                if (condition()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    setTimeout(check, 10);
                }
            };

            check();
        });
    }
};

// Test-specific configuration will be handled by individual test files