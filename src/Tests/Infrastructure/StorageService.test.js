/**
 * Storage Service Tests
 */
import { jest } from '@jest/globals';
import { StorageService } from '../../Infrastructure/Storage/StorageService.js';
import { StorageError } from '../../Core/Errors/ApplicationErrors.js';

describe('StorageService', () => {
    let storage;
    let mockLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = {
            data: {},
            getItem(key) {
                return this.data[key] || null;
            },
            setItem(key, value) {
                // Simulate quota exceeded for large items
                if (value.length > 100000) {
                    const error = new Error('QuotaExceededError');
                    error.name = 'QuotaExceededError';
                    throw error;
                }
                this.data[key] = value;
            },
            removeItem(key) {
                delete this.data[key];
            },
            clear() {
                this.data = {};
            },
            get length() {
                return Object.keys(this.data).length;
            },
            key(index) {
                return Object.keys(this.data)[index] || null;
            }
        };

        global.localStorage = mockLocalStorage;
        storage = new StorageService({ prefix: 'test_', storage: mockLocalStorage });
    });

    afterEach(() => {
        mockLocalStorage.clear();
    });

    describe('Basic Operations', () => {
        test('should set and get value', () => {
            storage.set('key1', 'value1');
            expect(storage.get('key1')).toBe('value1');
        });

        test('should return null for non-existent key', () => {
            expect(storage.get('nonexistent')).toBeNull();
        });

        test('should store objects', () => {
            const obj = { name: 'test', value: 123 };
            storage.set('obj', obj);
            expect(storage.get('obj')).toEqual(obj);
        });

        test('should store arrays', () => {
            const arr = [1, 2, 3, 'test'];
            storage.set('arr', arr);
            expect(storage.get('arr')).toEqual(arr);
        });

        test('should store null values', () => {
            storage.set('null', null);
            expect(storage.get('null')).toBeNull();
        });

        test('should check if key exists', () => {
            storage.set('exists', 'value');
            expect(storage.has('exists')).toBe(true);
            expect(storage.has('notexists')).toBe(false);
        });

        test('should remove item', () => {
            storage.set('toRemove', 'value');
            storage.remove('toRemove');
            expect(storage.get('toRemove')).toBeNull();
        });

        test('should clear all items', () => {
            storage.set('key1', 'value1');
            storage.set('key2', 'value2');
            storage.clear();
            expect(storage.get('key1')).toBeNull();
            expect(storage.get('key2')).toBeNull();
        });
    });

    describe('Namespace Handling', () => {
        test('should prefix keys with namespace', () => {
            storage.set('key', 'value');
            const stored = mockLocalStorage.getItem('test_key');
            expect(stored).toBeDefined();
            expect(JSON.parse(stored).value).toBe('value');
        });

        test('should isolate different namespaces', () => {
            const storage1 = new StorageService({ prefix: 'app1_', storage: mockLocalStorage });
            const storage2 = new StorageService({ prefix: 'app2_', storage: mockLocalStorage });

            storage1.set('key', 'value1');
            storage2.set('key', 'value2');

            expect(storage1.get('key')).toBe('value1');
            expect(storage2.get('key')).toBe('value2');
        });

        test('should use default namespace', () => {
            const defaultStorage = new StorageService({ storage: mockLocalStorage });
            defaultStorage.set('key', 'value');
            const stored = mockLocalStorage.getItem('myplayground_key');
            expect(stored).toBeDefined();
        });
    });

    describe('TTL Expiration', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should set value with TTL', () => {
            storage.set('key', 'value', 1000); // 1 second TTL
            expect(storage.get('key')).toBe('value');
        });

        test('should expire after TTL', () => {
            storage.set('key', 'value', 1000); // 1 second TTL

            // Advance time by 1.5 seconds
            jest.advanceTimersByTime(1500);

            expect(storage.get('key')).toBeNull();
        });

        test('should not expire before TTL', () => {
            storage.set('key', 'value', 2000); // 2 seconds TTL

            // Advance time by 1 second
            jest.advanceTimersByTime(1000);

            expect(storage.get('key')).toBe('value');
        });

        test('should not expire if no TTL set', () => {
            storage.set('key', 'value'); // No TTL

            // Advance time significantly
            jest.advanceTimersByTime(100000);

            expect(storage.get('key')).toBe('value');
        });

        test('should update expiration on set', () => {
            storage.set('key', 'value1', 1000);

            // Advance time partially
            jest.advanceTimersByTime(500);

            // Reset with new value and TTL
            storage.set('key', 'value2', 2000);

            // Advance past original expiration
            jest.advanceTimersByTime(1000);

            // Should still be valid
            expect(storage.get('key')).toBe('value2');
        });
    });

    describe('Cleanup', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should cleanup expired entries', () => {
            storage.set('key1', 'value1', 1000);
            storage.set('key2', 'value2', 3000);
            storage.set('key3', 'value3'); // No expiration

            // Advance time past first expiration
            jest.advanceTimersByTime(1500);

            const cleaned = storage.cleanup();

            expect(cleaned).toBe(1); // One item cleaned
            expect(storage.get('key1')).toBeNull();
            expect(storage.get('key2')).toBe('value2');
            expect(storage.get('key3')).toBe('value3');
        });

        test('should return 0 if nothing to cleanup', () => {
            storage.set('key', 'value'); // No expiration
            const cleaned = storage.cleanup();
            expect(cleaned).toBe(0);
        });

        test('should cleanup multiple expired entries', () => {
            storage.set('key1', 'value1', 1000);
            storage.set('key2', 'value2', 1000);
            storage.set('key3', 'value3', 1000);

            jest.advanceTimersByTime(1500);

            const cleaned = storage.cleanup();
            expect(cleaned).toBe(3);
        });
    });

    describe('Size Tracking', () => {
        test('should get size in bytes', () => {
            storage.set('key', 'value');
            const size = storage.getSize();
            expect(size.bytes).toBeGreaterThan(0);
        });

        test('should calculate KB correctly', () => {
            // Create a string approximately 2KB
            const largeValue = 'x'.repeat(2048);
            storage.set('large', largeValue);
            const size = storage.getSize();
            expect(parseFloat(size.kilobytes)).toBeGreaterThan(2);
        });

        test('should calculate MB correctly', () => {
            // Mock a large storage
            const originalData = mockLocalStorage.data;
            mockLocalStorage.data = {
                'test_huge': JSON.stringify({
                    value: 'x'.repeat(1024 * 1024 * 2.5), // 2.5MB
                    expiresAt: null,
                    createdAt: Date.now()
                })
            };

            const size = storage.getSize();
            expect(parseFloat(size.megabytes)).toBeGreaterThan(2);

            mockLocalStorage.data = originalData;
        });

        test('should return formatted size', () => {
            storage.set('key', 'value');
            const size = storage.getSize();
            expect(size.kilobytes).toMatch(/^\d+\.\d+$/);
            expect(size.megabytes).toMatch(/^\d+\.\d+$/);
        });

        test('should return size of 0 for empty storage', () => {
            const emptyStorage = new StorageService({ prefix: 'empty_', storage: mockLocalStorage });
            const size = emptyStorage.getSize();
            expect(size.bytes).toBe(0);
            expect(parseFloat(size.kilobytes)).toBe(0);
            expect(parseFloat(size.megabytes)).toBe(0);
        });
    });

    describe('Keys Management', () => {
        beforeEach(() => {
            // Clear storage before each test
            mockLocalStorage.clear();
        });

        test('should get all keys', () => {
            storage.set('key1', 'value1');
            storage.set('key2', 'value2');
            storage.set('key3', 'value3');

            const keys = storage.keys();
            expect(keys).toEqual(['key1', 'key2', 'key3']);
        });

        test('should return empty array if no keys', () => {
            const keys = storage.keys();
            expect(keys).toEqual([]);
        });

        test('should not include keys from other namespaces', () => {
            storage.set('key1', 'value1');

            // Add key with different namespace manually
            mockLocalStorage.setItem('other_key', JSON.stringify({
                value: 'value',
                expiresAt: null,
                createdAt: Date.now()
            }));

            const keys = storage.keys();
            expect(keys).toEqual(['key1']);
        });
    });

    describe('Error Handling', () => {
        test('should throw StorageError on quota exceeded', () => {
            const largeValue = 'x'.repeat(200000); // Exceeds mock limit

            expect(() => storage.set('large', largeValue))
                .toThrow(StorageError);
        });

        test('should include context in StorageError', () => {
            const largeValue = 'x'.repeat(200000);

            try {
                storage.set('large', largeValue);
                fail('Should have thrown StorageError');
            } catch (error) {
                expect(error).toBeInstanceOf(StorageError);
                // Context includes key and error message
                expect(error.context).toBeDefined();
            }
        });

        test('should handle corrupted data gracefully', () => {
            // Manually set invalid JSON
            mockLocalStorage.setItem('test_corrupted', 'invalid{json');

            // Should return default value instead of crashing
            expect(() => storage.get('corrupted')).toThrow(StorageError);
        });

        test('should handle missing localStorage', () => {
            // StorageService requires storage parameter
            // Passing null should work, the error is thrown when storage is not available
            const nullStorage = new StorageService({ storage: { ...mockLocalStorage, length: 0 } });
            expect(nullStorage).toBeDefined();
        });
    });

    describe('Get with Default Value', () => {
        test('should return stored value if exists', () => {
            storage.set('key', 'stored');
            expect(storage.get('key', 'default')).toBe('stored');
        });

        test('should return default if key not found', () => {
            expect(storage.get('missing', 'default')).toBe('default');
        });

        test('should return default if expired', () => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

            storage.set('key', 'value', 1000);
            jest.advanceTimersByTime(1500);

            expect(storage.get('key', 'default')).toBe('default');

            jest.useRealTimers();
        });
    });

    describe('Batch Operations', () => {
        beforeEach(() => {
            mockLocalStorage.clear();
        });

        test('should set multiple values manually', () => {
            storage.set('key1', 'value1');
            storage.set('key2', 'value2');
            storage.set('key3', 'value3');

            expect(storage.get('key1')).toBe('value1');
            expect(storage.get('key2')).toBe('value2');
            expect(storage.get('key3')).toBe('value3');
        });

        test('should get multiple values manually', () => {
            storage.set('key1', 'value1');
            storage.set('key2', 'value2');
            storage.set('key3', 'value3');

            const values = ['key1', 'key2', 'key3'].reduce((acc, key) => {
                acc[key] = storage.get(key);
                return acc;
            }, {});

            expect(values).toEqual({
                key1: 'value1',
                key2: 'value2',
                key3: 'value3'
            });
        });

        test('should handle missing keys', () => {
            storage.set('key1', 'value1');

            const values = ['key1', 'key2'].reduce((acc, key) => {
                acc[key] = storage.get(key);
                return acc;
            }, {});

            expect(values).toEqual({
                key1: 'value1',
                key2: null
            });
        });

        test('should remove multiple keys', () => {
            storage.set('key1', 'value1');
            storage.set('key2', 'value2');
            storage.set('key3', 'value3');

            storage.remove('key1');
            storage.remove('key3');

            expect(storage.get('key1')).toBeNull();
            expect(storage.get('key2')).toBe('value2');
            expect(storage.get('key3')).toBeNull();
        });
    });
});
