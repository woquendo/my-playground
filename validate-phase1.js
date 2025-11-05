/**
 * Manual Test Validation
 * Simple validation script to test our core infrastructure
 */

// Import our core modules
import { Container } from '../src/Core/Container.js';
import { EventBus } from '../src/Core/EventBus.js';
import { ApplicationError, ValidationError } from '../src/Core/Errors/ApplicationErrors.js';
import { ErrorHandler } from '../src/Core/Errors/ErrorHandler.js';

// Test Results
const results = [];

function test(name, testFn) {
    try {
        testFn();
        results.push({ name, status: 'PASS' });
        console.log(`✅ ${name}`);
    } catch (error) {
        results.push({ name, status: 'FAIL', error: error.message });
        console.log(`❌ ${name}: ${error.message}`);
    }
}

// Run tests
console.log('🧪 Running Phase 1 Infrastructure Tests...\n');

// Container Tests
test('Container: Should register and resolve services', () => {
    const container = new Container();
    container.register('test', () => 'test-service');

    const service = container.get('test');
    if (service !== 'test-service') {
        throw new Error('Service not resolved correctly');
    }
});

test('Container: Should handle singletons', () => {
    const container = new Container();
    let counter = 0;
    container.singleton('counter', () => ++counter);

    const first = container.get('counter');
    const second = container.get('counter');

    if (first !== second || first !== 1) {
        throw new Error('Singleton not working correctly');
    }
});

test('Container: Should detect circular dependencies', () => {
    const container = new Container();
    container.register('a', (c) => c.get('b'));
    container.register('b', (c) => c.get('a'));

    try {
        container.get('a');
        throw new Error('Should have thrown circular dependency error');
    } catch (error) {
        if (!error.message.includes('Circular dependency')) {
            throw error;
        }
    }
});

// EventBus Tests
test('EventBus: Should subscribe and emit events', () => {
    const eventBus = new EventBus();
    let eventReceived = false;

    eventBus.subscribe('test', () => {
        eventReceived = true;
    });

    eventBus.emitSync('test');

    if (!eventReceived) {
        throw new Error('Event not received');
    }
});

test('EventBus: Should handle once subscriptions', () => {
    const eventBus = new EventBus();
    let callCount = 0;

    eventBus.once('test', () => {
        callCount++;
    });

    eventBus.emitSync('test');
    eventBus.emitSync('test');

    if (callCount !== 1) {
        throw new Error('Once subscription called multiple times');
    }
});

test('EventBus: Should unsubscribe correctly', () => {
    const eventBus = new EventBus();
    let eventReceived = false;

    const unsubscribe = eventBus.subscribe('test', () => {
        eventReceived = true;
    });

    unsubscribe();
    eventBus.emitSync('test');

    if (eventReceived) {
        throw new Error('Event received after unsubscribe');
    }
});

// Error Handling Tests
test('ApplicationError: Should create custom errors', () => {
    const error = new ApplicationError('Test error', {
        code: 'TEST_ERROR',
        context: { test: true }
    });

    if (error.message !== 'Test error' || error.code !== 'TEST_ERROR') {
        throw new Error('ApplicationError not created correctly');
    }
});

test('ValidationError: Should extend ApplicationError', () => {
    const error = new ValidationError('Validation failed');

    if (!(error instanceof ApplicationError) || error.code !== 'VALIDATION_ERROR') {
        throw new Error('ValidationError not extending correctly');
    }
});

test('ErrorHandler: Should handle errors gracefully', () => {
    // Create a mock logger to avoid console output during tests
    const mockLogger = {
        warn: () => { }, // Silent mock
        error: () => { } // Silent mock
    };
    const errorHandler = new ErrorHandler(mockLogger);
    const testError = new Error('Test error');

    // Should not throw
    errorHandler.handle(testError);
});

// Integration Tests
test('Integration: Container and EventBus work together', () => {
    const container = new Container();
    const eventBus = new EventBus();

    container.singleton('eventBus', () => eventBus);

    const retrievedEventBus = container.get('eventBus');

    if (retrievedEventBus !== eventBus) {
        throw new Error('Container and EventBus integration failed');
    }
});

test('Integration: Error handling with dependency injection', () => {
    const container = new Container();
    const errorHandler = new ErrorHandler();

    container.singleton('errorHandler', () => errorHandler);

    const service = container.get('errorHandler');

    if (service !== errorHandler) {
        throw new Error('Error handler dependency injection failed');
    }
});

// Summary
console.log('\n📊 Test Results Summary:');
console.log('=======================');

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

console.log(`Total: ${results.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
    });
} else {
    console.log('\n🎉 All tests passed! Phase 1 infrastructure is working correctly.');
}

console.log('\n✨ Phase 1 Implementation Complete!');
console.log('Next: Begin Phase 2 - Domain Models & Value Objects');

export { results };