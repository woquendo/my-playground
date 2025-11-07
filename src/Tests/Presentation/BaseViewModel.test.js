/**
 * Tests for BaseViewModel
 * Test suite for base view model functionality
 */

import { jest } from '@jest/globals';
import { BaseViewModel } from '../../Presentation/ViewModels/BaseViewModel.js';
import { EventBus } from '../../Core/EventBus.js';
import { Logger } from '../../Core/Logger.js';

describe('BaseViewModel', () => {
    let viewModel;
    let eventBus;
    let logger;

    beforeEach(() => {
        eventBus = new EventBus();
        logger = new Logger({ prefix: 'Test' });
        viewModel = new BaseViewModel({ eventBus, logger, name: 'Test' });
    });

    afterEach(() => {
        if (viewModel) {
            viewModel.dispose();
        }
    });

    describe('Construction', () => {
        test('should create with default options', () => {
            const vm = new BaseViewModel();
            expect(vm.getName()).toBe('BaseViewModel');
            vm.dispose();
        });

        test('should create with custom name', () => {
            expect(viewModel.getName()).toBe('Test');
        });

        test('should initialize state', () => {
            const state = viewModel.getState();
            expect(state).toEqual({});
        });
    });

    describe('State Management', () => {
        test('should get and set properties', () => {
            viewModel.set('key', 'value');
            expect(viewModel.get('key')).toBe('value');
        });

        test('should not trigger change for same value', () => {
            viewModel.set('key', 'value');
            const listener = jest.fn();
            viewModel.watch('key', listener);

            viewModel.set('key', 'value');
            expect(listener).not.toHaveBeenCalled();
        });

        test('should set multiple properties', () => {
            viewModel.setMultiple({ a: 1, b: 2, c: 3 });
            expect(viewModel.get('a')).toBe(1);
            expect(viewModel.get('b')).toBe(2);
            expect(viewModel.get('c')).toBe(3);
        });

        test('should get entire state', () => {
            viewModel.set('a', 1);
            viewModel.set('b', 2);

            const state = viewModel.getState();
            expect(state).toEqual({ a: 1, b: 2 });
        });

        test('should replace state', () => {
            viewModel.set('old', 'value');
            viewModel.setState({ new: 'value' });

            expect(viewModel.get('old')).toBeUndefined();
            expect(viewModel.get('new')).toBe('value');
        });

        test('should clear state', () => {
            viewModel.set('key', 'value');
            viewModel.clearState();

            expect(viewModel.getState()).toEqual({});
        });
    });

    describe('Change Tracking', () => {
        test('should mark as dirty after change', () => {
            expect(viewModel.isDirty()).toBe(false);
            viewModel.set('key', 'value');
            expect(viewModel.isDirty()).toBe(true);
        });

        test('should save snapshot', () => {
            viewModel.set('key', 'value');
            viewModel.saveSnapshot();

            expect(viewModel.isDirty()).toBe(false);
        });

        test('should reset to snapshot', () => {
            viewModel.set('key', 'original');
            viewModel.saveSnapshot();

            viewModel.set('key', 'changed');
            viewModel.reset();

            expect(viewModel.get('key')).toBe('original');
            expect(viewModel.isDirty()).toBe(false);
        });

        test('should not trigger change when silent', () => {
            const listener = jest.fn();
            viewModel.watch('key', listener);

            viewModel.set('key', 'value', true);
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('Watchers', () => {
        test('should watch property changes', () => {
            const watcher = jest.fn();
            viewModel.watch('key', watcher);

            viewModel.set('key', 'newValue');
            expect(watcher).toHaveBeenCalledWith('newValue', undefined);
        });

        test('should unwatch property', () => {
            const watcher = jest.fn();
            const unwatch = viewModel.watch('key', watcher);

            unwatch();
            viewModel.set('key', 'value');

            expect(watcher).not.toHaveBeenCalled();
        });

        test('should handle multiple watchers', () => {
            const watcher1 = jest.fn();
            const watcher2 = jest.fn();

            viewModel.watch('key', watcher1);
            viewModel.watch('key', watcher2);

            viewModel.set('key', 'value');

            expect(watcher1).toHaveBeenCalled();
            expect(watcher2).toHaveBeenCalled();
        });
    });

    describe('Computed Properties', () => {
        test('should define computed property', () => {
            viewModel.set('first', 'John');
            viewModel.set('last', 'Doe');

            viewModel.defineComputed('fullName', function () {
                return `${this.get('first')} ${this.get('last')}`;
            });

            expect(viewModel.get('fullName')).toBe('John Doe');
        });

        test('should update computed on dependency change', () => {
            viewModel.set('count', 5);
            viewModel.defineComputed('double', function () {
                return this.get('count') * 2;
            });

            expect(viewModel.get('double')).toBe(10);

            viewModel.set('count', 10);
            expect(viewModel.get('double')).toBe(20);
        });
    });

    describe('Loading State', () => {
        test('should get and set loading', () => {
            expect(viewModel.isLoading()).toBe(false);

            viewModel.setLoading(true);
            expect(viewModel.isLoading()).toBe(true);
        });

        test('should emit loading event', () => {
            const listener = jest.fn();
            viewModel.on('loading', listener);

            viewModel.setLoading(true);
            expect(listener).toHaveBeenCalledWith({ loading: true });
        });
    });

    describe('Error Handling', () => {
        test('should add error', () => {
            viewModel.addError('Test error');
            expect(viewModel.hasErrors()).toBe(true);
            expect(viewModel.getErrors()).toEqual(['Test error']);
        });

        test('should handle Error objects', () => {
            viewModel.addError(new Error('Test error'));
            expect(viewModel.getErrors()).toEqual(['Test error']);
        });

        test('should clear errors', () => {
            viewModel.addError('Error 1');
            viewModel.addError('Error 2');
            viewModel.clearErrors();

            expect(viewModel.hasErrors()).toBe(false);
            expect(viewModel.getErrors()).toEqual([]);
        });
    });

    describe('Async Operations', () => {
        test('should execute async with loading state', async () => {
            const operation = jest.fn().mockResolvedValue('result');

            const promise = viewModel.executeAsync(operation);
            expect(viewModel.isLoading()).toBe(true);

            const result = await promise;
            expect(result).toBe('result');
            expect(viewModel.isLoading()).toBe(false);
        });

        test('should handle async errors', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Failed'));

            await expect(viewModel.executeAsync(operation)).rejects.toThrow('Failed');
            expect(viewModel.isLoading()).toBe(false);
            expect(viewModel.hasErrors()).toBe(true);
        });

        test('should clear errors before execution', async () => {
            viewModel.addError('Old error');

            const operation = jest.fn().mockResolvedValue('result');
            await viewModel.executeAsync(operation);

            expect(viewModel.hasErrors()).toBe(false);
        });
    });

    describe('Events', () => {
        test('should emit events', () => {
            const listener = jest.fn();
            viewModel.on('change', listener);

            viewModel.set('key', 'value');
            expect(listener).toHaveBeenCalled();
        });

        test('should include event data', () => {
            const listener = jest.fn();
            viewModel.on('change', listener);

            viewModel.set('key', 'value');
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: 'key',
                    value: 'value'
                })
            );
        });
    });

    describe('Validation', () => {
        test('should validate by default', () => {
            expect(viewModel.validate()).toBe(true);
        });

        test('should support custom validation', () => {
            class CustomViewModel extends BaseViewModel {
                validate() {
                    this.clearErrors();
                    if (!this.get('required')) {
                        this.addError('Required field missing');
                        return false;
                    }
                    return true;
                }
            }

            const vm = new CustomViewModel({ name: 'Custom' });
            expect(vm.validate()).toBe(false);
            expect(vm.hasErrors()).toBe(true);

            vm.set('required', 'value');
            expect(vm.validate()).toBe(true);

            vm.dispose();
        });
    });

    describe('Export/Import', () => {
        test('should export state', () => {
            viewModel.set('key', 'value');
            viewModel.addError('Test error');

            const exported = viewModel.export();

            expect(exported).toMatchObject({
                name: 'Test',
                state: { key: 'value' },
                isDirty: true,
                hasErrors: true,
                errors: ['Test error']
            });
        });

        test('should import state', () => {
            const data = {
                state: { key: 'imported' },
                isDirty: true,
                errors: ['Imported error']
            };

            viewModel.import(data);

            expect(viewModel.get('key')).toBe('imported');
            expect(viewModel.isDirty()).toBe(true);
            expect(viewModel.getErrors()).toEqual(['Imported error']);
        });
    });

    describe('Disposal', () => {
        test('should dispose resources', () => {
            viewModel.set('key', 'value');
            viewModel.addError('Error');

            viewModel.dispose();

            expect(viewModel.getState()).toEqual({});
            expect(viewModel.getErrors()).toEqual([]);
        });

        test('should emit disposed event', () => {
            const listener = jest.fn();
            viewModel.on('disposed', listener);

            viewModel.dispose();
            expect(listener).toHaveBeenCalled();
        });
    });
});
