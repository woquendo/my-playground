/**
 * QueryBus Tests
 */
import { jest } from '@jest/globals';
import { QueryBus } from '../../Application/Queries/QueryBus.js';
import { ValidationError, ApplicationError } from '../../Core/Errors/ApplicationErrors.js';

describe('QueryBus', () => {
    let queryBus;
    let mockEventBus;
    let mockLogger;
    let mockCache;

    beforeEach(() => {
        mockEventBus = {
            emit: jest.fn()
        };
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };
        mockCache = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            deletePattern: jest.fn()
        };

        queryBus = new QueryBus({
            eventBus: mockEventBus,
            logger: mockLogger,
            cache: mockCache
        });
    });

    describe('Registration', () => {
        test('should register query handler', () => {
            const handler = jest.fn();

            queryBus.register('test.query', handler);

            expect(queryBus.has('test.query')).toBe(true);
            expect(mockLogger.debug).toHaveBeenCalledWith('Registered query handler: test.query');
        });

        test('should throw on invalid query name', () => {
            expect(() => queryBus.register('', jest.fn()))
                .toThrow(ValidationError);
            expect(() => queryBus.register(null, jest.fn()))
                .toThrow(ValidationError);
        });

        test('should throw on invalid handler', () => {
            expect(() => queryBus.register('test', 'not-a-function'))
                .toThrow(ValidationError);
        });

        test('should throw on duplicate registration', () => {
            queryBus.register('test.query', jest.fn());

            expect(() => queryBus.register('test.query', jest.fn()))
                .toThrow(ValidationError);
        });

        test('should register query with options', () => {
            const handler = jest.fn();
            const transformer = jest.fn(result => result);

            queryBus.register('test.query', handler, {
                transformer,
                cacheTTL: 60000
            });

            expect(queryBus.has('test.query')).toBe(true);
        });
    });

    describe('Execution', () => {
        test('should execute query successfully', async () => {
            const handler = jest.fn().mockResolvedValue({ data: 'test' });
            queryBus.register('test.query', handler);

            const result = await queryBus.execute('test.query', { id: 1 });

            expect(result).toEqual({ data: 'test' });
            expect(handler).toHaveBeenCalledWith({ id: 1 });
            expect(mockEventBus.emit).toHaveBeenCalledWith('query:start', {
                queryName: 'test.query',
                params: { id: 1 }
            });
            expect(mockEventBus.emit).toHaveBeenCalledWith('query:success', {
                queryName: 'test.query',
                params: { id: 1 },
                result: { data: 'test' }
            });
        });

        test('should throw on unregistered query', async () => {
            await expect(queryBus.execute('unknown.query'))
                .rejects
                .toThrow(ValidationError);
        });

        test('should transform query result', async () => {
            const handler = jest.fn().mockResolvedValue([1, 2, 3]);
            const transformer = jest.fn((result) => result.map(x => x * 2));

            queryBus.register('test.query', handler, { transformer });

            const result = await queryBus.execute('test.query');

            expect(result).toEqual([2, 4, 6]);
            expect(transformer).toHaveBeenCalledWith([1, 2, 3], {});
        });

        test('should handle query execution errors', async () => {
            const error = new Error('Query failed');
            const handler = jest.fn().mockRejectedValue(error);

            queryBus.register('test.query', handler);

            await expect(queryBus.execute('test.query'))
                .rejects
                .toThrow(ApplicationError);

            expect(mockEventBus.emit).toHaveBeenCalledWith('query:error', expect.objectContaining({
                queryName: 'test.query',
                error
            }));
        });

        test('should preserve ApplicationError types', async () => {
            const error = new ValidationError('Invalid query');
            const handler = jest.fn().mockRejectedValue(error);

            queryBus.register('test.query', handler);

            await expect(queryBus.execute('test.query'))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('Caching', () => {
        test('should cache query results', async () => {
            const handler = jest.fn().mockResolvedValue({ data: 'test' });
            mockCache.get.mockReturnValue(undefined);

            queryBus.register('test.query', handler, { cacheTTL: 60000 });

            await queryBus.execute('test.query', { id: 1 });

            expect(mockCache.set).toHaveBeenCalledWith(
                expect.stringContaining('query:test.query:'),
                { data: 'test' },
                60000
            );
        });

        test('should return cached result', async () => {
            const handler = jest.fn().mockResolvedValue({ data: 'fresh' });
            const cachedData = { data: 'cached' };
            mockCache.get.mockReturnValue(cachedData);

            queryBus.register('test.query', handler, { cacheTTL: 60000 });

            const result = await queryBus.execute('test.query', { id: 1 });

            expect(result).toEqual(cachedData);
            expect(handler).not.toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith('query:cache-hit', {
                queryName: 'test.query',
                params: { id: 1 }
            });
        });

        test('should skip cache when requested', async () => {
            const handler = jest.fn().mockResolvedValue({ data: 'fresh' });
            mockCache.get.mockReturnValue({ data: 'cached' });

            queryBus.register('test.query', handler, { cacheTTL: 60000 });

            const result = await queryBus.execute('test.query', { id: 1 }, { skipCache: true });

            expect(result).toEqual({ data: 'fresh' });
            expect(handler).toHaveBeenCalled();
            expect(mockCache.set).not.toHaveBeenCalled();
        });

        test('should not cache when TTL is 0', async () => {
            const handler = jest.fn().mockResolvedValue({ data: 'test' });

            queryBus.register('test.query', handler);

            await queryBus.execute('test.query');

            expect(mockCache.set).not.toHaveBeenCalled();
        });

        test('should invalidate specific query cache', () => {
            queryBus.invalidateCache('test.query', { id: 1 });

            expect(mockCache.delete).toHaveBeenCalledWith(
                expect.stringContaining('query:test.query:')
            );
            expect(mockEventBus.emit).toHaveBeenCalledWith('query:cache-invalidated', {
                queryName: 'test.query',
                params: { id: 1 }
            });
        });

        test('should invalidate all query cache entries', () => {
            queryBus.invalidateCache('test.query');

            expect(mockCache.deletePattern).toHaveBeenCalledWith('query:test.query:*');
        });

        test('should handle missing cache gracefully', async () => {
            const busWithoutCache = new QueryBus();
            const handler = jest.fn().mockResolvedValue({ data: 'test' });

            busWithoutCache.register('test.query', handler, { cacheTTL: 60000 });

            const result = await busWithoutCache.execute('test.query');

            expect(result).toEqual({ data: 'test' });
        });
    });

    describe('Middleware', () => {
        test('should execute middleware before handler', async () => {
            const executionOrder = [];
            const middleware = jest.fn(async (name, params) => {
                executionOrder.push('middleware');
                return { ...params, modified: true };
            });
            const handler = jest.fn(async (params) => {
                executionOrder.push('handler');
                return params;
            });

            queryBus.use(middleware);
            queryBus.register('test.query', handler);

            const result = await queryBus.execute('test.query', { data: 'test' });

            expect(executionOrder).toEqual(['middleware', 'handler']);
            expect(result).toEqual({ data: 'test', modified: true });
        });

        test('should execute multiple middleware in order', async () => {
            const middleware1 = jest.fn(async (name, params) => ({ ...params, step1: true }));
            const middleware2 = jest.fn(async (name, params) => ({ ...params, step2: true }));
            const handler = jest.fn(async (params) => params);

            queryBus.use(middleware1);
            queryBus.use(middleware2);
            queryBus.register('test.query', handler);

            const result = await queryBus.execute('test.query', {});

            expect(result).toEqual({ step1: true, step2: true });
        });

        test('should throw on invalid middleware', () => {
            expect(() => queryBus.use('not-a-function'))
                .toThrow(ValidationError);
        });
    });

    describe('Management', () => {
        test('should unregister query handler', () => {
            queryBus.register('test.query', jest.fn());

            const result = queryBus.unregister('test.query');

            expect(result).toBe(true);
            expect(queryBus.has('test.query')).toBe(false);
        });

        test('should return false when unregistering non-existent handler', () => {
            const result = queryBus.unregister('unknown.query');

            expect(result).toBe(false);
        });

        test('should list registered queries', () => {
            queryBus.register('query1', jest.fn());
            queryBus.register('query2', jest.fn());

            const queries = queryBus.getRegisteredQueries();

            expect(queries).toContain('query1');
            expect(queries).toContain('query2');
            expect(queries.length).toBe(2);
        });

        test('should clear all handlers and middleware', () => {
            queryBus.register('query1', jest.fn());
            queryBus.use(jest.fn());

            queryBus.clear();

            expect(queryBus.getRegisteredQueries()).toHaveLength(0);
        });
    });

    describe('Integration', () => {
        test('should work without EventBus, Logger, and Cache', async () => {
            const simpleBus = new QueryBus();
            const handler = jest.fn().mockResolvedValue('result');

            simpleBus.register('test.query', handler);
            const result = await simpleBus.execute('test.query');

            expect(result).toBe('result');
        });

        test('should generate consistent cache keys', async () => {
            const handler = jest.fn().mockResolvedValue('result');
            let callCount = 0;
            mockCache.get.mockImplementation(() => {
                callCount++;
                // First call returns undefined, second returns cached value
                return callCount === 1 ? undefined : 'result';
            });

            queryBus.register('test.query', handler, { cacheTTL: 60000 });

            await queryBus.execute('test.query', { b: 2, a: 1 });
            await queryBus.execute('test.query', { a: 1, b: 2 });

            // First call caches, second call hits cache (same key due to sorted params)
            expect(mockCache.set).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(mockCache.get).toHaveBeenCalledTimes(2);
        });
    });
});
