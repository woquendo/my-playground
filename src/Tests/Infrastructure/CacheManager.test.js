/**
 * Cache Manager Tests
 */
import { jest } from '@jest/globals';
import { CacheManager } from '../../Infrastructure/Cache/CacheManager.js';

describe('CacheManager', () => {
    let cache;

    beforeEach(() => {
        cache = new CacheManager({
            defaultTTL: 1000,
            maxSize: 5,
            enableStats: true
        });
    });

    describe('Basic Operations', () => {
        test('should set and get values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        test('should return null for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeNull();
        });

        test('should check if key exists', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(false);
        });

        test('should delete keys', () => {
            cache.set('key1', 'value1');
            expect(cache.delete('key1')).toBe(true);
            expect(cache.get('key1')).toBeNull();
        });

        test('should clear all keys', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.size()).toBe(0);
        });
    });

    describe('TTL Expiration', () => {
        test('should expire entries after TTL', async () => {
            cache.set('key1', 'value1', 50); // 50ms TTL
            expect(cache.get('key1')).toBe('value1');

            await new Promise(resolve => setTimeout(resolve, 100));
            expect(cache.get('key1')).toBeNull();
        });

        test('should use default TTL when not specified', async () => {
            cache.set('key1', 'value1'); // Uses defaultTTL: 1000ms
            expect(cache.has('key1')).toBe(true);
        });

        test('should not expire if TTL is null', async () => {
            const noTTLCache = new CacheManager({ defaultTTL: null });
            noTTLCache.set('key1', 'value1');

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(noTTLCache.get('key1')).toBe('value1');
        });
    });

    describe('LRU Eviction', () => {
        test('should evict least recently used when max size reached', () => {
            // Fill cache to max size
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            cache.set('key4', 'value4');
            cache.set('key5', 'value5');

            // Access all except key1 to make key1 the least recently used
            cache.get('key2');
            cache.get('key3');
            cache.get('key4');
            cache.get('key5');

            // Adding new entry should evict key1 (least recently used)
            cache.set('key6', 'value6');

            expect(cache.size()).toBe(5);
            expect(cache.has('key1')).toBe(false); // Evicted
            expect(cache.has('key6')).toBe(true); // Newly added
        });
    }); describe('Pattern Deletion', () => {
        test('should delete keys matching string prefix', () => {
            cache.set('user:1', 'data1');
            cache.set('user:2', 'data2');
            cache.set('post:1', 'data3');

            const deleted = cache.deletePattern('user');
            expect(deleted).toBe(2);
            expect(cache.has('user:1')).toBe(false);
            expect(cache.has('user:2')).toBe(false);
            expect(cache.has('post:1')).toBe(true);
        });

        test('should delete keys matching regex pattern', () => {
            cache.set('user:1', 'data1');
            cache.set('user:2', 'data2');
            cache.set('admin:1', 'data3');

            const deleted = cache.deletePattern(/user:\d+/);
            expect(deleted).toBe(2);
            expect(cache.has('user:1')).toBe(false);
            expect(cache.has('admin:1')).toBe(true);
        });
    });

    describe('Statistics', () => {
        test('should track hits and misses', () => {
            cache.set('key1', 'value1');
            cache.get('key1'); // hit
            cache.get('key2'); // miss
            cache.get('key1'); // hit

            const stats = cache.getStats();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
            expect(stats.sets).toBe(1);
        });

        test('should calculate hit rate', () => {
            cache.set('key1', 'value1');
            cache.get('key1'); // hit
            cache.get('key2'); // miss

            const stats = cache.getStats();
            expect(stats.hitRate).toBe('50.00%');
        });

        test('should track evictions', () => {
            // Fill cache beyond max size
            for (let i = 1; i <= 6; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            const stats = cache.getStats();
            expect(stats.evictions).toBe(1);
        });
    });

    describe('Cleanup', () => {
        test('should remove expired entries', async () => {
            cache.set('key1', 'value1', 50);
            cache.set('key2', 'value2', 200);
            cache.set('key3', 'value3');

            await new Promise(resolve => setTimeout(resolve, 100));

            const removed = cache.cleanup();
            expect(removed).toBe(1);
            expect(cache.has('key1')).toBe(false);
            expect(cache.has('key2')).toBe(true);
        });
    });

    describe('Get or Set Pattern', () => {
        test('should get cached value if available', async () => {
            cache.set('key1', 'cached');

            const factory = jest.fn(() => 'generated');
            const value = await cache.getOrSet('key1', factory);

            expect(value).toBe('cached');
            expect(factory).not.toHaveBeenCalled();
        });

        test('should generate and cache value if not available', async () => {
            const factory = jest.fn(() => Promise.resolve('generated'));
            const value = await cache.getOrSet('key1', factory);

            expect(value).toBe('generated');
            expect(factory).toHaveBeenCalled();
            expect(cache.get('key1')).toBe('generated');
        });
    });

    describe('Utility Methods', () => {
        test('should get all keys', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const keys = cache.keys();
            expect(keys).toEqual(['key1', 'key2']);
        });

        test('should return cache size', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            expect(cache.size()).toBe(2);
        });
    });
});
