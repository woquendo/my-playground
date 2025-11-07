/**
 * HTTP Client Tests
 */
import { jest } from '@jest/globals';
import { HttpClient } from '../../Infrastructure/Http/HttpClient.js';
import { NetworkError } from '../../Core/Errors/ApplicationErrors.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('HttpClient', () => {
    let client;

    beforeEach(() => {
        client = new HttpClient({
            baseUrl: 'https://api.example.com',
            timeout: 5000,
            retries: 2
        });
        fetch.mockClear();
    });

    // Helper to create proper headers mock
    const createHeaders = (headers = {}) => ({
        get: (key) => headers[key.toLowerCase()] || null
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('Construction and Configuration', () => {
        test('should create client with default options', () => {
            const defaultClient = new HttpClient();
            const config = defaultClient.getConfig();

            expect(config.baseUrl).toBe('');
            expect(config.timeout).toBe(30000);
            expect(config.retries).toBe(3);
        });

        test('should create client with custom options', () => {
            const config = client.getConfig();

            expect(config.baseUrl).toBe('https://api.example.com');
            expect(config.timeout).toBe(5000);
            expect(config.retries).toBe(2);
        });

        test('should set default headers', () => {
            const config = client.getConfig();

            expect(config.headers['Content-Type']).toBe('application/json');
            expect(config.headers['Accept']).toBe('application/json');
        });
    });

    describe('GET Requests', () => {
        test('should perform GET request successfully', async () => {
            const mockData = { id: 1, name: 'Test' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockData,
                headers: createHeaders({ 'content-type': 'application/json' })
            });

            const result = await client.get('/users/1');

            expect(fetch).toHaveBeenCalledWith(
                'https://api.example.com/users/1',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.any(Object)
                })
            );
            expect(result).toEqual(mockData);
        });

        test('should handle absolute URLs', async () => {
            const mockData = { success: true };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockData,
                headers: createHeaders({ 'content-type': 'application/json' })
            });

            await client.get('https://other-api.com/data');

            expect(fetch).toHaveBeenCalledWith(
                'https://other-api.com/data',
                expect.any(Object)
            );
        });

        test('should return null for non-JSON responses', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                headers: createHeaders({ 'content-type': 'text/plain' })
            });

            const result = await client.get('/text');

            expect(result).toBeNull();
        });
    });

    describe('POST Requests', () => {
        test('should perform POST request with data', async () => {
            const postData = { name: 'New User' };
            const mockResponse = { id: 1, ...postData };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
                headers: createHeaders({ 'content-type': 'application/json' })
            });

            const result = await client.post('/users', postData);

            expect(fetch).toHaveBeenCalledWith(
                'https://api.example.com/users',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(postData)
                })
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('PUT Requests', () => {
        test('should perform PUT request with data', async () => {
            const putData = { name: 'Updated User' };
            const mockResponse = { id: 1, ...putData };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
                headers: createHeaders({ 'content-type': 'application/json' })
            });

            const result = await client.put('/users/1', putData);

            expect(fetch).toHaveBeenCalledWith(
                'https://api.example.com/users/1',
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(putData)
                })
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('DELETE Requests', () => {
        test('should perform DELETE request', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
                headers: createHeaders({ 'content-type': 'application/json' })
            });

            const result = await client.delete('/users/1');

            expect(fetch).toHaveBeenCalledWith(
                'https://api.example.com/users/1',
                expect.objectContaining({
                    method: 'DELETE'
                })
            );
            expect(result).toEqual({ success: true });
        });
    });

    describe('Error Handling', () => {
        test('should throw NetworkError on HTTP error', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: createHeaders()
            });

            await expect(client.get('/not-found'))
                .rejects
                .toThrow(NetworkError);
        });

        test('should include error context', async () => {
            // Mock all retry attempts with the same response
            const errorResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                headers: createHeaders()
            };
            fetch.mockResolvedValue(errorResponse);

            try {
                await client.get('/error');
                fail('Should have thrown NetworkError');
            } catch (error) {
                expect(error).toBeInstanceOf(NetworkError);
                expect(error.message).toContain('500');
            }
        });

        test('should not retry on 4xx errors', async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                headers: createHeaders()
            });

            await expect(client.get('/bad-request')).rejects.toThrow();

            // Should only call once (no retries on client errors)
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should retry on 5xx errors', async () => {
            // First 2 calls fail, third succeeds
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: createHeaders()
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: createHeaders()
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true }),
                    headers: createHeaders({ 'content-type': 'application/json' })
                });

            const result = await client.get('/retry-test');

            // Should have retried twice before succeeding (3 total attempts)
            expect(fetch).toHaveBeenCalledTimes(3);
            expect(result).toEqual({ success: true });
        }, 15000); // Increased timeout for retries

        test('should throw after max retries exhausted', async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
                headers: createHeaders()
            });

            await expect(client.get('/unavailable')).rejects.toThrow(/after 3 attempts/);

            // retries: 2 means 3 total attempts (initial + 2 retries)
            expect(fetch).toHaveBeenCalledTimes(3);
        }, 15000); // Increased timeout for retries

        test('should handle network errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network failure'));

            await expect(client.get('/network-error')).rejects.toThrow();
        }, 15000); // Increased timeout for retries
    });

    describe('Custom Headers', () => {
        test('should set custom header', () => {
            client.setHeader('Authorization', 'Bearer token123');
            const config = client.getConfig();

            expect(config.headers['Authorization']).toBe('Bearer token123');
        });

        test('should remove header', () => {
            client.setHeader('X-Custom', 'value');
            client.removeHeader('X-Custom');
            const config = client.getConfig();

            expect(config.headers['X-Custom']).toBeUndefined();
        });

        test('should merge request-specific headers', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
                headers: createHeaders({ 'content-type': 'application/json' })
            });

            await client.get('/data', {
                headers: { 'X-Request-ID': '123' }
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-Request-ID': '123'
                    })
                })
            );
        });
    });

    describe('Retry Configuration', () => {
        test('should respect custom retry count', async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Error'
            });

            await expect(client.get('/fail', { retries: 0 })).rejects.toThrow();

            // retries: 0 means 1 attempt (no retries)
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        test('should retry specified number of times', async () => {
            fetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Error'
            });

            await expect(client.get('/fail', { retries: 1 })).rejects.toThrow();

            // retries: 1 means 2 attempts (initial + 1 retry)
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Request Body Handling', () => {
        test('should not include body for GET requests', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
                headers: createHeaders({ 'content-type': 'application/json' })
            });

            await client.get('/data');

            const callArgs = fetch.mock.calls[0][1];
            expect(callArgs.body).toBeUndefined();
        });

        test('should stringify POST body', async () => {
            const data = { key: 'value' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
                headers: createHeaders({ 'content-type': 'application/json' })
            });

            await client.post('/data', data);

            const callArgs = fetch.mock.calls[0][1];
            expect(callArgs.body).toBe(JSON.stringify(data));
        });
    });
});
