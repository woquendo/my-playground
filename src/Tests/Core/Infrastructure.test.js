/**
 * Phase 1 Infrastructure Tests
 * Comprehensive test suite for core infrastructure components
 */
import { Container } from '../Core/Container.js';
import { EventBus } from '../Core/EventBus.js';
import { Logger } from '../Core/Logger.js';
import {
    ApplicationError,
    ValidationError,
    NetworkError,
    RepositoryError
} from '../Core/Errors/ApplicationErrors.js';
import { ErrorHandler } from '../Core/Errors/ErrorHandler.js';

describe('Phase 1 - Foundation Infrastructure', () => {
    describe('Container', () => {
        let container;

        beforeEach(() => {
            container = new Container();
        });

        test('should register and resolve services', () => {
            container.register('testService', () => ({ value: 'test' }));
            const service = container.get('testService');
            expect(service.value).toBe('test');
        });

        test('should handle singletons correctly', () => {
            container.register('singleton', () => ({ id: Math.random() }), { singleton: true });
            const instance1 = container.get('singleton');
            const instance2 = container.get('singleton');
            expect(instance1).toBe(instance2);
        });

        test('should provide singleton shorthand method', () => {
            container.singleton('single', () => ({ value: 42 }));
            const instance1 = container.get('single');
            const instance2 = container.get('single');
            expect(instance1).toBe(instance2);
            expect(instance1.value).toBe(42);
        });

        test('should detect circular dependencies', () => {
            container.register('a', (c) => ({ b: c.get('b') }));
            container.register('b', (c) => ({ a: c.get('a') }));

            expect(() => container.get('a')).toThrow('Circular dependency detected');
        });

        test('should throw error for non-existent services', () => {
            expect(() => container.get('nonexistent')).toThrow("Service 'nonexistent' not found");
        });

        test('should validate service registration parameters', () => {
            expect(() => container.register('', () => { })).toThrow('Service name must be a non-empty string');
            expect(() => container.register('test', 'not-a-function')).toThrow('Service factory must be a function');
        });

        test('should support tagged services', () => {
            container.register('service1', () => 'test1', { tags: ['tag1'] });
            container.register('service2', () => 'test2', { tags: ['tag1'] });
            container.register('service3', () => 'test3', { tags: ['tag2'] });

            const tagged = container.getTagged('tag1');
            expect(tagged).toHaveLength(2);
            expect(tagged).toContain('test1');
            expect(tagged).toContain('test2');
        });

        test('should provide diagnostic information', () => {
            container.register('service1', () => 'test');
            container.singleton('service2', () => 'test');
            container.get('service2'); // Create singleton

            const diagnostics = container.getDiagnostics();
            expect(diagnostics.registeredServices).toContain('service1');
            expect(diagnostics.registeredServices).toContain('service2');
            expect(diagnostics.activeSingletons).toContain('service2');
            expect(diagnostics.serviceCount).toBe(2);
            expect(diagnostics.singletonCount).toBe(1);
        });

        test('should clear all services and singletons', () => {
            container.register('test', () => 'value');
            container.singleton('single', () => 'value');
            container.get('single');

            container.clear();

            expect(() => container.get('test')).toThrow();
            expect(() => container.get('single')).toThrow();
            expect(container.getDiagnostics().serviceCount).toBe(0);
        });
    });

    describe('EventBus', () => {
        let eventBus;

        beforeEach(() => {
            eventBus = new EventBus();
        });

        test('should subscribe and emit events synchronously', () => {
            const handler = jest.fn();
            eventBus.subscribe('test', handler);
            eventBus.emitSync('test', { data: 'value' });

            expect(handler).toHaveBeenCalledWith({ data: 'value' });
        });

        test('should subscribe and emit events asynchronously', async () => {
            const handler = jest.fn();
            eventBus.subscribe('test', handler);
            await eventBus.emit('test', { data: 'value' });

            expect(handler).toHaveBeenCalledWith({ data: 'value' });
        });

        test('should handle multiple subscribers', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            eventBus.subscribe('test', handler1);
            eventBus.subscribe('test', handler2);
            eventBus.emitSync('test', 'data');

            expect(handler1).toHaveBeenCalledWith('data');
            expect(handler2).toHaveBeenCalledWith('data');
        });

        test('should unsubscribe correctly', () => {
            const handler = jest.fn();
            const unsubscribe = eventBus.subscribe('test', handler);

            unsubscribe();
            eventBus.emitSync('test', 'data');

            expect(handler).not.toHaveBeenCalled();
        });

        test('should handle once subscriptions', () => {
            const handler = jest.fn();
            eventBus.once('test', handler);

            eventBus.emitSync('test', 'data1');
            eventBus.emitSync('test', 'data2');

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith('data1');
        });

        test('should validate subscription parameters', () => {
            expect(() => eventBus.subscribe('', () => { })).toThrow('Event name must be a non-empty string');
            expect(() => eventBus.subscribe('test', 'not-a-function')).toThrow('Callback must be a function');
        });

        test('should handle errors in event handlers gracefully', () => {
            const errorHandler = jest.fn(() => { throw new Error('Handler error'); });
            const normalHandler = jest.fn();

            eventBus.subscribe('test', errorHandler);
            eventBus.subscribe('test', normalHandler);

            expect(() => eventBus.emitSync('test')).toThrow('Handler error');
        });

        test('should provide diagnostic information', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            eventBus.subscribe('event1', handler1);
            eventBus.subscribe('event1', handler2);
            eventBus.subscribe('event2', handler1);

            const diagnostics = eventBus.getDiagnostics();
            expect(diagnostics.events).toContain('event1');
            expect(diagnostics.events).toContain('event2');
            expect(diagnostics.eventStats.event1).toBe(2);
            expect(diagnostics.eventStats.event2).toBe(1);
            expect(diagnostics.totalEvents).toBe(2);
            expect(diagnostics.totalCallbacks).toBe(3);
        });

        test('should clear all events', () => {
            const handler = jest.fn();
            eventBus.subscribe('test', handler);

            eventBus.clear();
            eventBus.emitSync('test');

            expect(handler).not.toHaveBeenCalled();
            expect(eventBus.getDiagnostics().totalEvents).toBe(0);
        });
    });

    describe('Logger', () => {
        let logger;
        let consoleSpy;

        beforeEach(() => {
            logger = new Logger({ enableColors: false });
            consoleSpy = {
                log: jest.spyOn(console, 'log').mockImplementation(),
                warn: jest.spyOn(console, 'warn').mockImplementation(),
                error: jest.spyOn(console, 'error').mockImplementation()
            };
        });

        afterEach(() => {
            Object.values(consoleSpy).forEach(spy => spy.mockRestore());
        });

        test('should log at different levels', () => {
            logger.info('Info message');
            logger.warn('Warning message');
            logger.error('Error message');

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('[INFO ]'),
                'Additional data'
            );
            expect(consoleSpy.warn).toHaveBeenCalledWith(
                expect.stringContaining('[WARN ]')
            );
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining('[ERROR]')
            );
        });

        test('should respect log levels', () => {
            logger.setLevel('error');

            logger.debug('Debug message');
            logger.info('Info message');
            logger.warn('Warning message');
            logger.error('Error message');

            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalled();
        });

        test('should format messages with timestamp and prefix', () => {
            const customLogger = new Logger({
                prefix: 'TEST',
                enableTimestamp: true,
                enableColors: false
            });

            customLogger.info('Test message');

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringMatching(/\[INFO \] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[TEST\] Test message/)
            );
        });

        test('should validate log level', () => {
            expect(() => logger.setLevel('invalid')).toThrow('Invalid log level');

            logger.setLevel('debug');
            expect(logger.getLevel()).toBe('debug');
        });

        test('should handle additional arguments', () => {
            const data = { key: 'value' };
            logger.info('Message with data', data);

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('Message with data'),
                data
            );
        });
    });

    describe('ApplicationError', () => {
        test('should create error with message and options', () => {
            const error = new ApplicationError('Test error', {
                code: 'TEST_ERROR',
                context: { userId: 123 },
                cause: new Error('Original error')
            });

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.context.userId).toBe(123);
            expect(error.cause).toBeInstanceOf(Error);
            expect(error.timestamp).toBeDefined();
        });

        test('should generate default error code', () => {
            const error = new ValidationError('Validation failed');
            expect(error.code).toBe('VALIDATION_ERROR');
        });

        test('should convert to JSON', () => {
            const error = new NetworkError('Network failed', {
                status: 500,
                url: '/api/test'
            });

            const json = error.toJSON();
            expect(json.name).toBe('NetworkError');
            expect(json.message).toBe('Network failed');
            expect(json.code).toBe('NETWORK_ERROR');
            expect(json.timestamp).toBeDefined();
            expect(json.stack).toBeDefined();
        });

        test('should inherit from Error', () => {
            const error = new ApplicationError('Test');
            expect(error).toBeInstanceOf(Error);
            expect(error.stack).toBeDefined();
        });
    });

    describe('Specific Error Types', () => {
        test('ValidationError should extend ApplicationError', () => {
            const error = new ValidationError('Invalid input');
            expect(error).toBeInstanceOf(ApplicationError);
            expect(error.code).toBe('VALIDATION_ERROR');
        });

        test('NetworkError should include network-specific properties', () => {
            const error = new NetworkError('Request failed', {
                status: 404,
                url: '/api/resource',
                method: 'GET'
            });

            expect(error).toBeInstanceOf(ApplicationError);
            expect(error.status).toBe(404);
            expect(error.url).toBe('/api/resource');
            expect(error.method).toBe('GET');
        });

        test('RepositoryError should include repository-specific properties', () => {
            const error = new RepositoryError('Database error', {
                operation: 'save',
                entity: 'User'
            });

            expect(error).toBeInstanceOf(ApplicationError);
            expect(error.operation).toBe('save');
            expect(error.entity).toBe('User');
        });
    });

    describe('ErrorHandler', () => {
        let errorHandler;
        let mockLogger;

        beforeEach(() => {
            mockLogger = {
                warn: jest.fn(),
                error: jest.fn()
            };
            errorHandler = new ErrorHandler(mockLogger);
        });

        test('should handle application errors', () => {
            const error = new ValidationError('Invalid data');
            errorHandler.handle(error);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                '[VALIDATION] Invalid data',
                {}
            );
        });

        test('should handle generic errors', () => {
            const error = new Error('Generic error');
            errorHandler.handle(error, { userId: 123 });

            expect(mockLogger.error).toHaveBeenCalledWith(
                '[ERROR] Generic error',
                expect.objectContaining({
                    name: 'Error',
                    message: 'Generic error'
                }),
                { userId: 123 }
            );
        });

        test('should maintain error history', () => {
            const error1 = new Error('Error 1');
            const error2 = new Error('Error 2');

            errorHandler.handle(error1);
            errorHandler.handle(error2);

            const stats = errorHandler.getStats();
            expect(stats.totalErrors).toBe(2);
            expect(stats.recentErrors).toBe(2);
            expect(stats.lastError.error.message).toBe('Error 2');
        });

        test('should limit history size', () => {
            errorHandler.setMaxHistorySize(2);

            errorHandler.handle(new Error('Error 1'));
            errorHandler.handle(new Error('Error 2'));
            errorHandler.handle(new Error('Error 3'));

            const stats = errorHandler.getStats();
            expect(stats.recentErrors).toBe(2);
        });

        test('should clear history', () => {
            errorHandler.handle(new Error('Test error'));
            expect(errorHandler.getStats().recentErrors).toBe(1);

            errorHandler.clearHistory();
            expect(errorHandler.getStats().recentErrors).toBe(0);
        });
    });

    describe('Integration Tests', () => {
        test('Container and EventBus integration', () => {
            const container = new Container();
            const eventBus = new EventBus();

            container.singleton('eventBus', () => eventBus);

            const retrievedEventBus = container.get('eventBus');
            expect(retrievedEventBus).toBe(eventBus);

            // Test that the event bus works
            const handler = jest.fn();
            retrievedEventBus.subscribe('test', handler);
            retrievedEventBus.emitSync('test', 'data');

            expect(handler).toHaveBeenCalledWith('data');
        });

        test('Error handling with dependency injection', () => {
            const container = new Container();
            const errorHandler = new ErrorHandler();

            container.singleton('errorHandler', () => errorHandler);

            const service = container.get('errorHandler');
            expect(service).toBe(errorHandler);

            // Test error handling
            service.handle(new Error('Test error'));
            expect(service.getStats().totalErrors).toBe(1);
        });

        test('Logger with EventBus integration', () => {
            const container = new Container();
            const eventBus = new EventBus();
            const logger = new Logger();

            container.singleton('eventBus', () => eventBus);
            container.singleton('logger', () => logger);

            const logSpy = jest.spyOn(console, 'log').mockImplementation();

            // Simulate logging through event system
            eventBus.subscribe('log', (data) => {
                logger.info(data.message, data.context);
            });

            eventBus.emitSync('log', {
                message: 'Test log message',
                context: { test: true }
            });

            expect(logSpy).toHaveBeenCalled();
            logSpy.mockRestore();
        });
    });
});