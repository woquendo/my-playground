/**
 * CommandBus Tests
 */
import { jest } from '@jest/globals';
import { CommandBus } from '../../Application/Commands/CommandBus.js';
import { ValidationError, ApplicationError } from '../../Core/Errors/ApplicationErrors.js';

describe('CommandBus', () => {
    let commandBus;
    let mockEventBus;
    let mockLogger;

    beforeEach(() => {
        mockEventBus = {
            emit: jest.fn()
        };
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };

        commandBus = new CommandBus({
            eventBus: mockEventBus,
            logger: mockLogger
        });
    });

    describe('Registration', () => {
        test('should register command handler', () => {
            const handler = jest.fn();

            commandBus.register('test.command', handler);

            expect(commandBus.has('test.command')).toBe(true);
            expect(mockLogger.debug).toHaveBeenCalledWith('Registered command handler: test.command');
        });

        test('should throw on invalid command name', () => {
            expect(() => commandBus.register('', jest.fn()))
                .toThrow(ValidationError);
            expect(() => commandBus.register(null, jest.fn()))
                .toThrow(ValidationError);
        });

        test('should throw on invalid handler', () => {
            expect(() => commandBus.register('test', 'not-a-function'))
                .toThrow(ValidationError);
        });

        test('should throw on duplicate registration', () => {
            commandBus.register('test.command', jest.fn());

            expect(() => commandBus.register('test.command', jest.fn()))
                .toThrow(ValidationError);
        });

        test('should register handler with validator', () => {
            const handler = jest.fn();
            const validator = jest.fn(() => true);

            commandBus.register('test.command', handler, { validator });

            expect(commandBus.has('test.command')).toBe(true);
        });
    });

    describe('Dispatch', () => {
        test('should dispatch command successfully', async () => {
            const handler = jest.fn().mockResolvedValue({ success: true });
            commandBus.register('test.command', handler);

            const result = await commandBus.dispatch('test.command', { data: 'test' });

            expect(result).toEqual({ success: true });
            expect(handler).toHaveBeenCalledWith({ data: 'test' });
            expect(mockEventBus.emit).toHaveBeenCalledWith('command:start', {
                commandName: 'test.command',
                payload: { data: 'test' }
            });
            expect(mockEventBus.emit).toHaveBeenCalledWith('command:success', {
                commandName: 'test.command',
                payload: { data: 'test' },
                result: { success: true }
            });
        });

        test('should throw on unregistered command', async () => {
            await expect(commandBus.dispatch('unknown.command'))
                .rejects
                .toThrow(ValidationError);
        });

        test('should validate command payload', async () => {
            const validator = jest.fn(() => false);
            const handler = jest.fn();

            commandBus.register('test.command', handler, { validator });

            await expect(commandBus.dispatch('test.command', { invalid: true }))
                .rejects
                .toThrow(ValidationError);

            expect(handler).not.toHaveBeenCalled();
        });

        test('should pass validation and execute handler', async () => {
            const validator = jest.fn(() => true);
            const handler = jest.fn().mockResolvedValue('success');

            commandBus.register('test.command', handler, { validator });

            const result = await commandBus.dispatch('test.command', { valid: true });

            expect(validator).toHaveBeenCalledWith({ valid: true });
            expect(handler).toHaveBeenCalledWith({ valid: true });
            expect(result).toBe('success');
        });

        test('should handle command execution errors', async () => {
            const error = new Error('Execution failed');
            const handler = jest.fn().mockRejectedValue(error);

            commandBus.register('test.command', handler);

            await expect(commandBus.dispatch('test.command'))
                .rejects
                .toThrow(ApplicationError);

            expect(mockEventBus.emit).toHaveBeenCalledWith('command:error', expect.objectContaining({
                commandName: 'test.command',
                error
            }));
        });

        test('should preserve ApplicationError types', async () => {
            const error = new ValidationError('Invalid data');
            const handler = jest.fn().mockRejectedValue(error);

            commandBus.register('test.command', handler);

            await expect(commandBus.dispatch('test.command'))
                .rejects
                .toThrow(ValidationError);
        });
    });

    describe('Middleware', () => {
        test('should execute middleware before handler', async () => {
            const executionOrder = [];
            const middleware = jest.fn(async (name, payload) => {
                executionOrder.push('middleware');
                return { ...payload, modified: true };
            });
            const handler = jest.fn(async (payload) => {
                executionOrder.push('handler');
                return payload;
            });

            commandBus.use(middleware);
            commandBus.register('test.command', handler);

            const result = await commandBus.dispatch('test.command', { data: 'test' });

            expect(executionOrder).toEqual(['middleware', 'handler']);
            expect(result).toEqual({ data: 'test', modified: true });
        });

        test('should execute multiple middleware in order', async () => {
            const executionOrder = [];
            const middleware1 = jest.fn(async (name, payload) => {
                executionOrder.push('middleware1');
                return { ...payload, step1: true };
            });
            const middleware2 = jest.fn(async (name, payload) => {
                executionOrder.push('middleware2');
                return { ...payload, step2: true };
            });
            const handler = jest.fn(async (payload) => payload);

            commandBus.use(middleware1);
            commandBus.use(middleware2);
            commandBus.register('test.command', handler);

            const result = await commandBus.dispatch('test.command', {});

            expect(executionOrder).toEqual(['middleware1', 'middleware2']);
            expect(result).toEqual({ step1: true, step2: true });
        });

        test('should throw on invalid middleware', () => {
            expect(() => commandBus.use('not-a-function'))
                .toThrow(ValidationError);
        });
    });

    describe('Management', () => {
        test('should unregister command handler', () => {
            commandBus.register('test.command', jest.fn());

            const result = commandBus.unregister('test.command');

            expect(result).toBe(true);
            expect(commandBus.has('test.command')).toBe(false);
        });

        test('should return false when unregistering non-existent handler', () => {
            const result = commandBus.unregister('unknown.command');

            expect(result).toBe(false);
        });

        test('should list registered commands', () => {
            commandBus.register('command1', jest.fn());
            commandBus.register('command2', jest.fn());

            const commands = commandBus.getRegisteredCommands();

            expect(commands).toContain('command1');
            expect(commands).toContain('command2');
            expect(commands.length).toBe(2);
        });

        test('should clear all handlers and middleware', () => {
            commandBus.register('command1', jest.fn());
            commandBus.use(jest.fn());

            commandBus.clear();

            expect(commandBus.getRegisteredCommands()).toHaveLength(0);
        });
    });

    describe('Integration', () => {
        test('should work without EventBus and Logger', async () => {
            const simpleBus = new CommandBus();
            const handler = jest.fn().mockResolvedValue('success');

            simpleBus.register('test.command', handler);
            const result = await simpleBus.dispatch('test.command');

            expect(result).toBe('success');
        });

        test('should handle async validation', async () => {
            const validator = jest.fn(async (payload) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return payload.valid === true;
            });
            const handler = jest.fn().mockResolvedValue('success');

            commandBus.register('test.command', handler, { validator });

            await expect(commandBus.dispatch('test.command', { valid: false }))
                .rejects
                .toThrow(ValidationError);

            const result = await commandBus.dispatch('test.command', { valid: true });
            expect(result).toBe('success');
        });
    });
});
